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

async function main() {
  const slugs = JSON.parse(fs.readFileSync('data/usar-slugs-discovered.json', 'utf8'));
  console.log(`Analyzing ${slugs.length} slugs for dates...`);
  
  const results = [];
  const batchSize = 15;
  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    await Promise.all(batch.map(async (item) => {
      try {
        const tourneyRaw = await fetchJson(
          `https://firestore.googleapis.com/v1/projects/roundnet-4e9b0/databases/(default)/documents/tournaments/${item.tournamentId}`
        );
        const startDate = tourneyRaw.fields?.startDate?.timestampValue || '';
        results.push({
          slug: item.slug,
          name: item.name,
          startDate
        });
      } catch (err) {
        results.push({
          slug: item.slug,
          name: item.name,
          startDate: 'error'
        });
      }
    }));
    process.stdout.write(`Resolved ${results.length}/${slugs.length}\r`);
  }
  
  // Sort descending by date
  results.sort((a, b) => b.startDate.localeCompare(a.startDate));
  
  console.log('\nTop 10 Most Recent USAR Tournaments (Chronological):');
  results.slice(0, 10).forEach(r => {
    console.log(` - ${r.startDate} | ${r.slug} | ${r.name}`);
  });
}

main().catch(console.error);
