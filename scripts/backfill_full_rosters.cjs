/**
 * Full Tournament Roster & Placements Ingestion Script
 * Scrapes full standings (#1 to last place) and team rosters from Fwango Firestore
 * and ingests them into Supabase for complete player history & tournament analytics.
 */

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
        'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
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

async function fetchAll(endpoint) {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let all = [];
  while (true) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await supabaseRequest(`${endpoint}${sep}limit=${PAGE_SIZE}&offset=${offset}`);
    if (!Array.isArray(res) || res.length === 0) break;
    all.push(...res);
    if (res.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

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
  if (!doc || !doc.fields) return null;
  const result = { _id: (doc.name || '').split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    result[k] = parseFirestoreField(v);
  }
  return result;
}

function normalizeName(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function run(targetSlugLimit = null) {
  console.log('🚀 Initializing Full Tournament Roster & Placements Ingestion...');

  // 1. Load all players from Supabase into memory
  console.log('📥 Loading existing players from Supabase...');
  const allPlayers = await fetchAll('players');
  const playerMap = new Map(); // normalized name -> id
  allPlayers.forEach(p => {
    if (p.name) {
      playerMap.set(normalizeName(p.name), p.id);
    }
  });
  console.log(`✅ Loaded ${playerMap.size} existing players from Supabase.`);

  // 2. Load all tournaments and divisions
  console.log('📥 Loading tournaments from Supabase...');
  const tournaments = await fetchAll('tournaments?order=event_date.desc');
  console.log(`✅ Loaded ${tournaments.length} tournaments.`);

  let tournamentsProcessed = 0;
  let totalPlacementsAdded = 0;
  let totalNewPlayersCreated = 0;

  for (const tourney of tournaments) {
    const slugMatch = (tourney.notes || '').match(/Fwango Slug:\s*([^\s;]+)/i);
    if (!slugMatch || !slugMatch[1]) {
      console.log(`⚠️ Skipping ${tourney.name}: No Fwango slug found in notes.`);
      continue;
    }
    const slug = slugMatch[1].trim();

    if (targetSlugLimit && !slug.includes(targetSlugLimit)) {
      continue;
    }

    console.log(`\n======================================================`);
    console.log(`🏆 [${tournamentsProcessed + 1}/${tournaments.length}] Scraping: ${tourney.name} (${tourney.event_date}) - Slug: ${slug}`);
    console.log(`======================================================`);

    try {
      // 3. Resolve slug on Fwango
      const urlDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls/${slug}`);
      const urlDoc = parseFirestoreDoc(urlDocRaw);
      if (!urlDoc || !urlDoc.id) {
        console.log(`  ❌ Slug "${slug}" not found on Fwango.`);
        continue;
      }
      const fwangoTourneyId = urlDoc.id;

      // 4. Fetch tournament metadata & divisions configuration
      const tourneyDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${fwangoTourneyId}`);
      const tourneyData = parseFirestoreDoc(tourneyDocRaw);
      const divisionsConfig = tourneyData.divisions || tourneyData.divisionSettings || {};

      // 5. Fetch standings
      let standingsByDivision = {};
      try {
        const reportDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/reportEvents/${fwangoTourneyId}`);
        const reportDoc = parseFirestoreDoc(reportDocRaw);
        if (reportDoc && reportDoc.divisions) {
          standingsByDivision = reportDoc.divisions;
        }
      } catch (err) {
        console.log(`  ℹ️ No reportEvents standings for ${slug}: ${err.message}`);
      }

      // 6. Fetch all tournamentTeams & rosters
      let teamsMap = {};
      let nextPageToken = null;
      do {
        let teamsUrl = `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${fwangoTourneyId}/tournamentTeams?pageSize=300`;
        if (nextPageToken) teamsUrl += `&pageToken=${nextPageToken}`;
        const teamsRes = await fetchJson(teamsUrl);
        for (const doc of (teamsRes.documents || [])) {
          const teamData = parseFirestoreDoc(doc);
          if (teamData) teamsMap[teamData._id] = teamData;
        }
        nextPageToken = teamsRes.nextPageToken;
      } while (nextPageToken);

      console.log(`  📋 Loaded ${Object.keys(teamsMap).length} total registered teams from Fwango.`);

      // 7. Load existing divisions in Supabase for this tournament
      const supabaseDivs = await fetchAll(`tournament_divisions?tournament_id=eq.${tourney.id}`);
      console.log(`  📑 Supabase has ${supabaseDivs.length} divisions for this tournament.`);

      // 8. Process each division
      for (const [fwangoDivKey, divData] of Object.entries(standingsByDivision)) {
        const standingsList = divData.standings || [];
        if (standingsList.length === 0) continue;

        const divMeta = divisionsConfig[fwangoDivKey] || {};
        const fwangoDivName = divMeta.name || divMeta.divisionName || fwangoDivKey;

        // Match with Supabase division
        let matchedDiv = supabaseDivs.find(d => normalizeName(d.division_name) === normalizeName(fwangoDivName));
        if (!matchedDiv) {
          // Try loose matching
          matchedDiv = supabaseDivs.find(d => {
            const normA = normalizeName(d.division_name);
            const normB = normalizeName(fwangoDivName);
            return normA.includes(normB) || normB.includes(normA);
          });
        }

        if (!matchedDiv) {
          console.log(`    ⚠️ Division "${fwangoDivName}" not found in Supabase (creating division)...`);
          const newDivRes = await supabaseRequest('tournament_divisions', 'POST', {
            tournament_id: tourney.id,
            division_name: fwangoDivName,
            awards_glassware: false
          });
          matchedDiv = Array.isArray(newDivRes) ? newDivRes[0] : newDivRes;
        }

        if (!matchedDiv || !matchedDiv.id) continue;

        // Load existing placements in Supabase for this division
        const existingPlacements = await fetchAll(`placements?division_id=eq.${matchedDiv.id}`);
        const existingPlacesMap = new Map(); // place rank -> placement
        existingPlacements.forEach(p => {
          existingPlacesMap.set(p.place, p);
        });

        console.log(`    🏅 Division "${matchedDiv.division_name}": ${standingsList.length} Fwango standings (Supabase currently has ${existingPlacements.length} placements).`);

        const isSquadDiv = matchedDiv.division_name.toLowerCase().includes('squad');
        const placementsToInsert = [];

        for (const s of standingsList) {
          const rank = s.rank || 1;
          const teamObj = teamsMap[s.tournamentTeamID]?.team || {};
          const teamName = teamObj.name || teamObj.shortName || 'Unknown Team';

          let rawPlayers = [];
          if (Array.isArray(teamObj.players)) {
            rawPlayers = teamObj.players;
          } else if (teamObj.players && typeof teamObj.players === 'object') {
            rawPlayers = Object.values(teamObj.players);
          }

          const playerRecords = [];
          for (const pl of rawPlayers) {
            const pName = (pl.displayName || pl.name || `${pl.firstName || ''} ${pl.lastName || ''}`.trim() || 'Unknown Player').trim();
            if (!pName || pName === 'Unknown Player') continue;

            const pNorm = normalizeName(pName);
            let playerId = playerMap.get(pNorm);

            if (!playerId) {
              // Create new player in Supabase
              try {
                const createdP = await supabaseRequest('players', 'POST', { name: pName });
                if (Array.isArray(createdP) && createdP[0]) {
                  playerId = createdP[0].id;
                  playerMap.set(pNorm, playerId);
                  totalNewPlayersCreated++;
                }
              } catch (e) {
                // If collision, query existing
                const fetchedP = await supabaseRequest(`players?name=ilike.${encodeURIComponent(pName)}`);
                if (Array.isArray(fetchedP) && fetchedP[0]) {
                  playerId = fetchedP[0].id;
                  playerMap.set(pNorm, playerId);
                }
              }
            }

            if (playerId) {
              playerRecords.push({ id: playerId, name: pName });
            }
          }

          // If place already exists in Supabase (e.g. 1st, 2nd, 3rd, 4th), keep existing glassware settings
          if (existingPlacesMap.has(rank)) {
            const existing = existingPlacesMap.get(rank);
            // If it's a squad, make sure full squad roster is in notes
            if (isSquadDiv && playerRecords.length > 2 && (!existing.notes || !existing.notes.includes('Squad:'))) {
              const squadNames = playerRecords.map(p => p.name).join(', ');
              const updatedNotes = `Squad: ${squadNames}. ${existing.notes || `${rank}th Place`}`;
              await supabaseRequest(`placements?id=eq.${existing.id}`, 'PATCH', { notes: updatedNotes });
            }
            continue;
          }

          // Otherwise, it's a new placement (5th place and below)
          const p1 = playerRecords[0] || null;
          const p2 = playerRecords[1] || null;

          let notes = `${rank}th Place`;
          if (isSquadDiv && playerRecords.length > 0) {
            notes = `Squad: ${playerRecords.map(p => p.name).join(', ')}. ${rank}th Place`;
          }

          placementsToInsert.push({
            division_id: matchedDiv.id,
            place: rank,
            team_name: teamName,
            player1_id: p1 ? p1.id : null,
            player2_id: p2 ? p2.id : null,
            trophy_awarded: false,
            glassware_awarded: false,
            glassware_type: 'None',
            notes
          });
        }

        if (placementsToInsert.length > 0) {
          // Batch insert in chunks of 50
          for (let i = 0; i < placementsToInsert.length; i += 50) {
            const chunk = placementsToInsert.slice(i, i + 50);
            await supabaseRequest('placements', 'POST', chunk);
          }
          console.log(`      ✅ Added ${placementsToInsert.length} new placement records (5th to last place).`);
          totalPlacementsAdded += placementsToInsert.length;
        }
      }

      tournamentsProcessed++;
    } catch (err) {
      console.error(`  ❌ Error processing tournament ${tourney.name}:`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🏁 Ingestion Complete!`);
  console.log(`Tournaments Processed: ${tournamentsProcessed}`);
  console.log(`New Placements Ingested: ${totalPlacementsAdded}`);
  console.log(`New Players Created: ${totalNewPlayersCreated}`);
  console.log(`======================================================`);
}

const arg = process.argv[2];
run(arg).catch(console.error);
