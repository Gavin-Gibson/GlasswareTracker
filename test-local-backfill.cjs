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
      res.on('end', () => resolve(data ? JSON.parse(data) : null));
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getTournamentCircuit(slug, name) {
    const s = `${slug || ''} ${name || ''}`;
    
    const matches = (pattern) => new RegExp(`\\b${pattern}\\b`, 'i').test(s);
    const hasStr = (str) => s.toLowerCase().includes(str.toLowerCase());
    
    if (matches('sts') || hasStr('challenger') || hasStr('spikeball tour series')) return 'STS';
    if (matches('ers') || hasStr('east roundnet series')) return 'ERS';
    if (matches('tasr') || hasStr('texas')) return 'TASR';
    if (matches('casr') || hasStr('california')) return 'CASR';
    if (matches('mrs') || hasStr('midwest')) return 'MRS';
    if (matches('pra') || hasStr('players roundnet association') || hasStr('players roundnet')) return 'PRA';
    if (matches('ilr') || hasStr('illinois')) return 'ILR';
    if (matches('gwr') || hasStr('greater washington')) return 'GWR';
    if (matches('mra')) return 'MRA';
    if (matches('mnr')) return 'MNR';
    if (matches('utr') || hasStr('utah roundnet')) return 'UTR';

    const hasUsaOrUs = matches('usa') || matches('us') || matches('u.s.') || hasStr('usar') || hasStr('usa-');
    const hasNational = matches('national') || matches('natty') || matches('natties') || hasStr('national') || hasStr('championship') || hasStr('championships');

    if ((hasNational || hasStr('team tryout') || hasStr('team qualifier')) && hasUsaOrUs) return 'NATIONALS';

    if (matches('nats') || hasStr('north american tour series')) return 'NATS';
    if (hasUsaOrUs || hasStr('usar') || hasStr('usa roundnet') || hasStr('u.s. roundnet')) return 'USAR';
    
    if (matches('local') || matches('open')) return 'LOCAL';
    
    return 'LOCAL'; // Default fallback
}

async function run() {
  const tournaments = await supabaseRequest('tournaments');
  console.log(`Total tournaments: ${tournaments.length}`);
  
  let updatedCount = 0;
  for (const t of tournaments) {
    const newCircuit = getTournamentCircuit(t.slug, t.name);
    // If the database has it as NATS (from the old fallback) but the new logic says LOCAL
    if (t.Circuit !== newCircuit && (t.Circuit === 'NATS' || t.Circuit === null)) {
      console.log(`[${t.Circuit} -> ${newCircuit}] ${t.name}`);
      await supabaseRequest(`tournaments?id=eq.${t.id}`, 'PATCH', { Circuit: newCircuit });
      updatedCount++;
    }
  }
  console.log(`Fixed ${updatedCount} tournaments.`);
}

run();
