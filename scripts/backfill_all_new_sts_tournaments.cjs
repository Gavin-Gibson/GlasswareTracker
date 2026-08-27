/**
 * Comprehensive Backfill Script for STS, Majors & Spikeball Tournaments (2020–present)
 * Ingests all divisions, standings (#1 to last place), and rosters into Supabase.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

function getTournamentCircuit(slug, name, city) {
  const s = `${slug || ''} ${name || ''} ${city || ''}`.toLowerCase();
  
  if (s.includes('ets') || s.includes('european tour')) return 'ETS';
  if (s.includes('ara') || s.includes('australia') || s.includes('sydney') || s.includes('melbourne') || s.includes('brisbane')) return 'ARA';
  if (s.includes('crs') || s.includes('canadian') || s.includes('quebec') || s.includes('montreal') || s.includes('vancouver') || s.includes('mississauga')) return 'CRS';
  if (s.includes('ers') || s.includes('east roundnet series')) return 'ERS';
  if (s.includes('tasr') || s.includes('texas')) return 'TASR';
  if (s.includes('casr') || s.includes('california')) return 'CASR';
  if (s.includes('mrs') || s.includes('midwest')) return 'MRS';
  if (s.includes('ura') || s.includes('utah')) return 'URA';
  if (s.includes('pra') || s.includes('players roundnet')) return 'PRA';
  if (s.includes('gwr') || s.includes('greater washington')) return 'GWR';
  if (s.includes('nationals') || s.includes('championship')) return 'NATIONALS';
  if (s.includes('sts') || s.includes('tour series') || s.includes('tour stop') || s.includes('spikeball') || s.includes('challenger')) return 'STS';
  if (s.includes('major')) return 'MAJORS';

  return 'STS';
}

function classifyDivisionAwards(divisionName, allDivisionsInTourney) {
  const divLower = divisionName.toLowerCase();
  const isPointsOnly = divLower.includes('points') || divLower.includes('ladder') || divLower.includes('scrimmage');
  const isWomen = divLower.includes('women') || divLower.includes('female') || divLower.includes('girls');
  const isOpen = !isWomen && (divLower.includes('open') || divLower.includes('men') || divLower.includes('pro') || divLower.includes('premier') || divLower.includes('5.5') || divLower.includes('5.0') || divLower.includes('gold+'));

  let isTopTier = false;
  if (isWomen) {
    const hasHigherWomenDiv = allDivisionsInTourney.some(d => {
      const name = d.toLowerCase();
      return name.includes('women') && (name.includes('5.0') || name.includes('5.5') || name.includes('pro') || name.includes('premier') || name.includes('gold'));
    });
    if (divLower.includes('5.5') || divLower.includes('5.0') || divLower.includes('pro') || divLower.includes('premier') || divLower.includes('gold')) {
      isTopTier = true;
    } else if (!hasHigherWomenDiv && (divLower.includes('4.5') || divLower.includes('advanced') || divLower.includes('expert'))) {
      isTopTier = true;
    }
  } else if (isOpen) {
    if (divLower.includes('5.5') || divLower.includes('gold+') || divLower.includes('pro')) {
      isTopTier = true;
    } else {
      const has55 = allDivisionsInTourney.some(d => d.toLowerCase().includes('5.5') || d.toLowerCase().includes('gold+'));
      if (!has55 && (divLower.includes('5.0') || divLower.includes('premier') || divLower.includes('open bronze') || divLower.includes('pro/premier'))) {
        isTopTier = true;
      }
    }
  }

  if (!isTopTier && allDivisionsInTourney.length <= 2 && (divLower.includes('open') || divLower.includes('premier') || divLower.includes('advanced'))) {
    isTopTier = true;
  }

  return {
    awardsGlassware: isTopTier && !isPointsOnly,
    isTopTier
  };
}

async function run() {
  console.log('🚀 Starting Comprehensive Backfill for STS & Major Tournaments...');

  // 1. Load Supabase state
  const [allTournaments, allDivisions, allPlacements, allPlayers] = await Promise.all([
    fetchAll('tournaments?order=event_date.desc'),
    fetchAll('tournament_divisions'),
    fetchAll('placements'),
    fetchAll('players')
  ]);

  console.log(`📊 Initial DB State: ${allTournaments.length} Tournaments, ${allDivisions.length} Divisions, ${allPlacements.length} Placements, ${allPlayers.length} Players.`);

  const tourneyBySlug = new Map();
  allTournaments.forEach(t => {
    const m = (t.notes || '').match(/Fwango Slug:\s*([^\s;]+)/i);
    if (m) tourneyBySlug.set(m[1].toLowerCase(), t);
  });

  const playerMap = new Map(); // normalized name -> id
  allPlayers.forEach(p => {
    if (p.name) playerMap.set(normalizeName(p.name), p.id);
  });

  const placesByDivId = new Map();
  allPlacements.forEach(p => {
    placesByDivId.set(p.division_id, (placesByDivId.get(p.division_id) || 0) + 1);
  });

  // 2. Load target list of 137 STS/Major tournaments
  const targets = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/to_ingest_sts_majors.json'), 'utf8'));
  console.log(`🎯 Targets to process: ${targets.length}`);

  let tournamentsUpdated = 0;
  let totalPlacementsAdded = 0;
  let totalNewPlayersCreated = 0;

  for (let idx = 0; idx < targets.length; idx++) {
    const item = targets[idx];
    const slug = item.slug;

    console.log(`\n======================================================`);
    console.log(`[${idx + 1}/${targets.length}] Processing: ${item.name} (${item.startDate?.slice(0, 10)}) - Slug: ${slug}`);
    console.log(`======================================================`);

    try {
      // Find tournament in Supabase or create it
      let tourney = tourneyBySlug.get(slug.toLowerCase());
      if (!tourney) {
        // Create tournament
        const cityName = item.city || 'N/A';
        const circuit = getTournamentCircuit(slug, item.name, cityName);
        const eventDate = (item.startDate || '').slice(0, 10);
        const year = parseInt(eventDate.slice(0, 4), 10) || item.year;

        const tourneyPayload = {
          name: item.name,
          year: year,
          event_date: eventDate,
          location: cityName,
          tier: circuit === 'NATIONALS' ? 'Nationals' : (circuit === 'STS' ? 'Tour Stop' : 'Major'),
          era: year <= 2019 ? 'Classic' : 'Modern',
          notes: `Fwango Slug: ${slug}`,
          Circuit: circuit
        };

        const tourneyRes = await supabaseRequest('tournaments', 'POST', tourneyPayload);
        tourney = Array.isArray(tourneyRes) ? tourneyRes[0] : tourneyRes;
        tourneyBySlug.set(slug.toLowerCase(), tourney);
        console.log(`  ➕ Created tournament record in Supabase (ID: ${tourney.id})`);
      }

      // Fetch Fwango data
      const urlDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls/${slug}`);
      const urlDoc = parseFirestoreDoc(urlDocRaw);
      if (!urlDoc || !urlDoc.id) {
        console.log(`  ❌ Slug "${slug}" not found on Fwango.`);
        continue;
      }
      const fwangoTourneyId = urlDoc.id;

      const tourneyDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${fwangoTourneyId}`);
      const tourneyData = parseFirestoreDoc(tourneyDocRaw);
      const divisionsConfig = tourneyData.divisions || tourneyData.divisionSettings || {};

      let standingsByDivision = {};
      try {
        const reportDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/reportEvents/${fwangoTourneyId}`);
        const reportDoc = parseFirestoreDoc(reportDocRaw);
        if (reportDoc && reportDoc.divisions) standingsByDivision = reportDoc.divisions;
      } catch (err) {
        console.log(`  ⚠️ No standings for ${slug}`);
        continue;
      }

      if (Object.keys(standingsByDivision).length === 0) {
        console.log(`  ⚠️ 0 divisions with standings, skipping.`);
        continue;
      }

      // Fetch all registered teams
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

      // Collect new players
      const uniqueNewNames = new Set();
      for (const tObj of Object.values(teamsMap)) {
        const teamDetails = tObj.team || {};
        let rawPlayers = [];
        if (Array.isArray(teamDetails.players)) rawPlayers = teamDetails.players;
        else if (teamDetails.players && typeof teamDetails.players === 'object') rawPlayers = Object.values(teamDetails.players);

        for (const pl of rawPlayers) {
          const name = (pl.displayName || pl.name || `${pl.firstName || ''} ${pl.lastName || ''}`.trim());
          if (name && name !== 'Unknown Player' && !playerMap.has(normalizeName(name))) {
            uniqueNewNames.add(name.trim());
          }
        }
      }

      if (uniqueNewNames.size > 0) {
        console.log(`  👥 Registering ${uniqueNewNames.size} new unique players in Supabase...`);
        const playerBatch = Array.from(uniqueNewNames).map(name => ({ name }));
        for (let b = 0; b < playerBatch.length; b += 100) {
          const chunk = playerBatch.slice(b, b + 100);
          const inserted = await supabaseRequest('players', 'POST', chunk);
          if (Array.isArray(inserted)) {
            inserted.forEach(p => playerMap.set(normalizeName(p.name), p.id));
          }
        }
        totalNewPlayersCreated += uniqueNewNames.size;
      }

      // Load existing divisions in Supabase for this tournament
      const supabaseDivs = await fetchAll(`tournament_divisions?tournament_id=eq.${tourney.id}`);
      const divByName = new Map();
      supabaseDivs.forEach(d => divByName.set(normalizeName(d.division_name), d));

      const allDivNames = Object.keys(standingsByDivision).map(k =>
        divisionsConfig[k]?.name || divisionsConfig[k]?.divisionName || k
      );

      for (const [fwangoDivKey, divData] of Object.entries(standingsByDivision)) {
        const standingsList = divData.standings || [];
        if (standingsList.length === 0) continue;

        const divMeta = divisionsConfig[fwangoDivKey] || {};
        const fwangoDivName = divMeta.name || divMeta.divisionName || fwangoDivKey;
        const { awardsGlassware } = classifyDivisionAwards(fwangoDivName, allDivNames);

        let matchedDiv = divByName.get(normalizeName(fwangoDivName));
        if (!matchedDiv) {
          // Create division
          const newDivRes = await supabaseRequest('tournament_divisions', 'POST', {
            tournament_id: tourney.id,
            division_name: fwangoDivName,
            awards_glassware: awardsGlassware
          });
          matchedDiv = Array.isArray(newDivRes) ? newDivRes[0] : newDivRes;
          if (matchedDiv && matchedDiv.id) {
            divByName.set(normalizeName(fwangoDivName), matchedDiv);
          }
        }

        if (!matchedDiv || !matchedDiv.id) continue;

        // Check if placements already exist for this division
        const existingCount = placesByDivId.get(matchedDiv.id) || 0;
        if (existingCount >= standingsList.length) {
          console.log(`    ⏩ Division "${fwangoDivName}": already has ${existingCount} placements. Skipping.`);
          continue;
        }

        // Fetch placements from Fwango and insert
        const isSquadDiv = fwangoDivName.toLowerCase().includes('squad');
        const placementsToInsert = [];

        for (const s of standingsList) {
          const rank = s.rank || 1;
          const teamObj = teamsMap[s.tournamentTeamID]?.team || {};
          const teamName = teamObj.name || teamObj.shortName || 'Unknown Team';

          let rawPlayers = [];
          if (Array.isArray(teamObj.players)) rawPlayers = teamObj.players;
          else if (teamObj.players && typeof teamObj.players === 'object') rawPlayers = Object.values(teamObj.players);

          const playerIds = rawPlayers
            .map(pl => {
              const name = (pl.displayName || pl.name || `${pl.firstName || ''} ${pl.lastName || ''}`.trim());
              return name ? playerMap.get(normalizeName(name)) || null : null;
            })
            .filter(Boolean);

          const player1Id = playerIds[0] || null;
          const player2Id = playerIds[1] || null;

          let glasswareType = 'None';
          let isGlassware = false;
          let isTrophy = false;

          if (matchedDiv.awards_glassware || awardsGlassware) {
            isGlassware = rank <= 3;
            if (rank === 1) glasswareType = 'Pitcher';
            else if (rank === 2) glasswareType = 'Tankard / Cup';
            else if (rank === 3) glasswareType = 'Shot Glass / Horn';
          } else {
            isTrophy = rank <= 3;
          }

          let squadNotes = null;
          if (isSquadDiv && rawPlayers.length > 0) {
            const rosterNames = rawPlayers.map(pl => (pl.displayName || pl.name || `${pl.firstName || ''} ${pl.lastName || ''}`.trim())).filter(Boolean);
            squadNotes = `Squad: ${rosterNames.join(', ')}`;
          }

          placementsToInsert.push({
            division_id: matchedDiv.id,
            place: rank,
            team_name: teamName,
            player1_id: player1Id,
            player2_id: player2Id,
            glassware_awarded: isGlassware,
            glassware_type: isGlassware ? glasswareType : 'None',
            trophy_awarded: isTrophy,
            notes: squadNotes
          });
        }

        if (placementsToInsert.length > 0) {
          // Delete any existing partial placements for this division first
          if (existingCount > 0) {
            await supabaseRequest(`placements?division_id=eq.${matchedDiv.id}`, 'DELETE');
          }

          for (let pIdx = 0; pIdx < placementsToInsert.length; pIdx += 100) {
            const pChunk = placementsToInsert.slice(pIdx, pIdx + 100);
            await supabaseRequest('placements', 'POST', pChunk);
          }
          totalPlacementsAdded += placementsToInsert.length;
          placesByDivId.set(matchedDiv.id, placementsToInsert.length);
          console.log(`    🏅 Division "${fwangoDivName}" (${awardsGlassware ? '🍺 Glassware' : 'Medals'}): Ingested ${placementsToInsert.length} placements.`);
        }
      }

      tournamentsUpdated++;
    } catch (err) {
      console.error(`  ❌ Error processing ${slug}:`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 BACKFILL & INGESTION COMPLETE!`);
  console.log(`🏆 Tournaments Processed: ${tournamentsUpdated}`);
  console.log(`📊 Placements Added: ${totalPlacementsAdded}`);
  console.log(`👥 New Players Registered: ${totalNewPlayersCreated}`);
  console.log(`======================================================`);
}

run().catch(console.error);
