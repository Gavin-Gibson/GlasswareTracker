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

async function main() {
  try {
    console.log('Fetching tournaments from Supabase...');
    const tournaments = await supabaseRequest('tournaments?select=*');
    console.log(`Found ${tournaments.length} tournaments in Supabase.`);
    if (tournaments.length > 0) {
      console.log('Sample Tournament:', JSON.stringify(tournaments[0], null, 2));
    }

    console.log('\nFetching tournament_divisions from Supabase...');
    const divisions = await supabaseRequest('tournament_divisions?select=*&limit=1');
    console.log('Sample Division:', JSON.stringify(divisions[0], null, 2));

    console.log('\nFetching placements from Supabase...');
    const placements = await supabaseRequest('placements?select=*&limit=1');
    console.log('Sample Placement:', JSON.stringify(placements[0], null, 2));
  } catch (err) {
    console.error('Error querying Supabase:', err);
  }
}

main();
