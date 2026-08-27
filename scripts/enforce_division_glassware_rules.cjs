/**
 * Precision Glassware Rules:
 * 1. Open/Men's/Mixed/Co-Ed: ONLY top-tier divisions (Pro, Premier, 5.0+, 5.5, Gold+, Open) award Glassware.
 *    - Open Advanced, Advanced (4.0), Contender (4.5), 3.5 Advanced, Mixed Advanced do NOT award glassware (Medals only).
 * 2. Women's: Women's Pro, Premier, 5.0+, Bronze+, AND Women's Advanced (4.0+, 4.5+) ARE PRESERVED and award Glassware!
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

function isGlasswareDivision(divisionName, allDivisionsInTourney = []) {
  const d = (divisionName || '').toLowerCase().trim();

  // Exclude non-podium/side formats
  if (
    d.includes('intermediate') || 
    d.includes('beginner') || 
    d.includes('recreational') || 
    d.includes('récréatif') ||
    d.includes('youth') || 
    d.includes('junior') || 
    d.includes('ladder') || 
    d.includes('points') || 
    d.includes('scrimmage')
  ) {
    return false;
  }

  const isWomen = d.includes('women') || d.includes('female') || d.includes('girls') || d.includes('féminin');

  // WOMEN'S DIVISIONS: Preserves Women's Pro, Premier, 5.0+, Bronze+, and Women's Advanced!
  if (isWomen) {
    if (d.includes('pro') || d.includes('premier') || d.includes('5.0') || d.includes('5.5') || d.includes('gold') || d.includes('bronze') || d.includes('advanced') || d.includes('avancé') || d.includes('4.5') || d.includes('4.0')) {
      return true;
    }
    if (d === 'women' || d === "women's" || d === "women's division" || d === 'women pro') {
      return true;
    }
    // If it's the only or top women's division
    return true;
  }

  // OPEN / MEN'S / MIXED / CO-ED:
  // Advanced, Contender, 4.0, 3.5, 4.5 are lower tiers and DO NOT award glassware
  const isLowerTier = (
    d.includes('advanced') || 
    d.includes('avancé') || 
    d.includes('contender') || 
    d.includes('3.5') || 
    d.includes('4.0') || 
    d.includes('4.5')
  ) && !d.includes('5.0') && !d.includes('5.5') && !d.includes('gold+');

  if (isLowerTier) {
    return false;
  }

  // Top-tier Open/Men's keywords
  const isTop = (
    d.includes('5.5') || 
    d.includes('5.0') || 
    d.includes('pro') || 
    d.includes('premier') || 
    d.includes('gold+') || 
    d.includes('bronze+') || 
    d.includes('expert 5.0') || 
    d.includes('5.0+')
  );

  if (isTop) return true;

  // Strict standalone Open top divisions
  if (
    d === 'open' || 
    d === 'open division' || 
    d === 'pro/premier' || 
    d === 'open pro'
  ) {
    return true;
  }

  return false;
}

async function run() {
  console.log('🚀 Enforcing Glassware Division Rules (Preserving Women\'s Advanced)...');

  const [tournaments, divisions, placements] = await Promise.all([
    fetchAll('tournaments?order=event_date.desc'),
    fetchAll('tournament_divisions'),
    fetchAll('placements')
  ]);

  const tourMap = new Map(tournaments.map(t => [t.id, t]));
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

  const glasswareCircuits = new Set(['STS', 'NATIONALS', 'NATS', 'USAR', 'ETS']);

  let divisionsUpdated = 0;
  let placementsUpdated = 0;
  let totalGlasswareDivs = 0;

  for (const d of divisions) {
    const t = tourMap.get(d.tournament_id);
    const c = (t?.Circuit || '').toUpperCase();
    const isSectionalMrs = c === 'MRS' && ((t?.name || '').toLowerCase().includes('sectional') || (t?.tier || '').toLowerCase().includes('sectional'));
    const isAllowedCircuit = glasswareCircuits.has(c) || isSectionalMrs;

    const tourneyDivs = divsByTourney.get(d.tournament_id) || [];
    const allDivNames = tourneyDivs.map(td => td.division_name);

    const shouldAward = isAllowedCircuit && isGlasswareDivision(d.division_name, allDivNames);

    if (shouldAward) totalGlasswareDivs++;

    if (d.awards_glassware !== shouldAward) {
      await supabaseRequest(`tournament_divisions?id=eq.${d.id}`, 'PATCH', { awards_glassware: shouldAward });
      divisionsUpdated++;
      console.log(`[Division Update] "${d.division_name}" in "${t?.name}" (${c}) -> awards_glassware: ${shouldAward ? '🍺 YES' : '❌ NO'}`);

      // Update placements for this division
      const divPlaces = placesByDiv.get(d.id) || [];
      for (const p of divPlaces) {
        const rank = p.place || 1;
        let glasswareType = 'None';
        let isGlassware = false;
        let isTrophy = false;

        if (shouldAward) {
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

  console.log('==============================================');
  console.log('✅ RULES ENFORCED SUCCESSFULLY!');
  console.log(`Total Active Glassware Divisions: ${totalGlasswareDivs}`);
  console.log(`Divisions Changed: ${divisionsUpdated}`);
  console.log(`Placements Changed: ${placementsUpdated}`);
  console.log('==============================================');
}

run().catch(console.error);
