/**
 * Supabase Data Uploader for USAR Historical Tournaments
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

async function uploadAll() {
  console.log('🚀 Starting USAR import to Supabase...');

  const dataPath = path.join(__dirname, '../data/usar-tournaments-all.json');
  const tournamentsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // 1. Collect and Upsert All Unique Players
  console.log('👥 Collecting and syncing players...');
  const playerMap = new Map(); // Name -> UUID

  for (const tourney of tournamentsData) {
    for (const div of tourney.divisions) {
      for (const p of div.podium) {
        for (const pl of p.players) {
          const name = pl.name?.trim();
          if (name && name !== 'Unknown Player') {
            playerMap.set(name, null);
          }
        }
      }
    }
  }

  console.log(`Found ${playerMap.size} unique players.`);

  // Check existing players in Supabase
  const existingPlayers = await supabaseRequest('players?select=id,name');
  for (const ep of existingPlayers) {
    if (playerMap.has(ep.name)) {
      playerMap.set(ep.name, ep.id);
    }
  }

  // Insert missing players
  const playersToInsert = [];
  for (const [name, id] of playerMap.entries()) {
    if (!id) {
      playersToInsert.push({ name });
    }
  }

  if (playersToInsert.length > 0) {
    console.log(`Inserting ${playersToInsert.length} new players...`);
    const inserted = await supabaseRequest('players', 'POST', playersToInsert);
    for (const p of (inserted || [])) {
      playerMap.set(p.name, p.id);
    }
  }

  console.log('✅ Players synced successfully.');

  // 2. Insert Tournaments, Divisions, and Placements
  for (const t of tournamentsData) {
    console.log(`\n🏆 Importing USAR Tournament: ${t.name}...`);

    const year = t.startDate ? parseInt(t.startDate.slice(0, 4), 10) : 2026;
    const eventDate = t.startDate ? t.startDate.slice(0, 10) : null;
    const location = [t.city, t.state].filter(Boolean).join(', ') || 'USA';
    const tier = getTournamentTier(t.name);
    const circuit = getTournamentCircuit(t.slug, t.name);

    // Insert Tournament
    const tourneyPayload = [{
      name: t.name,
      year: year,
      event_date: eventDate,
      location: location,
      tier: tier,
      circuit: circuit,
      era: 'Modern',
      notes: `Fwango Slug: ${t.slug}`
    }];

    const [tourneyRecord] = await supabaseRequest('tournaments', 'POST', tourneyPayload);
    const tournamentId = tourneyRecord.id;

    for (const div of t.divisions) {
      // Insert Division
      const divPayload = [{
        tournament_id: tournamentId,
        division_name: div.divisionName,
        awards_glassware: div.awardsGlassware
      }];

      const [divRecord] = await supabaseRequest('tournament_divisions', 'POST', divPayload);
      const divisionId = divRecord.id;

      // Insert Placements
      const placementsPayload = div.podium.map(p => {
        const p1Name = p.players[0]?.name?.trim();
        const p2Name = p.players[1]?.name?.trim();

        const p1Id = p1Name ? playerMap.get(p1Name) : null;
        const p2Id = p2Name ? playerMap.get(p2Name) : null;

        return {
          division_id: divisionId,
          place: p.rank,
          team_name: p.teamName,
          player1_id: p1Id || null,
          player2_id: p2Id || null,
          trophy_awarded: p.rank === 1 && div.awardsGlassware,
          glassware_awarded: p.awardsGlassware && p.rank <= 3,
          glassware_type: p.awardsGlassware ? p.glasswareType : 'None',
          notes: p.awardType
        };
      });

      if (placementsPayload.length > 0) {
        await supabaseRequest('placements', 'POST', placementsPayload);
      }
    }
  }

  console.log('\n🎉 ALL USAR TOURNAMENTS SUCCESSFULLY IMPORTED INTO SUPABASE!');
}

uploadAll().catch(err => {
  console.error('❌ Upload failed:', err);
});
