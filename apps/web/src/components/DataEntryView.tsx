import { useState, useEffect } from 'react';
import { RemixIcon } from './RemixIcon';

export interface GlasswareRule {
  id: string;
  circuit: string;
  startYear: number;
  endYear: number;
  awardsGlassware: boolean;
  divisionKeyword?: string;
}

export interface CircuitConfig {
  name: string;
  awardsGlasswareDefault: boolean;
  placements: {
    place: number;
    glassware_type: string;
    trophy_awarded: boolean;
    notes: string;
  }[];
}

export const getSquadDisplayInfo = (notes?: string, p1?: string | null, p2?: string | null, separator = ' & ') => {
  const notesStr = notes || '';
  const squadPlayersMatch = notesStr.match(/^Squad:\s*([^.]+)\./);
  const squadPlayersList = squadPlayersMatch && squadPlayersMatch[1] ? squadPlayersMatch[1].replace(/,/g, separator) : null;
  const displayNotes = notesStr.replace(/^Squad:\s*([^.]+)\.\s*/, '').trim();

  let playersLabel: string;
  if (squadPlayersList) {
    // Squad division: use the parsed roster from notes
    playersLabel = squadPlayersList;
  } else if (p1 && p2) {
    // Standard doubles: show both names
    playersLabel = `${p1}${separator}${p2}`;
  } else if (p1 && !p2) {
    // Singles entry: show only the one player
    playersLabel = p1;
  } else if (!p1 && p2) {
    // Unusual: only p2 known
    playersLabel = p2;
  } else {
    // Both null: city-team or unknown — show nothing (caller shows team_name)
    playersLabel = '';
  }

  return { playersLabel, displayNotes };
};

export const getCircuitBadgeStyle = (circuit: string) => {
  switch ((circuit || '').toUpperCase()) {
    case 'STS':
      return { bg: 'rgba(234, 88, 12, 0.15)', color: '#ea580c' };  // Deep Orange / Fire
    case 'NATIONALS':
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }; // Red
    case 'USAR':
      return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }; // Sky Blue
    case 'NATS':
      return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }; // Purple
    case 'CASR':
      return { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308' };  // Yellow / Gold
    case 'ERS':
      return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };  // Green
    case 'TASR':
      return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };  // Rose / Coral
    case 'MRS':
      return { bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }; // Teal
    case 'UTR':
      return { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }; // Orange
    case 'PRA':
      return { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }; // Indigo
    case 'ILR':
      return { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' };  // Cyan
    case 'GWR':
      return { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }; // Pink
    default:
      return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }; // Slate
  }
};

export const CIRCUIT_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'STS', label: 'STS' },
  { key: 'USAR', label: 'USAR' },
  { key: 'NATS', label: 'NATS' },
  { key: 'NATIONALS', label: 'Nationals' },
  { key: 'CASR', label: 'CASR' },
  { key: 'ERS', label: 'ERS' },
  { key: 'TASR', label: 'TASR' },
  { key: 'MRS', label: 'MRS' },
  { key: 'UTR', label: 'UTR' },
  { key: 'PRA', label: 'PRA' },
  { key: 'ILR', label: 'ILR' },
  { key: 'GWR', label: 'GWR' },
  { key: 'LOCAL', label: 'Local / Etc' },
];

export const CIRCUIT_CONFIGS: Record<string, CircuitConfig> = {
  STS: {
    name: 'STS (Spikeball Tour Series / Challenger)',
    awardsGlasswareDefault: true,
    placements: [
      { place: 1, glassware_type: 'Pitcher', trophy_awarded: true, notes: '1st Place' },
      { place: 2, glassware_type: 'Tankard', trophy_awarded: false, notes: '2nd Place' },
      { place: 3, glassware_type: 'Glass', trophy_awarded: false, notes: '3rd Place' }
    ]
  },
  NATS: {
    name: 'NATS (North American Tour Series)',
    awardsGlasswareDefault: true,
    placements: [
      { place: 1, glassware_type: 'Pitcher', trophy_awarded: true, notes: '1st Place' },
      { place: 2, glassware_type: 'Tankard', trophy_awarded: false, notes: '2nd Place' },
      { place: 3, glassware_type: 'Glass', trophy_awarded: false, notes: '3rd Place' }
    ]
  },
  USAR: {
    name: 'USAR (USA Roundnet)',
    awardsGlasswareDefault: true,
    placements: [
      { place: 1, glassware_type: 'Pitcher', trophy_awarded: true, notes: '1st Place' },
      { place: 2, glassware_type: 'Tankard', trophy_awarded: false, notes: '2nd Place' },
      { place: 3, glassware_type: 'Glass', trophy_awarded: false, notes: '3rd Place' }
    ]
  },
  PRA: {
    name: 'PRA (Players Roundnet Association)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Pro Cash Prize ($)' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Pro Cash Prize ($)' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Pro Cash Prize ($)' }
    ]
  },
  ERS: {
    name: 'ERS (East Roundnet Series)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Gold Medal' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Silver Medal' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Bronze Medal' }
    ]
  },
  TASR: {
    name: 'TASR (Texas Association of Spikeball Roundnet)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Gold Medal' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Silver Medal' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Bronze Medal' }
    ]
  },
  CASR: {
    name: 'CASR (California Spikeball Roundnet)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Gold Medal' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Silver Medal' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Bronze Medal' }
    ]
  },
  MRS: {
    name: 'MRS (Midwest Roundnet Series)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Gold Medal' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Silver Medal' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Bronze Medal' }
    ]
  },
  ILR: {
    name: 'ILR (Illinois Roundnet)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Gold Medal' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Silver Medal' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Bronze Medal' }
    ]
  },
  GWR: {
    name: 'GWR (Greater Washington Roundnet)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '🏆 1st Place / Gold Medal' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '🥈 2nd Place / Silver Medal' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '🥉 3rd Place / Bronze Medal' }
    ]
  },
  UTR: {
    name: 'UTR (Utah Roundnet)',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '1st Place' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '2nd Place' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '3rd Place' },
      { place: 4, glassware_type: 'None', trophy_awarded: false, notes: '4th Place' }
    ]
  },
  NATIONALS: {
    name: 'Nationals (National Championships & Qualifiers)',
    awardsGlasswareDefault: true,
    placements: [
      { place: 1, glassware_type: 'Pitcher', trophy_awarded: true, notes: '1st Place' },
      { place: 2, glassware_type: 'Tankard', trophy_awarded: false, notes: '2nd Place' },
      { place: 3, glassware_type: 'Glass', trophy_awarded: false, notes: '3rd Place' }
    ]
  },
  LOCAL: {
    name: 'Local / Unaffiliated / Etc',
    awardsGlasswareDefault: false,
    placements: [
      { place: 1, glassware_type: 'None', trophy_awarded: true, notes: '1st Place' },
      { place: 2, glassware_type: 'None', trophy_awarded: false, notes: '2nd Place' },
      { place: 3, glassware_type: 'None', trophy_awarded: false, notes: '3rd Place' }
    ]
  }
};

interface PlacementInput {
  place: number;
  team_name: string;
  players: string[];
  glassware_type: string;
  trophy_awarded: boolean;
  notes: string;
}

