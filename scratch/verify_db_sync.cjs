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
  // Query 2025 USAR Nationals
  const tournaments = await supabaseRequest("tournaments?notes=ilike.*usar25nationals*");
  console.log('2025 Tournament:', tournaments);
  
  if (tournaments.length > 0) {
    const tId = tournaments[0].id;
    const divisions = await supabaseRequest(`tournament_divisions?tournament_id=eq.${tId}`);
    console.log('Divisions (Should be awards_glassware = false):');
    for (const d of divisions) {
      console.log(`- Division Name: "${d.division_name}" | awards_glassware: ${d.awards_glassware}`);
      
      const placements = await supabaseRequest(`placements?division_id=eq.${d.id}`);
      console.log('  Placements (Should be glassware_awarded = false, glassware_type = "None"):');
      for (const p of placements.slice(0, 3)) {
        console.log(`    * Rank: ${p.place} | glassware_awarded: ${p.glassware_awarded} | glassware_type: "${p.glassware_type}" | notes: "${p.notes}"`);
      }
    }
  }
}

main().catch(console.error);
