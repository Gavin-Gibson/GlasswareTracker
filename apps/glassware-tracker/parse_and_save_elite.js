import fs from 'fs';

const html = fs.readFileSync('/tmp/spikeball_elite.html', 'utf-8');

// The years in order from top to bottom on the page:
const years = [2023, 2022, 2021, 2019, 2018, 2017, 2016, 2015, 2014];

const panes = html.split(/<div class="shogun-tab-pane/i);
panes.shift();

const eliteRecords = [];
const playerFirstEliteYear = {};
const playerAllEliteYears = {};
const eliteTeams = [];

// Name normalization map for any typos on the official Spikeball Elite page
// e.g. "Preston Beis" -> "Preston Bies", "Ashley Gingerich-Showalter" -> "Ashley Showalter", "Kayla Wu Fleming" -> "Kayla Wu"
const normalizeName = (name) => {
  let clean = name.trim();
  if (clean.toLowerCase() === 'preston beis') clean = 'Preston Bies';
  if (clean.toLowerCase() === 'ashley gingerich-showalter') clean = 'Ashley Showalter';
  if (clean.toLowerCase() === 'kayla wu fleming') clean = 'Kayla Wu';
  if (clean.toLowerCase() === 'cody thompson') clean = 'Cody Thompson';
  if (clean.toLowerCase() === 'ali jenki') clean = 'Ali Jenki';
  if (clean.toLowerCase() === 'olivia jenki') clean = 'Olivia Jenki';
  return clean;
};

panes.forEach((pane, idx) => {
  const year = years[idx];
  
  // Split by heading component h1-h6
  const tables = pane.split(/<div class="shogun-heading-component">[\s\S]*?<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi);
  
  for (let t = 1; t < tables.length; t += 2) {
    const divName = tables[t].replace(/<[^>]+>/g, '').trim();
    const tableHtml = tables[t + 1];
    const rows = [...tableHtml.matchAll(/<tr class="shogun-table-row-container">([\s\S]*?)<\/tr>/gi)];
    
    rows.forEach(r => {
      const cols = [...r[1].matchAll(/<td class="shogun-table-row">([\s\S]*?)<\/td>/gi)];
      if (cols.length >= 2) {
        const teamText = cols[0][1].replace(/<[^>]+>/g, '').trim();
        const playersText = cols[1][1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
        
        // Clean rank and team name
        const cleanTeamName = teamText.replace(/^\d+\.\s*/, '').trim();
        
        // Split players by & or and
        const rawPlayers = playersText.split(/\s*&\s*|\s+and\s+/i).map(p => p.trim()).filter(Boolean);
        const players = rawPlayers.map(normalizeName);
        
        eliteTeams.push({
          year,
          division: divName,
          teamName: cleanTeamName,
          players,
          rawPlayers: playersText
        });
        
        players.forEach(p => {
          if (!playerFirstEliteYear[p] || year < playerFirstEliteYear[p]) {
            playerFirstEliteYear[p] = year;
          }
          if (!playerAllEliteYears[p]) {
            playerAllEliteYears[p] = [];
          }
          if (!playerAllEliteYears[p].includes(year)) {
            playerAllEliteYears[p].push(year);
          }
        });
      }
    });
  }
});

console.log('Total Elite Team records:', eliteTeams.length);
console.log('Total Unique Elite Players:', Object.keys(playerFirstEliteYear).length);
console.log('\nAll Elite Players and their First Year:');
Object.entries(playerFirstEliteYear)
  .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
  .forEach(([player, firstYear]) => {
    console.log(`${player} -> First: ${firstYear} (All: ${playerAllEliteYears[player].sort().join(', ')})`);
  });

fs.writeFileSync('./src/spikeball_elite.json', JSON.stringify({
  eliteTeams,
  playerFirstEliteYear,
  playerAllEliteYears
}, null, 2));