interface DivisionInput {
  id: string;
  name: string;
  awards_glassware: boolean;
  placements: PlacementInput[];
}

interface TournamentInput {
  name: string;
  date: string;
  location: string;
  tier: string;
  era: string;
  circuit: string;
  slug: string;
  notes: string;
  divisions: DivisionInput[];
}

export function DataEntryView() {
  const [tournament, setTournament] = useState<TournamentInput>({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    location: '',
    tier: 'Major',
    era: 'Modern',
    circuit: 'NATS',
    slug: '',
    notes: '',
    divisions: [
      {
        id: 'div-1',
        name: 'Open Pro',
        awards_glassware: true,
        placements: [
          { place: 1, team_name: '', players: ['', ''], glassware_type: 'Pitcher', trophy_awarded: true, notes: '🏆 Gold / Pitcher' },
          { place: 2, team_name: '', players: ['', ''], glassware_type: 'Tankard', trophy_awarded: false, notes: '🥈 Silver / Tankard' },
          { place: 3, team_name: '', players: ['', ''], glassware_type: 'Glass', trophy_awarded: false, notes: '🥉 Bronze / Glass' }
        ]
      }
    ]
  });

  const [isCircuitManuallySet, setIsCircuitManuallySet] = useState(false);
  const [rules, setRules] = useState<GlasswareRule[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [newRule, setNewRule] = useState<Omit<GlasswareRule, 'id'>>({
    circuit: 'NATS',
    startYear: 2016,
    endYear: 2026,
    awardsGlassware: true,
    divisionKeyword: ''
  });
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch('/api/daemon/glassware-rules');
        const data = await res.json();
        if (Array.isArray(data)) {
          setRules(data);
        }
      } catch (e) {
        console.error('Failed to fetch glassware rules:', e);
      }
    };
    fetchRules();
  }, []);
  const [activeTab, setActiveTab] = useState<'preview' | 'json'>('preview');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const getAutoDetectedCircuit = (slug: string, name: string) => {
    const s = `${slug || ''} ${name || ''}`;
    
    const matches = (pattern: string) => new RegExp(`\\b${pattern}\\b`, 'i').test(s);
    const hasStr = (str: string) => s.toLowerCase().includes(str.toLowerCase());
    
    if (hasStr('azr spring challenger') || hasStr('husky')) return 'LOCAL';

    // STS & Challenger tour stops
    if (matches('sts') || hasStr('challenger') || hasStr('spikeball tour series')) {
      return 'STS';
    }

    // Regional circuit prefixes take precedence
    if (matches('ers') || hasStr('east roundnet series')) return 'ERS';
    if (matches('tasr') || hasStr('texas')) return 'TASR';
    if (matches('casr') || hasStr('california')) return 'CASR';
    if (matches('mrs') || hasStr('midwest')) return 'MRS';
    if (matches('pra') || hasStr('players roundnet association') || hasStr('players roundnet')) return 'PRA';
    if (matches('ilr') || hasStr('illinois')) return 'ILR';
    if (matches('gwr') || hasStr('greater washington')) return 'GWR';
    if (matches('utr') || hasStr('utah roundnet')) return 'UTR';
    if (matches('mra')) return 'MRA'; // e.g. MRA Chicago
    if (matches('mnr')) return 'MNR'; // e.g. MNR @ Como Park

    const hasUsaOrUs = matches('usa') || matches('us') || hasStr('u.s.') || hasStr('usar') || hasStr('usa-') || hasStr('u.s. roundnet') || hasStr('usa roundnet');
    const hasNational = matches('national') || matches('nationals') || matches('natty') || matches('natties') || hasStr('national') || hasStr('nationals') || hasStr('championship') || hasStr('championships');

    // True Nationals must have USA/US/U.S. AND National (or be a US National Team tryout)
    if ((hasNational || hasStr('team tryout') || hasStr('team qualifier') || hasStr('nationals2024')) && hasUsaOrUs) {
      return 'NATIONALS';
    }

    if (matches('nats') || hasStr('north american tour series')) return 'NATS';
    if (hasUsaOrUs || hasStr('usar') || hasStr('usa roundnet') || hasStr('u.s. roundnet')) return 'USAR';
    
    if (matches('local') || matches('open')) return 'LOCAL';
    
    return 'LOCAL'; // Default fallback for etc
  };

  const getDivisionCategory = (name: string): string => {
    const lower = name.toLowerCase();
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
  };

  const getDivisionLevelScore = (name: string): number => {
    const lower = name.toLowerCase();
    if (lower.includes('5.5') || lower.includes('pro') || lower.includes('gold+')) return 5.5;
    if (lower.includes('5.0') || lower.includes('premier') || lower.includes('expert') || lower.includes('elite')) return 5.0;
    if (lower.includes('4.5')) return 4.5;
    if (lower.includes('4.0') || lower.includes('advanced') || lower.includes('challenger')) return 4.0;
    if (lower.includes('3.5')) return 3.5;
    if (lower.includes('3.0') || lower.includes('intermediate') || lower.includes('contender')) return 3.0;
    if (lower.includes('2.0') || lower.includes('recreational') || lower.includes('beginner') || lower.includes('casual')) return 2.0;
    return 1.0;
  };

  const shouldAwardGlassware = (
    circuitKey: string,
    dateStr: string,
    divisionName: string,
    tournamentName?: string,
    allDivisionNames: string[] = [divisionName]
  ): { value: boolean; ruleId?: string } => {
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
      return { value: false };
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
      return { value: specificRule.awardsGlassware, ruleId: specificRule.id };
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
          return { value: false };
        }
      }
      return { value: generalRule.awardsGlassware, ruleId: generalRule.id };
    }

    const config = (CIRCUIT_CONFIGS[circuitKey] || CIRCUIT_CONFIGS.NATS) as CircuitConfig;
    let fallbackValue = config.awardsGlasswareDefault;
    if (fallbackValue && circuitKey === 'USAR' && tournamentName) {
      const lowerName = tournamentName.toLowerCase();
      const isMajor = !lowerName.includes('regional') && !lowerName.includes('national') && !lowerName.includes('usar nationals');
      const isSectional = lowerName.includes('sectional');
      if (!isMajor && !isSectional) {
        fallbackValue = false;
      }
    }
    return { value: fallbackValue };
  };

  const applyCircuitDefaults = (circuitKey: string, divisions: DivisionInput[], dateStr: string, tournamentName?: string): DivisionInput[] => {
    const config = (CIRCUIT_CONFIGS[circuitKey] || CIRCUIT_CONFIGS.NATS) as CircuitConfig;
    const allDivNames = divisions.map(d => d.name);
    
    return divisions.map(div => {
      const { value: awards_glassware } = shouldAwardGlassware(circuitKey, dateStr, div.name, tournamentName, allDivNames);
      
      const isSquad = (div.name || '').toLowerCase().includes('squad');
      const targetLen = isSquad ? 8 : 2;

      const placements = div.placements.map(p => {
        const configPlacement = config.placements.find(cp => cp.place === p.place);
        if (!configPlacement) return p;

        let nextPlayers = [...p.players];
        if (nextPlayers.length < targetLen) {
          while (nextPlayers.length < targetLen) nextPlayers.push('');
        } else if (nextPlayers.length > targetLen) {
          nextPlayers = nextPlayers.slice(0, targetLen);
        }

        return {
          ...p,
          players: nextPlayers,
          glassware_type: awards_glassware ? configPlacement.glassware_type : 'None',
          trophy_awarded: configPlacement.trophy_awarded,
          notes: configPlacement.notes
        };
      });
      return {
        ...div,
        awards_glassware,
        placements
      };
    });
  };

  const handleCircuitChange = (newCircuit: string) => {
    setIsCircuitManuallySet(true);
    setTournament(prev => ({
      ...prev,
      circuit: newCircuit,
      divisions: applyCircuitDefaults(newCircuit, prev.divisions, prev.date, prev.name)
    }));
  };

  const handleMetadataChange = (key: keyof TournamentInput, value: string) => {
    setTournament(prev => {
      const next = { ...prev, [key]: value };
      let circuitToUse = prev.circuit;
      let dateToUse = key === 'date' ? value : prev.date;
      
      if ((key === 'name' || key === 'slug') && !isCircuitManuallySet) {
        const detected = getAutoDetectedCircuit(
          key === 'slug' ? value : prev.slug,
          key === 'name' ? value : prev.name
        );
        if (detected && detected !== prev.circuit) {
          next.circuit = detected;
          circuitToUse = detected;
        }
      }
      
      // If relevant fields changed, update division defaults
      if (key === 'date' || key === 'name' || key === 'slug' || key === 'circuit') {
        next.divisions = applyCircuitDefaults(circuitToUse, prev.divisions, dateToUse, next.name);
      }
      return next;
    });
  };

  const handleDivisionChange = (divId: string, key: keyof DivisionInput, value: any) => {
    setTournament(prev => {
      const updatedDivs = prev.divisions.map(div => {
        if (div.id !== divId) return div;
        let updated = { ...div, [key]: value } as DivisionInput;
        
        // Auto-update glassware_type placeholders if awards_glassware changed
        if (key === 'awards_glassware') {
          const config = (CIRCUIT_CONFIGS[prev.circuit] || CIRCUIT_CONFIGS.NATS) as CircuitConfig;
          updated.placements = div.placements.map(p => {
            const cp = config.placements.find(x => x.place === p.place);
            return {
              ...p,
              glassware_type: value
                ? (cp?.glassware_type || 'Pitcher')
                : 'None'
            };
          });
        }
        return updated;
      });

      // If division name changed, re-evaluate shouldAwardGlassware for ALL divisions!
      if (key === 'name') {
        const allDivNames = updatedDivs.map(d => d.name);
        return {
          ...prev,
          divisions: updatedDivs.map(div => {
            const { value: awards_glassware } = shouldAwardGlassware(prev.circuit, prev.date, div.name, prev.name, allDivNames);
            
            const isSquad = (div.name || '').toLowerCase().includes('squad');
            const targetLen = isSquad ? 8 : 2;

            const config = (CIRCUIT_CONFIGS[prev.circuit] || CIRCUIT_CONFIGS.NATS) as CircuitConfig;
            
            // Adjust players array length
            const placements = div.placements.map(p => {
              const cp = config.placements.find(x => x.place === p.place);
              
              let nextPlayers = [...p.players];
              if (nextPlayers.length < targetLen) {
                while (nextPlayers.length < targetLen) nextPlayers.push('');
              } else if (nextPlayers.length > targetLen) {
                nextPlayers = nextPlayers.slice(0, targetLen);
              }

              return {
                ...p,
                players: nextPlayers,
                glassware_type: awards_glassware ? (cp?.glassware_type || 'Pitcher') : 'None'
              };
            });

            return {
              ...div,
              awards_glassware,
              placements
            };
          })
        };
      }

      return {
        ...prev,
        divisions: updatedDivs
      };
    });
  };

  const handlePlacementChange = (divId: string, place: number, key: keyof PlacementInput, value: any) => {
    setTournament(prev => ({
      ...prev,
      divisions: prev.divisions.map(div => {
        if (div.id !== divId) return div;
        return {
          ...div,
          placements: div.placements.map(p => {
            if (p.place !== place) return p;
            return { ...p, [key]: value };
          })
        };
      })
    }));
  };

  const handlePlayerChange = (divId: string, place: number, playerIndex: number, val: string) => {
    setTournament(prev => ({
      ...prev,
      divisions: prev.divisions.map(div => {
        if (div.id !== divId) return div;
        return {
          ...div,
          placements: div.placements.map(p => {
            if (p.place !== place) return p;
            const newPlayers = [...p.players];
            newPlayers[playerIndex] = val;
            return { ...p, players: newPlayers };
          })
        };
      })
    }));
  };

  const addDivision = () => {
    const newId = `div-${Date.now()}`;
    setTournament(prev => {
      const config = (CIRCUIT_CONFIGS[prev.circuit] || CIRCUIT_CONFIGS.NATS) as CircuitConfig;
      const name = prev.divisions.length === 0 ? 'Open Pro' : 'Advanced';
      
      const isSquad = name.toLowerCase().includes('squad');
      const targetLen = isSquad ? 8 : 2;

      const newDiv: DivisionInput = {
        id: newId,
        name,
        awards_glassware: false,
        placements: [1, 2, 3].map(place => {
          const cp = config.placements.find(x => x.place === place);
          return {
            place,
            team_name: '',
            players: Array(targetLen).fill(''),
            glassware_type: 'None',
            trophy_awarded: cp?.trophy_awarded || false,
            notes: cp?.notes || `${place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'} Place`
          };
        })
      };

      const updatedDivs = [...prev.divisions, newDiv];
      const allDivNames = updatedDivs.map(d => d.name);

      return {
        ...prev,
        divisions: updatedDivs.map(div => {
          const { value: awards_glassware } = shouldAwardGlassware(prev.circuit, prev.date, div.name, prev.name, allDivNames);
          
          const divIsSquad = (div.name || '').toLowerCase().includes('squad');
          const divTargetLen = divIsSquad ? 8 : 2;

          return {
            ...div,
            awards_glassware,
            placements: div.placements.map(p => {
              const cp = config.placements.find(x => x.place === p.place);
              
              let nextPlayers = [...p.players];
              if (nextPlayers.length < divTargetLen) {
                while (nextPlayers.length < divTargetLen) nextPlayers.push('');
              } else if (nextPlayers.length > divTargetLen) {
                nextPlayers = nextPlayers.slice(0, divTargetLen);
              }

              return {
                ...p,
                players: nextPlayers,
                glassware_type: awards_glassware ? (cp?.glassware_type || 'Pitcher') : 'None'
              };
            })
          };
        })
      };
    });
  };

  const removeDivision = (divId: string) => {
    setTournament(prev => {
      const remainingDivs = prev.divisions.filter(d => d.id !== divId);
      const allDivNames = remainingDivs.map(d => d.name);
      const config = (CIRCUIT_CONFIGS[prev.circuit] || CIRCUIT_CONFIGS.NATS) as CircuitConfig;
      
      return {
        ...prev,
        divisions: remainingDivs.map(div => {
          const { value: awards_glassware } = shouldAwardGlassware(prev.circuit, prev.date, div.name, prev.name, allDivNames);
          
          const divIsSquad = (div.name || '').toLowerCase().includes('squad');
          const divTargetLen = divIsSquad ? 8 : 2;

          return {
            ...div,
            awards_glassware,
            placements: div.placements.map(p => {
              const cp = config.placements.find(x => x.place === p.place);
              
              let nextPlayers = [...p.players];
              if (nextPlayers.length < divTargetLen) {
                while (nextPlayers.length < divTargetLen) nextPlayers.push('');
              } else if (nextPlayers.length > divTargetLen) {
                nextPlayers = nextPlayers.slice(0, divTargetLen);
              }

              return {
                ...p,
                players: nextPlayers,
                glassware_type: awards_glassware ? (cp?.glassware_type || 'Pitcher') : 'None'
              };
            })
          };
        })
      };
    });
  };

  const handleAddRule = () => {
    const rule: GlasswareRule = {
      ...newRule,
      id: `rule-${Date.now()}`
    };
    setRules(prev => [...prev, rule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveRules = async () => {
    try {
      const res = await fetch('/api/daemon/glassware-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      const data = await res.json();
      if (data.ok) {
        setShowRulesModal(false);
        setTournament(prev => ({
          ...prev,
          divisions: applyCircuitDefaults(prev.circuit, prev.divisions, prev.date, prev.name)
        }));
      } else {
        alert(data.error || 'Failed to save rules');
      }
    } catch (e) {
      alert('Error occurred while saving glassware rules.');
    }
  };

  const prepareSubmitPayload = (input: TournamentInput): TournamentInput => {
    return {
      ...input,
      divisions: input.divisions.map(div => {
        const isSquad = (div.name || '').toLowerCase().includes('squad');
        if (!isSquad) return div;

        return {
          ...div,
          placements: div.placements.map(p => {
            const cleanPlayers = p.players.map(pl => pl.trim()).filter(Boolean);
            if (cleanPlayers.length === 0) return p;

            // Remove any existing "Squad: ..." prefix from notes first
            const cleanNotes = p.notes.replace(/^Squad:\s*([^.]+)\.\s*/, '');
            const squadNotes = `Squad: ${cleanPlayers.join(', ')}. ${cleanNotes}`;

            return {
              ...p,
              notes: squadNotes.trim()
            };
          })
        };
      })
    };
  };

  const handleSaveLocally = async () => {
    setLoading(true);
    setSaveStatus({ type: null, message: '' });
    try {
      const res = await fetch('/api/daemon/tournaments/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareSubmitPayload(tournament))
      });
      const data = await res.json();
      if (data.ok) {
        setSaveStatus({ type: 'success', message: 'Saved successfully to data/historical-manual-entry.json!' });
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: e.message || 'Error occurred while saving locally.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setLoading(true);
    setSaveStatus({ type: null, message: '' });
    try {
      const res = await fetch('/api/daemon/tournaments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareSubmitPayload(tournament))
      });
      const data = await res.json();
      if (data.ok) {
        setSaveStatus({ type: 'success', message: 'Synced successfully with Supabase!' });
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: e.message || 'Error occurred while syncing with Supabase.' });
    } finally {
      setLoading(false);
    }
  };

  const renderFormEntry = () => {
    return (
      <div className="data-entry-view" style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      gap: '24px',
      padding: '24px',
      overflow: 'hidden',
      color: 'var(--color-fg)',
      backgroundColor: 'var(--color-bg)'
    }}>
      {/* Form Input Side */}
      <div className="data-entry-form-side" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
        paddingRight: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <RemixIcon name="edit-box-line" size={24} style={{ color: 'var(--color-brand)' }} />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Tournament Data Entry</h2>
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-card, rgba(255, 255, 255, 0.15))',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--color-fg)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RemixIcon name="settings-3-line" size={14} /> Glassware Rules
          </button>
        </div>

        {/* Status notification */}
        {saveStatus.type && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: saveStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${saveStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: saveStatus.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <RemixIcon name={saveStatus.type === 'success' ? 'checkbox-circle-line' : 'error-warning-line'} size={18} />
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Metadata Section */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--color-border-card, rgba(255, 255, 255, 0.08))',
          borderRadius: '8px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Tournament Name</label>
            <input
              type="text"
              placeholder="e.g. 2016 National Championship"
              value={tournament.name}
              onChange={(e) => handleMetadataChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Circuit</label>
            <select
              value={tournament.circuit}
              onChange={(e) => handleCircuitChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            >
              {Object.entries(CIRCUIT_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
            {(() => {
              const year = tournament.date ? parseInt(tournament.date.slice(0, 4), 10) : new Date().getFullYear();
              // Find any rule matching the current circuit and year
              const rule = rules.find(r => r.circuit === tournament.circuit && year >= r.startYear && year <= r.endYear);
              if (rule) {
                return (
                  <span style={{ display: 'block', fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Applied rule: {rule.awardsGlassware ? 'Awards Glassware' : 'No Glassware'} ({rule.startYear}-{rule.endYear})
                  </span>
                );
              }
              return null;
            })()}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Slug / Key</label>
            <input
              type="text"
              placeholder="e.g. usar-nats-2016"
              value={tournament.slug}
              onChange={(e) => handleMetadataChange('slug', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Date (YYYY-MM-DD)</label>
            <input
              type="date"
              value={tournament.date}
              onChange={(e) => handleMetadataChange('date', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Location</label>
            <input
              type="text"
              placeholder="e.g. Chicago, IL"
              value={tournament.location}
              onChange={(e) => handleMetadataChange('location', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Tier</label>
            <select
              value={tournament.tier}
              onChange={(e) => handleMetadataChange('tier', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            >
              <option value="National">National</option>
              <option value="National Team Tryout">National Team Tryout</option>
              <option value="Championship">Championship</option>
              <option value="Major">Major</option>
              <option value="Super Major">Super Major</option>
              <option value="Sectional">Sectional</option>
              <option value="Regional">Regional</option>
              <option value="Local">Local</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Era</label>
            <select
              value={tournament.era}
              onChange={(e) => handleMetadataChange('era', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit'
              }}
            >
              <option value="Modern">Modern (Post-2018)</option>
              <option value="Pre-Modern (Pre-2018)">Pre-Modern (Pre-2018)</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Notes</label>
            <textarea
              placeholder="Any comments, descriptions, or links"
              value={tournament.notes}
              onChange={(e) => handleMetadataChange('notes', e.target.value)}
              style={{
                width: '100%',
                height: '60px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                color: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Divisions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Divisions</h3>
            <button
              type="button"
              onClick={addDivision}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-brand)',
                backgroundColor: 'transparent',
                color: 'var(--color-brand)',
                cursor: 'pointer'
              }}
            >
              <RemixIcon name="add-line" size={14} /> Add Division
            </button>
          </div>

          {tournament.divisions.map((div, dIndex) => {
            const isSquad = (div.name || '').toLowerCase().includes('squad');
            return (
              <div key={div.id} style={{
                backgroundColor: 'var(--color-bg-surface, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--color-border-card, rgba(255, 255, 255, 0.08))',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={div.name}
                      onChange={(e) => handleDivisionChange(div.id, 'name', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                        backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                        color: 'inherit',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={div.awards_glassware}
                        onChange={(e) => handleDivisionChange(div.id, 'awards_glassware', e.target.checked)}
                      />
                      Awards Glassware
                    </label>
                  </div>
                  {tournament.divisions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDivision(div.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer'
                      }}
                    >
                      <RemixIcon name="delete-bin-line" size={16} />
                    </button>
                  )}
                </div>

                {/* Placements inside division */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1.5fr 2fr 1fr 1fr', gap: '8px', opacity: 0.6, fontSize: '11px' }}>
                    <div>Place</div>
                    <div>Team Name</div>
                    <div>{isSquad ? 'Squad Players (6-8)' : 'Players (1 & 2)'}</div>
                    <div>Glassware</div>
                    <div>Trophy</div>
                  </div>

                  {div.placements.map((p) => (
                    <div key={p.place} style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1.5fr 2fr 1fr 1fr',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: 600 }}>{p.place === 1 ? '1st' : p.place === 2 ? '2nd' : '3rd'}</div>
                      <input
                        type="text"
                        placeholder="Team Name"
                        value={p.team_name}
                        onChange={(e) => handlePlacementChange(div.id, p.place, 'team_name', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                          backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                          color: 'inherit',
                          fontSize: '13px'
                        }}
                      />
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px'
                      }}>
                        {Array.from({ length: isSquad ? 8 : 2 }).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Player ${idx + 1}`}
                            value={p.players[idx] || ''}
                            onChange={(e) => handlePlayerChange(div.id, p.place, idx, e.target.value)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                              backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                              color: 'inherit',
                              fontSize: '13px'
                            }}
                          />
                        ))}
                      </div>
                    <input
                      type="text"
                      placeholder="Type"
                      value={p.glassware_type}
                      onChange={(e) => handlePlacementChange(div.id, p.place, 'glassware_type', e.target.value)}
                      disabled={!div.awards_glassware}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border-input, rgba(255, 255, 255, 0.15))',
                        backgroundColor: 'var(--color-bg-input, rgba(0, 0, 0, 0.2))',
                        color: 'inherit',
                        fontSize: '13px',
                        opacity: div.awards_glassware ? 1 : 0.4
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        checked={p.trophy_awarded}
                        onChange={(e) => handlePlacementChange(div.id, p.place, 'trophy_awarded', e.target.checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>

        {/* Save Actions */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px 0',
          borderTop: '1px solid var(--color-border-card, rgba(255, 255, 255, 0.08))',
          marginTop: '20px'
        }}>
          <button
            type="button"
            onClick={handleSaveLocally}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-fg)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RemixIcon name="save-3-line" size={16} /> Save to Local JSON
          </button>

          <button
            type="button"
            onClick={handleSyncToSupabase}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--color-brand, #10b981)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RemixIcon name="cloud-windy-line" size={16} /> Sync to Supabase
          </button>
        </div>
      </div>

      {/* Live Preview Side */}
      <div className="data-entry-preview-side" style={{
        width: '400px',
        borderLeft: '1px solid var(--color-border-card, rgba(255, 255, 255, 0.08))',
        paddingLeft: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border-card, rgba(255, 255, 255, 0.08))',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'preview' ? '2px solid var(--color-brand)' : 'none',
              color: activeTab === 'preview' ? 'var(--color-fg)' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Podium Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'json' ? '2px solid var(--color-brand)' : 'none',
              color: activeTab === 'json' ? 'var(--color-fg)' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            JSON Code
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'preview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '16px'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>{tournament.name || 'Untitled Tournament'}</h4>
                <div style={{ fontSize: '13px', opacity: 0.6, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>📅 {tournament.date}</div>
                  <div>📍 {tournament.location || 'Unknown Location'}</div>
                  <div>🏆 {tournament.tier} • {tournament.era}</div>
                </div>
              </div>

              {tournament.divisions.map(div => (
                <div key={div.id} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                    {div.name}
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {div.placements.map(p => (
                      <div key={p.place} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        borderRadius: '6px',
                        backgroundColor: p.place === 1 ? 'rgba(212, 175, 55, 0.05)' : p.place === 2 ? 'rgba(192, 192, 192, 0.05)' : 'rgba(205, 127, 50, 0.05)',
                        border: `1px solid ${p.place === 1 ? 'rgba(212, 175, 55, 0.2)' : p.place === 2 ? 'rgba(192, 192, 192, 0.2)' : 'rgba(205, 127, 50, 0.2)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: p.place === 1 ? '#D4AF37' : p.place === 2 ? '#C0C0C0' : '#CD7F32',
                            color: '#000'
                          }}>{p.place}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.team_name || 'TBD'}</div>
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                              {p.players.filter(Boolean).join(' & ') || 'Unknown Players'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {p.trophy_awarded && <span style={{ fontSize: '10px', backgroundColor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', padding: '2px 6px', borderRadius: '4px' }}>🏆 Trophy</span>}
                          {div.awards_glassware && p.glassware_type && p.glassware_type !== 'None' && (
                            <span style={{ fontSize: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>
                              🍺 {p.glassware_type}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: '16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--color-fg-muted, #a0aec0)',
              overflowX: 'auto',
              margin: 0
            }}>
              {JSON.stringify(tournament, null, 2)}
            </pre>
          )}
        </div>
      </div>
          {/* Glassware Rules Modal */}
      {showRulesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1d24',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '650px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-fg)' }}>Glassware Award Rules</h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer'
                }}
              >
                <RemixIcon name="close-line" size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rules.map((rule) => (
                  <div key={rule.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontWeight: 600, minWidth: '80px', color: 'var(--color-fg)' }}>{rule.circuit}</div>
                    <div style={{ opacity: 0.6, fontSize: '13px', color: 'var(--color-fg)' }}>Years: {rule.startYear} - {rule.endYear}</div>
                    {rule.divisionKeyword && (
                      <div style={{
                        fontSize: '11px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        Filter: "{rule.divisionKeyword}"
                      </div>
                    )}
                    <div style={{
                      marginLeft: 'auto',
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: rule.awardsGlassware ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: rule.awardsGlassware ? '#10b981' : '#ef4444'
                    }}>
                      {rule.awardsGlassware ? 'Awards Glassware' : 'No Glassware'}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'rgba(239, 68, 68, 0.6)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <RemixIcon name="delete-bin-line" size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Rule Form */}
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-fg)' }}>Add New Rule</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1.5fr 0.8fr', gap: '10px' }}>
                  <select
                    value={newRule.circuit}
                    onChange={(e) => setNewRule(prev => ({ ...prev, circuit: e.target.value }))}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: 'inherit'
                    }}
                  >
                    {Object.keys(CIRCUIT_CONFIGS).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Start"
                    value={newRule.startYear}
                    onChange={(e) => setNewRule(prev => ({ ...prev, startYear: parseInt(e.target.value, 10) || 2026 }))}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: 'inherit'
                    }}
                  />

                  <input
                    type="number"
                    placeholder="End"
                    value={newRule.endYear}
                    onChange={(e) => setNewRule(prev => ({ ...prev, endYear: parseInt(e.target.value, 10) || 2026 }))}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: 'inherit'
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Div Keyword (optional)"
                    value={newRule.divisionKeyword || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, divisionKeyword: e.target.value }))}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: 'inherit'
                    }}
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--color-fg)' }}>
                    <input
                      type="checkbox"
                      checked={newRule.awardsGlassware}
                      onChange={(e) => setNewRule(prev => ({ ...prev, awardsGlassware: e.target.checked }))}
                    />
                    Glass?
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'var(--color-brand, #10b981)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  Add Rule
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(0, 0, 0, 0.1)'
            }}>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-fg)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRules}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--color-brand, #10b981)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Save Rules Configuration
              </button>
            </div>
          </div>
        </div>
      )}</div>
    );
  };

  // State for Database Viewer
  const [viewMode, setViewMode] = useState<'entry' | 'browse' | 'winners'>('entry');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [circuitFilter, setCircuitFilter] = useState<string>('ALL');
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null); // "type:id:field"
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<{ key: string; ok: boolean } | null>(null);

  const startEdit = (key: string, currentValue: string) => {
    setEditingField(key);
    setEditValues(prev => ({ ...prev, [key]: currentValue }));
  };

  const cancelEdit = () => setEditingField(null);

  const flashStatus = (key: string, ok: boolean) => {
    setEditStatus({ key, ok });
    setTimeout(() => setEditStatus(null), 2000);
  };

  const commitEdit = async (key: string, endpoint: string, body: Record<string, any>) => {
    setSavingField(key);
    setEditingField(null);
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.ok) {
        flashStatus(key, true);
        // Refresh the detail panel
        if (selectedTournament) {
          await fetchTournamentDetails(selectedTournament.id);
          // If tournament-level field, also refresh tournament list
          if (key.startsWith('tour:')) {
            const tourRes = await fetch('/api/daemon/tournaments');
            const tourData = await tourRes.json();
            if (tourData.ok) {
              setTournaments(tourData.tournaments);
              // Update selectedTournament to reflect changes
              const updated = tourData.tournaments.find((t: any) => t.id === selectedTournament.id);
              if (updated) setSelectedTournament(updated);
            }
          }
        }
      } else {
        flashStatus(key, false);
      }
    } catch {
      flashStatus(key, false);
    } finally {
      setSavingField(null);
    }
  };

  const fetchTournaments = async () => {
    setLoadingDB(true);
    try {
      const res = await fetch('/api/daemon/tournaments');
      const data = await res.json();
      if (data.ok) {
        setTournaments(data.tournaments);
      }
    } catch (e) {
      console.error('Failed to fetch tournaments:', e);
    } finally {
      setLoadingDB(false);
    }
  };

  const fetchWinners = async () => {
    setLoadingDB(true);
    try {
      const res = await fetch('/api/daemon/glassware-winners');
      const data = await res.json();
      if (data.ok) {
        setWinners(data.winners);
      }
    } catch (e) {
      console.error('Failed to fetch glassware winners:', e);
    } finally {
      setLoadingDB(false);
    }
  };

  const fetchTournamentDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/daemon/tournaments/${id}/details`);
      const data = await res.json();
      if (data.ok) {
        setTournamentDetails(data.divisions);
      }
    } catch (e) {
      console.error('Failed to fetch tournament details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    setCircuitFilter('ALL');
    if (viewMode === 'browse') {
      fetchTournaments();
      setSelectedTournament(null);
      setTournamentDetails(null);
    } else if (viewMode === 'winners') {
      fetchWinners();
    }
  }, [viewMode]);

  const renderDatabaseBrowser = () => {
    const filteredTournaments = tournaments.filter(t => {
      const query = searchQuery.toLowerCase();
      const tCircuit = t.Circuit || t.circuit || '';
      const matchesSearch = (t.name || '').toLowerCase().includes(query) ||
                            (t.location || '').toLowerCase().includes(query) ||
                            tCircuit.toLowerCase().includes(query) ||
                            (t.year || '').toString().includes(query);
      
      const matchesCircuit = circuitFilter === 'ALL' || tCircuit === circuitFilter;
      return matchesSearch && matchesCircuit;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden' }}>
        {/* Left Side: Tournament List */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          padding: '24px',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search tournaments by name, location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-fill-tertiary)',
                color: 'var(--text-strong)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              backgroundColor: 'var(--bg-fill-secondary)',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {CIRCUIT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCircuitFilter(tab.key)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: circuitFilter === tab.key ? 'var(--bg-fill)' : 'transparent',
                    color: circuitFilter === tab.key ? 'var(--text-strong)' : 'var(--text-soft)',
                    fontWeight: circuitFilter === tab.key ? 600 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
            {loadingDB ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                Loading database records...
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                No tournaments found matching the filters.
              </div>
            ) : (
              filteredTournaments.map(t => {
                const isSelected = selectedTournament?.id === t.id;
                const circ = t.Circuit || t.circuit || '';
                const badgeStyle = getCircuitBadgeStyle(circ);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTournament(t);
                      fetchTournamentDetails(t.id);
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `1px solid ${isSelected ? 'var(--border-selected)' : 'var(--border)'}`,
                      backgroundColor: isSelected ? 'var(--bg-fill-secondary)' : 'var(--bg-panel)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color
                        }}>
                          {circ || 'NATS'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                          {t.event_date}
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-strong)' }}>{t.name}</h4>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📍 {t.location} • {t.tier} • {t.era}
                      </div>
                    </div>
                    <span style={{ fontSize: '16px', color: 'var(--text-soft)' }}>➔</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Details Pane */}
        <div style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--bg)'
        }}>
          {!selectedTournament ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-soft)',
              gap: '12px'
            }}>
              <span style={{ fontSize: '32px' }}>📊</span>
              <span>Select a tournament to view its divisions and podium results.</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Tournament Header — editable */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    {/* Tournament Name */}
                    {editingField === `tour:${selectedTournament.id}:name` ? (
                      <input
                        autoFocus
                        value={editValues[`tour:${selectedTournament.id}:name`] ?? ''}
                        onChange={e => setEditValues(prev => ({ ...prev, [`tour:${selectedTournament.id}:name`]: e.target.value }))}
                        onBlur={() => commitEdit(`tour:${selectedTournament.id}:name`, `/api/daemon/tournaments/${selectedTournament.id}`, { name: editValues[`tour:${selectedTournament.id}:name`] })}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') cancelEdit(); }}
                        style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', background: 'var(--bg-fill)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '4px 8px', width: '100%', outline: 'none' }}
                      />
                    ) : (
                      <h3
                        onClick={() => startEdit(`tour:${selectedTournament.id}:name`, selectedTournament.name || '')}
                        title="Click to edit"
                        style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', cursor: 'text', borderRadius: '4px', padding: '2px 4px' }}
                        className="editable-field"
                      >
                        {savingField === `tour:${selectedTournament.id}:name` ? <span style={{ opacity: 0.5 }}>Saving…</span> : selectedTournament.name}
                        {editStatus?.key === `tour:${selectedTournament.id}:name` && <span style={{ marginLeft: '8px', fontSize: '13px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                      </h3>
                    )}

                    {/* Date / Location / Circuit / Tier row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                      {([
                        { field: 'event_date', label: '📅', value: selectedTournament.event_date, inputType: 'date' },
                        { field: 'location', label: '📍', value: selectedTournament.location, inputType: 'text' },
                        { field: 'Circuit', label: '🏁', value: selectedTournament.Circuit || selectedTournament.circuit, inputType: 'select', options: Object.keys(CIRCUIT_CONFIGS).concat(['USAR', 'NATS']) },
                        { field: 'tier', label: '⭐', value: selectedTournament.tier, inputType: 'select', options: ['Local', 'Regional', 'Sectional', 'Major', 'Super Major', 'Championship', 'National', 'National Team Tryout'] },
                      ] as Array<{ field: string; label: string; value: string; inputType: string; options?: string[] }>).map(({ field, label, value, inputType, options }) => {
                        const key = `tour:${selectedTournament.id}:${field}`;
                        return (
                          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            <span>{label}</span>
                            {editingField === key ? (
                              inputType === 'select' ? (
                                <select
                                  autoFocus
                                  value={editValues[key] ?? value ?? ''}
                                  onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                                  onBlur={() => commitEdit(key, `/api/daemon/tournaments/${selectedTournament.id}`, { [field]: editValues[key] })}
                                  style={{ fontSize: '12px', background: 'var(--bg-fill)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '2px 4px', color: 'var(--text-strong)', outline: 'none' }}
                                >
                                  {options!.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input
                                  autoFocus
                                  type={inputType}
                                  value={editValues[key] ?? value ?? ''}
                                  onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                                  onBlur={() => commitEdit(key, `/api/daemon/tournaments/${selectedTournament.id}`, { [field]: editValues[key] })}
                                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') cancelEdit(); }}
                                  style={{ fontSize: '12px', background: 'var(--bg-fill)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '2px 4px', color: 'var(--text-strong)', outline: 'none' }}
                                />
                              )
                            ) : (
                              <span
                                onClick={() => startEdit(key, value || '')}
                                title="Click to edit"
                                className="editable-field"
                                style={{ cursor: 'text', padding: '1px 4px', borderRadius: '4px' }}
                              >
                                {savingField === key ? <span style={{ opacity: 0.5 }}>…</span> : (value || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>—</span>)}
                                {editStatus?.key === key && <span style={{ marginLeft: '4px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes */}
                    <div style={{ marginTop: '10px' }}>
                      {editingField === `tour:${selectedTournament.id}:notes` ? (
                        <textarea
                          autoFocus
                          value={editValues[`tour:${selectedTournament.id}:notes`] ?? (selectedTournament.notes || '')}
                          onChange={e => setEditValues(prev => ({ ...prev, [`tour:${selectedTournament.id}:notes`]: e.target.value }))}
                          onBlur={() => commitEdit(`tour:${selectedTournament.id}:notes`, `/api/daemon/tournaments/${selectedTournament.id}`, { notes: editValues[`tour:${selectedTournament.id}:notes`] })}
                          onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                          rows={2}
                          style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace', background: 'var(--bg-fill)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-muted)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(`tour:${selectedTournament.id}:notes`, selectedTournament.notes || '')}
                          title="Click to edit notes"
                          className="editable-field"
                          style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-fill-tertiary)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', cursor: 'text', minHeight: '28px' }}
                        >
                          {selectedTournament.notes || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Click to add notes…</span>}
                          {editStatus?.key === `tour:${selectedTournament.id}:notes` && <span style={{ marginLeft: '6px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divisions + Placements */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }} className="custom-scrollbar">
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                    Loading division details...
                  </div>
                ) : !tournamentDetails || tournamentDetails.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                    No division or podium data found for this tournament.
                  </div>
                ) : (
                  tournamentDetails.map((div: any) => {
                    const divKey = (f: string) => `div:${div.id}:${f}`;
                    return (
                      <div
                        key={div.id}
                        style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', marginBottom: '12px' }}
                      >
                        {/* Division header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                          {/* Division name — inline editable */}
                          {editingField === divKey('division_name') ? (
                            <input
                              autoFocus
                              value={editValues[divKey('division_name')] ?? div.name}
                              onChange={e => setEditValues(prev => ({ ...prev, [divKey('division_name')]: e.target.value }))}
                              onBlur={() => commitEdit(divKey('division_name'), `/api/daemon/divisions/${div.id}`, { division_name: editValues[divKey('division_name')] })}
                              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') cancelEdit(); }}
                              style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: 'var(--text-strong)', background: 'var(--bg-fill)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '3px 8px', outline: 'none' }}
                            />
                          ) : (
                            <h4
                              onClick={() => startEdit(divKey('division_name'), div.name)}
                              title="Click to rename division"
                              className="editable-field"
                              style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-strong)', cursor: 'text', padding: '2px 4px', borderRadius: '4px', flex: 1 }}
                            >
                              {savingField === divKey('division_name') ? <span style={{ opacity: 0.5 }}>Saving…</span> : div.name}
                              {editStatus?.key === divKey('division_name') && <span style={{ marginLeft: '6px', fontSize: '12px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                            </h4>
                          )}

                          {/* Glassware toggle — single click */}
                          <button
                            onClick={() => commitEdit(divKey('awards_glassware'), `/api/daemon/divisions/${div.id}`, { awards_glassware: !div.awards_glassware })}
                            title="Toggle glassware"
                            style={{
                              padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none',
                              backgroundColor: div.awards_glassware ? 'var(--green-bg)' : 'var(--bg-fill-secondary)',
                              color: div.awards_glassware ? 'var(--green)' : 'var(--text-muted)',
                              outline: savingField === divKey('awards_glassware') ? '2px solid var(--accent)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            {savingField === divKey('awards_glassware') ? '⏳' : div.awards_glassware ? '🏆 Glassware' : '🏅 No Glassware'}
                            {editStatus?.key === divKey('awards_glassware') && <span style={{ marginLeft: '4px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                          </button>
                        </div>

                        {/* Placements */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {div.placements.map((p: any) => {
                            const medalEmoji = p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : '🎗️';
                            const { playersLabel } = getSquadDisplayInfo(p.notes, p.player1_name, p.player2_name, ' & ');
                            const pk = (f: string) => `pl:${p.id}:${f}`;

                            const EditableCell = ({ field, value, placeholder, style: cellStyle }: { field: string; value: string; placeholder?: string; style?: React.CSSProperties }) => {
                              const key = pk(field);
                              return editingField === key ? (
                                <input
                                  autoFocus
                                  value={editValues[key] ?? value}
                                  onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                                  onBlur={() => commitEdit(key, `/api/daemon/placements/${p.id}`, { [field]: editValues[key] })}
                                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') cancelEdit(); }}
                                  placeholder={placeholder}
                                  style={{ fontSize: '12px', background: 'var(--bg-fill)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '2px 6px', color: 'var(--text-strong)', outline: 'none', ...cellStyle }}
                                />
                              ) : (
                                <span
                                  onClick={() => startEdit(key, value || '')}
                                  title="Click to edit"
                                  className="editable-field"
                                  style={{ cursor: 'text', padding: '1px 4px', borderRadius: '3px', ...cellStyle }}
                                >
                                  {savingField === key ? <span style={{ opacity: 0.4 }}>…</span> : (value || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>{placeholder || '—'}</span>)}
                                  {editStatus?.key === key && <span style={{ marginLeft: '4px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                                </span>
                              );
                            };

                            return (
                              <div
                                key={p.id}
                                style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-fill-tertiary)', border: '1px solid var(--border)', fontSize: '13px', gap: '10px' }}
                              >
                                <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>{medalEmoji}</span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {/* Team name */}
                                  <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                                    <EditableCell field="team_name" value={p.team_name || ''} placeholder="Team name…" style={{ fontWeight: 600, fontSize: '13px' }} />
                                  </div>
                                  {/* Player 1 */}
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ opacity: 0.5, fontSize: '11px', minWidth: '46px' }}>Player 1</span>
                                    <EditableCell field="player1_name" value={p.player1_name || ''} placeholder="Player name…" style={{ fontSize: '12px' }} />
                                  </div>
                                  {/* Player 2 */}
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ opacity: 0.5, fontSize: '11px', minWidth: '46px' }}>Player 2</span>
                                    <EditableCell field="player2_name" value={p.player2_name || ''} placeholder="Player name…" style={{ fontSize: '12px' }} />
                                  </div>
                                  {/* Notes */}
                                  <div style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ opacity: 0.5, minWidth: '46px' }}>Notes</span>
                                    <EditableCell field="notes" value={p.notes || ''} placeholder="Notes…" style={{ fontSize: '11px', color: 'var(--text-soft)' }} />
                                  </div>
                                </div>
                                {/* Right: glassware badge + type edit */}
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                                  {/* Glassware toggle */}
                                  <button
                                    onClick={() => commitEdit(pk('glassware_awarded'), `/api/daemon/placements/${p.id}`, { glassware_awarded: !p.glassware_awarded })}
                                    style={{
                                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none',
                                      backgroundColor: p.glassware_awarded ? 'var(--amber-bg)' : 'var(--bg-fill-secondary)',
                                      color: p.glassware_awarded ? 'var(--amber)' : 'var(--text-soft)',
                                      outline: savingField === pk('glassware_awarded') ? '2px solid var(--accent)' : 'none',
                                    }}
                                  >
                                    {savingField === pk('glassware_awarded') ? '⏳' : p.glassware_awarded ? '🍺 Awarded' : '🏅 No Glass'}
                                    {editStatus?.key === pk('glassware_awarded') && <span style={{ marginLeft: '3px', color: editStatus.ok ? '#4ade80' : '#f87171' }}>{editStatus.ok ? '✓' : '✗'}</span>}
                                  </button>
                                  {/* Glassware type */}
                                  {p.glassware_awarded && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                                      <EditableCell field="glassware_type" value={p.glassware_type || ''} placeholder="Type…" style={{ fontSize: '11px' }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderGlasswareWinners = () => {
    const filteredWinners = winners.filter(w => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (w.tournament_name || '').toLowerCase().includes(query) ||
                            (w.division_name || '').toLowerCase().includes(query) ||
                            (w.team_name || '').toLowerCase().includes(query) ||
                            (w.player1_name || '').toLowerCase().includes(query) ||
                            (w.player2_name || '').toLowerCase().includes(query) ||
                            (w.glassware_type || '').toLowerCase().includes(query) ||
                            (w.award_notes || '').toLowerCase().includes(query);
      
      const matchesCircuit = circuitFilter === 'ALL' || w.circuit === circuitFilter;
      return matchesSearch && matchesCircuit;
    });

    const getGlasswareEmoji = (type: string) => {
      const lower = (type || '').toLowerCase();
      if (lower.includes('pitcher')) return '🍺';
      if (lower.includes('tankard') || lower.includes('cup')) return '🍺';
      if (lower.includes('shot') || lower.includes('glass')) return '🥃';
      return '🏆';
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search winners by tournament, player, team, glassware..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-fill-tertiary)',
                color: 'var(--text-strong)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Total Glassware Awarded: <strong style={{ color: 'var(--amber)' }}>{filteredWinners.length}</strong>
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            backgroundColor: 'var(--bg-fill-secondary)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            {CIRCUIT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCircuitFilter(tab.key)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: circuitFilter === tab.key ? 'var(--bg-fill)' : 'transparent',
                  color: circuitFilter === tab.key ? 'var(--text-strong)' : 'var(--text-soft)',
                  fontWeight: circuitFilter === tab.key ? 600 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }} className="custom-scrollbar">
          {loadingDB ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
              Loading glassware winners...
            </div>
          ) : filteredWinners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
              No glassware winners found matching the criteria.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Circuit</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Tournament</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Division</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Place</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Team / Players</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Glassware Award</th>
                </tr>
              </thead>
              <tbody>
                {filteredWinners.map((w, idx) => {
                  const placeEmoji = w.place === 1 ? '🥇' : w.place === 2 ? '🥈' : w.place === 3 ? '🥉' : '🏅';
                  const badgeStyle = getCircuitBadgeStyle(w.circuit);
                  return (
                    <tr
                      key={w.placement_id || idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-fill-tertiary)'
                      }}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-soft)' }}>{w.date_won}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color
                        }}>
                          {w.circuit || 'NATS'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-strong)' }}>{w.tournament_name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{w.division_name}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-strong)' }}>
                        <span style={{ marginRight: '6px' }}>{placeEmoji}</span>
                        {w.place === 1 ? '1st' : w.place === 2 ? '2nd' : w.place === 3 ? '3rd' : `${w.place}th`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{w.team_name || 'No Team Name'}</div>
                        {(() => {
                          const pl = getSquadDisplayInfo(w.award_notes, w.player1_name, w.player2_name, ' • ').playersLabel;
                          return pl ? (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {pl}
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{getGlasswareEmoji(w.glassware_type)}</span>
                          <span style={{ fontWeight: 500, color: 'var(--amber)' }}>{w.glassware_type}</span>
                        </div>
                        {getSquadDisplayInfo(w.award_notes, w.player1_name, w.player2_name, ' • ').displayNotes && (
                          <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '2px' }}>
                            {getSquadDisplayInfo(w.award_notes, w.player1_name, w.player2_name, ' • ').displayNotes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="data-entry-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      overflow: 'hidden'
    }}>
      {/* Top Header / View Selector */}
      <div className="data-entry-header" style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-panel)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>Tournament Hub</h2>
          
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-fill-secondary)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setViewMode('entry')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'entry' ? 'var(--bg-fill)' : 'transparent',
                color: viewMode === 'entry' ? 'var(--text-strong)' : 'var(--text-soft)',
                fontWeight: 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Form Entry
            </button>
            <button
              onClick={() => setViewMode('browse')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'browse' ? 'var(--bg-fill)' : 'transparent',
                color: viewMode === 'browse' ? 'var(--text-strong)' : 'var(--text-soft)',
                fontWeight: 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Browse Database
            </button>
            <button
              onClick={() => setViewMode('winners')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'winners' ? 'var(--bg-fill)' : 'transparent',
                color: viewMode === 'winners' ? 'var(--text-strong)' : 'var(--text-soft)',
                fontWeight: 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Glassware Winners
            </button>
          </div>
        </div>

        {viewMode === 'entry' && (
          <button
            onClick={() => setShowRulesModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-strong)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            ⚙️ Glassware Rules Configuration
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {viewMode === 'entry' && renderFormEntry()}
        {viewMode === 'browse' && renderDatabaseBrowser()}
        {viewMode === 'winners' && renderGlasswareWinners()}
      </div>

      <style>{`
        .editable-field:hover {
          background-color: var(--bg-fill-secondary) !important;
          outline: 1px dashed var(--accent, #38bdf8);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
