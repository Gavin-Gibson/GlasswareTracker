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

function classifyDivisionAwards(divisionName, allDivisionsInTourney) {
  const divLower = divisionName.toLowerCase();
  const isPointsOnly = divLower.includes('points') || divLower.includes('ladder');
  const isWomen = divLower.includes('women');
  const isOpen = !isWomen && (divLower.includes('open') || divLower.includes('men') || divLower.includes('pro') || divLower.includes('premier'));

  let isTopTier = false;
  if (isWomen) {
    const hasHigherWomenDiv = allDivisionsInTourney.some(d => {
      const name = d.toLowerCase();
      return name.includes('women') && (name.includes('5.0') || name.includes('5.5') || name.includes('pro') || name.includes('premier') || name.includes('gold'));
    });
    if (divLower.includes('5.5') || divLower.includes('5.0') || divLower.includes('pro') || divLower.includes('premier') || divLower.includes('gold')) {
      isTopTier = true;
    } else if (!hasHigherWomenDiv && (divLower.includes('4.5') || divLower.includes('advanced'))) {
      isTopTier = true;
    }
  } else if (isOpen) {
    if (divLower.includes('5.5') || divLower.includes('gold+') || divLower.includes('pro')) {
      isTopTier = true;
    } else {
      const has55 = allDivisionsInTourney.some(d => d.toLowerCase().includes('5.5') || d.toLowerCase().includes('gold+'));
      if (!has55 && (divLower.includes('5.0') || divLower.includes('premier'))) {
        isTopTier = true;
      }
    }
  }

  // We flag divisions that fall into Mixed / Other OR that have unclear terms
  const needsReview = !isWomen && !isOpen;

  return {
    awardsGlassware: isTopTier && !isPointsOnly,
    category: isWomen ? "Women's" : (isOpen ? "Open / Men's" : 'Mixed / Other'),
    isTopTier,
    needsReview
  };
}

async function main() {
  const slugs = JSON.parse(fs.readFileSync('data/usar-slugs-discovered.json', 'utf8'));
  console.log(`Checking classifications for divisions in ${slugs.length} tournaments...`);

  const unclassified = [];
  const allClassifications = [];

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

        for (const [divKey, divStandings] of Object.entries(standingsByDivision)) {
          const standingsList = divStandings.standings || [];
          if (!standingsList.length) continue;

          const divMeta = divisionsConfig[divKey] || {};
          const divisionName = divMeta.name || divMeta.divisionName || divKey;
          const classification = classifyDivisionAwards(divisionName, allDivNames);

          if (classification.needsReview) {
            unclassified.push({
              tournamentSlug: item.slug,
              tournamentName: item.name,
              divisionName,
              classification
            });
          }
        }
      } catch (err) {
        // Skip fetch errors for check stage
      }
    }));
    process.stdout.write(`Processed ${Math.min(i + batchSize, slugs.length)}/${slugs.length}\r`);
  }

  console.log('\n\n--- CHECK COMPLETE ---');
  console.log(`Found ${unclassified.length} divisions flagged for manual review/Mixed classification:`);
  
  // Write to a local file for inspection
  fs.writeFileSync('data/usar-unclassified-divisions.json', JSON.stringify(unclassified, null, 2), 'utf8');
  console.log('Saved to data/usar-unclassified-divisions.json');

  unclassified.slice(0, 30).forEach(u => {
    console.log(`[${u.tournamentSlug}] "${u.divisionName}" classified as "${u.classification.category}"`);
  });
  if (unclassified.length > 30) {
    console.log(`... and ${unclassified.length - 30} more (see usar-unclassified-divisions.json)`);
  }
}

main().catch(console.error);
