import fs from 'fs';

const html = fs.readFileSync('/tmp/spikeball_elite.html', 'utf-8');

// Parse tab buttons
const tabMatches = [...html.matchAll(/<li[^>]*class="[^"]*shogun-tab[^"]*"[^>]*>[\s\S]*?<\/li>/gi)];
const tabNames = tabMatches.map(t => t[0].replace(/<[^>]+>/g, '').trim());
console.log('Tab names:', tabNames);

// Split by tab panes
const panes = html.split(/<div class="shogun-tab-pane/i);
panes.shift();

console.log('Found panes:', panes.length);

panes.forEach((pane, idx) => {
  const year = tabNames[idx] || `Pane_${idx}`;
  const clean = pane
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  console.log(`\n=== YEAR ${year} ===`);
  console.log(clean.join('\n'));
});
