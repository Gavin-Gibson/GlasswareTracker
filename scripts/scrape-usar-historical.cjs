/**
 * USAR Tournament Historical Scraper
 *
 * How it works:
 *   1. Paginates Fwango's public `urls` collection to get every tournament slug + ID
 *   2. For each tournament, fetches the tournament doc and checks if the USAR org
 *      (ID: 6226c6737ffda50967a24166) is listed as a host
 *   3. For all USAR-hosted tournaments that have published results in `reportEvents`,
 *      scrapes standings, teams, and player rosters
 *   4. Outputs:
 *        data/usar-tournaments-all.json
 *        data/usar-placements-all.csv
 *        data/usar-tournaments-{year}.json  (one per year)
 *        data/usar-placements-{year}.csv    (one per year)
 *
 * Usage:
 *   node scripts/scrape-usar-historical.cjs              # full run
 *   node scripts/scrape-usar-historical.cjs --dry-run    # discover USAR slugs only, no scraping
 *   node scripts/scrape-usar-historical.cjs --from 2022  # only scrape from a given year
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FROM_YEAR = (() => {
  const idx = args.indexOf('--from');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : null;
})();

// USAR's Fwango organization ID (confirmed from natsseattle26, natsatlanta26)
const USAR_ORG_ID = '6226c6737ffda50967a24166';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Firestore parsing helpers
// ---------------------------------------------------------------------------

function parseFirestoreField(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map(parseFirestoreField);
  }
  if ('mapValue' in field) {
    const res = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      res[k] = parseFirestoreField(v);
    }
    return res;
  }
  return null;
}

function parseFirestoreDoc(doc) {
  const result = { _id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    result[k] = parseFirestoreField(v);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Award classification
// ---------------------------------------------------------------------------

// Helper to determine category
function getDivisionCategory(name) {
  const lower = name.toLowerCase();
  if (lower.includes('women') || lower.includes('girls') || lower.includes('fem')) {
    return "Women's";
  }
  if (lower.includes('mixed') || lower.includes('coed') || lower.includes('co-ed') || lower.includes('squads')) {
    return "Mixed / Other";
  }
  if (lower.includes('registration') || lower.includes('results') || lower.includes('hat bracket') || lower.includes('individual') || lower.includes('squad')) {
    return "Mixed / Other";
  }
  return "Open / Men's";
}

// Convert division name to a numeric rating level for tier comparison
function getDivisionLevelScore(name) {
  const lower = name.toLowerCase();
  if (lower.includes('5.5') || lower.includes('pro') || lower.includes('gold+')) return 5.5;
  if (lower.includes('5.0') || lower.includes('premier') || lower.includes('expert') || lower.includes('elite')) return 5.0;
  if (lower.includes('4.5')) return 4.5;
  if (lower.includes('4.0') || lower.includes('advanced') || lower.includes('challenger')) return 4.0;
  if (lower.includes('3.5')) return 3.5;
  if (lower.includes('3.0') || lower.includes('intermediate') || lower.includes('contender')) return 3.0;
  if (lower.includes('2.0') || lower.includes('recreational') || lower.includes('beginner') || lower.includes('casual')) return 2.0;
  return 1.0; // default low score
}

function classifyDivisionAwards(divisionName, allDivisionsInTourney) {
  const category = getDivisionCategory(divisionName);
  const score = getDivisionLevelScore(divisionName);
  const isPointsOnly = divisionName.toLowerCase().includes('points') || divisionName.toLowerCase().includes('ladder');

  // Compute maximum scores in this tournament for category comparison
  const parsedDivs = allDivisionsInTourney.map(name => ({
    category: getDivisionCategory(name),
    score: getDivisionLevelScore(name)
  }));
  const maxWomenScore = Math.max(...parsedDivs.filter(d => d.category === "Women's").map(d => d.score), 0);
  const maxOpenScore = Math.max(...parsedDivs.filter(d => d.category === "Open / Men's").map(d => d.score), 0);

  let isTopTier = false;
  if (category === "Women's") {
    isTopTier = score === maxWomenScore && score >= 4.0;
  } else if (category === "Open / Men's") {
    isTopTier = score === maxOpenScore && score >= 4.5;
  }

  const lowerName = divisionName.toLowerCase();
  const shouldSkip = lowerName.includes('results') || lowerName.includes('registration') || lowerName.includes('hat bracket') || lowerName.includes('individual') || lowerName.includes('squad') || lowerName.includes('just for');

  return {
    awardsGlassware: isTopTier && !isPointsOnly,
    category,
    isTopTier,
    shouldSkip
  };
}

// ---------------------------------------------------------------------------
// Phase 1: Enumerate all USAR-hosted tournament slugs via the `urls` collection
// ---------------------------------------------------------------------------

async function discoverUsarTournaments() {
  console.log('\n🔍 Phase 1: Scanning Fwango urls collection for USAR-hosted tournaments...');
  console.log('   (This may take a while — the urls collection is large)\n');

  const usarTournaments = []; // { slug, tournamentId }
  let pageToken = null;
  let totalScanned = 0;
  let pageCount = 0;

  do {
    let url = 'https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls?pageSize=300';
    if (pageToken) url += `&pageToken=${pageToken}`;

    let res;
    try {
      res = await fetchJson(url);
    } catch (err) {
      console.warn(`  ⚠️  Failed to fetch urls page ${pageCount + 1}: ${err.message}`);
      break;
    }

    if (res.error) {
      console.error('  ❌ Firestore error:', res.error.message);
      break;
    }

    pageCount++;
    const docs = res.documents || [];
    totalScanned += docs.length;

    // Collect tournament-type URL docs
    const tournamentDocs = docs.filter(d => d.fields?.type?.stringValue === 'tournament' && d.fields?.id?.stringValue);

    // Batch-check each tournament's hosts field to filter USAR ones
    const batchResults = await Promise.allSettled(
      tournamentDocs.map(async (urlDoc) => {
        const slug = urlDoc.name.split('/').pop();
        const tournamentId = urlDoc.fields.id.stringValue;

        // Apply year filter early if we can (skip if no date info yet)
        if (FROM_YEAR) {
          // We'll filter by date after fetching the tournament doc
        }

        try {
          const tourneyRaw = await fetchJson(
            `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${tournamentId}`
          );
          if (tourneyRaw.error) return null;

          const hostsFields = tourneyRaw.fields?.hosts?.mapValue?.fields || {};
          if (!hostsFields[USAR_ORG_ID]) return null;

          // Year filter
          const startDate = tourneyRaw.fields?.startDate?.stringValue || '';
          if (FROM_YEAR && startDate) {
            const year = new Date(startDate).getFullYear();
            if (year < FROM_YEAR) return null;
          }

          const name = tourneyRaw.fields?.name?.stringValue || slug;
          const startDateShort = startDate.slice(0, 10);
          return { slug, tournamentId, name, startDate: startDateShort };
        } catch (_) {
          return null;
        }
      })
    );

    const found = batchResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    usarTournaments.push(...found);

    if (found.length > 0) {
      console.log(`  📄 Page ${pageCount}: scanned ${docs.length} URLs, found ${found.length} USAR tournaments (${usarTournaments.length} total)`);
    } else {
      process.stdout.write(`  📄 Page ${pageCount}: ${totalScanned} scanned, ${usarTournaments.length} USAR found\r`);
    }

    pageToken = res.nextPageToken;
  } while (pageToken);

  console.log(`\n\n  ✅ Discovery complete. Scanned ${totalScanned} URLs across ${pageCount} pages.`);
  console.log(`  📊 Found ${usarTournaments.length} USAR-hosted tournaments.`);

  // Sort by date
  usarTournaments.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  return usarTournaments;
}

// ---------------------------------------------------------------------------
// Phase 2: Scrape each USAR tournament
// ---------------------------------------------------------------------------

async function scrapeTournament({ slug, tournamentId, name, startDate }) {
  try {
    // Fetch tournament metadata (already know it's USAR-hosted)
    const tourneyDocRaw = await fetchJson(
      `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${tournamentId}`
    );
    const tourney = parseFirestoreDoc(tourneyDocRaw);

    const cityName = tourney.location?.city?.longName || tourney.location?.address || 'N/A';
    const stateName = tourney.location?.area?.shortName || '';
    const country = tourney.location?.country?.shortName || 'USA';

    // Standings from reportEvents
    let standingsByDivision = {};
    try {
      const reportDocRaw = await fetchJson(
        `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/reportEvents/${tournamentId}`
      );
      if (reportDocRaw.fields) {
        const reportDoc = parseFirestoreDoc(reportDocRaw);
        standingsByDivision = reportDoc.divisions || {};
      }
    } catch (_) {
      // no published standings — skip silently
    }

    if (!Object.keys(standingsByDivision).length) {
      console.log(`  ⚠️  No published standings: ${name} (${startDate})`);
      return null;
    }

    // Teams & rosters
    let teamsMap = {};
    let nextPageToken = null;
    do {
      let teamsUrl = `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${tournamentId}/tournamentTeams?pageSize=300`;
      if (nextPageToken) teamsUrl += `&pageToken=${nextPageToken}`;
      const teamsRes = await fetchJson(teamsUrl);
      for (const doc of (teamsRes.documents || [])) {
        const teamData = parseFirestoreDoc(doc);
        teamsMap[teamData._id] = teamData;
      }
      nextPageToken = teamsRes.nextPageToken;
    } while (nextPageToken);

    const divisionsConfig = tourney.divisions || tourney.divisionSettings || {};
    const allDivNames = Object.keys(standingsByDivision).map(k =>
      divisionsConfig[k]?.name || divisionsConfig[k]?.divisionName || k
    );

    const tournamentRecord = {
      id: tournamentId,
      slug,
      name: tourney.name,
      startDate: tourney.startDate,
      endDate: tourney.endDate,
      city: cityName,
      state: stateName,
      country,
      divisions: [],
    };

    for (const [divKey, divStandings] of Object.entries(standingsByDivision)) {
      const standingsList = divStandings.standings || [];
      if (!standingsList.length) continue;

      const divMeta = divisionsConfig[divKey] || {};
      const divisionName = divMeta.name || divMeta.divisionName || divKey;
      const { awardsGlassware, category, shouldSkip } = classifyDivisionAwards(divisionName, allDivNames);
      if (shouldSkip) continue;

      const podium = standingsList.slice(0, 4).map(item => {
        const rank = item.rank;
        const teamObj = teamsMap[item.tournamentTeamID] || {};
        const teamDetails = teamObj.team || {};
        const teamName = teamDetails.name || teamDetails.shortName || 'Unknown Team';

        let rawPlayers = [];
        if (Array.isArray(teamDetails.players)) {
          rawPlayers = teamDetails.players;
        } else if (teamDetails.players && typeof teamDetails.players === 'object') {
          rawPlayers = Object.values(teamDetails.players);
        }

        const players = rawPlayers.map(p => ({
          id: p.id || p.uid || p.fuid,
          name: p.displayName || p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Player',
        }));

        let awardType = '4th Place (No Award)';
        let glasswareType = null;
        let isGlassware = false;
        let isMedal = false;

        if (awardsGlassware) {
          isGlassware = rank <= 3;
          if (rank === 1) { glasswareType = 'Pitcher'; awardType = '🍺 Pitcher (1st Place Glassware)'; }
          else if (rank === 2) { glasswareType = 'Tankard / Cup'; awardType = '🍻 Tankard (2nd Place Glassware)'; }
          else if (rank === 3) { glasswareType = 'Shot Glass / Horn'; awardType = '🥃 Shot Glass (3rd Place Glassware)'; }
        } else {
          isMedal = rank <= 3;
          if (rank === 1) awardType = '🥇 Gold Medal';
          else if (rank === 2) awardType = '🥈 Silver Medal';
          else if (rank === 3) awardType = '🥉 Bronze Medal';
        }

        return {
          rank,
          teamName,
          players,
          awardType,
          awardsGlassware: isGlassware,
          glasswareType: isGlassware ? glasswareType : null,
          awardsMedal: isMedal,
        };
      });

      tournamentRecord.divisions.push({ divisionId: divKey, divisionName, category, awardsGlassware, podium });
    }

    return tournamentRecord;
  } catch (err) {
    console.error(`    ❌ Error scraping ${slug}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function getYear(tourney) {
  if (tourney.startDate) return new Date(tourney.startDate).getFullYear();
  const m = tourney.slug?.match(/(\d{2})$/);
  if (m) return 2000 + parseInt(m[1], 10);
  return 0;
}

function buildCsvRows(tournaments) {
  const rows = ['Tournament,Year,Date,Location,Division,DivisionTier,Place,Award,GlasswareType,Team,Player1,Player2'];
  for (const tourney of tournaments) {
    const year = getYear(tourney);
    for (const div of tourney.divisions) {
      for (const p of div.podium) {
        const p1 = p.players[0]?.name || '';
        const p2 = p.players[1]?.name || '';
        const loc = [tourney.city, tourney.state, tourney.country].filter(Boolean).join(', ');
        rows.push(
          `"${tourney.name}","${year}","${tourney.startDate?.slice(0, 10) || ''}","${loc}","${div.divisionName}","${div.awardsGlassware ? 'Top Tier (Glassware)' : 'Lower Division (Medals)'}",${p.rank},"${p.awardType}","${p.glasswareType || 'None'}","${p.teamName}","${p1}","${p2}"`
        );
      }
    }
  }
  return rows.join('\n');
}

function writeOutputs(allTournaments, dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });

  const byYear = {};
  for (const t of allTournaments) {
    const yr = getYear(t);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(t);
  }

  for (const [year, tournaments] of Object.entries(byYear).sort()) {
    const jsonPath = path.join(dataDir, `usar-tournaments-${year}.json`);
    const csvPath = path.join(dataDir, `usar-placements-${year}.csv`);
    fs.writeFileSync(jsonPath, JSON.stringify(tournaments, null, 2), 'utf8');
    fs.writeFileSync(csvPath, buildCsvRows(tournaments), 'utf8');
    console.log(`  💾 ${year}: ${tournaments.length} tournaments → ${path.basename(jsonPath)}, ${path.basename(csvPath)}`);
  }

  const allJsonPath = path.join(dataDir, 'usar-tournaments-all.json');
  const allCsvPath = path.join(dataDir, 'usar-placements-all.csv');
  fs.writeFileSync(allJsonPath, JSON.stringify(allTournaments, null, 2), 'utf8');
  fs.writeFileSync(allCsvPath, buildCsvRows(allTournaments), 'utf8');
  console.log(`\n  📦 Merged → ${path.basename(allJsonPath)}, ${path.basename(allCsvPath)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('🏐 USAR Historical Tournament Scraper');
  console.log(`   USAR Org ID: ${USAR_ORG_ID}`);
  if (DRY_RUN) console.log('   [DRY RUN — discovery only, no scraping]');
  if (FROM_YEAR) console.log(`   [FROM: ${FROM_YEAR} onwards]`);
  console.log('='.repeat(60));

  // Phase 1: Discover all USAR-hosted tournaments
  const usarTourneys = await discoverUsarTournaments();

  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 USAR tournaments found:');
  console.log('='.repeat(60));
  for (const t of usarTourneys) {
    console.log(`  • ${t.startDate || 'unknown date'} | ${t.slug} | ${t.name}`);
  }

  // Save the slug list for reference
  const slugListPath = path.join(__dirname, '../data/usar-slugs-discovered.json');
  fs.mkdirSync(path.dirname(slugListPath), { recursive: true });
  fs.writeFileSync(slugListPath, JSON.stringify(usarTourneys, null, 2), 'utf8');
  console.log(`\n  📝 Slug list saved → data/usar-slugs-discovered.json`);

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Re-run without --dry-run to scrape.');
    return;
  }

  // Phase 2: Scrape all discovered tournaments
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 Phase 2: Scraping all USAR tournaments...');
  console.log('='.repeat(60));

  const allTournaments = [];
  let successCount = 0;
  let failCount = 0;
  let noResultsCount = 0;

  for (let i = 0; i < usarTourneys.length; i++) {
    const t = usarTourneys[i];
    process.stdout.write(`\n[${i + 1}/${usarTourneys.length}] ${t.name} (${t.startDate})`);
    const data = await scrapeTournament(t);
    if (data && data.divisions.length > 0) {
      allTournaments.push(data);
      successCount++;
      console.log(` ✅ ${data.divisions.length} division(s)`);
    } else if (data) {
      noResultsCount++;
      console.log(' ⚠️  No division data');
    } else {
      failCount++;
    }
  }

  allTournaments.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  console.log(`\n${'='.repeat(60)}`);
  console.log('💾 Writing output files...');
  console.log('='.repeat(60));
  writeOutputs(allTournaments, path.join(__dirname, '../data'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`   Scraped with results: ${successCount}`);
  console.log(`   No published standings: ${noResultsCount}`);
  console.log(`   Errors: ${failCount}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
