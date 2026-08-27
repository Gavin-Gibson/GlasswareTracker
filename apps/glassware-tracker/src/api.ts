const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';

export async function supabaseRequest(endpoint: string, method = 'GET', body: any = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const options: RequestInit = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    let errorText = '';
    try {
      const errJson = await res.json();
      errorText = JSON.stringify(errJson);
    } catch {
      errorText = await res.text();
    }
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchAll(endpoint: string): Promise<any[]> {
  let all: any[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const batch: any = await supabaseRequest(`${endpoint}${separator}limit=${limit}&offset=${offset}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return all;
}

export function getTournamentCircuit(slug?: string, name?: string): string {
  const s = `${slug || ''} ${name || ''}`.toLowerCase();
  const matches = (pattern: string) => new RegExp(`\\b${pattern}\\b`, 'i').test(s);
  const hasStr = (str: string) => s.includes(str.toLowerCase());

  if (hasStr('azr spring challenger') || hasStr('husky') || hasStr('gold coast')) return 'LOCAL';

  const isOfficialSTS = (
    hasStr('spikeball tour series') || 
    hasStr('spikeball tour stop') || 
    hasStr('spikeball challenger') || 
    hasStr('a spikeball challenger') ||
    (matches('sts') && !hasStr('etst') && !hasStr('tests')) ||
    (hasStr('challenger') && !hasStr('azr spring challenger') && !hasStr('derbycitychallenger'))
  );

  const isNationals = hasStr('nationals') || hasStr('championship') || hasStr('natty') || hasStr('natties');
  const isSpikeballOrUSA = hasStr('spikeball') || hasStr('usa') || hasStr('usar') || hasStr('u.s.');

  // 1. True Nationals
  if (isNationals && isSpikeballOrUSA) {
    return 'NATIONALS';
  }

  // 2. STS Outranks Regional Circuit Tags!
  if (isOfficialSTS) {
    return 'STS';
  }

  // 3. Regional Circuit Tags take priority over generic 'major' and do NOT award glassware
  if (matches('tasr') || hasStr('texas') || hasStr('waco') || hasStr('austin major') || hasStr('houston major') || hasStr('dallas major') || hasStr('round rock major') || hasStr('frisco major') || hasStr('wylie major') || hasStr('collegestationmajor') || hasStr('lafayette major')) {
    return 'TASR';
  }

  if (matches('ura') || hasStr('utah') || hasStr('provo') || hasStr('draper') || hasStr('american fork') || hasStr('taylorsville') || hasStr('rexburg') || hasStr('santaquin') || hasStr('dixie major') || hasStr('pleasant grove') || hasStr('millcreek') || hasStr('centerville')) {
    return 'URA';
  }

  if (matches('casr') || hasStr('california')) return 'CASR';
  if (matches('ers') || hasStr('east roundnet series')) return 'ERS';
  if (matches('mrs') || hasStr('midwest')) return 'MRS';
  if (matches('pra') || hasStr('players roundnet association') || hasStr('players roundnet')) return 'PRA';
  if (matches('ilr') || hasStr('illinois')) return 'ILR';
  if (matches('gwr') || hasStr('greater washington')) return 'GWR';
  if (matches('mnr')) return 'MNR';
  if (matches('mra')) return 'MRA';
  if (matches('ara') || hasStr('australia') || hasStr('sydney major') || hasStr('melbourne major') || hasStr('brisbane major')) return 'ARA';
  if (matches('crs') || hasStr('canada') || hasStr('québec') || hasStr('quebec') || hasStr('vancouver') || hasStr('mississauga') || hasStr('edmonton')) return 'CRS';
  if (matches('ets') || hasStr('european tour')) return 'ETS';
  if (matches('nats') || hasStr('north american tour series')) return 'NATS';
  if (hasStr('usar') || hasStr('usa roundnet') || hasStr('u.s. roundnet')) return 'USAR';
  if (hasStr('major')) return 'MAJORS';

  return 'LOCAL';
}

export async function fetchTournaments() {
  const tournaments = await fetchAll('tournaments?order=event_date.desc');
  return tournaments;
}

export function getDivisionSortPriority(divisionName?: string): number {
  const d = (divisionName || '').toLowerCase();
  // 1. Women's comes first
  if (d.includes('women') || d.includes('female') || d.includes('girl') || d.includes('féminin') || d.includes('feminin')) {
    return 1;
  }
  // 3. Mixed / Co-Ed / Squad comes after Men's / Open
  if (d.includes('mixed') || d.includes('co-ed') || d.includes('coed') || d.includes('squad')) {
    return 3;
  }
  // 2. Men's / Open
  return 2;
}

export function getDivisionCategory(divisionName?: string): 'women' | 'mixed' | 'men' {
  const d = (divisionName || '').toLowerCase();
  if (d.includes('women') || d.includes('female') || d.includes('girl') || d.includes('féminin') || d.includes('feminin')) {
    return 'women';
  }
  if (d.includes('mixed') || d.includes('co-ed') || d.includes('coed') || d.includes('squad')) {
    return 'mixed';
  }
  return 'men';
}

export function inferPlayerGenders(
  divisions: any[],
  placements: any[],
  playerById?: Map<string, string>
): {
  byId: Map<string, 'male' | 'female'>;
  byName: Map<string, 'male' | 'female'>;
} {
  const divMap = new Map(divisions.map((d: any) => [d.id, d.division_name || '']));
  const genderById = new Map<string, 'male' | 'female'>();
  const genderByName = new Map<string, 'male' | 'female'>();

  const isWomensDiv = (name: string) => {
    const s = (name || '').toLowerCase();
    return s.includes('women') || s.includes('womens') || s.includes('female') || s.includes('girl') || s.includes('féminin') || s.includes('feminin');
  };

  const isMixedDiv = (name: string) => {
    const s = (name || '').toLowerCase();
    return s.includes('mixed') || s.includes('co-ed') || s.includes('coed') || s.includes('co_ed');
  };

  const setPlayerGender = (id?: string, name?: string, gender: 'male' | 'female' = 'female') => {
    if (id) genderById.set(id, gender);
    if (name) genderByName.set(name.trim().toLowerCase(), gender);
  };

  // Step 1: Base truth - Any player in a Women's division is Female
  for (const p of placements) {
    const divName = divMap.get(p.division_id) || '';
    if (isWomensDiv(divName)) {
      const p1Name = p.player1_name || (playerById && p.player1_id ? playerById.get(p.player1_id) : undefined);
      const p2Name = p.player2_name || (playerById && p.player2_id ? playerById.get(p.player2_id) : undefined);
      if (p.player1_id || p1Name) setPlayerGender(p.player1_id, p1Name, 'female');
      if (p.player2_id || p2Name) setPlayerGender(p.player2_id, p2Name, 'female');
    }
  }

  // Step 2: Constraint propagation over Mixed / Co-Ed teams
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of placements) {
      const divName = divMap.get(p.division_id) || '';
      if (isMixedDiv(divName)) {
        const p1Name = p.player1_name || (playerById && p.player1_id ? playerById.get(p.player1_id) : undefined);
        const p2Name = p.player2_name || (playerById && p.player2_id ? playerById.get(p.player2_id) : undefined);

        const p1Gender = p.player1_id ? genderById.get(p.player1_id) : (p1Name ? genderByName.get(p1Name.trim().toLowerCase()) : undefined);
        const p2Gender = p.player2_id ? genderById.get(p.player2_id) : (p2Name ? genderByName.get(p2Name.trim().toLowerCase()) : undefined);

        if (p1Gender === 'female' && !p2Gender) {
          setPlayerGender(p.player2_id, p2Name, 'male');
          changed = true;
        } else if (p2Gender === 'female' && !p1Gender) {
          setPlayerGender(p.player1_id, p1Name, 'male');
          changed = true;
        } else if (p1Gender === 'male' && !p2Gender) {
          setPlayerGender(p.player2_id, p2Name, 'female');
          changed = true;
        } else if (p2Gender === 'male' && !p1Gender) {
          setPlayerGender(p.player1_id, p1Name, 'female');
          changed = true;
        }
      }
    }
  }

  // Step 3: Default any player who only ever played in Open divisions to male
  for (const p of placements) {
    const p1Name = p.player1_name || (playerById && p.player1_id ? playerById.get(p.player1_id) : undefined);
    const p2Name = p.player2_name || (playerById && p.player2_id ? playerById.get(p.player2_id) : undefined);
    if (p.player1_id && !genderById.has(p.player1_id)) genderById.set(p.player1_id, 'male');
    if (p.player2_id && !genderById.has(p.player2_id)) genderById.set(p.player2_id, 'male');
    if (p1Name && !genderByName.has(p1Name.trim().toLowerCase())) genderByName.set(p1Name.trim().toLowerCase(), 'male');
    if (p2Name && !genderByName.has(p2Name.trim().toLowerCase())) genderByName.set(p2Name.trim().toLowerCase(), 'male');
  }

  // Explicit base truth overrides
  genderByName.set('etienne cote', 'male');

  return { byId: genderById, byName: genderByName };
}

export function detectTrophyCategory(
  glasswareType?: string | null,
  trophyAwarded?: boolean | null,
  notes?: string | null,
  place?: number | null
): { category: 'Belt' | 'Ring' | 'Trophy' | 'Pitcher' | 'Tankard' | 'Glass'; baseLabel: string; alsoPitcher?: boolean } {
  const t = `${glasswareType || ''} ${notes || ''}`.toLowerCase();
  
  if (t.includes('belt')) {
    const alsoPitcher = t.includes('pitcher') || place === 1;
    return { category: 'Belt', baseLabel: alsoPitcher ? 'Belt & Pitcher' : 'Belt', alsoPitcher };
  }
  if (t.includes('ring')) {
    return { category: 'Ring', baseLabel: 'Ring' };
  }
  if (t.includes('plaque') || t.includes('shield')) {
    return { category: 'Trophy', baseLabel: 'Plaque' };
  }
  if (t.includes('trophy')) {
    return { category: 'Trophy', baseLabel: 'Trophy' };
  }

  // Standard glassware mapping by place or type
  if (t.includes('pitcher') || place === 1) {
    return { category: 'Pitcher', baseLabel: 'Pitcher' };
  }
  if (t.includes('tankard') || t.includes('cup') || place === 2) {
    return { category: 'Tankard', baseLabel: 'Tankard' };
  }
  return { category: 'Glass', baseLabel: 'Glass' };
}

export async function fetchGlasswareWinners() {
  const [placements, divisions, tournaments, players] = await Promise.all([
    fetchAll('placements?glassware_awarded=eq.true'),
    fetchAll('tournament_divisions'),
    fetchAll('tournaments'),
    fetchAll('players?select=id,name'),
  ]);

  const divById = new Map(divisions.map((d: any) => [d.id, d]));
  const tourById = new Map(tournaments.map((t: any) => [t.id, t]));
  const playerById = new Map(players.map((p: any) => [p.id, p.name]));

  // Deduce player genders across the glassware tournament graph
  const genderInference = inferPlayerGenders(divisions, placements, playerById);

  const nonGlasswareCircuits = new Set(['LOCAL', 'ILR', 'PRA', 'GWR', 'MNR', 'MRA', 'TASR', 'URA', 'CASR', 'ERS', 'ARA', 'CRS', 'MAJORS']);

  // Identify tournaments that offer a Women's Pro / Premier / Advanced division
  const toursWithWomensPro = new Set<string>();
  for (const d of divisions) {
    const s = (d.division_name || '').toLowerCase();
    const isWomensPro = (s.includes('women') || s.includes('female')) && (s.includes('pro') || s.includes('premier') || (s.includes('advanced') && !s.includes('intermediate') && !s.includes('contender')));
    if (isWomensPro) {
      toursWithWomensPro.add(d.tournament_id);
    }
  }

  // Identify tournaments that offer a 5.5 Gold+ Open division (e.g. NATS Majors)
  const toursWithOpenGold = new Set<string>();
  for (const d of divisions) {
    const s = (d.division_name || '').toLowerCase();
    if (s.includes('5.5') || s.includes('gold+')) {
      toursWithOpenGold.add(d.tournament_id);
    }
  }

  const winners = placements
    .filter((p: any) => {
      const div = divById.get(p.division_id);
      const tour = div ? tourById.get(div.tournament_id) : null;
      const circuit = (tour?.Circuit || tour?.circuit || '').toUpperCase();
      const isSectionalMrs = circuit === 'MRS' && ((tour?.name || '').toLowerCase().includes('sectional') || (tour?.tier || '').toLowerCase().includes('sectional'));
      const isAllowedCircuit = (!nonGlasswareCircuits.has(circuit) && (circuit !== 'MRS' || isSectionalMrs)) || circuit === 'STS' || circuit === 'NATIONALS' || circuit === 'NATS' || circuit === 'USAR' || circuit === 'ETS';

      const divNameLower = (div?.division_name || '').toLowerCase();
      const isWomensContender = (divNameLower.includes('women') || divNameLower.includes('female')) && (divNameLower.includes('contender') || divNameLower.includes('intermediate'));
      if (isWomensContender && toursWithWomensPro.has(div.tournament_id)) {
        return false; // Only Women's Pro awards glassware when both exist
      }

      // In NATS Majors offering 5.5 Gold+, 5.0 Premier does not award glassware (only 5.5 Gold+ does)
      const isOpenPremier = divNameLower.includes('5.0') && (divNameLower.includes('premier') || divNameLower.includes('bronze'));
      if (isOpenPremier && toursWithOpenGold.has(div.tournament_id)) {
        return false;
      }

      // Override: 2026 Husky Open is a local event (non-glassware)
      if ((tour?.name || '').toLowerCase().includes('husky')) {
        return false;
      }

      // In 2025 USAR Nationals, only top 6.0 Pro divisions award glassware
      const is2025Nationals = ((tour?.name || '').toLowerCase().includes('national championship') || (tour?.name || '').toLowerCase().includes('us roundnet national')) && (tour?.event_date || '').startsWith('2025');
      if (is2025Nationals && !divNameLower.includes('pro') && !divNameLower.includes('6.0')) {
        return false;
      }

      return div && div.awards_glassware === true && isAllowedCircuit;
    })
    .map((p: any) => {
      const div = divById.get(p.division_id);
      const tour = div ? tourById.get(div.tournament_id) : null;
      if (!tour) return null;

      const p1Name = p.player1_id ? (playerById.get(p.player1_id) || null) : null;
      const p2Name = p.player2_id ? (playerById.get(p.player2_id) || null) : null;

      const p1Gender = p.player1_id ? (genderInference.byId.get(p.player1_id) || (p1Name ? genderInference.byName.get(p1Name.toLowerCase()) : 'male')) : (p1Name ? (genderInference.byName.get(p1Name.toLowerCase()) || 'male') : 'male');
      const p2Gender = p.player2_id ? (genderInference.byId.get(p.player2_id) || (p2Name ? genderInference.byName.get(p2Name.toLowerCase()) : 'male')) : (p2Name ? (genderInference.byName.get(p2Name.toLowerCase()) || 'male') : 'male');

      return {
        id: p.id,
        division_id: div.id,
        tournament_id: tour.id,
        tournament_name: tour.name,
        division_name: div.division_name,
        division_category: getDivisionCategory(div.division_name),
        circuit: tour.Circuit || tour.circuit || 'NATS',
        place: p.place,
        team_name: p.team_name || null,
        player1_name: p1Name,
        player2_name: p2Name,
        player1_gender: p1Gender,
        player2_gender: p2Gender,
        glassware_type: p.glassware_type,
        trophy_awarded: p.trophy_awarded,
        award_notes: p.notes,
        date_won: tour.event_date,
      };
    })
    .filter(Boolean);

  // Chronological sort with Division Priority (Women -> Men/Open -> Mixed/Squad)
  winners.sort((a: any, b: any) => {
    const da = a.date_won ? new Date(a.date_won).getTime() : 0;
    const db = b.date_won ? new Date(b.date_won).getTime() : 0;
    if (da !== db) return da - db;
    const tourDiff = (a.tournament_name || '').localeCompare(b.tournament_name || '');
    if (tourDiff !== 0) return tourDiff;

    // Division priority: Women (1) -> Men/Open (2) -> Mixed/Squad (3)
    const prioA = getDivisionSortPriority(a.division_name);
    const prioB = getDivisionSortPriority(b.division_name);
    if (prioA !== prioB) return prioA - prioB;

    if ((a.place || 99) !== (b.place || 99)) return (a.place || 99) - (b.place || 99);
    const divDiff = (a.division_name || '').localeCompare(b.division_name || '');
    if (divDiff !== 0) return divDiff;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Group placements by division to compute tied A/B suffixes
  const divPlacements = new Map<string, any[]>();
  winners.forEach((w: any) => {
    if (!divPlacements.has(w.division_id)) divPlacements.set(w.division_id, []);
    divPlacements.get(w.division_id)!.push(w);
  });

  let pitcherCounter = 1;
  let tankardCounter = 1;
  let glassCounter = 1;
  let beltCounter = 1;
  let ringCounter = 1;
  let medalCounter = 1;
  let trophyCounter = 1;
  let overallCounter = 1;

  const processedDivisions = new Set<string>();
  const numberedWinners: any[] = [];

  winners.forEach((w: any) => {
    if (processedDivisions.has(w.division_id)) return;
    processedDivisions.add(w.division_id);

    const divWinners = divPlacements.get(w.division_id) || [];
    
    // Group placements within the division by detected trophy category
    const categoryGroups = new Map<string, any[]>();
    divWinners.forEach((p: any) => {
      const detected = detectTrophyCategory(p.glassware_type, p.trophy_awarded, p.award_notes, p.place);
      const cat = detected.category;
      if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
      categoryGroups.get(cat)!.push({ ...p, detectedCategory: cat, detectedLabel: detected.baseLabel, alsoPitcher: detected.alsoPitcher });
    });

    categoryGroups.forEach((groupWinners, cat) => {
      // Sort place within category
      groupWinners.sort((a, b) => (a.place || 99) - (b.place || 99));

      // Separate ties by place
      const placeGroups = new Map<number, any[]>();
      groupWinners.forEach((p) => {
        const pl = p.place || 1;
        if (!placeGroups.has(pl)) placeGroups.set(pl, []);
        placeGroups.get(pl)!.push(p);
      });

      placeGroups.forEach((tiedGroup) => {
        let currentCounter = 1;
        if (cat === 'Belt') currentCounter = beltCounter;
        else if (cat === 'Ring') currentCounter = ringCounter;
        else if (cat === 'Trophy') currentCounter = trophyCounter;
        else if (cat === 'Pitcher') currentCounter = pitcherCounter;
        else if (cat === 'Tankard') currentCounter = tankardCounter;
        else currentCounter = glassCounter;

        tiedGroup.forEach((p: any, idx: number) => {
          const suffix = tiedGroup.length > 1 ? String.fromCharCode(65 + idx) : '';
          let label = `${p.detectedLabel || cat} #${currentCounter}${suffix}`;
          if (p.alsoPitcher) {
            label = `Belt #${beltCounter}${suffix} & Pitcher #${pitcherCounter}${suffix}`;
          }
          numberedWinners.push({
            ...p,
            type_number: currentCounter,
            type_suffix: suffix,
            pitcher_number: p.alsoPitcher ? pitcherCounter : undefined,
            type_label: label,
            type_category: cat,
            overall_number: overallCounter++
          });
        });

        if (tiedGroup.length > 0) {
          if (cat === 'Belt') {
            beltCounter++;
            if (tiedGroup.some((p: any) => p.alsoPitcher)) {
              pitcherCounter++;
            }
          }
          else if (cat === 'Ring') ringCounter++;
          else if (cat === 'Trophy') trophyCounter++;
          else if (cat === 'Pitcher') pitcherCounter++;
          else if (cat === 'Tankard') tankardCounter++;
          else glassCounter++;
        }
      });
    });
  });

  return numberedWinners;
}

