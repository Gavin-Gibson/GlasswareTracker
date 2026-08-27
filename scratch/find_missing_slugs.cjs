const fs = require('fs');
const path = require('path');
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
  const dbTournaments = await supabaseRequest('tournaments?select=id,name,notes');
  const dbSlugs = new Set();
  for (const t of dbTournaments) {
    const slugMatch = t.notes?.match(/Fwango Slug:\s*(.+)$/);
    if (slugMatch) {
      dbSlugs.add(slugMatch[1].trim());
    }
  }

  const dataDir = path.join(__dirname, '../data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.endsWith('-all.json') && f !== 'glassware-rules.json' && f !== 'contributors.json' && f !== 'usar-division-classifications.json' && f !== 'usar-unclassified-divisions.json' && f !== 'usar-slugs-discovered.json');
  
  console.log('Comparing files...');
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const tournaments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missing = [];
    for (const t of tournaments) {
      if (!dbSlugs.has(t.slug)) {
        missing.push(t.slug);
      }
    }
    if (missing.length > 0) {
      console.log(`- File ${file}: ${missing.length} missing slugs in Supabase:`, missing);
    } else {
      console.log(`- File ${file}: all slugs present in Supabase.`);
    }
  }
}

main().catch(console.error);
