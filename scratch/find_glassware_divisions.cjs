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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Fetching all tournaments...');
  const tournaments = await supabaseRequest('tournaments');
  console.log(`Found ${tournaments.length} tournaments.`);

  console.log('Fetching all divisions with awards_glassware = true...');
  const divisions = await supabaseRequest('tournament_divisions?awards_glassware=eq.true');
  console.log(`Found ${divisions.length} divisions with awards_glassware = true.`);

  // Group divisions by tournament
  const tMap = new Map();
  tournaments.forEach(t => tMap.set(t.id, t));

  const tDivs = new Map();
  divisions.forEach(d => {
    if (!tDivs.has(d.tournament_id)) {
      tDivs.set(d.tournament_id, []);
    }
    tDivs.get(d.tournament_id).push(d);
  });

  for (const [tId, divs] of tDivs.entries()) {
    const t = tMap.get(tId);
    if (!t) continue;
    console.log(`\nTournament: "${t.name}" (${t.Circuit} - ${t.year})`);
    console.log('Divisions with Glassware Active:');
    divs.forEach(d => {
      console.log(`  - "${d.division_name}" (ID: ${d.id})`);
    });
  }
}

main().catch(console.error);
