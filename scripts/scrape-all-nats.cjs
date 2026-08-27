/**
 * Fwango Tournament Bulk Scraper & Exporter
 * Scrapes top and lower divisions with accurate Glassware vs Medals classification.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

/**
 * Determine if a division qualifies for Glassware vs Medals:
 * - Glassware is awarded to the HIGHEST division for Open/Men and Women (e.g. Pro, Premier, Gold+, 5.5, 5.0).
 * - Lower divisions (Contender, Advanced, Intermediate, 4.0, 3.5, etc.) receive Medals.
 */
function classifyDivisionAwards(divisionName, allDivisionsInTourney) {
  const divLower = divisionName.toLowerCase();
  
  // Exclude non-standard / side divisions like points ladders or individual squads if desired
  const isPointsOnly = divLower.includes('points') || divLower.includes('ladder');
  
  const isWomen = divLower.includes('women');
  const isOpen = !isWomen && (divLower.includes('open') || divLower.includes('men') || divLower.includes('pro') || divLower.includes('premier'));

  // Identify if this is the highest division in its gender group
  // Higher rating numbers (5.5 > 5.0 > 4.5 > 4.0 > 3.5) or keywords (Gold+, Pro, Premier)
  let isTopTier = false;
  if (isWomen) {
    // Top women division: e.g. 5.0 Women's Bronze+, Pro, Premier, or highest rating in this tourney
    const hasHigherWomenDiv = allDivisionsInTourney.some(d => {
      const name = d.toLowerCase();
      return name.includes('women') && (name.includes('5.0') || name.includes('5.5') || name.includes('pro') || name.includes('premier') || name.includes('gold'));
    });
    if (divLower.includes('5.5') || divLower.includes('5.0') || divLower.includes('pro') || divLower.includes('premier') || divLower.includes('gold')) {
      isTopTier = true;
    } else if (!hasHigherWomenDiv && (divLower.includes('4.5') || divLower.includes('advanced'))) {
      isTopTier = true; // When 4.5 is the highest offered
    }
  } else if (isOpen) {
    if (divLower.includes('5.5') || divLower.includes('gold+') || divLower.includes('pro')) {
      isTopTier = true;
    } else {
      const has55 = allDivisionsInTourney.some(d => d.toLowerCase().includes('5.5') || d.toLowerCase().includes('gold+'));
      if (!has55 && (divLower.includes('5.0') || divLower.includes('premier'))) {
        isTopTier = true; // 5.0 Premier is top when 5.5 is not present
      }
    }
  }

  return {
    awardsGlassware: isTopTier && !isPointsOnly,
    category: isWomen ? "Women's" : (isOpen ? "Open / Men's" : "Mixed / Other"),
    isTopTier
  };
}

