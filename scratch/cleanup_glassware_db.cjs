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

// Load glassware rules from the repo config
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/glassware-rules.json'), 'utf8'));

// Categorization and Scoring helpers
function getDivisionCategory(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('women') || lower.includes('girls') || lower.includes('fem')) {
    return "Women's";
  }
  if (lower.includes('mixed') || lower.includes('coed') || lower.includes('co-ed') || lower.includes('squads')) {
    return "Mixed / Other";
  }
  if (lower.includes('registration') || lower.includes('results') || lower.includes('hat bracket') || lower.includes('individual') || lower.includes('squad')) {
    return "Mixed / Other";
  }
  return "Open / Men's";
}

function getDivisionLevelScore(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('5.5') || lower.includes('pro') || lower.includes('gold+')) return 5.5;
  if (lower.includes('5.0') || lower.includes('premier') || lower.includes('expert') || lower.includes('elite')) return 5.0;
  if (lower.includes('4.5')) return 4.5;
  if (lower.includes('4.0') || lower.includes('advanced') || lower.includes('challenger')) return 4.0;
  if (lower.includes('3.5')) return 3.5;
  if (lower.includes('3.0') || lower.includes('intermediate') || lower.includes('contender')) return 3.0;
  if (lower.includes('2.0') || lower.includes('recreational') || lower.includes('beginner') || lower.includes('casual')) return 2.0;
  return 1.0;
}

function shouldAwardGlassware(circuitKey, dateStr, divisionName, tournamentName, allDivisionNames = []) {
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : new Date().getFullYear();
  const nameLower = (divisionName || '').toLowerCase();

  // 0. Perform highest division verification in the current category
  const currentCategory = getDivisionCategory(divisionName);
  const currentScore = getDivisionLevelScore(divisionName);

  // Group other divisions in this category
  const sameCategoryDivs = allDivisionNames.map(name => ({
    name,
    category: getDivisionCategory(name),
    score: getDivisionLevelScore(name)
  })).filter(d => d.category === currentCategory);

  const maxScore = sameCategoryDivs.reduce((max, d) => Math.max(max, d.score), 0);

  // If there's a higher ranked division in the same category, this division gets NO glassware
  if (currentScore < maxScore) {
    return false;
  }
  
  // 1. Try to find a division-specific rule (matches keyword)
  const specificRule = rules.find(
    r => r.circuit === circuitKey &&
         year >= r.startYear &&
         year <= r.endYear &&
         r.divisionKeyword &&
         nameLower.includes(r.divisionKeyword.toLowerCase())
  );
  if (specificRule) {
    return specificRule.awardsGlassware;
  }

  // 2. Try to find a general circuit-year rule
  const generalRule = rules.find(
    r => r.circuit === circuitKey &&
         year >= r.startYear &&
         year <= r.endYear &&
         !r.divisionKeyword
  );
  if (generalRule) {
    if (generalRule.awardsGlassware && circuitKey === 'USAR' && tournamentName) {
      const lowerName = tournamentName.toLowerCase();
      const isMajor = !lowerName.includes('regional') && !lowerName.includes('national') && !lowerName.includes('usar nationals');
      const isSectional = lowerName.includes('sectional');
      if (!isMajor && !isSectional) {
        return false;
      }
    }
    return generalRule.awardsGlassware;
  }

  // Default fallbacks
  const awardsGlasswareDefault = (circuitKey === 'NATS' || circuitKey === 'USAR');
  let fallbackValue = awardsGlasswareDefault;
  if (fallbackValue && circuitKey === 'USAR' && tournamentName) {
    const lowerName = tournamentName.toLowerCase();
    const isMajor = !lowerName.includes('regional') && !lowerName.includes('national') && !lowerName.includes('usar nationals');
    const isSectional = lowerName.includes('sectional');
    if (!isMajor && !isSectional) {
      fallbackValue = false;
    }
  }
  return fallbackValue;
}

