const https = require('https');

function supabaseRequest(endpoint, method = 'GET', body = null) {
  const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const req = https.request({
      method, hostname: url.hostname, path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAll(endpoint) {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const batch = await supabaseRequest(
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return all;
}

async function run() {
  const [placements, divisions, tournaments, players] = await Promise.all([
    fetchAll('placements?glassware_awarded=eq.true'),
    fetchAll('tournament_divisions'),
    fetchAll('tournaments'),
    fetchAll('players?select=id,name'),
  ]);
  console.log('placements:', placements.length);
  console.log('divisions:', divisions.length);
  console.log('tournaments:', tournaments.length);
  console.log('players:', players.length);
}
run();
