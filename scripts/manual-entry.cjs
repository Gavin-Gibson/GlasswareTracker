const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log("🏆 Historical Spikeball Tournament Manual Entry 🏆\n");

  const tournament = {
    name: await ask("Tournament Name (e.g., 2016 National Championship): "),
    date: await ask("Date (YYYY-MM-DD): "),
    location: await ask("Location (e.g., Chicago, IL): "),
    tier: await ask("Tier (e.g., Major, Sectional, Championship): "),
    era: "Pre-Modern (Pre-2018)",
    divisions: []
  };

  while (true) {
    const addDivision = (await ask("\nAdd a division? (y/n): ")).toLowerCase();
    if (addDivision !== 'y') break;

    const division = {
      name: await ask("Division Name (e.g., Open Pro, Women's Advanced): "),
      awards_glassware: (await ask("Did this division award Glassware? (y/n): ")).toLowerCase() === 'y',
      placements: []
    };

    console.log("\n--- Placements ---");
    for (let i = 1; i <= 3; i++) {
      const addPlace = (await ask(`Add ${i} place? (y/n): `)).toLowerCase();
      if (addPlace !== 'y') break;

      const teamName = await ask(`  ${i} Place Team Name: `);
      const p1 = await ask(`  Player 1 Name: `);
      const p2 = await ask(`  Player 2 Name: `);
      
      let defaultAward = i === 1 ? "Pitcher" : (i === 2 ? "Tankard / Cup" : "Shot Glass / Horn");
      let defaultNotes = i === 1 ? "🍺 Pitcher" : (i === 2 ? "🍻 Tankard" : "🥃 Shot Glass");

      if (!division.awards_glassware) {
        defaultAward = "None";
        defaultNotes = i === 1 ? "🥇 Gold Medal" : (i === 2 ? "🥈 Silver Medal" : "🥉 Bronze Medal");
      }

      division.placements.push({
        place: i,
        team_name: teamName,
        players: [p1, p2],
        glassware_type: defaultAward,
        notes: defaultNotes,
        trophy_awarded: i === 1 // Usually 1st gets a trophy too
      });
    }

    tournament.divisions.push(division);
  }

  rl.close();

  const outputPath = path.join(__dirname, '../data/historical-manual-entry.json');
  let existingData = [];
  if (fs.existsSync(outputPath)) {
    existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  
  existingData.push(tournament);
  fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));

  console.log(`\n✅ Saved to data/historical-manual-entry.json!`);
  console.log(`You can run the Supabase upload script later to import this data.`);
}

main();
