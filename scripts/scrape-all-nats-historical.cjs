/**
 * Fwango Historical Nats Bulk Scraper (2016–2025)
 *
 * Phase 1 — Slug Discovery:
 *   1. Paginates through Fwango's Firestore `urls` collection to find all `nats*{YY}` slugs.
 *   2. Falls back to pattern-probing known cities × year combos for any gaps.
 *
 * Phase 2 — Bulk Scrape:
 *   Runs each discovered slug through the same scrapeTournament logic, writing:
 *     data/nats-tournaments-{year}.json
 *     data/nats-placements-{year}.csv
 *   Plus merged all-years files:
 *     data/nats-tournaments-all.json
 *     data/nats-placements-all.csv
 *
 * Usage:
 *   node scripts/scrape-all-nats-historical.cjs              # full run
 *   node scripts/scrape-all-nats-historical.cjs --dry-run    # discover slugs only, no scraping
 *   node scripts/scrape-all-nats-historical.cjs --year 22    # scrape a specific 2-digit year only
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
const YEAR_FILTER = (() => {
  const idx = args.indexOf('--year');
  return idx !== -1 ? args[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// Firestore helpers
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
// Award classification (mirrors scrape-all-nats.cjs)
// ---------------------------------------------------------------------------

function classifyDivisionAwards(divisionName, allDivisionsInTourney) {
  const divLower = divisionName.toLowerCase();
  const isPointsOnly = divLower.includes('points') || divLower.includes('ladder');
  const isWomen = divLower.includes('women');
  const isOpen = !isWomen && (divLower.includes('open') || divLower.includes('men') || divLower.includes('pro') || divLower.includes('premier'));

  let isTopTier = false;
  if (isWomen) {
    const hasHigherWomenDiv = allDivisionsInTourney.some(d => {
      const name = d.toLowerCase();
      return name.includes('women') && (name.includes('5.0') || name.includes('5.5') || name.includes('pro') || name.includes('premier') || name.includes('gold'));
    });
    if (divLower.includes('5.5') || divLower.includes('5.0') || divLower.includes('pro') || divLower.includes('premier') || divLower.includes('gold')) {
      isTopTier = true;
    } else if (!hasHigherWomenDiv && (divLower.includes('4.5') || divLower.includes('advanced'))) {
      isTopTier = true;
    }
  } else if (isOpen) {
    if (divLower.includes('5.5') || divLower.includes('gold+') || divLower.includes('pro')) {
      isTopTier = true;
    } else {
      const has55 = allDivisionsInTourney.some(d => d.toLowerCase().includes('5.5') || d.toLowerCase().includes('gold+'));
      if (!has55 && (divLower.includes('5.0') || divLower.includes('premier'))) {
        isTopTier = true;
      }
    }
  }

  return {
    awardsGlassware: isTopTier && !isPointsOnly,
    category: isWomen ? "Women's" : (isOpen ? "Open / Men's" : 'Mixed / Other'),
    isTopTier,
  };
}

// ---------------------------------------------------------------------------
// Core tournament scraper
// ---------------------------------------------------------------------------

async function scrapeTournament(slugOrUrl) {
  const slug = slugOrUrl.replace(/^https?:\/\/fwango\.io\//, '').replace(/\/.*$/, '').trim();

  try {
    // 1. Resolve slug → Tournament ID
    const urlDocRaw = await fetchJson(
      `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls/${slug}`
    );
    if (!urlDocRaw.fields || !urlDocRaw.fields.id) {
      return null; // slug doesn't exist
    }
    const urlDoc = parseFirestoreDoc(urlDocRaw);
    const tournamentId = urlDoc.id;

    // 2. Tournament metadata
    const tourneyDocRaw = await fetchJson(
      `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${tournamentId}`
    );
    const tourney = parseFirestoreDoc(tourneyDocRaw);

    const cityName = tourney.location?.city?.longName || tourney.location?.address || 'N/A';
    const stateName = tourney.location?.area?.shortName || '';
    console.log(`  📍 ${tourney.name} | ${tourney.startDate?.slice(0, 10)} | ${cityName}${stateName ? ', ' + stateName : ''}`);

    // 3. Standings from reportEvents
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
      // no published standings
    }

    // 4. Teams & rosters
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
      divisions: [],
    };

    for (const [divKey, divStandings] of Object.entries(standingsByDivision)) {
      const standingsList = divStandings.standings || [];
      if (!standingsList.length) continue;

      const divMeta = divisionsConfig[divKey] || {};
      const divisionName = divMeta.name || divMeta.divisionName || divKey;
      const { awardsGlassware, category } = classifyDivisionAwards(divisionName, allDivNames);

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

        let awardType = 'None';
        let glasswareType = 'None';
        let isGlassware = false;
        let isMedal = false;

        if (awardsGlassware) {
          isGlassware = rank <= 3;
          if (rank === 1) { glasswareType = 'Pitcher'; awardType = '🍺 Pitcher (1st Place Glassware)'; }
          else if (rank === 2) { glasswareType = 'Tankard / Cup'; awardType = '🍻 Tankard (2nd Place Glassware)'; }
          else if (rank === 3) { glasswareType = 'Shot Glass / Horn'; awardType = '🥃 Shot Glass (3rd Place Glassware)'; }
          else { awardType = '4th Place (No Award)'; }
        } else {
          isMedal = rank <= 3;
          if (rank === 1) awardType = '🥇 Gold Medal';
          else if (rank === 2) awardType = '🥈 Silver Medal';
          else if (rank === 3) awardType = '🥉 Bronze Medal';
          else awardType = '4th Place (No Award)';
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
    if (err.message && err.message.includes('404')) return null; // slug not found
    console.error(`    ❌ Error scraping ${slug}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 1a: Slug discovery via Firestore collection listing
// ---------------------------------------------------------------------------

// Matches nats<anything><2-digit-year> where year is 16–25
const NATS_SLUG_RE = /^nats.+(1[6-9]|2[0-5])$/;
// Also accept slugs like nats2019, nats-seattle-2019 etc.
const NATS_SLUG_RE_LONG = /^nats.+(201[6-9]|202[0-5])$/;

async function discoverSlugsFromFirestore() {
  console.log('\n🔍 Phase 1a: Scanning Fwango urls collection for historical nats slugs...');
  const found = [];
  let pageToken = null;
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

    pageCount++;
    const docs = res.documents || [];
    for (const doc of docs) {
      const slug = doc.name.split('/').pop();
      if (NATS_SLUG_RE.test(slug) || NATS_SLUG_RE_LONG.test(slug)) {
        found.push(slug);
      }
    }

    pageToken = res.nextPageToken;
    if (docs.length > 0) process.stdout.write(`  📄 Page ${pageCount}: ${docs.length} docs scanned, ${found.length} nats slugs so far\r`);
  } while (pageToken);

  console.log(`\n  ✅ Collection scan complete. Found ${found.length} historical nats slugs across ${pageCount} pages.`);
  return found;
}

// ---------------------------------------------------------------------------
// Phase 1b: Pattern-probing fallback
// ---------------------------------------------------------------------------

// Known Nats host cities (extend as needed)
const NATS_CITIES = [
  'seattle', 'losangeles', 'atlanta', 'dallas', 'montreal', 'toronto',
  'boston', 'vancouver', 'columbus', 'newyorkcity', 'chicago', 'denver',
  'austin', 'minneapolis', 'portland', 'charlotte', 'nashville',
  'philadelphia', 'sandiego', 'miami', 'kansascity', 'stlouis',
  'pittsburgh', 'cincinnati', 'cleveland', 'detroit', 'milwaukee',
  'memphis', 'orlando', 'tampa', 'raleigh', 'richmond', 'baltimore',
  'washingtondc', 'dc', 'nyc', 'la', 'sf', 'sanfrancisco',
];

const PROBE_YEARS = ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25'];

async function probeSlugs(knownSlugs) {
  console.log('\n🔍 Phase 1b: Pattern-probing known city × year combos for any gaps...');
  const knownSet = new Set(knownSlugs);
  const additional = [];

  // Build candidate list
  const candidates = [];
  for (const year of PROBE_YEARS) {
    if (YEAR_FILTER && year !== YEAR_FILTER) continue;
    for (const city of NATS_CITIES) {
      const slug = `nats${city}${year}`;
      if (!knownSet.has(slug)) {
        candidates.push(slug);
      }
    }
  }

  console.log(`  🧪 Testing ${candidates.length} candidate slugs...`);
  let tested = 0;
  for (const slug of candidates) {
    try {
      const res = await fetchJson(
        `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls/${slug}`
      );
      if (res.fields && res.fields.id) {
        console.log(`  ✅ Found via probe: ${slug}`);
        additional.push(slug);
      }
    } catch (_) {
      // not found, skip
    }
    tested++;
    if (tested % 20 === 0) process.stdout.write(`  🔎 Probed ${tested}/${candidates.length}...\r`);
  }

  console.log(`\n  ✅ Pattern probe complete. Found ${additional.length} additional slugs.`);
  return additional;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function buildCsvRows(tournaments) {
  const rows = ['Tournament,Year,Date,Location,Division,DivisionTier,Place,Award,GlasswareType,Team,Player1,Player2'];
  for (const tourney of tournaments) {
    const year = tourney.startDate ? new Date(tourney.startDate).getFullYear() : 'Unknown';
    for (const div of tourney.divisions) {
      for (const p of div.podium) {
        const p1 = p.players[0]?.name || '';
        const p2 = p.players[1]?.name || '';
        rows.push(
          `"${tourney.name}","${year}","${tourney.startDate?.slice(0, 10) || ''}","${tourney.city}, ${tourney.state}","${div.divisionName}","${div.awardsGlassware ? 'Top Tier (Glassware)' : 'Lower Division (Medals)'}",${p.rank},"${p.awardType}","${p.glasswareType || 'None'}","${p.teamName}","${p1}","${p2}"`
        );
      }
    }
  }
  return rows.join('\n');
}

function getYear(tourney) {
  if (tourney.startDate) return new Date(tourney.startDate).getFullYear();
  // Try to extract year from slug (e.g. natsseattle22 → 2022)
  const m = tourney.slug.match(/(\d{2})$/);
  if (m) return 2000 + parseInt(m[1], 10);
  return 0;
}

function writeOutputs(allTournaments, dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });

  // Group by year
  const byYear = {};
  for (const t of allTournaments) {
    const yr = getYear(t);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(t);
  }

  // Per-year files
  for (const [year, tournaments] of Object.entries(byYear)) {
    const jsonPath = path.join(dataDir, `nats-tournaments-${year}.json`);
    const csvPath = path.join(dataDir, `nats-placements-${year}.csv`);
    fs.writeFileSync(jsonPath, JSON.stringify(tournaments, null, 2), 'utf8');
    fs.writeFileSync(csvPath, buildCsvRows(tournaments), 'utf8');
    console.log(`  💾 ${year}: ${tournaments.length} tournaments → ${path.basename(jsonPath)}, ${path.basename(csvPath)}`);
  }

  // All-years merged files
  const allJsonPath = path.join(dataDir, 'nats-tournaments-all.json');
  const allCsvPath = path.join(dataDir, 'nats-placements-all.csv');
  fs.writeFileSync(allJsonPath, JSON.stringify(allTournaments, null, 2), 'utf8');
  fs.writeFileSync(allCsvPath, buildCsvRows(allTournaments), 'utf8');
  console.log(`\n  📦 All years merged → ${path.basename(allJsonPath)}, ${path.basename(allCsvPath)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('🏐 Fwango Historical Nats Scraper (2016–2025)');
  if (DRY_RUN) console.log('   [DRY RUN — slug discovery only, no scraping]');
  if (YEAR_FILTER) console.log(`   [YEAR FILTER — only year: 20${YEAR_FILTER}]`);
  console.log('='.repeat(60));

  // Phase 1a: Collection listing
  const collectionSlugs = await discoverSlugsFromFirestore();

  // Phase 1b: Pattern probing for gaps
  const probedSlugs = await probeSlugs(collectionSlugs);

  // Merge & deduplicate, apply year filter
  let allSlugs = [...new Set([...collectionSlugs, ...probedSlugs])].sort();
  if (YEAR_FILTER) {
    allSlugs = allSlugs.filter(s => s.endsWith(YEAR_FILTER));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Total unique historical nats slugs found: ${allSlugs.length}`);
  console.log('='.repeat(60));
  for (const slug of allSlugs) {
    console.log(`  • ${slug}`);
  }

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Re-run without --dry-run to scrape all tournaments.');
    return;
  }

  // Phase 2: Scrape all
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 Phase 2: Scraping all discovered tournaments...');
  console.log('='.repeat(60));

  const allTournaments = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allSlugs.length; i++) {
    const slug = allSlugs[i];
    console.log(`\n[${i + 1}/${allSlugs.length}] ${slug}`);
    const data = await scrapeTournament(slug);
    if (data) {
      allTournaments.push(data);
      successCount++;
    } else {
      console.log(`  ⚠️  No data returned for ${slug}`);
      failCount++;
    }
  }

  // Sort by date
  allTournaments.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  // Write outputs
  console.log(`\n${'='.repeat(60)}`);
  console.log('💾 Writing output files...');
  console.log('='.repeat(60));
  const dataDir = path.join(__dirname, '../data');
  writeOutputs(allTournaments, dataDir);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done! Scraped ${successCount} tournaments (${failCount} failed/missing).`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
