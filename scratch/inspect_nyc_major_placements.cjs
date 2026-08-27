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
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
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
  const tournaments = await supabaseRequest('tournaments?name=ilike.*New York City Major*');
  console.log('Tournaments:', tournaments);
  if (tournaments.length === 0) return;

  const tId = tournaments[0].id;
  const divisions = await supabaseRequest(`tournament_divisions?tournament_id=eq.${tId}`);
  console.log('Divisions:', divisions);

  const squadDiv = divisions.find(d => d.division_name.includes('Squads'));
  if (!squadDiv) return;

  const placements = await supabaseRequest(`placements?division_id=eq.${squadDiv.id}`);
  console.log('Placements:', placements);
}

main().catch(console.error);