let cachedPlayerMap: Map<string, string> | null = null;
let lastPlayerMapFetch = 0;

export async function getPlayerMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedPlayerMap && now - lastPlayerMapFetch < 120000) {
    return cachedPlayerMap;
  }
  const players = await fetchAll('players?select=id,name');
  const map = new Map<string, string>();
  if (Array.isArray(players)) {
    for (const p of players) {
      if (p.id && p.name) map.set(p.id, p.name);
    }
  }
  cachedPlayerMap = map;
  lastPlayerMapFetch = now;
  return map;
}

export async function fetchTournamentDetails(id: string) {
  const divisions = await supabaseRequest(`tournament_divisions?tournament_id=eq.${id}`);
  if (!Array.isArray(divisions) || divisions.length === 0) {
    return [];
  }

  const divisionIds = divisions.map(d => d.id);
  const [placements, playerMap] = await Promise.all([
    fetchAll(`placements?division_id=in.(${divisionIds.join(',')})`),
    getPlayerMap()
  ]);

  const formattedDivisions = divisions.map((d: any) => {
    const divPlacements = Array.isArray(placements)
      ? placements
          .filter((p: any) => p.division_id === d.id)
          .map((p: any) => ({
            ...p,
            player1_name: playerMap.get(p.player1_id) || null,
            player2_name: playerMap.get(p.player2_id) || null
          }))
          .sort((a: any, b: any) => a.place - b.place)
      : [];

    return {
      id: d.id,
      name: d.division_name,
      awards_glassware: d.awards_glassware,
      placements: divPlacements
    };
  });

  return formattedDivisions;
}

