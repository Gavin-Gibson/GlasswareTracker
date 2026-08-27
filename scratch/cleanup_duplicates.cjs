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
  const tournaments = await supabaseRequest('tournaments?select=id,name,notes');
  const slugCounts = {};
  
  for (const t of tournaments) {
    const slugMatch = t.notes?.match(/Fwango Slug:\s*(.+)$/);
    if (slugMatch) {
      const slug = slugMatch[1].trim();
      slugCounts[slug] = (slugCounts[slug] || []);
      slugCounts[slug].push(t);
    }
  }
  
  const toDelete = [];
  
  for (const [slug, list] of Object.entries(slugCounts)) {
    if (list.length > 1) {
      console.log(`\nChecking duplicates for slug: ${slug}`);
      for (const t of list) {
        const divs = await supabaseRequest(`tournament_divisions?tournament_id=eq.${t.id}`);
        console.log(`  * Tournament ID: ${t.id} has ${divs.length} divisions`);
        if (divs.length === 0) {
          toDelete.push(t.id);
        }
      }
    }
  }
  
  console.log(`\nFound ${toDelete.length} empty duplicate tournaments to delete.`);
  if (toDelete.length > 0) {
    console.log('Deleting empty duplicate tournaments...');
    for (const id of toDelete) {
      try {
        await supabaseRequest(`tournaments?id=eq.${id}`, 'DELETE');
        console.log(`  * Deleted empty tournament ${id}`);
      } catch (err) {
        console.error(`  * Failed to delete tournament ${id}:`, err.message);
      }
    }
    console.log('✅ Cleanup complete!');
  } else {
    console.log('No empty duplicates found (or both duplicates have divisions).');
  }
}

main().catch(console.error);
