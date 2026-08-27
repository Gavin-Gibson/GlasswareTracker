/**
 * Apply Circuit Precedence & Glassware Rules
 * 1. STS outranks regional circuit tags and awards glassware.
 * 2. Majors with regional circuit tags (e.g. TASR, URA, CASR, ERS, MRS, etc.) take priority for their circuit tag and DO NOT award glassware.
 */

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

async function fetchAll(endpoint) {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let all = [];
  while (true) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await supabaseRequest(`${endpoint}${sep}limit=${PAGE_SIZE}&offset=${offset}`);
    if (!Array.isArray(res) || res.length === 0) break;
    all.push(...res);
    if (res.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

function classifyTournament(name, slug, currentCircuit) {
  const s = `${slug || ''} ${name || ''}`.toLowerCase();
  
  // STS outranks circuit tag
  const isOfficialSTS = (
    s.includes('spikeball tour series') || 
    s.includes('spikeball tour stop') || 
    s.includes('spikeball challenger') || 
    s.includes('a spikeball challenger') ||
    (s.includes('sts') && !s.includes('etst') && !s.includes('tests')) ||
    (s.includes('challenger') && !s.includes('azr spring challenger') && !s.includes('derbycitychallenger'))
  ) && !s.includes('azr spring challenger');

  const isNationals = s.includes('nationals') || s.includes('championship') || s.includes('natty');
  const isSpikeballOrUSA = s.includes('spikeball') || s.includes('usa') || s.includes('usar') || s.includes('u.s.');

  if (isNationals && isSpikeballOrUSA) {
    return { circuit: 'NATIONALS', awardsGlassware: true };
  }

  if (isOfficialSTS) {
    return { circuit: 'STS', awardsGlassware: true };
  }

  // Regional circuits take priority over generic 'major' and DO NOT award glassware
  if (s.includes('tasr') || s.includes('texas') || s.includes('waco') || s.includes('austin major') || s.includes('houston major') || s.includes('dallas major') || s.includes('round rock major') || s.includes('frisco major') || s.includes('wylie major') || s.includes('collegestationmajor') || s.includes('lafayette major')) {
    return { circuit: 'TASR', awardsGlassware: false };
  }

  if (s.includes('ura') || s.includes('utah') || s.includes('provo') || s.includes('draper') || s.includes('american fork') || s.includes('taylorsville') || s.includes('rexburg') || s.includes('santaquin') || s.includes('dixie major') || s.includes('pleasant grove') || s.includes('millcreek') || s.includes('centerville')) {
    return { circuit: 'URA', awardsGlassware: false };
  }

  if (s.includes('casr') || s.includes('california')) {
    return { circuit: 'CASR', awardsGlassware: false };
  }

  if (s.includes('ers') || s.includes('east roundnet series')) {
    return { circuit: 'ERS', awardsGlassware: false };
  }

  if (s.includes('mrs') || s.includes('midwest')) {
    const isSectional = s.includes('sectional');
    return { circuit: 'MRS', awardsGlassware: isSectional };
  }

  if (s.includes('pra') || s.includes('players roundnet')) {
    return { circuit: 'PRA', awardsGlassware: false };
  }

  if (s.includes('ilr') || s.includes('illinois')) {
    return { circuit: 'ILR', awardsGlassware: false };
  }

  if (s.includes('gwr') || s.includes('greater washington')) {
    return { circuit: 'GWR', awardsGlassware: false };
  }

  if (s.includes('mnr')) {
    return { circuit: 'MNR', awardsGlassware: false };
  }

  if (s.includes('ara') || s.includes('australia') || s.includes('sydney major') || s.includes('melbourne major') || s.includes('brisbane major')) {
    return { circuit: 'ARA', awardsGlassware: false };
  }

  if (s.includes('crs') || s.includes('canada') || s.includes('québec') || s.includes('quebec') || s.includes('vancouver') || s.includes('mississauga') || s.includes('edmonton')) {
    return { circuit: 'CRS', awardsGlassware: false };
  }

  if (s.includes('ets') || s.includes('european tour')) {
    return { circuit: 'ETS', awardsGlassware: true };
  }

  if (s.includes('nats') || s.includes('north american tour series')) {
    return { circuit: 'NATS', awardsGlassware: true };
  }

  if (s.includes('usar')) {
    return { circuit: 'USAR', awardsGlassware: true };
  }

  if (s.includes('major')) {
    return { circuit: 'MAJORS', awardsGlassware: false };
  }

  return { circuit: currentCircuit || 'LOCAL', awardsGlassware: false };
}

async function run() {
  console.log('🚀 Applying Circuit Precedence and Glassware Rules to Supabase...');

  const [tournaments, divisions, placements] = await Promise.all([
    fetchAll('tournaments?order=event_date.desc'),
    fetchAll('tournament_divisions'),
    fetchAll('placements')
  ]);

  const divsByTourney = new Map();
  divisions.forEach(d => {
    if (!divsByTourney.has(d.tournament_id)) divsByTourney.set(d.tournament_id, []);
    divsByTourney.get(d.tournament_id).push(d);
  });

  const placesByDiv = new Map();
  placements.forEach(p => {
    if (!placesByDiv.has(p.division_id)) placesByDiv.set(p.division_id, []);
    placesByDiv.get(p.division_id).push(p);
  });

  let tourneysUpdated = 0;
  let divsUpdated = 0;
  let placementsUpdated = 0;

  for (const t of tournaments) {
    const slugMatch = (t.notes || '').match(/Fwango Slug:\s*([^\s;]+)/i);
    const slug = slugMatch ? slugMatch[1] : '';
    const res = classifyTournament(t.name, slug, t.Circuit);

    // 1. Update tournament circuit if changed
    if (t.Circuit !== res.circuit) {
      await supabaseRequest(`tournaments?id=eq.${t.id}`, 'PATCH', { Circuit: res.circuit });
      tourneysUpdated++;
      console.log(`[Tourney] "${t.name}" -> Circuit: ${t.Circuit} -> ${res.circuit}`);
    }

    // 2. Update divisions and placements for glassware
    const tourneyDivs = divsByTourney.get(t.id) || [];
    for (const d of tourneyDivs) {
      const dName = (d.division_name || '').toLowerCase();
      const isTopDivision = dName.includes('pro') || dName.includes('premier') || dName.includes('5.5') || dName.includes('5.0') || dName.includes('gold+') || dName.includes('advanced');
      
      const shouldAwardGlassware = res.awardsGlassware && isTopDivision;

      if (d.awards_glassware !== shouldAwardGlassware) {
        await supabaseRequest(`tournament_divisions?id=eq.${d.id}`, 'PATCH', { awards_glassware: shouldAwardGlassware });
        divsUpdated++;

        // Update placements for this division
        const divPlaces = placesByDiv.get(d.id) || [];
        for (const p of divPlaces) {
          const rank = p.place || 1;
          let glasswareType = 'None';
          let isGlassware = false;
          let isTrophy = false;

          if (shouldAwardGlassware) {
            isGlassware = rank <= 3;
            if (rank === 1) glasswareType = 'Pitcher';
            else if (rank === 2) glasswareType = 'Tankard / Cup';
            else if (rank === 3) glasswareType = 'Shot Glass / Horn';
          } else {
            isTrophy = rank <= 3;
          }

          if (p.glassware_awarded !== isGlassware || p.glassware_type !== glasswareType || p.trophy_awarded !== isTrophy) {
            await supabaseRequest(`placements?id=eq.${p.id}`, 'PATCH', {
              glassware_awarded: isGlassware,
              glassware_type: glasswareType,
              trophy_awarded: isTrophy
            });
            placementsUpdated++;
          }
        }
      }
    }
  }

  console.log('==============================================');
  console.log('✅ RULES APPLIED SUCCESSFULLY!');
  console.log(`Tournaments Circuit Updated: ${tourneysUpdated}`);
  console.log(`Divisions Updated: ${divsUpdated}`);
  console.log(`Placements Updated: ${placementsUpdated}`);
  console.log('==============================================');
}

run().catch(console.error);
