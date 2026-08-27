/**
 * probe_missing_players.cjs — Deep dive into the 17 missing-player placements
 */
const https = require('https');

const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';

function supabaseRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const options = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data ? JSON.parse(data) : null));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllRecords(endpoint) {
  let all = [], offset = 0;
  while (true) {
    const batch = await supabaseRequest(`${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=1000&offset=${offset}`);
    if (!batch || !batch.length) break;
    all = all.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  const [placements, divisions, tournaments, players] = await Promise.all([
    fetchAllRecords('placements'),
    fetchAllRecords('tournament_divisions'),
    fetchAllRecords('tournaments'),
    fetchAllRecords('players'),
  ]);

  const divById = new Map(divisions.map(d => [d.id, d]));
  const tourById = new Map(tournaments.map(t => [t.id, t]));
  const playerById = new Map(players.map(p => [p.id, p]));

  // All placements with any null player
  const missing = placements.filter(p => !p.player1_id || !p.player2_id);
  
  console.log(`Total placements with null player: ${missing.length}\n`);
  console.log('Full details:\n');

  for (const p of missing) {
    const div = divById.get(p.division_id);
    const tour = div ? tourById.get(div.tournament_id) : null;
    const p1 = p.player1_id ? playerById.get(p.player1_id)?.name : 'NULL';
    const p2 = p.player2_id ? playerById.get(p.player2_id)?.name : 'NULL';
    
    console.log(`[${tour?.name || '?'}]`);
    console.log(`  Division: ${div?.division_name || '?'} | Rank: ${p.place}`);
    console.log(`  Player1: ${p1}`);
    console.log(`  Player2: ${p2}`);
    console.log(`  Notes: ${p.notes}`);
    console.log(`  Team: ${p.team_name || '(none)'}`);
    console.log('');
  }
}

main().catch(console.error);
