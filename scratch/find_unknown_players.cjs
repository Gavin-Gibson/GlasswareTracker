/**
 * find_unknown_players.cjs
 * 
 * Fetches all placements from Supabase where player1 or player2 is missing/unknown,
 * then cross-references with local JSON data files to find the correct player names.
 * 
 * Outputs a full report and saves a JSON patch file for review.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';

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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchAllRecords(endpoint) {
  let allRecords = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const batch = await supabaseRequest(`${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`);
    if (!batch || batch.length === 0) break;
    allRecords = allRecords.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return allRecords;
}

async function main() {
  console.log('=== Unknown Player Diagnostic Tool ===\n');

  // --- 1. Fetch all DB records ---
  console.log('Fetching all records from Supabase (paginated)...');
  const [dbTournaments, dbDivisions, dbPlacements, dbPlayers] = await Promise.all([
    fetchAllRecords('tournaments'),
    fetchAllRecords('tournament_divisions'),
    fetchAllRecords('placements'),
    fetchAllRecords('players')
  ]);

  console.log(`  Tournaments: ${dbTournaments.length}`);
  console.log(`  Divisions:   ${dbDivisions.length}`);
  console.log(`  Placements:  ${dbPlacements.length}`);
  console.log(`  Players:     ${dbPlayers.length}\n`);

  // Build lookup maps
  const tournamentById = new Map(dbTournaments.map(t => [t.id, t]));
  const divisionById = new Map(dbDivisions.map(d => [d.id, d]));
  const playerById = new Map(dbPlayers.map(p => [p.id, p]));
  const playerByName = new Map(dbPlayers.map(p => [p.name.toLowerCase().trim(), p]));

  // --- 2. Find placements with null player IDs ---
  const missingPlayer1 = dbPlacements.filter(p => !p.player1_id);
  const missingPlayer2 = dbPlacements.filter(p => !p.player2_id);
  const missingEither = dbPlacements.filter(p => !p.player1_id || !p.player2_id);

  console.log(`Found ${missingEither.length} placements with at least one null player ID:`);
  console.log(`  - Missing player1_id: ${missingPlayer1.length}`);
  console.log(`  - Missing player2_id: ${missingPlayer2.length}\n`);

  // --- 3. Load all local JSON data files ---
  const dataDir = path.join(__dirname, '../data');
  const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f.includes('tournament'));
  console.log(`Loading local JSON data: ${jsonFiles.join(', ')}\n`);

  // Build source map: "tournamentName:divisionName:rank" -> { players: [{name}...], rank }
  const sourceMap = new Map();

  for (const file of jsonFiles) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    } catch (e) {
      console.warn(`  [WARN] Could not parse ${file}: ${e.message}`);
      continue;
    }
    if (!Array.isArray(data)) continue;

    for (const t of data) {
      const tName = (t.name || '').toLowerCase().trim();
      for (const div of (t.divisions || [])) {
        const divName = (div.divisionName || '').toLowerCase().trim();
        for (const p of (div.podium || [])) {
          const key = `${tName}:${divName}:${p.rank}`;
          sourceMap.set(key, {
            players: (p.players || []).map(pl => ({ name: pl.name?.trim() || null, id: pl.id })),
            rank: p.rank,
            tournamentName: t.name,
            divisionName: div.divisionName,
          });
        }
      }
    }
  }

  console.log(`Loaded ${sourceMap.size} placement records from local JSON files.\n`);

  // --- 4. Cross-reference: find what the correct names should be ---
  const patchCandidates = [];
  const unresolvable = [];

  for (const placement of missingEither) {
    const div = divisionById.get(placement.division_id);
    if (!div) {
      unresolvable.push({ placement_id: placement.id, reason: 'Division not found in DB' });
      continue;
    }
    const tournament = tournamentById.get(div.tournament_id);
    if (!tournament) {
      unresolvable.push({ placement_id: placement.id, reason: 'Tournament not found in DB' });
      continue;
    }

    const tKey = tournament.name.toLowerCase().trim();
    const divKey = div.division_name.toLowerCase().trim();
    const rank = placement.place;
    const sourceKey = `${tKey}:${divKey}:${rank}`;

    const sourceRecord = sourceMap.get(sourceKey);
    const p1Player = playerById.get(placement.player1_id);
    const p2Player = playerById.get(placement.player2_id);

    const p1NameCurrent = p1Player?.name || null;
    const p2NameCurrent = p2Player?.name || null;

    if (!sourceRecord) {
      unresolvable.push({
        placement_id: placement.id,
        tournament: tournament.name,
        division: div.division_name,
        rank,
        p1Current: p1NameCurrent,
        p2Current: p2NameCurrent,
        reason: `No source record found for key: "${sourceKey}"`
      });
      continue;
    }

    const srcPlayers = sourceRecord.players;
    const srcP1Name = srcPlayers[0]?.name || null;
    const srcP2Name = srcPlayers[1]?.name || null;

    const srcP1Unknown = !srcP1Name || srcP1Name === 'Unknown Player';
    const srcP2Unknown = !srcP2Name || srcP2Name === 'Unknown Player';

    if (srcP1Unknown && srcP2Unknown) {
      unresolvable.push({
        placement_id: placement.id,
        tournament: tournament.name,
        division: div.division_name,
        rank,
        p1Current: p1NameCurrent,
        p2Current: p2NameCurrent,
        reason: 'Source data also has unknown/empty player names'
      });
      continue;
    }

    const patches = {};
    let needsPatch = false;

    // Check if source player 1 can resolve a missing player1_id
    if (!placement.player1_id && srcP1Name && !srcP1Unknown) {
      const existingPlayer = playerByName.get(srcP1Name.toLowerCase().trim());
      patches.player1_name = srcP1Name;
      patches.player1_id_resolved = existingPlayer?.id || null;
      needsPatch = true;
    }
    if (!placement.player2_id && srcP2Name && !srcP2Unknown) {
      const existingPlayer = playerByName.get(srcP2Name.toLowerCase().trim());
      patches.player2_name = srcP2Name;
      patches.player2_id_resolved = existingPlayer?.id || null;
      needsPatch = true;
    }

    if (needsPatch) {
      patchCandidates.push({
        placement_id: placement.id,
        division_id: placement.division_id,
        place: placement.place,
        tournament: tournament.name,
        division: div.division_name,
        p1_current_id: placement.player1_id,
        p2_current_id: placement.player2_id,
        p1_current_name: p1NameCurrent,
        p2_current_name: p2NameCurrent,
        p1_source_name: srcP1Name,
        p2_source_name: srcP2Name,
        notes: placement.notes,
        patches
      });
    }
  }

  // --- 5. Print Report ---
  console.log('=== REPORT ===\n');
  console.log(`Resolvable   (can fix from source data): ${patchCandidates.length}`);
  console.log(`Unresolvable (need manual fix):          ${unresolvable.length}\n`);

  if (patchCandidates.length > 0) {
    console.log('--- RESOLVABLE PLACEMENTS ---');
    for (const c of patchCandidates) {
      console.log(`\n  [${c.tournament}] "${c.division}" → Rank ${c.place}`);
      if (c.patches.player1_name) {
        console.log(`    player1: NULL → "${c.patches.player1_name}" (id: ${c.patches.player1_id_resolved || 'NEEDS INSERT'})`);
      }
      if (c.patches.player2_name) {
        console.log(`    player2: NULL → "${c.patches.player2_name}" (id: ${c.patches.player2_id_resolved || 'NEEDS INSERT'})`);
      }
    }
  }

  if (unresolvable.length > 0) {
    console.log('\n--- UNRESOLVABLE PLACEMENTS ---');
    for (const u of unresolvable) {
      console.log(`\n  [${u.tournament || 'UNKNOWN'}] "${u.division || ''}" → Rank ${u.rank || '?'}`);
      console.log(`    p1: "${u.p1Current}", p2: "${u.p2Current}"`);
      console.log(`    Reason: ${u.reason}`);
    }
  }

  // --- 6. Save patch candidates to file ---
  const outputPath = path.join(__dirname, 'unknown_players_report.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
      total_placements: dbPlacements.length,
      missing_any_player: missingEither.length,
      resolvable: patchCandidates.length,
      unresolvable: unresolvable.length
    },
    resolvable: patchCandidates,
    unresolvable
  }, null, 2));

  console.log(`\nFull report saved to: scratch/unknown_players_report.json`);
  console.log('Next step: run fix_unknown_players.cjs to apply patches (after reviewing the report).');
}

main().catch(console.error);
