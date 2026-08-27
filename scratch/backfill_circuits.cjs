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

function getTournamentCircuit(slug, name) {
  const sLower = (slug || '').toLowerCase();
  const nLower = (name || '').toLowerCase();
  
  if (sLower.startsWith('ers') || nLower.includes('east roundnet series')) return 'ERS';
  if (sLower.startsWith('tasr') || nLower.includes('texas')) return 'TASR';
  if (sLower.startsWith('casr') || nLower.includes('california') || sLower.includes('casr')) return 'CASR';
  if (sLower.startsWith('mrs') || nLower.includes('midwest')) return 'MRS';
  if (sLower.startsWith('pra') || nLower.includes('players roundnet association') || nLower.includes('pra ')) return 'PRA';
  if (sLower.startsWith('ilr') || nLower.includes('illinois')) return 'ILR';
  if (sLower.startsWith('gwr') || nLower.includes('greater washington')) return 'GWR';
  if (sLower.startsWith('nats') || nLower.includes('north american tour series')) return 'NATS';
  if (nLower.includes('usar') || nLower.includes('usa roundnet') || nLower.includes('u.s. roundnet')) return 'USAR';
  
  if (sLower.includes('usar') || sLower.includes('usa-')) return 'USAR';
  return 'USAR'; // fallback
}

async function main() {
  console.log('Fetching all tournaments from Supabase...');
  const tournaments = await supabaseRequest('tournaments?select=id,name,notes');
  console.log(`Found ${tournaments.length} tournaments. Updating circuit values...`);

  for (const t of tournaments) {
    // Extract slug from notes (e.g. "Fwango Slug: natsseattle26")
    const match = t.notes?.match(/Fwango Slug:\s*(\S+)/);
    const slug = match ? match[1] : '';
    const circuit = getTournamentCircuit(slug, t.name);

    console.log(` - "${t.name}" (slug: "${slug}") -> Circuit: ${circuit}`);
    await supabaseRequest(`tournaments?id=eq.${t.id}`, 'PATCH', { Circuit: circuit });
  }

  console.log('✅ All existing tournaments updated with circuit values!');
}

main().catch(console.error);
