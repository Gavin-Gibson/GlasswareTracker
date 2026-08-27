/**
 * Fwango Tournament Scraper
 * Extracts tournament info, divisions, teams, player rosters, and final standings.
 */

const https = require('https');

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

async function scrapeFwango(slugOrUrl) {
  const slug = slugOrUrl.replace(/^https?:\/\/fwango\.io\//, '').replace(/\/.*$/, '').trim();
  console.log(`\n======================================================`);
  console.log(`🏆 Scraping Fwango Tournament: ${slug}`);
  console.log(`======================================================`);

  // 1. Resolve slug to Tournament ID
  const urlDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls/${slug}`);
  if (!urlDocRaw.fields || !urlDocRaw.fields.id) {
    throw new Error(`Tournament URL slug not found on Fwango: ${slug}`);
  }
  const urlDoc = parseFirestoreDoc(urlDocRaw);
  const tournamentId = urlDoc.id;

  // 2. Fetch Tournament Metadata
  const tourneyDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${tournamentId}`);
  const tourney = parseFirestoreDoc(tourneyDocRaw);

  const cityName = tourney.location?.city?.longName || tourney.location?.address || 'N/A';
  const stateName = tourney.location?.area?.shortName || '';
  console.log(`📍 Tournament: ${tourney.name}`);
  console.log(`📅 Dates: ${tourney.startDate?.slice(0, 10)} to ${tourney.endDate?.slice(0, 10)}`);
  console.log(`🗺️  Location: ${cityName}${stateName ? ', ' + stateName : ''}`);
  console.log(`👥 Total Teams Registered: ${tourney.teamCount || 'N/A'}`);

  // 3. Fetch Standings from reportEvents
  let standingsByDivision = {};
  try {
    const reportDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/reportEvents/${tournamentId}`);
    if (reportDocRaw.fields) {
      const reportDoc = parseFirestoreDoc(reportDocRaw);
      standingsByDivision = reportDoc.divisions || {};
    }
  } catch (err) {
    console.log('No reportEvents standings found:', err.message);
  }

  // 4. Fetch Tournament Teams & Players
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

  console.log(`✅ Loaded ${Object.keys(teamsMap).length} team rosters.\n`);

  // 5. Match Standings with Divisions, Team Rosters, and Players
  const divisionsConfig = tourney.divisions || tourney.divisionSettings || {};
  const results = {
    tournament: {
      id: tournamentId,
      slug,
      name: tourney.name,
      startDate: tourney.startDate,
      endDate: tourney.endDate,
      city: cityName,
      state: stateName,
      country: tourney.location?.country?.shortName || 'USA',
    },
    divisions: []
  };

  for (const [divKey, divStandings] of Object.entries(standingsByDivision)) {
    const standingsList = divStandings.standings || [];
    if (!standingsList.length) continue;

    // Get Division Name
    const divMeta = divisionsConfig[divKey] || {};
    const divisionName = divMeta.name || divMeta.divisionName || divKey;

    console.log(`🏅 Division: ${divisionName} (${standingsList.length} ranked teams)`);

    const podium = standingsList.slice(0, 4).map(item => {
      const rank = item.rank;
      const teamObj = teamsMap[item.tournamentTeamID] || {};
      const teamDetails = teamObj.team || {};
      const teamName = teamDetails.name || teamDetails.shortName || 'Unknown Team';
      
      // Players can be an array OR a map in Fwango Firestore
      let rawPlayers = [];
      if (Array.isArray(teamDetails.players)) {
        rawPlayers = teamDetails.players;
      } else if (teamDetails.players && typeof teamDetails.players === 'object') {
        rawPlayers = Object.values(teamDetails.players);
      }

      const players = rawPlayers.map(p => ({
        id: p.id || p.uid || p.fuid,
        name: p.displayName || p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Player',
        firstName: p.firstName || '',
        lastName: p.lastName || '',
      }));

      // Suggested Glassware logic
      let defaultGlass = 'None';
      let trophy = false;
      if (rank === 1) {
        defaultGlass = 'Pitcher';
        trophy = true;
      } else if (rank === 2) {
        defaultGlass = 'Tankard / Cup';
      } else if (rank === 3) {
        defaultGlass = 'Shot Glass / Horn';
      }

      const playerNames = players.map(p => p.name).join(' & ') || 'Roster not listed';
      const badge = rank === 1 ? '🍺 Pitcher (1st)' : (rank === 2 ? '🍻 Tankard (2nd)' : (rank === 3 ? '🥃 Shot Glass (3rd)' : '4th'));
      console.log(`   ${rank}. [${badge}] ${teamName} (${playerNames})`);

      return {
        rank,
        teamName,
        players,
        glasswareAwarded: rank <= 3,
        glasswareType: defaultGlass,
        trophyAwarded: trophy,
      };
    });

    results.divisions.push({
      divisionId: divKey,
      divisionName,
      podium
    });
    console.log('');
  }

  return results;
}

// Test with CLI args
const targetUrls = process.argv.slice(2);
if (targetUrls.length > 0) {
  (async () => {
    for (const url of targetUrls) {
      await scrapeFwango(url);
    }
  })();
}

module.exports = { scrapeFwango };
