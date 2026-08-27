/**
 * Retroactive Glassware Award Backfill Script
 * 
 * Applies rules from data/glassware-rules.json to nats-tournaments-*.json and usar-tournaments-*.json,
 * regenerates the CSV placement files, and updates Supabase database records in-place.
 * 
 * Usage:
 *   node scripts/backfill-glassware.cjs             # Run backfill and update DB
 *   node scripts/backfill-glassware.cjs --dry-run   # Preview changes without modifying files or DB
 *   node scripts/backfill-glassware.cjs --skip-db   # Update local JSON/CSV files only, skip DB sync
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase Configuration (from sync scripts)
const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_DB = args.includes('--skip-db');

// ---------------------------------------------------------------------------
// HTTP Helpers for Supabase
// ---------------------------------------------------------------------------

function supabaseRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function supabaseFetchAll(endpoint) {
  let allRecords = [];
  const limit = 1000;
  let offset = 0;
  let hasMore = true;
  const separator = endpoint.includes('?') ? '&' : '?';

  while (hasMore) {
    const paginatedEndpoint = `${endpoint}${separator}limit=${limit}&offset=${offset}`;
    const page = await supabaseRequest(paginatedEndpoint);
    if (page && Array.isArray(page)) {
      allRecords.push(...page);
      if (page.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    } else {
      hasMore = false;
    }
  }
  return allRecords;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTournamentCircuit(slug, name) {
  const sLower = (slug || '').toLowerCase();
  const nLower = (name || '').toLowerCase();
  
  if (sLower.startsWith('ers') || nLower.includes('east roundnet series')) return 'ERS';
  if (sLower.startsWith('tasr') || nLower.includes('texas')) return 'TASR';
  if (sLower.startsWith('casr') || nLower.includes('california') || sLower.includes('casr')) return 'CASR';
  if (sLower.startsWith('mrs') || nLower.includes('midwest')) return 'MRS';
  if (sLower.startsWith('pra') || nLower.includes('players roundnet association') || nLower.includes('pra ')) return 'PRA';
  if (sLower.startsWith('ilr') || nLower.includes('illinois')) return 'ILR';
  if (sLower.startsWith('gwr') || nLower.includes('greater washington')) return 'GWR';
  if (sLower.startsWith('nats') || nLower.includes('north american tour series')) return 'NATS';
  if (nLower.includes('usar') || nLower.includes('usa roundnet') || nLower.includes('u.s. roundnet')) return 'USAR';
  
  if (sLower.includes('usar') || sLower.includes('usa-')) return 'USAR';
  return 'USAR'; // fallback
}

function getYear(tourney) {
  if (tourney.startDate) return new Date(tourney.startDate).getFullYear();
  const m = tourney.slug?.match(/(\d{2})$/);
  if (m) return 2000 + parseInt(m[1], 10);
  return 0;
}

function getTournamentTier(name) {
  const lower = name.toLowerCase();
  if (lower.includes('national') || lower.includes('usar nationals')) {
    return 'National';
  }
  if (lower.includes('regional')) {
    return 'Regional';
  }
  if (lower.includes('sectional')) {
    return 'Sectional';
  }
  return 'Major';
}

function shouldAwardGlassware(circuit, year, divisionName, rules, tournamentName) {
  const nameLower = (divisionName || '').toLowerCase();
  
  // 1. Specific rule override (matches keyword)
  const specificRule = rules.find(
    r => r.circuit === circuit &&
         year >= r.startYear &&
         year <= r.endYear &&
         r.divisionKeyword &&
         nameLower.includes(r.divisionKeyword.toLowerCase())
  );
  if (specificRule) {
    return specificRule.awardsGlassware;
  }

  // 2. General circuit-year rule
  const generalRule = rules.find(
    r => r.circuit === circuit &&
         year >= r.startYear &&
         year <= r.endYear &&
         !r.divisionKeyword
  );
  if (generalRule) {
    if (generalRule.awardsGlassware && circuit === 'USAR' && tournamentName) {
      const tier = getTournamentTier(tournamentName);
      if (tier !== 'Major' && tier !== 'Sectional') {
        return false;
      }
    }
    return generalRule.awardsGlassware;
  }

  // 3. Fallback to circuit default (NATS and USAR award glassware by default, others don't)
  let fallbackValue = (circuit === 'NATS' || circuit === 'USAR');
  if (fallbackValue && circuit === 'USAR' && tournamentName) {
    const tier = getTournamentTier(tournamentName);
    if (tier !== 'Major' && tier !== 'Sectional') {
      fallbackValue = false;
    }
  }
  return fallbackValue;
}

function buildCsvRows(tournaments, circuit) {
  const rows = ['Tournament,Year,Date,Location,Division,DivisionTier,Place,Award,GlasswareType,Team,Player1,Player2'];
  for (const tourney of tournaments) {
    const year = getYear(tourney);
    for (const div of tourney.divisions) {
      for (const p of div.podium) {
        const p1 = p.players[0]?.name || '';
        const p2 = p.players[1]?.name || '';
        let loc;
        if (circuit === 'NATS') {
          loc = `${tourney.city}, ${tourney.state}`;
        } else {
          loc = [tourney.city, tourney.state, tourney.country].filter(Boolean).join(', ');
        }
        rows.push(
          `"${tourney.name}","${year}","${tourney.startDate?.slice(0, 10) || ''}","${loc}","${div.divisionName}","${div.awardsGlassware ? 'Top Tier (Glassware)' : 'Lower Division (Medals)'}",${p.rank},"${p.awardType}","${p.glasswareType || 'None'}","${p.teamName}","${p1}","${p2}"`
        );
      }
    }
  }
  return rows.join('\n');
}

// Helper to chunk an array for controlled concurrency
async function runWithConcurrency(items, fn, limit = 5) {
  const results = [];
  const executing = new Set();
  
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);
    
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// ---------------------------------------------------------------------------
// Main Logic
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('🔄 Retroactive Glassware Award Backfill');
  if (DRY_RUN) console.log('   [DRY RUN — No files or database updates will be written]');
  if (SKIP_DB) console.log('   [SKIP DATABASE SYNC — Local files only]');
  console.log('='.repeat(60));

  const dataDir = path.join(__dirname, '../data');
  const rulesPath = path.join(dataDir, 'glassware-rules.json');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  console.log(`Loaded ${rules.length} rules from data/glassware-rules.json`);

  // Scan for per-year JSON tournament files
  const files = fs.readdirSync(dataDir);
  const usarFileRe = /^usar-tournaments-(\d{4})\.json$/;
  const natsFileRe = /^nats-tournaments-(\d{4})\.json$/;

  const usarYearFiles = [];
  const natsYearFiles = [];

  for (const file of files) {
    if (usarFileRe.test(file)) usarYearFiles.push(file);
    if (natsFileRe.test(file)) natsYearFiles.push(file);
  }

  console.log(`\nFound USAR per-year files: ${usarYearFiles.join(', ')}`);
  console.log(`Found NATS per-year files: ${natsYearFiles.join(', ')}`);

  const allUpdatedUsar = [];
  const allUpdatedNats = [];

  // Summary counts of changes
  let totalDivisionsChecked = 0;
  let totalDivisionsModified = 0;
  let totalPlacementsModified = 0;

  // Process all files
  const processGroup = async (filesList, circuitName, collector) => {
    for (const file of filesList) {
      const filePath = path.join(dataDir, file);
      const tournaments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`\n📄 Processing ${file} (${tournaments.length} tournaments)...`);
      let fileModified = false;

      for (const tourney of tournaments) {
        const circuit = getTournamentCircuit(tourney.slug, tourney.name);
        const year = getYear(tourney);

        for (const div of tourney.divisions) {
          totalDivisionsChecked++;
          const awardsGlassware = shouldAwardGlassware(circuit, year, div.divisionName, rules, tourney.name);

          if (div.awardsGlassware !== awardsGlassware) {
            console.log(`   💡 Rule change: [${circuit} ${year}] Division "${div.divisionName}" (Fwango slug: ${tourney.slug})`);
            console.log(`      awardsGlassware: ${div.awardsGlassware} ➔ ${awardsGlassware}`);
            div.awardsGlassware = awardsGlassware;
            fileModified = true;
            totalDivisionsModified++;
          }

          // Evaluate placements on the podium
          for (const p of div.podium) {
            const rank = p.rank;
            let isGlassware = false;
            let isMedal = false;
            let glasswareType = null;
            let awardType = `${rank}th Place (No Award)`;

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

            // Check if values differ from what is currently in JSON
            const expectedGlasswareType = isGlassware ? glasswareType : null;
            if (
              p.awardsGlassware !== isGlassware ||
              p.glasswareType !== expectedGlasswareType ||
              p.awardsMedal !== isMedal ||
              p.awardType !== awardType
            ) {
              p.awardsGlassware = isGlassware;
              p.glasswareType = expectedGlasswareType;
              p.awardsMedal = isMedal;
              p.awardType = awardType;
              fileModified = true;
              totalPlacementsModified++;
            }
          }
        }
        collector.push(tourney);
      }

      if (fileModified) {
        if (!DRY_RUN) {
          fs.writeFileSync(filePath, JSON.stringify(tournaments, null, 2), 'utf8');
          const csvFile = file.replace('tournaments', 'placements').replace('.json', '.csv');
          fs.writeFileSync(path.join(dataDir, csvFile), buildCsvRows(tournaments, circuitName), 'utf8');
          console.log(`   💾 Updated local JSON and CSV for ${file}`);
        } else {
          console.log(`   🔍 Dry run: would update local JSON and CSV for ${file}`);
        }
      } else {
        console.log(`   ✅ No local changes needed for ${file}`);
      }
    }
  };

  await processGroup(usarYearFiles, 'USAR', allUpdatedUsar);
  await processGroup(natsYearFiles, 'NATS', allUpdatedNats);

  // Sorting merged collections by date chronologically
  allUpdatedUsar.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  allUpdatedNats.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  // Write merged files
  if (!DRY_RUN) {
    fs.writeFileSync(path.join(dataDir, 'usar-tournaments-all.json'), JSON.stringify(allUpdatedUsar, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'usar-placements-all.csv'), buildCsvRows(allUpdatedUsar, 'USAR'), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'nats-tournaments-all.json'), JSON.stringify(allUpdatedNats, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'nats-placements-all.csv'), buildCsvRows(allUpdatedNats, 'NATS'), 'utf8');
    console.log('\n📦 Merged all-years JSON and CSV files regenerated successfully.');
  } else {
    console.log('\n🔍 Dry run: would regenerate merged all-years JSON and CSV files.');
  }

  console.log('\n' + '-'.repeat(40));
  console.log(`Local Processing Summary:`);
  console.log(`- Divisions checked: ${totalDivisionsChecked}`);
  console.log(`- Divisions modified: ${totalDivisionsModified}`);
  console.log(`- Placements modified: ${totalPlacementsModified}`);
  console.log('-'.repeat(40));

  // ---------------------------------------------------------------------------
  // Supabase Database Sync Phase
  // ---------------------------------------------------------------------------
  if (SKIP_DB) {
    console.log('\n⏭️ Database sync skipped as requested by --skip-db.');
    console.log('\n✅ Local backfill process complete.');
    return;
  }

  console.log('\n🌐 Starting Supabase database sync phase...');
  
  // 1. Fetch current database snapshot using pagination
  console.log('   Fetching tournaments...');
  const dbTournaments = await supabaseFetchAll('tournaments?select=id,name,notes,Circuit');
  console.log(`   Fetched ${dbTournaments.length} tournaments.`);

  console.log('   Fetching divisions...');
  const dbDivisions = await supabaseFetchAll('tournament_divisions?select=id,tournament_id,division_name,awards_glassware');
  console.log(`   Fetched ${dbDivisions.length} divisions.`);

  console.log('   Fetching placements...');
  const dbPlacements = await supabaseFetchAll('placements?select=id,division_id,place,team_name,glassware_awarded,glassware_type,trophy_awarded,notes');
  console.log(`   Fetched ${dbPlacements.length} placements.`);

  // 2. Build maps for fast lookups
  // Map: Fwango Slug -> DB Tournament Record
  const dbTourneyMap = new Map();
  for (const t of dbTournaments) {
    const slugMatch = t.notes?.match(/Fwango Slug:\s*(.+)$/);
    if (slugMatch) {
      dbTourneyMap.set(slugMatch[1].trim(), t);
    }
  }

  // Map: (tournament_id + division_name) -> DB Division Record
  const dbDivMap = new Map();
  for (const d of dbDivisions) {
    dbDivMap.set(`${d.tournament_id}_${d.division_name.trim().toLowerCase()}`, d);
  }

  // Map: (division_id + place + team_name) -> DB Placement Record
  const dbPlacementMap = new Map();
  for (const p of dbPlacements) {
    dbPlacementMap.set(`${p.division_id}_${p.place}_${(p.team_name || '').trim().toLowerCase()}`, p);
  }

  // 3. Compare and compute updates
  const divisionUpdates = [];
  const placementUpdates = [];

  const allLocalTournaments = [...allUpdatedUsar, ...allUpdatedNats];

  for (const localTourney of allLocalTournaments) {
    const slug = localTourney.slug;
    const dbTourney = dbTourneyMap.get(slug);

    if (!dbTourney) {
      console.warn(`   ⚠️ Tournament slug not found in Supabase: "${slug}"`);
      continue;
    }

    for (const localDiv of localTourney.divisions) {
      const divKey = `${dbTourney.id}_${localDiv.divisionName.trim().toLowerCase()}`;
      const dbDiv = dbDivMap.get(divKey);

      if (!dbDiv) {
        console.warn(`   ⚠️ Division not found in Supabase: "${localDiv.divisionName}" (Tournament: ${slug})`);
        continue;
      }

      // Check if division rules changed
      if (dbDiv.awards_glassware !== localDiv.awardsGlassware) {
        divisionUpdates.push({
          id: dbDiv.id,
          awards_glassware: localDiv.awardsGlassware
        });
      }

      // Check placements
      for (const localP of localDiv.podium) {
        const placeKey = `${dbDiv.id}_${localP.rank}_${(localP.teamName || '').trim().toLowerCase()}`;
        const dbP = dbPlacementMap.get(placeKey);

        if (!dbP) {
          console.warn(`   ⚠️ Placement rank ${localP.rank} not found in Supabase: "${localDiv.divisionName}" (Tournament: ${slug})`);
          continue;
        }

        // Expected values in DB
        const targetGlasswareAwarded = localP.awardsGlassware;
        const targetGlasswareType = localP.awardsGlassware ? localP.glasswareType : 'None';
        const targetTrophyAwarded = localP.rank === 1 && localDiv.awardsGlassware;
        const targetNotes = localP.awardType;

        if (
          dbP.glassware_awarded !== targetGlasswareAwarded ||
          dbP.glassware_type !== targetGlasswareType ||
          dbP.trophy_awarded !== targetTrophyAwarded ||
          dbP.notes !== targetNotes
        ) {
          placementUpdates.push({
            id: dbP.id,
            glassware_awarded: targetGlasswareAwarded,
            glassware_type: targetGlasswareType,
            trophy_awarded: targetTrophyAwarded,
            notes: targetNotes
          });
        }
      }
    }
  }

  console.log('\n' + '-'.repeat(40));
  console.log(`Database Comparison Summary:`);
  console.log(`- Divisions requiring update: ${divisionUpdates.length}`);
  console.log(`- Placements requiring update: ${placementUpdates.length}`);
  console.log('-'.repeat(40));

  if (DRY_RUN) {
    console.log('\n🔍 Dry run: database updates will not be applied.');
    console.log('✅ Backfill process completed (dry run).');
    return;
  }

  // 4. Apply database updates
  if (divisionUpdates.length === 0 && placementUpdates.length === 0) {
    console.log('\n✅ Database is already up to date. No updates needed.');
    return;
  }

  console.log(`\n🚀 Executing Supabase updates in-place...`);

  // Update divisions
  if (divisionUpdates.length > 0) {
    console.log(`\n🛠️ Updating ${divisionUpdates.length} division records...`);
    let count = 0;
    await runWithConcurrency(divisionUpdates, async (update) => {
      try {
        await supabaseRequest(`tournament_divisions?id=eq.${update.id}`, 'PATCH', {
          awards_glassware: update.awards_glassware
        });
        count++;
        process.stdout.write(`   Progress: ${count}/${divisionUpdates.length}\r`);
      } catch (err) {
        console.error(`\n   ❌ Failed to update division ID ${update.id}:`, err.message);
      }
    }, 5);
    console.log(`\n   ✅ Divisions updated successfully.`);
  }

  // Update placements
  if (placementUpdates.length > 0) {
    console.log(`\n🛠️ Updating ${placementUpdates.length} placement records...`);
    let count = 0;
    await runWithConcurrency(placementUpdates, async (update) => {
      try {
        await supabaseRequest(`placements?id=eq.${update.id}`, 'PATCH', {
          glassware_awarded: update.glassware_awarded,
          glassware_type: update.glassware_type,
          trophy_awarded: update.trophy_awarded,
          notes: update.notes
        });
        count++;
        process.stdout.write(`   Progress: ${count}/${placementUpdates.length}\r`);
      } catch (err) {
        console.error(`\n   ❌ Failed to update placement ID ${update.id}:`, err.message);
      }
    }, 5);
    console.log(`\n   ✅ Placements updated successfully.`);
  }

  console.log('\n🎉 BACKFILL COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('\n💥 Fatal backfill execution failure:', err);
  process.exit(1);
});