export async function updateTournament(id: string, patch: Record<string, any>) {
  return await supabaseRequest(`tournaments?id=eq.${id}`, 'PATCH', patch);
}

export async function updateDivision(id: string, patch: Record<string, any>) {
  return await supabaseRequest(`tournament_divisions?id=eq.${id}`, 'PATCH', patch);
}

export async function updatePlacement(id: string, patch: Record<string, any>) {
  if (patch.player1_name !== undefined || patch.player2_name !== undefined) {
    for (const [key, nameVal] of [['player1_name', 'player1_id'], ['player2_name', 'player2_id']] as const) {
      if (patch[key] !== undefined) {
        const name = (patch[key] || '').trim();
        delete patch[key];
        if (!name) {
          patch[nameVal] = null;
        } else {
          const existing: any = await supabaseRequest(`players?name=eq.${encodeURIComponent(name)}&select=id`);
          if (Array.isArray(existing) && existing.length > 0) {
            patch[nameVal] = existing[0].id;
          } else {
            const created: any = await supabaseRequest('players', 'POST', [{ name }]);
            if (Array.isArray(created) && created.length > 0) {
              patch[nameVal] = created[0].id;
            }
          }
        }
      }
    }
  }

  return await supabaseRequest(`placements?id=eq.${id}`, 'PATCH', patch);
}

