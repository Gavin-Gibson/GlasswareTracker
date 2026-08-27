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
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const tournaments = await supabaseRequest("tournaments?notes=ilike.*natsseattle26*");
  console.log('Tournaments:', tournaments);
  
  if (tournaments.length > 0) {
    const tId = tournaments[0].id;
    const divisions = await supabaseRequest(`tournament_divisions?tournament_id=eq.${tId}`);
    console.log('Divisions:', divisions);
    
    for (const d of divisions) {
      const placements = await supabaseRequest(`placements?division_id=eq.${d.id}`);
      console.log(`Placements for division ${d.division_name} (${d.id}):`, placements.length);
    }
  }
}

main().catch(console.error);