async function scrapeTournament(slugOrUrl) {
  const slug = slugOrUrl.replace(/^https?:\/\/fwango\.io\//, '').replace(/\/.*$/, '').trim();
  console.log(`\n======================================================`);
  console.log(`🏆 Scraping: https://fwango.io/${slug}`);
  console.log(`======================================================`);

  try {
    // 1. Resolve slug to Tournament ID
    const urlDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/urls/${slug}`);
    if (!urlDocRaw.fields || !urlDocRaw.fields.id) {
      console.log(`❌ URL slug not found on Fwango: ${slug}`);
      return null;
    }
    const urlDoc = parseFirestoreDoc(urlDocRaw);
    const tournamentId = urlDoc.id;

    // 2. Fetch Tournament Metadata
    const tourneyDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${tournamentId}`);
    const tourney = parseFirestoreDoc(tourneyDocRaw);

    const cityName = tourney.location?.city?.longName || tourney.location?.address || 'N/A';
    const stateName = tourney.location?.area?.shortName || '';
    console.log(`📍 ${tourney.name}`);
    console.log(`📅 Date: ${tourney.startDate?.slice(0, 10)} | Location: ${cityName}${stateName ? ', ' + stateName : ''}`);

    // 3. Fetch Standings from reportEvents
    let standingsByDivision = {};
    try {
      const reportDocRaw = await fetchJson(`https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/reportEvents/${tournamentId}`);
      if (reportDocRaw.fields) {
        const reportDoc = parseFirestoreDoc(reportDocRaw);
        standingsByDivision = reportDoc.divisions || {};
      }
    } catch (err) {
      console.log('⚠️ No published standings found in reportEvents.');
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

    const divisionsConfig = tourney.divisions || tourney.divisionSettings || {};
    const allDivNames = Object.keys(standingsByDivision).map(k => (divisionsConfig[k]?.name || divisionsConfig[k]?.divisionName || k));

    const tournamentRecord = {
      id: tournamentId,
      slug,
      name: tourney.name,
      startDate: tourney.startDate,
      endDate: tourney.endDate,
      city: cityName,
      state: stateName,
      divisions: []
    };

    for (const [divKey, divStandings] of Object.entries(standingsByDivision)) {
      const standingsList = divStandings.standings || [];
      if (!standingsList.length) continue;

      const divMeta = divisionsConfig[divKey] || {};
      const divisionName = divMeta.name || divMeta.divisionName || divKey;
      const { awardsGlassware, category } = classifyDivisionAwards(divisionName, allDivNames);

      const divTypeLabel = awardsGlassware ? '🏆 [TOP TIER - AWARDS GLASSWARE]' : '🎖️ [LOWER DIVISION - AWARDS MEDALS]';
      console.log(`\n--- Division: ${divisionName} ${divTypeLabel} ---`);

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
          name: p.displayName || p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Player'
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

        const playerNames = players.map(p => p.name).join(' & ') || 'Roster not listed';
        console.log(`  ${rank}. [${awardType}] ${teamName} (${playerNames})`);

        return {
          rank,
          teamName,
          players,
          awardType,
          awardsGlassware: isGlassware,
          glasswareType: isGlassware ? glasswareType : null,
          awardsMedal: isMedal
        };
      });

      tournamentRecord.divisions.push({
        divisionId: divKey,
        divisionName,
        category,
        awardsGlassware,
        podium
      });
    }

    return tournamentRecord;
  } catch (err) {
    console.error(`❌ Error scraping ${slug}:`, err.message);
    return null;
  }
}

async function main() {
  const urls = [
    'https://fwango.io/natsseattle26',
    'https://fwango.io/natslosangeles26',
    'https://fwango.io/natsatlanta26',
    'https://fwango.io/natsdallas26',
    'https://fwango.io/natsmontreal26',
    'https://fwango.io/natstoronto26',
    'https://fwango.io/natsboston26',
    'https://fwango.io/natsvancouver26',
    'https://fwango.io/natscolumbus26',
    'https://fwango.io/natsnewyorkcity26'
  ];

  const allTournaments = [];
  for (const url of urls) {
    const data = await scrapeTournament(url);
    if (data) allTournaments.push(data);
  }

  // Write full JSON export
  const outputPath = path.join(__dirname, '../data/nats-tournaments-2026.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allTournaments, null, 2), 'utf8');
  console.log(`\n💾 Saved all tournament data to: ${outputPath}`);

  // Generate CSV Summary of all Placements & Glassware
  let csvRows = ['Tournament,Date,Location,Division,DivisionTier,Place,Award,GlasswareType,Team,Player1,Player2'];
  for (const tourney of allTournaments) {
    for (const div of tourney.divisions) {
      for (const p of div.podium) {
        const p1 = p.players[0]?.name || '';
        const p2 = p.players[1]?.name || '';
        csvRows.push(`"${tourney.name}","${tourney.startDate?.slice(0,10) || ''}","${tourney.city}, ${tourney.state}","${div.divisionName}","${div.awardsGlassware ? 'Top Tier (Glassware)' : 'Lower Division (Medals)'}",${p.rank},"${p.awardType}","${p.glasswareType || 'None'}","${p.teamName}","${p1}","${p2}"`);
      }
    }
  }

  const csvPath = path.join(__dirname, '../data/nats-placements-2026.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
  console.log(`📊 Exported CSV report to: ${csvPath}`);
}

main();