async function main() {
  console.log('Fetching all tournaments...');
  const tournaments = await supabaseRequest('tournaments');
  console.log(`Found ${tournaments.length} tournaments.`);

  console.log('Fetching all divisions...');
  const divisions = await supabaseRequest('tournament_divisions');
  console.log(`Found ${divisions.length} divisions.`);

  console.log('Fetching all placements...');
  const placements = await supabaseRequest('placements');
  console.log(`Found ${placements.length} placements.`);

  // Maps and grouping
  const tournamentMap = new Map();
  tournaments.forEach(t => tournamentMap.set(t.id, t));

  const divisionMap = new Map();
  divisions.forEach(d => divisionMap.set(d.id, d));

  const tournamentDivisions = new Map();
  divisions.forEach(d => {
    if (!tournamentDivisions.has(d.tournament_id)) {
      tournamentDivisions.set(d.tournament_id, []);
    }
    tournamentDivisions.get(d.tournament_id).push(d);
  });

  const divisionPlacements = new Map();
  placements.forEach(p => {
    if (!divisionPlacements.has(p.division_id)) {
      divisionPlacements.set(p.division_id, []);
    }
    divisionPlacements.get(p.division_id).push(p);
  });

  let patchedDivisionsCount = 0;
  let patchedPlacementsCount = 0;

  console.log('\nStarting cleanup validation...');

  for (const t of tournaments) {
    const divs = tournamentDivisions.get(t.id) || [];
    const allDivNames = divs.map(d => d.division_name);

    for (const d of divs) {
      const calculatedAwardsGlassware = shouldAwardGlassware(
        t.Circuit || '',
        t.event_date || '',
        d.division_name || '',
        t.name || '',
        allDivNames
      );

      const currentPlacements = divisionPlacements.get(d.id) || [];

      // 1. If division glassware status is incorrect, patch it
      if (d.awards_glassware !== calculatedAwardsGlassware) {
        console.log(` - Patching division "${d.division_name}" in "${t.name}": awards_glassware ${d.awards_glassware} -> ${calculatedAwardsGlassware}`);
        await supabaseRequest(`tournament_divisions?id=eq.${d.id}`, 'PATCH', {
          awards_glassware: calculatedAwardsGlassware
        });
        patchedDivisionsCount++;
      }

      // 2. Validate and patch placements
      for (const p of currentPlacements) {
        let expectedGlasswareAwarded = false;
        let expectedGlasswareType = 'None';

        if (calculatedAwardsGlassware) {
          if (p.place === 1) {
            expectedGlasswareAwarded = true;
            expectedGlasswareType = 'Pitcher';
          } else if (p.place === 2) {
            expectedGlasswareAwarded = true;
            expectedGlasswareType = 'Tankard';
          } else if (p.place === 3) {
            expectedGlasswareAwarded = true;
            expectedGlasswareType = 'Shot Glass';
          }
        }

        const isGlasswareAwardedDiff = p.glassware_awarded !== expectedGlasswareAwarded;
        const isGlasswareTypeDiff = p.glassware_type !== expectedGlasswareType;

        if (isGlasswareAwardedDiff || isGlasswareTypeDiff) {
          console.log(`   * Patching placement Rank ${p.place} in division "${d.division_name}": glassware_awarded (${p.glassware_awarded} -> ${expectedGlasswareAwarded}), glassware_type ("${p.glassware_type}" -> "${expectedGlasswareType}")`);
          await supabaseRequest(`placements?id=eq.${p.id}`, 'PATCH', {
            glassware_awarded: expectedGlasswareAwarded,
            glassware_type: expectedGlasswareType
          });
          patchedPlacementsCount++;
        }
      }
    }
  }

  console.log('\n--- CLEANUP COMPLETE ---');
  console.log(`Total divisions patched: ${patchedDivisionsCount}`);
  console.log(`Total placements patched: ${patchedPlacementsCount}`);
}

main().catch(console.error);
