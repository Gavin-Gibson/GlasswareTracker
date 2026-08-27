const https = require('https');

function supabaseRequest(endpoint, method = 'GET', body = null) {
  const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const req = https.request({
      method, hostname: url.hostname, path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAll(endpoint) {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const batch = await supabaseRequest(
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return all;
}

function getTournamentCircuit(slug, name) {
    const s = (slug || '') + ' ' + (name || '');
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
    if (matches('utr') || hasStr('utah roundnet')) return 'UTR';
    if (matches('mra')) return 'MRA'; // Maybe MRA Chicago?
    if (matches('mnr')) return 'MNR'; // MNR @ Como Park
    
    const hasUsaOrUs = matches('usa') || matches('us') || matches('u.s.') || hasStr('usar') || hasStr('usa-');
    const hasNational = matches('national') || matches('natty') || matches('natties') || hasStr('national');

    if ((hasNational || hasStr('team tryout') || hasStr('team qualifier')) && hasUsaOrUs) {
      return 'NATIONALS';
    }

    if (matches('nats') || hasStr('north american tour series')) return 'NATS';
    if (hasUsaOrUs || hasStr('usar') || hasStr('usa roundnet') || hasStr('u.s. roundnet')) return 'USAR';
    
    return null; // Don't return NATS default unless we know, so we can see what isn't matching!
}

async function run() {
  const tournaments = await fetchAll('tournaments');
  console.log(`Found ${tournaments.length} tournaments`);
  
  for (const t of tournaments) {
    const detected = getTournamentCircuit(t.notes || '', t.name);
    const current = t.Circuit || t.circuit;
    
    if (detected && detected !== current) {
      console.log(`Mismatch: "${t.name}" -> DB: ${current}, Detected: ${detected}`);
    } else if (!detected) {
      console.log(`Unknown: "${t.name}" -> DB: ${current}`);
    }
  }
}
run();
