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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  // Newer duplicate tournament IDs to clean up (created on Aug 24)
  const duplicateTournamentsToDelete = [
    '06644bd4-8cb9-493a-8771-520dff030af7', // LA
    '04abe1ed-afad-4758-9c6e-09c06521e4be', // Atlanta
    'ed85ba7e-66ba-4e04-a72a-f7ba0117b295', // Dallas
    'c41d3fbc-b07c-4bfb-b0f1-5ec135ed5c97', // Boston
    'a125fa13-9799-4a48-856d-1760a2919aba', // Columbus
    'd33b77c5-01d4-4ba6-8033-1cf27b9275ce', // Seattle
    '816aaa4d-59b1-4be2-a366-0cca53138b73'  // NYC
  ];

  console.log(`Starting cleanup of ${duplicateTournamentsToDelete.length} duplicate tournaments...`);

  for (const tId of duplicateTournamentsToDelete) {
    console.log(`\n🧹 Cleaning duplicate tournament ID: ${tId}`);
    
    // 1. Fetch all division IDs for this tournament
    const divisions = await supabaseRequest(`tournament_divisions?tournament_id=eq.${tId}`);
    console.log(`   Found ${divisions.length} divisions.`);
    
    if (divisions.length > 0) {
      const divIds = divisions.map(d => d.id);
      
      // 2. Delete all placements for these divisions
      console.log(`   Deleting placements for divisions: ${divIds.join(', ')}`);
      for (const dId of divIds) {
        await supabaseRequest(`placements?division_id=eq.${dId}`, 'DELETE');
      }
      console.log('   Placements deleted.');

      // 3. Delete divisions
      console.log(`   Deleting divisions for tournament: ${tId}`);
      await supabaseRequest(`tournament_divisions?tournament_id=eq.${tId}`, 'DELETE');
      console.log('   Divisions deleted.');
    }

    // 4. Delete tournament
    console.log(`   Deleting tournament record: ${tId}`);
    await supabaseRequest(`tournaments?id=eq.${tId}`, 'DELETE');
    console.log('   Tournament deleted.');
  }

  console.log('\n🎉 ALL DUPLICATES CLEANED UP SUCCESSFULLY!');
}

main().catch(console.error);
