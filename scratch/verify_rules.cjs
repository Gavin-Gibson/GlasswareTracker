const fs = require('fs');
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function parseFirestoreField(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map(parseFirestoreField);
  }
  if ('mapValue' in field) {
    const res = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      res[k] = parseFirestoreField(v);
    }
    return res;
  }
  return null;
}

function parseFirestoreDoc(doc) {
  const result = { _id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    result[k] = parseFirestoreField(v);
  }
  return result;
}

// Helper to determine category
function getDivisionCategory(name) {
  const lower = name.toLowerCase();
  if (lower.includes('women') || lower.includes('girls') || lower.includes('fem')) {
    return "Women's";
  }
  if (lower.includes('mixed') || lower.includes('coed') || lower.includes('co-ed') || lower.includes('squads')) {
    return "Mixed / Other";
  }
  // Unrecognized/junk divisions to skip or flag
  if (lower.includes('registration') || lower.includes('results') || lower.includes('hat bracket') || lower.includes('individual') || lower.includes('squad')) {
    return "Mixed / Other";
  }
  return "Open / Men's";
}

// Convert division name to a numeric rating level for tier comparison
function getDivisionLevelScore(name) {
  const lower = name.toLowerCase();
  if (lower.includes('5.5') || lower.includes('pro') || lower.includes('gold+')) return 5.5;
  if (lower.includes('5.0') || lower.includes('premier') || lower.includes('expert') || lower.includes('elite')) return 5.0;
  if (lower.includes('4.5')) return 4.5;
  if (lower.includes('4.0') || lower.includes('advanced') || lower.includes('challenger')) return 4.0;
  if (lower.includes('3.5')) return 3.5;
  if (lower.includes('3.0') || lower.includes('intermediate') || lower.includes('contender')) return 3.0;
  if (lower.includes('2.0') || lower.includes('recreational') || lower.includes('beginner') || lower.includes('casual')) return 2.0;
  return 1.0; // default low score
}

function classifyDivisions(divisionsInTourney) {
  // divisionsInTourney: array of strings (division names)
  // We want to map each to its classification
  
  // 1. Group by category
  const categories = divisionsInTourney.map(name => ({
    name,
    category: getDivisionCategory(name),
    score: getDivisionLevelScore(name)
  }));

  // Find max score for Women's and Open categories in this tournament
  const maxWomenScore = Math.max(...categories.filter(c => c.category === "Women's").map(c => c.score), 0);
  const maxOpenScore = Math.max(...categories.filter(c => c.category === "Open / Men's").map(c => c.score), 0);

  return categories.map(c => {
    const isPointsOnly = c.name.toLowerCase().includes('points') || c.name.toLowerCase().includes('ladder');
    let isTopTier = false;

    if (c.category === "Women's") {
      isTopTier = c.score === maxWomenScore && c.score >= 4.0; // Needs to be at least Advanced/4.0+ to be top tier
    } else if (c.category === "Open / Men's") {
      isTopTier = c.score === maxOpenScore && c.score >= 4.5; // Needs to be at least Contender/Elite/4.5+ to be top tier
    }

    // Flag as garbage/junk if it has generic terms like "Final Results" or "Registration"
    const lowerName = c.name.toLowerCase();
    const shouldSkip = lowerName.includes('results') || lowerName.includes('registration') || lowerName.includes('hat bracket') || lowerName.includes('individual') || lowerName.includes('squad') || lowerName.includes('just for');

    return {
      name: c.name,
      category: c.category,
      isTopTier,
      awardsGlassware: isTopTier && !isPointsOnly,
      shouldSkip
    };
  });
}

async function main() {
  const slugs = JSON.parse(fs.readFileSync('data/usar-slugs-discovered.json', 'utf8'));
  console.log(`Analyzing divisions in ${slugs.length} tournaments...`);

  const results = [];
  const batchSize = 15;
  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    await Promise.all(batch.map(async (item) => {
      try {
        const tourneyDocRaw = await fetchJson(
          `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${item.tournamentId}`
        );
        const tourney = parseFirestoreDoc(tourneyDocRaw);
        
        let standingsByDivision = {};
        try {
          const reportDocRaw = await fetchJson(
            `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/reportEvents/${item.tournamentId}`
          );
          if (reportDocRaw.fields) {
            const reportDoc = parseFirestoreDoc(reportDocRaw);
            standingsByDivision = reportDoc.divisions || {};
          }
        } catch (_) {}

        const divisionsConfig = tourney.divisions || tourney.divisionSettings || {};
        const allDivNames = Object.keys(standingsByDivision).map(k =>
          divisionsConfig[k]?.name || divisionsConfig[k]?.divisionName || k
        );

        if (allDivNames.length === 0) return;

        const classified = classifyDivisions(allDivNames);

        results.push({
          slug: item.slug,
          name: item.name,
          divisions: classified
        });
      } catch (err) {
        // Skip fetch errors
      }
    }));
    process.stdout.write(`Processed ${Math.min(i + batchSize, slugs.length)}/${slugs.length}\r`);
  }

  // Write classifications for user review
  fs.writeFileSync('data/usar-division-classifications.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\n\n✅ Analysis complete! Saved classification mappings to data/usar-division-classifications.json');

  // Let's summarize the classifications
  let totalDivs = 0;
  let topTierCount = 0;
  let skippedCount = 0;
  
  results.forEach(r => {
    r.divisions.forEach(d => {
      totalDivs++;
      if (d.isTopTier) topTierCount++;
      if (d.shouldSkip) skippedCount++;
    });
  });

  console.log(`Total Tournaments analyzed: ${results.length}`);
  console.log(`Total Divisions: ${totalDivs}`);
  console.log(`Top Tier Divisions: ${topTierCount}`);
  console.log(`Skipped Divisions (Junk/Admin): ${skippedCount}`);
}

main().catch(console.error);
