/**
 * set_utr_circuit.cjs
 *
 * Updates 5 confirmed Utah non-major tournaments in Supabase:
 *   - circuit -> 'UTR'
 *   - tier -> 'Local'
 * Then for each tournament's divisions:
 *   - awards_glassware -> false
 * And for each placement in those divisions:
 *   - glassware_awarded -> false
 *   - glassware_type -> 'None'
 */

const https = require('https');

const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';

const UTR_TOURNAMENT_IDS = [
  '08309bc3-7b89-4239-8d31-d1211bfbb434', // 2025 Utah Championships
  'bb909f42-83d1-4d1c-a330-78b4b0db8af2', // Free the Spike Tournament
  '77980c54-8ea1-4ac1-8ae2-4dcb03f85727', // Spring Spike Tournament
  'aa40df61-2460-44f6-ac87-0b790d5b6a99', // AF Steel Days Spike Tournament
  'c7787790-2988-4d9d-89d7-58ccab120c70', // Back to School Spike Tournament
];

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
        } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchAll(endpoint) {
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
  console.log('=== UTR Circuit Backfill ===\n');
  console.log(`Updating ${UTR_TOURNAMENT_IDS.length} tournaments to circuit=UTR, tier=Local...\n`);

  // 1. Fetch tournament names for logging
  const allTournaments = await fetchAll('tournaments');
  const tourMap = new Map(allTournaments.map(t => [t.id, t]));

  // 2. Update each tournament
  for (const id of UTR_TOURNAMENT_IDS) {
    const tour = tourMap.get(id);
    console.log(`[Tournament] "${tour?.name || id}"`);

    await supabaseRequest(`tournaments?id=eq.${id}`, 'PATCH', {
      Circuit: 'UTR'
    });
    console.log(`  ✓ Circuit=UTR`);

    // 3. Fetch all divisions for this tournament
    const divisions = await fetchAll(`tournament_divisions?tournament_id=eq.${id}`);
    console.log(`  Found ${divisions.length} division(s)`);

    for (const div of divisions) {
      // Update division: no glassware
      await supabaseRequest(`tournament_divisions?id=eq.${div.id}`, 'PATCH', {
        awards_glassware: false
      });
      console.log(`    ✓ Division "${div.division_name}" → awards_glassware=false`);

      // Update all placements in this division
      const placements = await fetchAll(`placements?division_id=eq.${div.id}`);
      if (placements.length > 0) {
        await supabaseRequest(`placements?division_id=eq.${div.id}`, 'PATCH', {
          glassware_awarded: false,
          glassware_type: 'None'
        });
        console.log(`      ✓ ${placements.length} placement(s) → glassware_awarded=false, glassware_type=None`);
      }
    }
    console.log('');
  }

  console.log('=== DONE ===');
  console.log('All 5 Utah non-major tournaments updated to UTR circuit with no glassware.');
}

main().catch(console.error);