export async function syncTournamentToSupabase(tourneyData: any) {
  const { tournament, divisions } = tourneyData;
  const playerNames: string[] = [];
  for (const div of divisions) {
    for (const p of div.placements) {
      if (p.player1_name) playerNames.push(p.player1_name.trim());
      if (p.player2_name) playerNames.push(p.player2_name.trim());
    }
  }

  const playerMap = new Map<string, string>();
  if (playerNames.length > 0) {
    const existingPlayers: any = await fetchAll('players?select=id,name');
    if (Array.isArray(existingPlayers)) {
      for (const ep of existingPlayers) {
        if (playerNames.includes(ep.name)) {
          playerMap.set(ep.name, ep.id);
        }
      }
    }

    const uniqueNewPlayers = Array.from(
      new Set(playerNames.filter(name => !playerMap.has(name)))
    );

    if (uniqueNewPlayers.length > 0) {
      const playersToInsert = uniqueNewPlayers.map(name => ({ name }));
      const inserted: any = await supabaseRequest('players', 'POST', playersToInsert);
      if (Array.isArray(inserted)) {
        for (const p of inserted) {
          playerMap.set(p.name, p.id);
        }
      }
    }
  }

  const detectedCircuit = getTournamentCircuit(tournament.slug, tournament.name);
  const tourneyPayload = {
    name: tournament.name,
    year: tournament.year,
    event_date: tournament.event_date,
    location: tournament.location,
    tier: tournament.tier,
    era: tournament.era || 'Modern',
    notes: tournament.notes || (tournament.slug ? `Fwango Slug: ${tournament.slug}` : ''),
    Circuit: tournament.circuit || detectedCircuit
  };

  const tourneyRecordResult: any = await supabaseRequest('tournaments', 'POST', tourneyPayload);
  const tournamentId = tourneyRecordResult && tourneyRecordResult[0] ? tourneyRecordResult[0].id : null;
  if (!tournamentId) throw new Error('Failed to create tournament record');

  for (const div of divisions) {
    const divPayload = {
      tournament_id: tournamentId,
      division_name: div.name,
      awards_glassware: !!div.awards_glassware
    };

    const divRecordResult: any = await supabaseRequest('tournament_divisions', 'POST', divPayload);
    const divisionId = divRecordResult && divRecordResult[0] ? divRecordResult[0].id : null;
    if (!divisionId) continue;

    const placementsPayload = div.placements.map((p: any) => ({
      division_id: divisionId,
      place: p.place,
      team_name: p.team_name || null,
      player1_id: p.player1_name ? playerMap.get(p.player1_name.trim()) || null : null,
      player2_id: p.player2_name ? playerMap.get(p.player2_name.trim()) || null : null,
      glassware_awarded: !!p.glassware_awarded,
      glassware_type: p.glassware_type || 'None',
      trophy_awarded: !!p.trophy_awarded,
      notes: p.notes || null
    }));

    if (placementsPayload.length > 0) {
      await supabaseRequest('placements', 'POST', placementsPayload);
    }
  }

  return { ok: true, tournamentId };
}
