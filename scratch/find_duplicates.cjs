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
  const tournaments = await supabaseRequest('tournaments?select=id,name,notes,Circuit');
  console.log(`Total tournaments: ${tournaments.length}`);
  
  const slugCounts = {};
  const duplicateSlugs = [];
  
  for (const t of tournaments) {
    const slugMatch = t.notes?.match(/Fwango Slug:\s*(.+)$/);
    if (slugMatch) {
      const slug = slugMatch[1].trim();
      slugCounts[slug] = (slugCounts[slug] || []);
      slugCounts[slug].push(t);
    }
  }
  
  for (const [slug, list] of Object.entries(slugCounts)) {
    if (list.length > 1) {
      duplicateSlugs.push({ slug, count: list.length, items: list });
    }
  }
  
  console.log(`Found ${duplicateSlugs.length} duplicate slugs:`);
  for (const dup of duplicateSlugs) {
    console.log(`- Slug: ${dup.slug} (Count: ${dup.count})`);
    dup.items.forEach(t => {
      console.log(`  * ID: ${t.id} | Name: ${t.name} | Circuit: ${t.Circuit} | Notes: ${t.notes}`);
    });
  }
}

main().catch(console.error);
