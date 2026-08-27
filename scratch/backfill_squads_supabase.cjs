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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Fetch all pages from Supabase using PostgREST limit/offset
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

function cleanPlacementNotes(notes, place) {
  if (!notes) {
    const suffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th';
    return `${place}${suffix} Place`;
  }

  // Strip any existing Squad prefix to evaluate the raw note text
  let clean = notes.replace(/^Squad:\s*([^.]+)\.\s*/, '').trim();

  // Mappings of verbose strings to simple place text
  const matchLower = clean.toLowerCase();
  if (matchLower.includes('1st place') || matchLower.includes('pitcher (1st') || matchLower.includes('gold / pitcher')) {
    clean = '1st Place';
  } else if (matchLower.includes('2nd place') || matchLower.includes('tankard (2nd') || matchLower.includes('silver / tankard')) {
    clean = '2nd Place';
  } else if (matchLower.includes('3rd place') || matchLower.includes('shot glass (3rd') || matchLower.includes('bronze / shot glass')) {
    clean = '3rd Place';
  } else if (matchLower.includes('4th place')) {
    clean = '4th Place';
  }

  return clean;
}

async function main() {
  console.log('Fetching all Supabase tournaments (paginated)...');
  const dbTournaments = await fetchAllRecords('tournaments');
  console.log(`Found ${dbTournaments.length} tournaments.`);

  console.log('Fetching all Supabase divisions (paginated)...');
  const dbDivisions = await fetchAllRecords('tournament_divisions');
  console.log(`Found ${dbDivisions.length} divisions.`);

  console.log('Fetching all Supabase placements (paginated)...');
  const dbPlacements = await fetchAllRecords('placements');
  console.log(`Found ${dbPlacements.length} placements.`);

  // Build maps
  const tournamentMap = new Map(); // name.toLowerCase() -> tournament
  dbTournaments.forEach(t => {
    tournamentMap.set(t.name.toLowerCase().trim(), t);
  });

  const divisionMap = new Map(); // tournament_id : division_name.toLowerCase() -> division
  dbDivisions.forEach(d => {
    const key = `${d.tournament_id}:${d.division_name.toLowerCase().trim()}`;
    divisionMap.set(key, d);
  });

  const placementMap = new Map(); // division_id : place -> placement
  dbPlacements.forEach(p => {
    const key = `${p.division_id}:${p.place}`;
    placementMap.set(key, p);
  });

  // Load JSON files to match squad player rosters
  const dataDir = path.join(__dirname, '../data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f.includes('tournament'));

  console.log(`\nLoading JSON data files: ${files.join(', ')}`);

  // Map to store squad rosters: tournamentName : divisionName : rank -> playerNames[]
  const squadRosterMap = new Map();

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      continue;
    }
    if (!Array.isArray(data)) continue;

    for (const t of data) {
      const tKey = (t.name || '').toLowerCase().trim();
      const divisions = t.divisions || [];
      for (const div of divisions) {
        const divKey = (div.divisionName || '').toLowerCase().trim();
        if (!divKey.includes('squad')) continue;

        const podium = div.podium || [];
        for (const p of podium) {
          const roster = (p.players || []).map(pl => pl.name?.trim()).filter(Boolean);
          if (roster.length > 0) {
            const mapKey = `${tKey}:${divKey}:${p.rank}`;
            squadRosterMap.set(mapKey, roster);
          }
        }
      }
    }
  }

  console.log(`Compiled ${squadRosterMap.size} squad rosters from local JSON files.`);
  console.log('\nRunning database updates...');

  let patchedPlacementsCount = 0;

  for (const p of dbPlacements) {
    // 1. Get parent division and tournament
    const dbDiv = dbDivisions.find(d => d.id === p.division_id);
    if (!dbDiv) continue;
    const dbT = dbTournaments.find(t => t.id === dbDiv.tournament_id);
    if (!dbT) continue;

    const tKey = dbT.name.toLowerCase().trim();
    const divKey = dbDiv.division_name.toLowerCase().trim();

    // 2. Clean the raw placement notes
    const cleanedNotesText = cleanPlacementNotes(p.notes, p.place);

    // 3. Check if this is a squad placement and check for a roster
    const rosterKey = `${tKey}:${divKey}:${p.place}`;
    const squadRoster = squadRosterMap.get(rosterKey);

    let expectedNotes = cleanedNotesText;
    if (squadRoster && squadRoster.length > 0) {
      expectedNotes = `Squad: ${squadRoster.join(', ')}. ${cleanedNotesText}`;
    }

    if (p.notes !== expectedNotes) {
      console.log(` - Patching placement Rank ${p.place} in "${dbT.name}" [${dbDiv.division_name}]:`);
      console.log(`   Old Notes: "${p.notes}"`);
      console.log(`   New Notes: "${expectedNotes}"`);
      await supabaseRequest(`placements?id=eq.${p.id}`, 'PATCH', {
        notes: expectedNotes
      });
      patchedPlacementsCount++;
    }
  }

  console.log('\n--- CLEANUP AND BACKFILL COMPLETE ---');
  console.log(`Total placements updated: ${patchedPlacementsCount}`);
}

main().catch(console.error);
