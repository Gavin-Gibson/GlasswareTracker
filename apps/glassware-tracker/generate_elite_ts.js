import fs from 'fs';

const eliteJson = JSON.parse(fs.readFileSync('./src/spikeball_elite.json', 'utf-8'));

const code = `// Spikeball Elite Official Dataset & Utility Functions
// Source: https://tournaments.spikeball.com/pages/spikeball-elite

export interface EliteTeamEntry {
  year: number;
  division: string;
  teamName: string;
  players: string[];
  rawPlayers: string;
}

export const ELITE_TEAMS: EliteTeamEntry[] = ${JSON.stringify(eliteJson.eliteTeams, null, 2)};

export const PLAYER_FIRST_ELITE_YEAR: Record<string, number> = ${JSON.stringify(eliteJson.playerFirstEliteYear, null, 2)};

export const PLAYER_ALL_ELITE_YEARS: Record<string, number[]> = ${JSON.stringify(eliteJson.playerAllEliteYears, null, 2)};

// Normalize player names for resilient matching
export const normalizePlayerName = (name?: string): string => {
  if (!name) return '';
  let clean = name.trim().replace(/\\s+/g, ' ');
  const lower = clean.toLowerCase();

  if (lower === 'pj showalter' || lower === 'peter showalter' || lower === 'peter jon showalter') return 'Peter Jon Showalter';
  if (lower === 'preston beis') return 'Preston Bies';
  if (lower === 'ashley gingerich-showalter' || lower === 'ashley gingerich showalter') return 'Ashley Showalter';
  if (lower === 'kayla wu fleming') return 'Kayla Wu';
  if (lower === 'jordann vigna') return 'Jordi Vigna';
  if (lower === 'matthew cole') return 'Matt Cole';
  if (lower === 'daniel mcpartland') return 'Dan McPartland';
  if (lower === 'ian  golembeski') return 'Ian Golembeski';
  if (lower === 'alli kauffman' || lower === 'alli kauffman rogers') return 'Alli Rogers';

  return clean;
};

// Check if a player is in the Spikeball Elite roster
export function isElitePlayer(name?: string): boolean {
  if (!name) return false;
  const norm = normalizePlayerName(name);
  if (PLAYER_FIRST_ELITE_YEAR[norm] !== undefined) return true;

  const lower = norm.toLowerCase();
  for (const [k] of Object.entries(PLAYER_FIRST_ELITE_YEAR)) {
    if (k.toLowerCase() === lower) return true;
  }
  return false;
}

// Get the year a player first achieved Spikeball Elite
export function getFirstEliteYear(name?: string): number | null {
  if (!name) return null;
  const norm = normalizePlayerName(name);
  if (PLAYER_FIRST_ELITE_YEAR[norm] !== undefined) return PLAYER_FIRST_ELITE_YEAR[norm];

  const lower = norm.toLowerCase();
  for (const [k, v] of Object.entries(PLAYER_FIRST_ELITE_YEAR)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// Get all years a player achieved Spikeball Elite
export function getAllEliteYears(name?: string): number[] {
  if (!name) return [];
  const norm = normalizePlayerName(name);
  if (PLAYER_ALL_ELITE_YEARS[norm] !== undefined) return PLAYER_ALL_ELITE_YEARS[norm];

  const lower = norm.toLowerCase();
  for (const [k, v] of Object.entries(PLAYER_ALL_ELITE_YEARS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return [];
}

// Formatted Elite tag for badges (e.g. "⭐ Elite '14, '15" or "⭐ Elite '21")
export function getEliteBadgeText(name?: string, short = false): string | null {
  const years = getAllEliteYears(name);
  if (years.length === 0) return null;

  if (short) {
    return '⭐ Elite';
  }

  const yrStrs = years.map(y => \`'\${String(y).slice(-2)}\`).join(', ');
  return \`⭐ Elite \${yrStrs}\`;
}

// Check if a player is an Elite veteran at a specific tournament date/year
// (i.e. tournament year is strictly AFTER the year they first achieved Elite)
export function isEliteVeteranAtDate(name?: string, dateOrYear?: string | number | null): boolean {
  if (!name || !dateOrYear) return false;
  const firstYear = getFirstEliteYear(name);
  if (firstYear === null) return false;

  let eventYear: number;
  if (typeof dateOrYear === 'number') {
    eventYear = dateOrYear;
  } else {
    try {
      eventYear = new Date(dateOrYear).getFullYear();
    } catch {
      return false;
    }
  }

  if (isNaN(eventYear) || eventYear <= 0) return false;
  return eventYear > firstYear;
}

// Check if a team is a recognized Spikeball Elite team
export function getTeamEliteInfo(teamName?: string, rosterPlayers?: string[]): { isElite: boolean; years: number[]; title?: string } {
  if (!teamName && (!rosterPlayers || rosterPlayers.length === 0)) {
    return { isElite: false, years: [] };
  }

  const tLower = (teamName || '').toLowerCase().trim();
  const matchedYears = new Set<number>();

  for (const et of ELITE_TEAMS) {
    const etNameLower = et.teamName.toLowerCase().trim();
    let nameMatches = false;

    if (tLower && (tLower === etNameLower || tLower.includes(etNameLower) || etNameLower.includes(tLower))) {
      nameMatches = true;
    }

    // Also check slash / slash-less variations (e.g., "Cisek/Showalter" vs "Cisek / Showalter")
    if (tLower && tLower.replace(/\\s*\\/\\s*/g, '/') === etNameLower.replace(/\\s*\\/\\s*/g, '/')) {
      nameMatches = true;
    }

    // Check roster match: if both players from the Elite team are in rosterPlayers
    let rosterMatches = false;
    if (rosterPlayers && rosterPlayers.length >= 2 && et.players.length >= 2) {
      const normRoster = rosterPlayers.map(p => normalizePlayerName(p).toLowerCase());
      const p1 = normalizePlayerName(et.players[0]).toLowerCase();
      const p2 = normalizePlayerName(et.players[1]).toLowerCase();
      if (normRoster.includes(p1) && normRoster.includes(p2)) {
        rosterMatches = true;
      }
    }

    if (nameMatches || rosterMatches) {
      matchedYears.add(et.year);
    }
  }

  const years = Array.from(matchedYears).sort((a, b) => a - b);
  if (years.length > 0) {
    const yrStrs = years.map(y => \`'\${String(y).slice(-2)}\`).join(', ');
    return {
      isElite: true,
      years,
      title: \`⭐ Spikeball Elite (\${yrStrs})\`
    };
  }

  return { isElite: false, years: [] };
}
`;

fs.writeFileSync('./src/elite.ts', code);
console.log('src/elite.ts generated successfully!');
