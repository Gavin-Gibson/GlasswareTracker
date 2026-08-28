import React, { useState, useEffect, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import * as api from './api';
import * as elite from './elite';
import tournamentStatsDataRaw from './tournament_stats.json';

const tournamentStatsData: Record<string, { totalChampions: number; futureChampions: number; glasswareAwarded: number; totalParticipants?: number }> = tournamentStatsDataRaw as any;

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

export const getSquadPlayers = (notes?: string, p1?: string | null, p2?: string | null): string[] => {
  const notesStr = notes || '';
  const squadPlayersMatch = notesStr.match(/Squad:\s*([^.]+)\./i);
  if (squadPlayersMatch && squadPlayersMatch[1]) {
    const list = squadPlayersMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  const fallback: string[] = [];
  if (p1 && p1.trim()) fallback.push(p1.trim());
  if (p2 && p2.trim()) fallback.push(p2.trim());
  return fallback;
};

export const getSquadDisplayInfo = (notes?: string, p1?: string | null, p2?: string | null, separator = ' • ') => {
  const players = getSquadPlayers(notes, p1, p2);
  const notesStr = notes || '';
  const displayNotes = notesStr.replace(/Squad:\s*([^.]+)\.\s*/i, '').trim();
  const playersLabel = players.join(separator);

  return { playersLabel, displayNotes, players };
};

export const getCircuitBadgeStyle = (circuit: string) => {
  switch ((circuit || '').toUpperCase()) {
    case 'NATIONALS':
    case 'NATS':
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' };
    case 'STS':
      return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' };
    case 'USAR':
      return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
    case 'ETS':
      return { bg: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf', border: 'rgba(45, 212, 191, 0.35)' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)' };
  }
};

export const CIRCUIT_TABS = [
  { key: 'ALL', label: 'All Circuits', icon: '🌐' },
  { key: 'NATIONALS', label: 'Nationals', icon: '🇺🇸' },
  { key: 'STS', label: 'STS Tour Stops', icon: '⚡' },
  { key: 'USAR', label: 'USAR Regionals', icon: '🛡️' },
  { key: 'ETS', label: 'ETS Europe', icon: '🌍' }
];

export const getDivisionCategoryBadgeStyle = (category?: string) => {
  switch ((category || '').toLowerCase()) {
    case 'women':
      return { bg: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', border: 'rgba(244, 114, 182, 0.35)', label: "Women's" };
    case 'mixed':
      return { bg: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', border: 'rgba(167, 139, 250, 0.35)', label: 'Mixed' };
    default:
      return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', label: "Men's / Open" };
  }
};

export const getGlasswareDetails = (type?: string, place?: number, typeNum?: string | number, typeSuffix?: string, typeLabel?: string) => {
  const t = (type || '').toLowerCase();
  const numStr = typeNum ? (typeSuffix ? `${typeNum}${typeSuffix}` : `${typeNum}`) : '';
  const customLabel = typeLabel || '';

  // Explicit Championship Belt Award
  if (t === 'belt' || t.includes('belt') || customLabel.includes('Belt')) {
    return {
      type: 'Belt',
      label: customLabel || (numStr ? `Belt #${numStr}` : 'Championship Belt'),
      serial: numStr ? `#${numStr}` : '',
      icon: '🥋',
      medal: place === 1 ? '🥇 1st Place' : place === 2 ? '🥈 2nd Place' : '🥉 3rd Place',
      badgeBg: 'rgba(245, 158, 11, 0.2)',
      badgeColor: '#fbbf24',
      badgeBorder: '#d97706',
      glowClass: 'glow-gold'
    };
  }

  // 1st Place Pitcher
  if (t === 'pitcher' || place === 1) {
    return {
      type: 'Pitcher',
      label: customLabel || (numStr ? `Pitcher #${numStr}` : '1st Place Pitcher'),
      serial: numStr ? `#${numStr}` : '',
      icon: '🍺',
      medal: '🥇 1st Place',
      badgeBg: 'rgba(251, 191, 36, 0.15)',
      badgeColor: '#fbbf24',
      badgeBorder: 'rgba(251, 191, 36, 0.4)',
      glowClass: 'glow-gold'
    };
  }

  // 2nd Place Tankard
  if (t === 'tankard' || t === 'cup' || place === 2) {
    return {
      type: 'Tankard',
      label: customLabel || (numStr ? `Tankard #${numStr}` : '2nd Place Tankard'),
      serial: numStr ? `#${numStr}` : '',
      icon: '🍻',
      medal: '🥈 2nd Place',
      badgeBg: 'rgba(226, 232, 240, 0.15)',
      badgeColor: '#e2e8f0',
      badgeBorder: 'rgba(226, 232, 240, 0.4)',
      glowClass: 'glow-silver'
    };
  }

  // 3rd Place Shot Glass / Horn
  return {
    type: 'Glass',
    label: customLabel || (numStr ? `Glass #${numStr}` : '3rd Place Glass'),
    serial: numStr ? `#${numStr}` : '',
    icon: '🥃',
    medal: '🥉 3rd Place',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    badgeColor: '#fb923c',
    badgeBorder: 'rgba(249, 115, 22, 0.4)',
    glowClass: 'glow-bronze'
  };
};

export const BeltIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    {/* Outer Belt Strap (Dark Stitched Leather with Notch End) */}
    <path
      d="M2 8.5C2 7.67157 2.67157 7 3.5 7H20.5C21.3284 7 22 7.67157 22 8.5V15.5C22 16.3284 21.3284 17 20.5 17H3.5C2.67157 17 2 16.3284 2 15.5V8.5Z"
      fill="#1c1917"
      stroke="#b45309"
      strokeWidth="1.2"
    />
    {/* Inner Leather Accent Lines */}
    <line x1="2" y1="9.5" x2="22" y2="9.5" stroke="#78350f" strokeWidth="0.75" strokeDasharray="1.5 1" />
    <line x1="2" y1="14.5" x2="22" y2="14.5" stroke="#78350f" strokeWidth="0.75" strokeDasharray="1.5 1" />
    {/* Left & Right Gold Side Plates */}
    <rect x="4.5" y="8.5" width="2.5" height="7" rx="1" fill="url(#goldPlateGrad)" stroke="#f59e0b" strokeWidth="0.6" />
    <rect x="17" y="8.5" width="2.5" height="7" rx="1" fill="url(#goldPlateGrad)" stroke="#f59e0b" strokeWidth="0.6" />
    {/* Center Gold Medallion Shield */}
    <path
      d="M12 5.5L16 7.8V13.2C16 16 13.8 18 12 18.8C10.2 18 8 16 8 13.2V7.8L12 5.5Z"
      fill="url(#goldMainGrad)"
      stroke="#fef08a"
      strokeWidth="0.8"
    />
    {/* Inner Crown / Star Emblem inside Shield */}
    <path
      d="M12 8.2L12.9 10.1L15 10.4L13.5 11.8L13.9 13.8L12 12.8L10.1 13.8L10.5 11.8L9 10.4L11.1 10.1L12 8.2Z"
      fill="#78350f"
    />
    {/* Gradients */}
    <defs>
      <linearGradient id="goldMainGrad" x1="8" y1="5.5" x2="16" y2="18.8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.35" stopColor="#fbbf24" />
        <stop offset="0.7" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="goldPlateGrad" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#fef08a" />
        <stop offset="0.5" stopColor="#fbbf24" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
    </defs>
  </svg>
);

export interface AnalyzedTournamentParticipant {
  playerName: string;
  divisionName: string;
  divisionId: string;
  teamName: string | null;
  place: number;
  isGlasswareWinnerEver: boolean;
  status: 'breakthrough' | 'won_here' | 'prior_winner' | 'future_winner' | 'no_glassware';
  winsHere: any[];
  priorWins: any[];
  futureWins: any[];
  allCareerWins: any[];
  firstEverWin: any | null;
  firstFutureWin: any | null;
  totalCareerPieces: number;
  careerPitchers: number;
  careerTankards: number;
  careerGlasses: number;
  careerBelts: number;
  careerOther: number;
  daysToFirstWin?: number;
}

export interface PlayerHardwareEntry {
  tournamentId: string;
  tournamentName: string;
  divisionName: string;
  divisionCategory?: string;
  date: string;
  typeLabel: string;
  typeCategory: string;
  place: number;
  circuit: string;
  overallNumber: number;
  typeNumber?: string | number;
  typeSuffix?: string;
  notes?: string;
  teamName?: string;
  teammates: string[];
}

export interface TeamHardwareEntry {
  tournamentId: string;
  tournamentName: string;
  divisionName: string;
  date: string;
  typeLabel: string;
  typeCategory: string;
  place: number;
  circuit: string;
  overallNumber: number;
  notes?: string;
  players: string[];
}

export interface SherpaEntry {
  rookieName: string;
  tournamentId: string;
  tournamentName: string;
  divisionName: string;
  divisionCategory: string;
  date: string;
  hardwareType: string;
  place: number;
}

export interface PlayerRecord {
  name: string;
  gender?: 'male' | 'female';
  isElite?: boolean;
  firstEliteYear?: number | null;
  allEliteYears?: number[];
  eliteBadgeText?: string | null;
  pitchers: number;
  tankards: number;
  glasses: number;
  belts: number;
  otherTrophies: number;
  total: number;
  sherpaScore: number;
  sherpaList: SherpaEntry[];
  pitcherNumbers: string[];
  tankardNumbers: string[];
  glassNumbers: string[];
  beltNumbers: string[];
  hardwareList: PlayerHardwareEntry[];
}

export interface TeamRecord {
  name: string;
  isElite?: boolean;
  eliteYears?: number[];
  eliteTitle?: string;
  pitchers: number;
  tankards: number;
  glasses: number;
  belts: number;
  otherTrophies: number;
  totalGlassware: number;
  pitcherNumbers: string[];
  tankardNumbers: string[];
  glassNumbers: string[];
  beltNumbers: string[];
  allNumbers: string[];
  hardwareList: TeamHardwareEntry[];
  rosterPlayers: string[];
  firstDate: string;
  latestDate: string;
  circuits: string[];
  categories: string[];
}

export default function App() {
  const [viewMode, setViewMode] = useState<'halloffame' | 'winners' | 'browse' | 'teams'>('halloffame');
  const [includePre2020, setIncludePre2020] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [circuitFilter, setCircuitFilter] = useState('ALL');
  const [glasswareTypeFilter, setGlasswareTypeFilter] = useState('ALL');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<'all' | 'men' | 'women' | 'mixed'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default: Oldest first (#1 at top)
  const [timelineViewStyle, setTimelineViewStyle] = useState<'cards' | 'table'>('cards');
  const [leaderboardCategory, setLeaderboardCategory] = useState<'all' | 'men' | 'women' | 'mixed'>('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'total' | 'pitchers' | 'tankards' | 'glasses' | 'sherpa'>('pitchers');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRecord | null>(null);

  // Team Database states
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSortBy, setTeamSortBy] = useState<'total' | 'pitchers' | 'tankards' | 'glasses' | 'name'>('total');
  const [teamFilterType, setTeamFilterType] = useState<'all' | 'pitchers_only' | 'multi_hardware' | 'squads' | 'men' | 'women' | 'mixed' | 'elite'>('all');
  const [teamViewStyle, setTeamViewStyle] = useState<'cards' | 'table'>('cards');
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);

  // Selected tournament details for browse mode
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<any[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [tournamentDetailTab, setTournamentDetailTab] = useState<'analytics' | 'divisions' | 'future' | 'allwinners'>('analytics');
  const [participantSearch, setParticipantSearch] = useState('');
  const [glasswareOnlyTournaments, setGlasswareOnlyTournaments] = useState(false);
  const [tournamentSortBy, setTournamentSortBy] = useState<'date_desc' | 'date_asc' | 'future_champions' | 'total_champions' | 'glassware_awarded'>('date_desc');
  const [tournamentSpecialFilter, setTournamentSpecialFilter] = useState<'all' | 'high_future' | 'heavyweight' | 'glassware_only'>('all');

  useEffect(() => {
    fetchWinners();
    fetchTournaments();
  }, []);

  const fetchWinners = async () => {
    setLoadingDB(true);
    const start = Date.now();
    try {
      const data = await api.fetchGlasswareWinners();
      const elapsed = Date.now() - start;
      if (elapsed < 1100) {
        await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
      }
      setWinners(data);
    } catch (e) {
      console.error('Failed to fetch glassware winners:', e);
    } finally {
      setLoadingDB(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const data = await api.fetchTournaments();
      setTournaments(data);
    } catch (e) {
      console.error('Failed to fetch tournaments:', e);
    }
  };

  const fetchTournamentDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const data = await api.fetchTournamentDetails(id);
      setTournamentDetails(data);
    } catch (e) {
      console.error('Failed to fetch tournament details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const navigateToTournament = (tournamentId?: string, tourneyName?: string) => {
    let target = tournaments.find(t => t.id === tournamentId);
    if (!target && tourneyName) {
      target = tournaments.find(t => (t.name || '').toLowerCase().trim() === tourneyName.toLowerCase().trim());
    }
    if (target) {
      setSelectedTournament(target);
      fetchTournamentDetails(target.id);
      setTournamentDetailTab('analytics');
      setParticipantSearch('');
      setViewMode('browse');
      setSelectedTeam(null);
    }
  };

  // Era-scoped dataset derivations
  const eraWinners = useMemo(() => {
    if (!includePre2020) {
      return winners.filter(w => !w.date_won || w.date_won >= '2020');
    }
    return winners;
  }, [winners, includePre2020]);

  const eraTournaments = useMemo(() => {
    if (!includePre2020) {
      return tournaments.filter(t => (!t.event_date || t.event_date >= '2020') && (!t.year || t.year >= 2020));
    }
    return tournaments;
  }, [tournaments, includePre2020]);

  // Map of player names (lowercased) -> all their glassware wins
  const playerWinsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const w of eraWinners) {
      const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      for (const p of pNames) {
        const key = p.toLowerCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(w);
      }
    }
    return map;
  }, [eraWinners]);

  // Map of tournament ID -> count of glassware awarded
  const tournamentGlasswareCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of winners) {
      if (w.tournament_id) {
        map.set(w.tournament_id, (map.get(w.tournament_id) || 0) + 1);
      }
    }
    return map;
  }, [winners]);

  // Deep Tournament Explorer Analytics for selected tournament
  const tournamentAnalytics = useMemo(() => {
    if (!selectedTournament || !tournamentDetails) return null;

    const eventTime = selectedTournament.event_date ? new Date(selectedTournament.event_date).getTime() : 0;
    const participantsMap = new Map<string, AnalyzedTournamentParticipant>();

    tournamentDetails.forEach(div => {
      div.placements.forEach((p: any) => {
        const pNames = getSquadPlayers(p.notes, p.player1_name, p.player2_name);

        pNames.forEach(rawName => {
          const key = rawName.toLowerCase();
          if (participantsMap.has(key)) return;

          const careerWins = playerWinsMap.get(key) || [];
          const winsHere = careerWins.filter(w => w.tournament_id === selectedTournament.id);
          const priorWins = careerWins.filter(w => {
            const wTime = w.date_won ? new Date(w.date_won).getTime() : 0;
            return wTime < eventTime;
          });
          const futureWins = careerWins.filter(w => {
            const wTime = w.date_won ? new Date(w.date_won).getTime() : 0;
            return wTime > eventTime && w.tournament_id !== selectedTournament.id;
          }).sort((a, b) => (new Date(a.date_won).getTime() || 0) - (new Date(b.date_won).getTime() || 0));

          const sortedCareerWins = [...careerWins].sort((a, b) => (new Date(a.date_won).getTime() || 0) - (new Date(b.date_won).getTime() || 0));
          const firstEverWin = sortedCareerWins.length > 0 ? sortedCareerWins[0] : null;
          const firstFutureWin = futureWins.length > 0 ? futureWins[0] : null;

          let status: AnalyzedTournamentParticipant['status'] = 'no_glassware';
          if (careerWins.length > 0) {
            if (winsHere.length > 0) {
              status = priorWins.length === 0 ? 'breakthrough' : 'won_here';
            } else if (priorWins.length > 0) {
              status = 'prior_winner';
            } else if (futureWins.length > 0) {
              status = 'future_winner';
            }
          }

          let daysToFirstWin: number | undefined;
          if (firstFutureWin && eventTime > 0) {
            const fTime = new Date(firstFutureWin.date_won).getTime() || 0;
            if (fTime > eventTime) {
              daysToFirstWin = Math.round((fTime - eventTime) / (1000 * 60 * 60 * 24));
            }
          }

          let pitchers = 0;
          let tankards = 0;
          let glasses = 0;
          let belts = 0;
          let otherTrophies = 0;
          careerWins.forEach(w => {
            const cat = (w.type_category || '').toLowerCase();
            const t = `${w.glassware_type || ''} ${w.award_notes || ''}`.toLowerCase();
            if (cat === 'belt' || t.includes('belt')) belts++;
            else if (cat === 'ring' || cat === 'trophy' || t.includes('ring') || t.includes('trophy')) otherTrophies++;
            else if (cat === 'pitcher' || t.includes('pitcher') || w.place === 1) pitchers++;
            else if (cat === 'tankard' || t.includes('tankard') || t.includes('cup') || w.place === 2) tankards++;
            else glasses++;
          });

          participantsMap.set(key, {
            playerName: rawName,
            divisionName: div.name,
            divisionId: div.id,
            teamName: p.team_name,
            place: p.place,
            isGlasswareWinnerEver: careerWins.length > 0,
            status,
            winsHere,
            priorWins,
            futureWins,
            allCareerWins: careerWins,
            firstEverWin,
            firstFutureWin,
            totalCareerPieces: careerWins.length,
            careerPitchers: pitchers,
            careerTankards: tankards,
            careerGlasses: glasses,
            careerBelts: belts,
            careerOther: otherTrophies,
            daysToFirstWin
          });
        });
      });
    });

    const participants = Array.from(participantsMap.values());
    const totalParticipants = participants.length;
    const everWinners = participants.filter(p => p.isGlasswareWinnerEver);
    const futureWinners = participants.filter(p => p.status === 'future_winner').sort((a, b) => (a.daysToFirstWin || 0) - (b.daysToFirstWin || 0));
    const breakthroughWinners = participants.filter(p => p.status === 'breakthrough');
    const priorWinners = participants.filter(p => p.status === 'prior_winner' || p.status === 'won_here');
    const eventWinners = participants.filter(p => p.winsHere.length > 0);
    const nonGlassware = participants.filter(p => p.status === 'no_glassware');

    const totalGlasswareAtEvent = winners.filter(w => w.tournament_id === selectedTournament.id).length;

    return {
      participants,
      totalParticipants,
      everWinners,
      totalEverWinners: everWinners.length,
      everWinnersRatio: totalParticipants > 0 ? (everWinners.length / totalParticipants) : 0,
      futureWinners,
      futureWinnersCount: futureWinners.length,
      breakthroughWinners,
      breakthroughWinnersCount: breakthroughWinners.length,
      priorWinners,
      priorWinnersCount: priorWinners.length,
      eventWinners,
      eventWinnersCount: eventWinners.length,
      nonGlassware,
      nonGlasswareCount: nonGlassware.length,
      totalGlasswareAtEvent
    };
  }, [selectedTournament, tournamentDetails, playerWinsMap, winners]);


  // Compute statistics dynamically from live database records
  const stats = useMemo(() => {
    let pitcherCount = 0;
    let tankardCount = 0;
    let glassCount = 0;
    let beltCount = 0;
    let otherCount = 0;
    const uniqueDecoratedPlayers = new Set<string>();

    for (const w of eraWinners) {
      const cat = (w.type_category || '').toLowerCase();
      const type = `${w.glassware_type || ''} ${w.award_notes || ''}`.toLowerCase();
      if (cat === 'belt' || type.includes('belt')) {
        beltCount++;
        if (w.pitcher_number || (w.type_label && w.type_label.includes('Pitcher'))) {
          pitcherCount++;
        }
      } else if (cat === 'ring' || cat === 'trophy' || type.includes('ring') || type.includes('trophy')) {
        otherCount++;
      } else if (cat === 'pitcher' || type.includes('pitcher') || w.place === 1) {
        pitcherCount++;
      } else if (cat === 'tankard' || type.includes('tankard') || type.includes('cup') || w.place === 2) {
        tankardCount++;
      } else {
        glassCount++;
      }

      const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      pNames.forEach((name) => {
        if (name && name.trim()) uniqueDecoratedPlayers.add(name.trim().toLowerCase());
      });
    }

    return {
      totalGlassware: eraWinners.length,
      pitchers: pitcherCount,
      tankards: tankardCount,
      glasses: glassCount,
      belts: beltCount,
      otherTrophies: otherCount,
      totalTournaments: eraTournaments.length,
      decoratedPlayers: uniqueDecoratedPlayers.size
    };
  }, [eraWinners, eraTournaments]);

  // Map of player name (lowercased) -> deduced gender ('male' | 'female') via constraint propagation
  const playerGenderMap = useMemo(() => {
    const map = new Map<string, 'male' | 'female'>();
    for (const w of eraWinners) {
      if (w.player1_name && w.player1_gender) {
        map.set(w.player1_name.toLowerCase(), w.player1_gender);
      }
      if (w.player2_name && w.player2_gender) {
        map.set(w.player2_name.toLowerCase(), w.player2_gender);
      }
      const cat = w.division_category || api.getDivisionCategory(w.division_name);
      if (cat === 'women') {
        const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
        for (const p of pNames) {
          map.set(p.toLowerCase(), 'female');
        }
      }
    }
    return map;
  }, [eraWinners]);

  // Summary counts of unique decorated players per category
  const leaderboardCategoryCounts = useMemo(() => {
    const allSet = new Set<string>();
    const menSet = new Set<string>();
    const womenSet = new Set<string>();
    const mixedSet = new Set<string>();

    for (const w of eraWinners) {
      const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      const cat = w.division_category || api.getDivisionCategory(w.division_name);
      for (const p of pNames) {
        allSet.add(p);
        const pGender = playerGenderMap.get(p.toLowerCase()) || (cat === 'women' ? 'female' : 'male');
        if (pGender === 'female' || cat === 'women') {
          womenSet.add(p);
        }
        if (pGender === 'male' || cat === 'men') {
          menSet.add(p);
        }
        if (cat === 'mixed') {
          mixedSet.add(p);
        }
      }
    }

    return {
      all: allSet.size,
      men: menSet.size,
      women: womenSet.size,
      mixed: mixedSet.size
    };
  }, [eraWinners, playerGenderMap]);

  // Compute leaderboard / Hall of Fame with serial numbers filtered by category and Sherpa mentorship scores
  const leaderboard = useMemo(() => {
    const playerStats = new Map<string, PlayerRecord>();

    // 1. Chronological Sherpa computation
    // Sort all winners chronologically from oldest to newest
    const chronologicalWinners = [...eraWinners].sort((a, b) => {
      const da = a.date_won ? new Date(a.date_won).getTime() : 0;
      const db = b.date_won ? new Date(b.date_won).getTime() : 0;
      return da - db;
    });

    const playerCategoryPriorWins = new Map<string, number>(); // key: `${cat}:${pName.toLowerCase()}` -> count
    const playerSherpaMap = new Map<string, SherpaEntry[]>(); // key: pName.toLowerCase() -> list of SherpaEntry
    const playerCategorySherpaMap = new Map<string, SherpaEntry[]>(); // key: `${cat}:${pName.toLowerCase()}` -> list

    for (const w of chronologicalWinners) {
      const cat = w.division_category || api.getDivisionCategory(w.division_name);
      const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      const isSquad = (w.award_notes && w.award_notes.includes('Squad:')) || (w.division_name && w.division_name.toLowerCase().includes('squad')) || pNames.length > 2;
      const hwType = w.glassware_type || (w.place === 1 ? 'Pitcher' : w.place === 2 ? 'Tankard' : 'Glass');
      const eventYear = w.date_won ? new Date(w.date_won).getFullYear() : 0;

      const rookies: string[] = [];
      const veterans: string[] = [];

      for (const pName of pNames) {
        const key = `${cat}:${pName.toLowerCase()}`;
        const priorWins = playerCategoryPriorWins.get(key) || 0;
        const isEliteVet = elite.isEliteVeteranAtDate(pName, eventYear);

        // A player is an experienced veteran if they have prior glassware wins in this division category
        // OR if they attained Spikeball Elite status in a prior year!
        if (priorWins > 0 || isEliteVet) {
          veterans.push(pName);
        } else {
          rookies.push(pName);
        }
      }

      // If there are rookies winning their first glassware in this division category,
      // and it is a doubles partnership (not squads), the veteran partner gets a Sherpa credit!
      if (!isSquad && rookies.length > 0 && veterans.length > 0) {
        for (const vet of veterans) {
          for (const rookie of rookies) {
            const entry: SherpaEntry = {
              rookieName: rookie,
              tournamentId: w.tournament_id,
              tournamentName: w.tournament_name,
              divisionName: w.division_name,
              divisionCategory: cat,
              date: w.date_won,
              hardwareType: hwType,
              place: w.place
            };

            const vetKey = vet.toLowerCase();
            if (!playerSherpaMap.has(vetKey)) playerSherpaMap.set(vetKey, []);
            playerSherpaMap.get(vetKey)!.push(entry);

            const vetCatKey = `${cat}:${vetKey}`;
            if (!playerCategorySherpaMap.has(vetCatKey)) playerCategorySherpaMap.set(vetCatKey, []);
            playerCategorySherpaMap.get(vetCatKey)!.push(entry);
          }
        }
      }

      // Increment prior win count for all participating athletes
      for (const pName of pNames) {
        const key = `${cat}:${pName.toLowerCase()}`;
        playerCategoryPriorWins.set(key, (playerCategoryPriorWins.get(key) || 0) + 1);
      }
    }

    // 2. Filter winners according to the active leaderboard category
    const filteredWinners = leaderboardCategory === 'all'
      ? eraWinners
      : eraWinners.filter(w => (w.division_category || api.getDivisionCategory(w.division_name)) === leaderboardCategory);

    for (const w of filteredWinners) {
      const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      const cat = (w.type_category || '').toLowerCase();
      const type = `${w.glassware_type || ''} ${w.award_notes || ''}`.toLowerCase();
      const isBelt = cat === 'belt' || type.includes('belt');
      const isRing = cat === 'ring' || type.includes('ring');
      const isTrophy = cat === 'trophy' || type.includes('trophy') || type.includes('plaque');
      const isPitcher = cat === 'pitcher' || (!isBelt && !isRing && !isTrophy && (type.includes('pitcher') || w.place === 1));
      const isTankard = cat === 'tankard' || (!isBelt && !isRing && !isTrophy && (type.includes('tankard') || type.includes('cup') || w.place === 2));

      const numStr = w.type_number ? (w.type_suffix ? `${w.type_number}${w.type_suffix}` : `${w.type_number}`) : '';

      for (const pName of pNames) {
        const pKey = pName.toLowerCase();
        const deducedGender = playerGenderMap.get(pKey) || (w.division_category === 'women' ? 'female' : 'male');
        if (!playerStats.has(pName)) {
          const sherpaEntries = leaderboardCategory === 'all'
            ? (playerSherpaMap.get(pKey) || [])
            : (playerCategorySherpaMap.get(`${leaderboardCategory}:${pKey}`) || []);

          const isElite = elite.isElitePlayer(pName);
          const firstEliteYear = elite.getFirstEliteYear(pName);
          const allEliteYears = elite.getAllEliteYears(pName);
          const eliteBadgeText = elite.getEliteBadgeText(pName);

          playerStats.set(pName, {
            name: pName,
            gender: deducedGender,
            isElite,
            firstEliteYear,
            allEliteYears,
            eliteBadgeText,
            pitchers: 0,
            tankards: 0,
            glasses: 0,
            belts: 0,
            otherTrophies: 0,
            total: 0,
            sherpaScore: sherpaEntries.length,
            sherpaList: sherpaEntries,
            pitcherNumbers: [],
            tankardNumbers: [],
            glassNumbers: [],
            beltNumbers: [],
            hardwareList: []
          });
        }
        const record = playerStats.get(pName)!;
        if (isBelt) {
          record.belts = (record.belts || 0) + 1;
          if (numStr) record.beltNumbers.push(numStr);
          if (w.pitcher_number || (w.type_label && w.type_label.includes('Pitcher'))) {
            record.pitchers += 1;
            const pNum = w.pitcher_number ? `${w.pitcher_number}${w.type_suffix || ''}` : numStr;
            if (pNum && !record.pitcherNumbers.includes(pNum)) record.pitcherNumbers.push(pNum);
          }
        } else if (isRing || isTrophy) {
          record.otherTrophies = (record.otherTrophies || 0) + 1;
        } else if (isPitcher) {
          record.pitchers += 1;
          if (numStr) record.pitcherNumbers.push(numStr);
        } else if (isTankard) {
          record.tankards += 1;
          if (numStr) record.tankardNumbers.push(numStr);
        } else {
          record.glasses += 1;
          if (numStr) record.glassNumbers.push(numStr);
        }
        record.total += 1;

        const teammates = pNames.filter(name => name.toLowerCase() !== pName.toLowerCase());
        record.hardwareList.push({
          tournamentId: w.tournament_id,
          tournamentName: w.tournament_name,
          divisionName: w.division_name,
          divisionCategory: w.division_category || api.getDivisionCategory(w.division_name),
          date: w.date_won,
          typeLabel: w.type_label || (isBelt ? `Belt #${w.type_number || '?'}` : isPitcher ? `Pitcher #${w.type_number || '?'}` : isTankard ? `Tankard #${w.type_number || '?'}` : `Glass #${w.type_number || '?'}`),
          typeCategory: w.type_category || (isBelt ? 'Belt' : isPitcher ? 'Pitcher' : isTankard ? 'Tankard' : 'Glass'),
          place: w.place,
          circuit: w.circuit,
          overallNumber: w.overall_number,
          typeNumber: w.type_number,
          typeSuffix: w.type_suffix,
          notes: w.award_notes,
          teamName: w.team_name,
          teammates: teammates
        });
      }
    }

    // Sort hardwareList newest first so most recent trophies appear at the top of the trophy cabinet
    for (const record of playerStats.values()) {
      record.hardwareList.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (db !== da) return db - da;
        return (a.place || 99) - (b.place || 99);
      });
    }

    const list = Array.from(playerStats.values());
    list.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.pitchers !== a.pitchers) return b.pitchers - a.pitchers;
      if ((b.belts || 0) !== (a.belts || 0)) return (b.belts || 0) - (a.belts || 0);
      if (b.tankards !== a.tankards) return b.tankards - a.tankards;
      return b.glasses - a.glasses;
    });

    return list;
  }, [eraWinners, leaderboardCategory, playerGenderMap]);

  // Filtered leaderboard for Hall of Fame search and Sherpa score ranking
  const filteredLeaderboard = useMemo(() => {
    const q = leaderboardSearch.toLowerCase().trim();
    const list = leaderboard.filter(p => {
      if (!q) return true;
      const matchName = p.name.toLowerCase().includes(q);
      const matchPitcherNum = p.pitcherNumbers.some(n => `#${n}`.includes(q) || `${n}` === q.replace('#', ''));
      const matchTankardNum = p.tankardNumbers.some(n => `#${n}`.includes(q) || `${n}` === q.replace('#', ''));
      const matchGlassNum = p.glassNumbers.some(n => `#${n}`.includes(q) || `${n}` === q.replace('#', ''));
      const matchBeltNum = p.beltNumbers.some(n => `#${n}`.includes(q) || `${n}` === q.replace('#', ''));
      return matchName || matchPitcherNum || matchTankardNum || matchGlassNum || matchBeltNum;
    });

    return [...list].sort((a, b) => {
      if (leaderboardSortBy === 'sherpa') return b.sherpaScore - a.sherpaScore || b.total - a.total || b.pitchers - a.pitchers;
      if (leaderboardSortBy === 'pitchers') return b.pitchers - a.pitchers || (b.belts || 0) - (a.belts || 0) || b.total - a.total;
      if (leaderboardSortBy === 'tankards') return b.tankards - a.tankards || b.total - a.total;
      if (leaderboardSortBy === 'glasses') return b.glasses - a.glasses || b.total - a.total;
      return b.total - a.total || b.pitchers - a.pitchers || (b.belts || 0) - (a.belts || 0);
    });
  }, [leaderboard, leaderboardSearch, leaderboardSortBy]);

  // Aggregated Team Database
  const teamsDatabase = useMemo(() => {
    const teamsMap = new Map<string, TeamRecord>();

    for (const w of eraWinners) {
      const rawTeam = (w.team_name || '').trim();
      if (!rawTeam || rawTeam === 'Individual / Doubles Entry') continue;

      const key = rawTeam.toLowerCase();
      if (!teamsMap.has(key)) {
        teamsMap.set(key, {
          name: rawTeam,
          isElite: false,
          eliteYears: [],
          eliteTitle: '',
          pitchers: 0,
          tankards: 0,
          glasses: 0,
          belts: 0,
          otherTrophies: 0,
          totalGlassware: 0,
          pitcherNumbers: [],
          tankardNumbers: [],
          glassNumbers: [],
          beltNumbers: [],
          allNumbers: [],
          hardwareList: [],
          rosterPlayers: [],
          firstDate: w.date_won,
          latestDate: w.date_won,
          circuits: [],
          categories: []
        });
      }

      const tData = teamsMap.get(key)!;
      const cat = (w.type_category || '').toLowerCase();
      const type = `${w.glassware_type || ''} ${w.award_notes || ''}`.toLowerCase();
      const isBelt = cat === 'belt' || type.includes('belt');
      const isRing = cat === 'ring' || type.includes('ring');
      const isTrophy = cat === 'trophy' || type.includes('trophy') || type.includes('plaque');
      const isPitcher = cat === 'pitcher' || (!isBelt && !isRing && !isTrophy && (type.includes('pitcher') || w.place === 1));
      const isTankard = cat === 'tankard' || (!isBelt && !isRing && !isTrophy && (type.includes('tankard') || type.includes('cup') || w.place === 2));

      const numStr = w.type_number ? (w.type_suffix ? `${w.type_number}${w.type_suffix}` : `${w.type_number}`) : '';

      if (isBelt) {
        tData.belts = (tData.belts || 0) + 1;
        if (numStr) tData.beltNumbers.push(numStr);
        if (w.pitcher_number || (w.type_label && w.type_label.includes('Pitcher'))) {
          tData.pitchers++;
          const pNum = w.pitcher_number ? `${w.pitcher_number}${w.type_suffix || ''}` : numStr;
          if (pNum && !tData.pitcherNumbers.includes(pNum)) tData.pitcherNumbers.push(pNum);
        }
      } else if (isRing || isTrophy) {
        tData.otherTrophies = (tData.otherTrophies || 0) + 1;
      } else if (isPitcher) {
        tData.pitchers++;
        if (numStr) tData.pitcherNumbers.push(numStr);
      } else if (isTankard) {
        tData.tankards++;
        if (numStr) tData.tankardNumbers.push(numStr);
      } else {
        tData.glasses++;
        if (numStr) tData.glassNumbers.push(numStr);
      }

      if (numStr) tData.allNumbers.push(numStr);
      tData.totalGlassware++;

      const pNames = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      pNames.forEach(p => {
        if (!tData.rosterPlayers.includes(p)) {
          tData.rosterPlayers.push(p);
        }
      });

      const divCat = w.division_category || api.getDivisionCategory(w.division_name);
      if (divCat && !tData.categories.includes(divCat)) {
        tData.categories.push(divCat);
      }

      tData.hardwareList.push({
        tournamentId: w.tournament_id,
        tournamentName: w.tournament_name,
        divisionName: w.division_name,
        date: w.date_won,
        typeLabel: w.type_label || (isBelt ? `Belt #${w.type_number || '?'}` : isPitcher ? `Pitcher #${w.type_number || '?'}` : isTankard ? `Tankard #${w.type_number || '?'}` : `Glass #${w.type_number || '?'}`),
        typeCategory: w.type_category || (isBelt ? 'Belt' : isPitcher ? 'Pitcher' : isTankard ? 'Tankard' : 'Glass'),
        place: w.place,
        circuit: w.circuit,
        overallNumber: w.overall_number,
        notes: w.award_notes,
        players: pNames
      });

      if (w.circuit && !tData.circuits.includes(w.circuit)) {
        tData.circuits.push(w.circuit);
      }

      if (new Date(w.date_won).getTime() < new Date(tData.firstDate).getTime()) {
        tData.firstDate = w.date_won;
      }
      if (new Date(w.date_won).getTime() > new Date(tData.latestDate).getTime()) {
        tData.latestDate = w.date_won;
      }
    }

    // Decorate each team with its Spikeball Elite qualification status and sort hardwareList newest first
    for (const tData of teamsMap.values()) {
      tData.hardwareList.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (db !== da) return db - da;
        return (a.place || 99) - (b.place || 99);
      });

      const eliteInfo = elite.getTeamEliteInfo(tData.name, tData.rosterPlayers);
      if (eliteInfo.isElite) {
        tData.isElite = true;
        tData.eliteYears = eliteInfo.years;
        tData.eliteTitle = eliteInfo.title;
      }
    }

    const list = Array.from(teamsMap.values());
    list.sort((a, b) => {
      if (b.totalGlassware !== a.totalGlassware) return b.totalGlassware - a.totalGlassware;
      if (b.pitchers !== a.pitchers) return b.pitchers - a.pitchers;
      if (b.tankards !== a.tankards) return b.tankards - a.tankards;
      return b.glasses - a.glasses;
    });

    return list;
  }, [eraWinners]);

  // Filtered & Sorted Teams
  const filteredTeams = useMemo(() => {
    const q = teamSearch.toLowerCase().trim();
    return teamsDatabase.filter(t => {
      if (q) {
        const matchName = t.name.toLowerCase().includes(q);
        const matchPlayers = t.rosterPlayers.some(p => p.toLowerCase().includes(q));
        const matchCircuits = t.circuits.some(c => c.toLowerCase().includes(q));
        const matchNumbers = t.allNumbers.some(n => `#${n}`.includes(q) || n === q.replace('#', ''));
        const matchTourneys = t.hardwareList.some(h => h.tournamentName.toLowerCase().includes(q));
        const matchElite = t.isElite && ('spikeball elite'.includes(q) || 'elite'.includes(q));
        if (!matchName && !matchPlayers && !matchCircuits && !matchNumbers && !matchTourneys && !matchElite) return false;
      }

      if (teamFilterType === 'elite' && !t.isElite) return false;
      if (teamFilterType === 'pitchers_only' && t.pitchers === 0) return false;
      if (teamFilterType === 'multi_hardware' && t.totalGlassware < 2) return false;
      if (teamFilterType === 'squads' && t.rosterPlayers.length < 3) return false;
      if (teamFilterType === 'men' && !t.categories.includes('men')) return false;
      if (teamFilterType === 'women' && !t.categories.includes('women')) return false;
      if (teamFilterType === 'mixed' && !t.categories.includes('mixed')) return false;

      return true;
    }).sort((a, b) => {
      if (teamSortBy === 'pitchers') return b.pitchers - a.pitchers || b.totalGlassware - a.totalGlassware;
      if (teamSortBy === 'tankards') return b.tankards - a.tankards || b.totalGlassware - a.totalGlassware;
      if (teamSortBy === 'glasses') return b.glasses - a.glasses || b.totalGlassware - a.totalGlassware;
      if (teamSortBy === 'name') return a.name.localeCompare(b.name);
      return b.totalGlassware - a.totalGlassware || b.pitchers - a.pitchers;
    });
  }, [teamsDatabase, teamSearch, teamSortBy, teamFilterType]);

  // Dynamic KPI stats for Team Database based on current filters
  const teamKPIStats = useMemo(() => {
    if (filteredTeams.length === 0) {
      return {
        topTeam: null,
        mostPitchersName: 'None',
        mostPitchersCount: 0,
        totalDecoratedTeams: 0,
        totalPieces: 0,
        totalPitchers: 0
      };
    }

    // Top Dynasty Team in this filtered view (highest total, then highest pitchers)
    const sortedByDynasty = [...filteredTeams].sort((a, b) => b.totalGlassware - a.totalGlassware || b.pitchers - a.pitchers);
    const topTeam = sortedByDynasty[0];

    // Most 1st Place Pitchers in this filtered view
    const maxPitchers = Math.max(...filteredTeams.map((t) => t.pitchers));
    let mostPitchersName = 'None';
    if (maxPitchers > 0) {
      const topPitcherTeams = filteredTeams.filter((t) => t.pitchers === maxPitchers);
      if (topPitcherTeams.length === 1) {
        mostPitchersName = topPitcherTeams[0].name;
      } else if (topPitcherTeams.length === 2) {
        mostPitchersName = `${topPitcherTeams[0].name} & ${topPitcherTeams[1].name}`;
      } else {
        mostPitchersName = `${topPitcherTeams[0].name} +${topPitcherTeams.length - 1} more`;
      }
    }

    const totalPieces = filteredTeams.reduce((sum, t) => sum + t.totalGlassware, 0);
    const totalPitchers = filteredTeams.reduce((sum, t) => sum + t.pitchers, 0);

    return {
      topTeam,
      mostPitchersName,
      mostPitchersCount: maxPitchers,
      totalDecoratedTeams: filteredTeams.length,
      totalPieces,
      totalPitchers
    };
  }, [filteredTeams]);

  // Filtered & Sorted tournaments for Tournament Database
  const filteredTournaments = useMemo(() => {
    return eraTournaments
      .filter(t => {
        const q = searchQuery.toLowerCase().trim();
        const tCirc = (t.Circuit || t.circuit || '').toUpperCase();
        const s = tournamentStatsData[t.id] || { totalChampions: 0, futureChampions: 0, glasswareAwarded: 0 };
        const gwCount = tournamentGlasswareCountMap.get(t.id) || s.glasswareAwarded || 0;

        const matchQ = !q || (t.name || '').toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q) || (t.year || '').toString().includes(q);
        const matchC = circuitFilter === 'ALL' || tCirc === circuitFilter;
        
        if (tournamentSpecialFilter === 'high_future' && s.futureChampions < 10) return false;
        if (tournamentSpecialFilter === 'heavyweight' && s.totalChampions < 30) return false;
        if (tournamentSpecialFilter === 'glassware_only' && gwCount === 0) return false;
        if (glasswareOnlyTournaments && gwCount === 0) return false;

        return matchQ && matchC;
      })
      .sort((a, b) => {
        const sA = tournamentStatsData[a.id] || { totalChampions: 0, futureChampions: 0, glasswareAwarded: 0 };
        const sB = tournamentStatsData[b.id] || { totalChampions: 0, futureChampions: 0, glasswareAwarded: 0 };

        if (tournamentSortBy === 'future_champions') {
          if (sB.futureChampions !== sA.futureChampions) return sB.futureChampions - sA.futureChampions;
        } else if (tournamentSortBy === 'total_champions') {
          if (sB.totalChampions !== sA.totalChampions) return sB.totalChampions - sA.totalChampions;
        } else if (tournamentSortBy === 'glassware_awarded') {
          const gwA = sA.glasswareAwarded || (tournamentGlasswareCountMap.get(a.id) || 0);
          const gwB = sB.glasswareAwarded || (tournamentGlasswareCountMap.get(b.id) || 0);
          if (gwB !== gwA) return gwB - gwA;
        } else if (tournamentSortBy === 'date_asc') {
          const da = a.event_date ? new Date(a.event_date).getTime() : 0;
          const db = b.event_date ? new Date(b.event_date).getTime() : 0;
          if (da !== db) return da - db;
        } else {
          const da = a.event_date ? new Date(a.event_date).getTime() : 0;
          const db = b.event_date ? new Date(b.event_date).getTime() : 0;
          if (da !== db) return db - da;
        }

        return (a.name || '').localeCompare(b.name || '');
      });
  }, [eraTournaments, searchQuery, circuitFilter, glasswareOnlyTournaments, tournamentSpecialFilter, tournamentSortBy, tournamentGlasswareCountMap]);

  // Filtered winners
  const filteredWinners = useMemo(() => {
    return eraWinners.filter(w => {
      const q = searchQuery.toLowerCase().trim();
      const squadPlayers = getSquadPlayers(w.award_notes, w.player1_name, w.player2_name);
      const matchSquad = squadPlayers.some(p => p.toLowerCase().includes(q));

      const matchQuery = !q ||
        (w.tournament_name || '').toLowerCase().includes(q) ||
        (w.division_name || '').toLowerCase().includes(q) ||
        (w.team_name || '').toLowerCase().includes(q) ||
        (w.player1_name || '').toLowerCase().includes(q) ||
        (w.player2_name || '').toLowerCase().includes(q) ||
        matchSquad ||
        (w.award_notes || '').toLowerCase().includes(q) ||
        (w.circuit || '').toLowerCase().includes(q) ||
        (w.date_won || '').includes(q) ||
        `#${w.type_number}`.includes(q) ||
        `#${w.overall_number}`.includes(q) ||
        `${w.type_category} #${w.type_number}`.toLowerCase().includes(q) ||
        `${w.type_number}` === q.replace('#', '');

      const matchCircuit = circuitFilter === 'ALL' || (w.circuit || '').toUpperCase() === circuitFilter;

      let matchGlass = true;
      const cat = (w.type_category || '').toLowerCase();
      const typeStr = `${w.glassware_type || ''} ${w.award_notes || ''}`.toLowerCase();
      if (glasswareTypeFilter === 'pitcher') {
        matchGlass = cat === 'pitcher' || (!cat && (typeStr.includes('pitcher') || w.place === 1));
      } else if (glasswareTypeFilter === 'tankard') {
        matchGlass = cat === 'tankard' || (!cat && (typeStr.includes('tankard') || typeStr.includes('cup') || w.place === 2));
      } else if (glasswareTypeFilter === 'glass') {
        matchGlass = cat === 'glass' || (!cat && (typeStr.includes('glass') || typeStr.includes('horn') || typeStr.includes('shot') || w.place === 3));
      } else if (glasswareTypeFilter === 'belt') {
        matchGlass = cat === 'belt' || typeStr.includes('belt');
      }

      const matchCategory = timelineCategoryFilter === 'all' || (w.division_category || api.getDivisionCategory(w.division_name)) === timelineCategoryFilter;

      return matchQuery && matchCircuit && matchGlass && matchCategory;
    }).sort((a, b) => {
      if (sortOrder === 'asc') {
        return (a.overall_number || 0) - (b.overall_number || 0);
      } else {
        return (b.overall_number || 0) - (a.overall_number || 0);
      }
    });
  }, [winners, searchQuery, circuitFilter, glasswareTypeFilter, timelineCategoryFilter, sortOrder]);

  const divisionPodiums = useMemo(() => {
    const groupMap = new Map<string, {
      key: string;
      division_id: string;
      tournament_name: string;
      division_name: string;
      date_won: string;
      circuit: string;
      firstPlace: any | null;
      secondPlace: any | null;
      thirdPlaces: any[];
      overallMin: number;
    }>();

    for (const w of filteredWinners) {
      const gKey = `${w.tournament_name}_${w.division_name}_${w.date_won}`;
      if (!groupMap.has(gKey)) {
        groupMap.set(gKey, {
          key: gKey,
          division_id: w.division_id,
          tournament_name: w.tournament_name,
          division_name: w.division_name,
          date_won: w.date_won,
          circuit: w.circuit,
          firstPlace: null,
          secondPlace: null,
          thirdPlaces: [],
          overallMin: w.overall_number || 999999
        });
      }
      const g = groupMap.get(gKey)!;
      g.overallMin = Math.min(g.overallMin, w.overall_number || 999999);
      if (w.place === 1) {
        g.firstPlace = w;
      } else if (w.place === 2) {
        g.secondPlace = w;
      } else {
        g.thirdPlaces.push(w);
      }
    }

    const list = Array.from(groupMap.values());
    list.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.overallMin - b.overallMin;
      } else {
        return b.overallMin - a.overallMin;
      }
    });

    return list;
  }, [filteredWinners, sortOrder]);

  const getGlasswareDetails = (type: string, place: number, typeNumber?: number, typeSuffix?: string, typeLabel?: string) => {
    const t = (type || '').toLowerCase();
    const suffix = typeSuffix || '';
    const numDisplay = typeNumber ? `#${typeNumber}${suffix}` : '';

    if (t.includes('belt')) {
      return {
        icon: <BeltIcon size={16} />,
        label: typeLabel || `Belt ${numDisplay}`.trim(),
        typeCategory: 'Belt',
        typeNumber,
        typeSuffix,
        badgeColor: '#fbbf24',
        badgeBg: 'rgba(245, 158, 11, 0.2)',
        glowClass: 'glow-gold',
        medal: 'Championship Belt'
      };
    }
    if (t.includes('ring')) {
      return {
        icon: '💍',
        label: typeLabel || `Ring ${numDisplay}`.trim(),
        typeCategory: 'Ring',
        typeNumber,
        typeSuffix,
        badgeColor: '#a78bfa',
        badgeBg: 'rgba(167, 139, 250, 0.2)',
        glowClass: 'glow-purple',
        medal: '💍 Championship Ring'
      };
    }
    if (t.includes('trophy') || t.includes('plaque') || t.includes('shield')) {
      return {
        icon: '🏆',
        label: typeLabel || `Trophy ${numDisplay}`.trim(),
        typeCategory: 'Trophy',
        typeNumber,
        typeSuffix,
        badgeColor: '#38bdf8',
        badgeBg: 'rgba(56, 189, 248, 0.15)',
        glowClass: 'glow-blue',
        medal: '🏆 Trophy'
      };
    }

    if (t.includes('pitcher') || place === 1) {
      return {
        icon: '🍺',
        label: typeLabel || `Pitcher ${numDisplay}`.trim(),
        typeCategory: 'Pitcher',
        typeNumber,
        typeSuffix,
        badgeColor: '#fbbf24',
        badgeBg: 'rgba(251, 191, 36, 0.15)',
        glowClass: 'glow-gold',
        medal: suffix ? `🥇 1st (${suffix})` : '🥇 1st Place'
      };
    }
    if (t.includes('tankard') || t.includes('cup') || place === 2) {
      return {
        icon: '🍻',
        label: typeLabel || `Tankard ${numDisplay}`.trim(),
        typeCategory: 'Tankard',
        typeNumber,
        typeSuffix,
        badgeColor: '#e2e8f0',
        badgeBg: 'rgba(226, 232, 240, 0.15)',
        glowClass: 'glow-silver',
        medal: suffix ? `🥈 2nd (${suffix})` : '🥈 2nd Place'
      };
    }
    return {
      icon: '🥃',
      label: typeLabel || `Glass ${numDisplay}`.trim(),
      typeCategory: 'Glass',
      typeNumber,
      typeSuffix,
      badgeColor: '#f97316',
      badgeBg: 'rgba(249, 115, 22, 0.15)',
      glowClass: 'glow-bronze',
      medal: suffix ? `🥉 T-3rd (${suffix})` : '🥉 3rd Place'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc' }}>
      {/* Ambient Lighting */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '25%',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, rgba(56, 189, 248, 0.03) 50%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* INITIAL LOAD SPLASH GRAPHIC */}
      {loadingDB && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          backgroundColor: '#090d16',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          {/* Ambient Glow Orbs */}
          <div style={{
            position: 'absolute',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />

          {/* Central Animated Glassware Shield */}
          <div className="splash-ring" style={{
            width: '108px',
            height: '108px',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(245, 158, 11, 0.06))',
            border: '2px solid rgba(251, 191, 36, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginBottom: '26px'
          }}>
            <span className="splash-icon" style={{ fontSize: '52px', display: 'inline-block' }}>
              🍺
            </span>
          </div>

          {/* Title & Brand */}
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(to right, #ffffff, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}>
            Gavin's Glassware Tracker
          </h2>

          <p style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '420px',
            lineHeight: 1.5
          }}>
            Curating 12 Years of Championship Hardware & Hall of Fame... • 2014–2026
          </p>

          {/* Shimmering Progress Bar */}
          <div style={{
            width: '280px',
            height: '6px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '16px'
          }}>
            <div className="shimmer-progress" style={{
              width: '100%',
              height: '100%',
              borderRadius: '999px'
            }} />
          </div>

          {!loadingDB && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            color: '#94a3b8',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>
              🏆 {stats.totalGlassware} Pieces of Glassware
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
              🏟️ {stats.totalTournaments} Tournaments
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#c084fc', fontWeight: 700 }}>
              👥 {stats.decoratedPlayers} Decorated Champions
            </span>
          </div>
        )}
        </div>
      )}

      {/* Main Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(9, 13, 22, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Logo & Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)'
            }}>
              🏆
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Gavin's Glassware Tracker
                </h1>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Historical Glassware Serial Numbers (#1 to #{stats.pitchers}) • {includePre2020 ? '2013–2026' : '2020–2026'}
              </p>
            </div>
          </div>

          {/* Include Pre-2020 Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '7px 14px',
            borderRadius: '10px',
            backgroundColor: includePre2020 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${includePre2020 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
            userSelect: 'none',
            transition: 'all 0.15s ease'
          }}>
            <input
              type="checkbox"
              checked={includePre2020}
              onChange={(e) => setIncludePre2020(e.target.checked)}
              style={{
                cursor: 'pointer',
                accentColor: '#fbbf24',
                width: '15px',
                height: '15px'
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: includePre2020 ? '#fbbf24' : '#cbd5e1' }}>
              Include Pre-2020?
            </span>
          </label>

          {/* Stat Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {stats.belts > 0 && (
              <div style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span><BeltIcon size={16} /></span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>Belts #{stats.belts}</span>
              </div>
            )}
            <div style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🍺</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>Pitchers #1–#{stats.pitchers}</span>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: 'rgba(226, 232, 240, 0.08)', border: '1px solid rgba(226, 232, 240, 0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🍻</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0' }}>Tankards #1–#{stats.tankards}</span>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🥃</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#fb923c' }}>Glasses #1–#{stats.glasses}</span>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏟️</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>{stats.totalTournaments} Tournaments</span>
            </div>
          </div>

          {/* Navigation Mode Segmented Control */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              onClick={() => setViewMode('halloffame')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'halloffame' ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                color: viewMode === 'halloffame' ? '#fbbf24' : '#94a3b8',
                fontWeight: viewMode === 'halloffame' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>👑</span> Leaderboards
            </button>

            <button
              onClick={() => setViewMode('winners')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'winners' ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                color: viewMode === 'winners' ? '#fbbf24' : '#94a3b8',
                fontWeight: viewMode === 'winners' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>⏳</span> Timeline
            </button>

            <button
              onClick={() => setViewMode('browse')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'browse' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                color: viewMode === 'browse' ? '#38bdf8' : '#94a3b8',
                fontWeight: viewMode === 'browse' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📁</span> Database
            </button>

            <button
              onClick={() => setViewMode('teams')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'teams' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                color: viewMode === 'teams' ? '#c084fc' : '#94a3b8',
                fontWeight: viewMode === 'teams' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>👥</span> Team Database
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 10 }}>

        {/* 1. TIMELINE VIEW */}
        {viewMode === 'winners' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Filter Control Bar */}
            <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Top Row: Search + Glassware Filter + View Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by serial (e.g. #1, #42), player, team, tournament..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px 10px 38px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Glassware Type Toggles */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setGlasswareTypeFilter('ALL')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: glasswareTypeFilter === 'ALL' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: glasswareTypeFilter === 'ALL' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                      color: glasswareTypeFilter === 'ALL' ? '#fbbf24' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    All ({winners.length})
                  </button>

                  {stats.belts > 0 && (
                    <button
                      onClick={() => setGlasswareTypeFilter('belt')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: glasswareTypeFilter === 'belt' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: glasswareTypeFilter === 'belt' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: glasswareTypeFilter === 'belt' ? '#fbbf24' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <BeltIcon size={15} /> Belts (#{stats.belts})
                    </button>
                  )}

                  <button
                    onClick={() => setGlasswareTypeFilter('pitcher')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: glasswareTypeFilter === 'pitcher' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: glasswareTypeFilter === 'pitcher' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                      color: glasswareTypeFilter === 'pitcher' ? '#fbbf24' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🍺</span> Pitchers (#{stats.pitchers})
                  </button>

                  <button
                    onClick={() => setGlasswareTypeFilter('tankard')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: glasswareTypeFilter === 'tankard' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: glasswareTypeFilter === 'tankard' ? 'rgba(226, 232, 240, 0.15)' : 'transparent',
                      color: glasswareTypeFilter === 'tankard' ? '#e2e8f0' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🍻</span> Tankards (#{stats.tankards})
                  </button>

                  <button
                    onClick={() => setGlasswareTypeFilter('glass')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: glasswareTypeFilter === 'glass' ? '#fb923c' : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: glasswareTypeFilter === 'glass' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                      color: glasswareTypeFilter === 'glass' ? '#fb923c' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🥃</span> Glasses (#{stats.glasses})
                  </button>
                </div>

                {/* Sort Order & Layout Toggle */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{sortOrder === 'asc' ? '⏳ #1 Oldest First' : '⚡ Latest First'}</span>
                  </button>

                  {glasswareTypeFilter === 'ALL' && (
                    <button
                      onClick={() => setTimelineViewStyle(prev => prev === 'cards' ? 'table' : 'cards')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{timelineViewStyle === 'cards' ? '📊 Table View' : '🎴 Card View'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Middle Row: Division / Gender Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
                  Division:
                </span>
                {[
                  { key: 'all', label: 'All Divisions', icon: '🌟', color: '#fbbf24' },
                  { key: 'men', label: "Men's / Open", icon: '🚹', color: '#38bdf8' },
                  { key: 'women', label: "Women's", icon: '🚺', color: '#f472b6' },
                  { key: 'mixed', label: 'Mixed / Co-Ed', icon: '🔀', color: '#a78bfa' }
                ].map(tab => {
                  const isActive = timelineCategoryFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setTimelineCategoryFilter(tab.key as any)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: isActive ? tab.color : 'rgba(255, 255, 255, 0.08)',
                        backgroundColor: isActive ? `${tab.color}22` : 'rgba(255, 255, 255, 0.02)',
                        color: isActive ? tab.color : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Row: Circuit Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
                  Circuit:
                </span>
                {CIRCUIT_TABS.map(tab => {
                  const isActive = circuitFilter === tab.key;
                  const bStyle = tab.key === 'ALL' ? { color: '#fbbf24', border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' } : getCircuitBadgeStyle(tab.key);
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setCircuitFilter(tab.key)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: isActive ? bStyle.border : 'rgba(255, 255, 255, 0.08)',
                        backgroundColor: isActive ? bStyle.bg : 'rgba(255, 255, 255, 0.02)',
                        color: isActive ? bStyle.color : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Showing <strong style={{ color: '#fbbf24' }}>{filteredWinners.length}</strong> numbered {glasswareTypeFilter !== 'ALL' ? `${glasswareTypeFilter}s` : 'glassware pieces'}
              </div>
            </div>

            {/* Display: Cards vs Table */}
            {loadingDB ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading Numbered Glassware Series...</div>
              </div>
            ) : filteredWinners.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>No Glassware Records Found</div>
                <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: '#64748b' }}>Try adjusting your search terms or circuit filter.</p>
              </div>
            ) : glasswareTypeFilter !== 'ALL' ? (
              
              /* SINGLE-TYPE CARD GRID (Filtered to only Pitchers, Tankards, or Glasses) */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '16px'
              }}>
                {filteredWinners.map((w, idx) => {
                  const gw = getGlasswareDetails(w.glassware_type, w.place, w.type_number, w.type_suffix, w.type_label);
                  const bStyle = getCircuitBadgeStyle(w.circuit);
                  const squadInfo = getSquadDisplayInfo(w.award_notes, w.player1_name, w.player2_name, ' • ');

                  return (
                    <div
                      key={w.id || idx}
                      className={`glass-panel glass-panel-interactive ${gw.glowClass}`}
                      style={{
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Top Bar: Date + Circuit + Glassware Serial Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                            📅 {w.date_won}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: bStyle.bg,
                            color: bStyle.color,
                            border: `1px solid ${bStyle.border}`
                          }}>
                            {w.circuit || 'NATS'}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          backgroundColor: gw.badgeBg,
                          border: `1px solid ${gw.badgeColor}`,
                          color: gw.badgeColor,
                          fontWeight: 800,
                          fontSize: '13px',
                          letterSpacing: '-0.01em'
                        }}>
                          <span>{gw.icon}</span>
                          <span>{gw.label}</span>
                        </div>
                      </div>

                      {/* Tournament & Division Name */}
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
                          {w.tournament_name}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                          {w.division_name}
                        </div>
                      </div>

                      {/* Team & Winners Section */}
                      <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            {w.team_name || 'Individual / Doubles Entry'}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: gw.badgeColor }}>
                            {gw.medal}
                          </span>
                        </div>

                        {squadInfo.playersLabel && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Winners:</span>
                            {squadInfo.playersLabel.split('•').map((pName, pIdx) => (
                              <span
                                key={pIdx}
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#e2e8f0',
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                {pName.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Overall Piece #{w.overall_number}
                          </span>
                          {squadInfo.displayNotes && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                              📝 {squadInfo.displayNotes}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : timelineViewStyle === 'cards' ? (
              
              /* 3-COLUMN DIVISION PODIUM TRIO LAYOUT (1st Left, 2nd Center, 3rd Right) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {divisionPodiums.map((podium) => {
                  const bStyle = getCircuitBadgeStyle(podium.circuit);

                  const renderCard = (w: any, isTied: boolean = false) => {
                    const gw = getGlasswareDetails(w.glassware_type, w.place, w.type_number, w.type_suffix, w.type_label);
                    const squadInfo = getSquadDisplayInfo(w.award_notes, w.player1_name, w.player2_name, ' • ');

                    return (
                      <div
                        key={w.id}
                        className={`glass-panel glass-panel-interactive ${gw.glowClass}`}
                        style={{
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          position: 'relative',
                          overflow: 'hidden',
                          height: '100%',
                          backgroundColor: 'rgba(18, 24, 38, 0.85)',
                          border: `1px solid ${gw.badgeColor}40`
                        }}
                      >
                        {/* Top Bar: Medal + Glassware Number Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: gw.badgeColor }}>
                            {gw.medal}
                          </span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            backgroundColor: gw.badgeBg,
                            border: `1px solid ${gw.badgeColor}`,
                            color: gw.badgeColor,
                            fontWeight: 800,
                            fontSize: '13px',
                            letterSpacing: '-0.01em'
                          }}>
                            <span>{gw.icon}</span>
                            <span>{gw.label}</span>
                          </div>
                        </div>

                        {/* Team Name & Players */}
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px', lineHeight: 1.3 }}>
                            {w.team_name || 'Individual / Doubles Entry'}
                          </div>
                          {squadInfo.playersLabel && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {squadInfo.playersLabel.split('•').map((pName, pIdx) => (
                                <span
                                  key={pIdx}
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#cbd5e1',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  {pName.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Historical Hardware #{w.overall_number}
                          </span>
                          {squadInfo.displayNotes && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                              📝 {squadInfo.displayNotes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div
                      key={podium.key}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(18, 24, 38, 0.7) 100%)'
                      }}
                    >
                      {/* Tournament & Division Header Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                            📅 {podium.date_won}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: bStyle.bg,
                            color: bStyle.color,
                            border: `1px solid ${bStyle.border}`
                          }}>
                            {podium.circuit}
                          </span>
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                            {podium.tournament_name}
                          </h3>
                        </div>

                        <div style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#38bdf8',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}>
                          🏆 {podium.division_name}
                        </div>
                      </div>

                      {/* 3-Column Podium Grid: 1st Left, 2nd Center, 3rd Right */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '14px',
                        alignItems: 'stretch'
                      }}>
                        {/* Column 1: 🥇 1st Place (Gold) */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {podium.firstPlace ? (
                            renderCard(podium.firstPlace)
                          ) : (
                            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#64748b', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(251, 191, 36, 0.2)' }}>
                              🥇 1st Place (None recorded)
                            </div>
                          )}
                        </div>

                        {/* Column 2: 🥈 2nd Place (Silver) */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {podium.secondPlace ? (
                            renderCard(podium.secondPlace)
                          ) : (
                            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#64748b', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(226, 232, 240, 0.2)' }}>
                              🥈 2nd Place (None recorded)
                            </div>
                          )}
                        </div>

                        {/* Column 3: 🥉 3rd Place (Bronze - Stacked if 2 winners!) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {podium.thirdPlaces.length > 0 ? (
                            podium.thirdPlaces.map((w) => renderCard(w, podium.thirdPlaces.length > 1))
                          ) : (
                            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#64748b', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(249, 115, 22, 0.2)' }}>
                              🥉 3rd Place (None recorded)
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            ) : (

              /* TABLE VIEW */
              <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#fbbf24' }}>Serial #</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Date</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Circuit</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Tournament</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Division</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Place</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Team / Winners</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8' }}>Glassware Award</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWinners.map((w, idx) => {
                      const gw = getGlasswareDetails(w.glassware_type, w.place, w.type_number, w.type_suffix, w.type_label);
                      const bStyle = getCircuitBadgeStyle(w.circuit);
                      const squadInfo = getSquadDisplayInfo(w.award_notes, w.player1_name, w.player2_name, ' • ');

                      return (
                        <tr
                          key={w.id || idx}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                          }}
                        >
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '12px',
                              backgroundColor: gw.badgeBg,
                              color: gw.badgeColor,
                              border: `1px solid ${gw.badgeColor}`
                            }}>
                              {gw.typeCategory} #{w.type_number}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                            {w.date_won}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: bStyle.bg,
                              color: bStyle.color,
                              border: `1px solid ${bStyle.border}`
                            }}>
                              {w.circuit || 'NATS'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                            {w.tournament_name}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                            {w.division_name}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 700, color: gw.badgeColor }}>
                            {gw.medal}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{w.team_name || '—'}</div>
                            {squadInfo.playersLabel && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                {squadInfo.playersLabel}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: gw.badgeColor }}>
                              <span>{gw.icon}</span>
                              <span>{gw.label}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* 2. HALL OF FAME / LEADERBOARDS */}
        {viewMode === 'halloffame' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header Banner */}
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.08) 0%, rgba(18, 24, 38, 0.7) 100%)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👑</div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#fbbf24' }}>
                All-Time Glassware Hall of Fame
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', maxWidth: '650px', marginInline: 'auto' }}>
                {leaderboardCategory === 'women'
                  ? "Rankings of female players and their numbered historical glassware awards won in Women's divisions."
                  : leaderboardCategory === 'men'
                  ? "Rankings of players and their numbered historical glassware awards won in Men's and Open divisions."
                  : leaderboardCategory === 'mixed'
                  ? "Rankings of players and their numbered historical glassware awards won in Mixed and Co-Ed divisions."
                  : "Rankings of all players and their numbered historical glassware awards across all divisions."}
              </p>
            </div>

            {/* Division / Category Segment Bar */}
            <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>
                  Filter Division:
                </span>

                {/* All Divisions */}
                <button
                  onClick={() => setLeaderboardCategory('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: leaderboardCategory === 'all' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardCategory === 'all' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(0, 0, 0, 0.2)',
                    color: leaderboardCategory === 'all' ? '#fbbf24' : '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: leaderboardCategory === 'all' ? '0 0 12px rgba(251, 191, 36, 0.25)' : 'none'
                  }}
                >
                  <span>🌟</span>
                  <span>All Divisions</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: leaderboardCategory === 'all' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: leaderboardCategory === 'all' ? '#fbbf24' : '#94a3b8'
                  }}>
                    {leaderboardCategoryCounts.all}
                  </span>
                </button>

                {/* Men's / Open */}
                <button
                  onClick={() => setLeaderboardCategory('men')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: leaderboardCategory === 'men' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardCategory === 'men' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(0, 0, 0, 0.2)',
                    color: leaderboardCategory === 'men' ? '#38bdf8' : '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: leaderboardCategory === 'men' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none'
                  }}
                >
                  <span>🚹</span>
                  <span>Men's / Open</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: leaderboardCategory === 'men' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: leaderboardCategory === 'men' ? '#38bdf8' : '#94a3b8'
                  }}>
                    {leaderboardCategoryCounts.men}
                  </span>
                </button>

                {/* Women's */}
                <button
                  onClick={() => setLeaderboardCategory('women')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: leaderboardCategory === 'women' ? '#f472b6' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardCategory === 'women' ? 'rgba(244, 114, 182, 0.18)' : 'rgba(0, 0, 0, 0.2)',
                    color: leaderboardCategory === 'women' ? '#f472b6' : '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: leaderboardCategory === 'women' ? '0 0 12px rgba(244, 114, 182, 0.25)' : 'none'
                  }}
                >
                  <span>🚺</span>
                  <span>Women's</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: leaderboardCategory === 'women' ? 'rgba(244, 114, 182, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: leaderboardCategory === 'women' ? '#f472b6' : '#94a3b8'
                  }}>
                    {leaderboardCategoryCounts.women}
                  </span>
                </button>

                {/* Mixed / Co-Ed */}
                <button
                  onClick={() => setLeaderboardCategory('mixed')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: leaderboardCategory === 'mixed' ? '#a78bfa' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardCategory === 'mixed' ? 'rgba(167, 139, 250, 0.18)' : 'rgba(0, 0, 0, 0.2)',
                    color: leaderboardCategory === 'mixed' ? '#a78bfa' : '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: leaderboardCategory === 'mixed' ? '0 0 12px rgba(167, 139, 250, 0.25)' : 'none'
                  }}
                >
                  <span>🔀</span>
                  <span>Mixed / Co-Ed</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: leaderboardCategory === 'mixed' ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: leaderboardCategory === 'mixed' ? '#a78bfa' : '#94a3b8'
                  }}>
                    {leaderboardCategoryCounts.mixed}
                  </span>
                </button>
              </div>

              {/* Status context badge */}
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Viewing:</span>
                <span style={{
                  fontWeight: 700,
                  color: leaderboardCategory === 'women' ? '#f472b6' : leaderboardCategory === 'men' ? '#38bdf8' : leaderboardCategory === 'mixed' ? '#a78bfa' : '#fbbf24'
                }}>
                  {leaderboardCategory === 'women' ? "🚺 Women's Division" : leaderboardCategory === 'men' ? "🚹 Men's / Open Division" : leaderboardCategory === 'mixed' ? "🔀 Mixed / Co-Ed Division" : "🌟 All Divisions Combined"}
                </span>
              </div>
            </div>

            {/* Top 3 Podium Cards */}
            {filteredLeaderboard.length >= 3 && !leaderboardSearch && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {/* 1st Place Champion */}
                <div
                  onClick={() => setSelectedPlayer(filteredLeaderboard[0])}
                  className="glass-panel glow-gold glass-panel-interactive"
                  style={{ padding: '24px', textAlign: 'center', position: 'relative', order: 1, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥇</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em' }}>
                    {(() => {
                      const prefix = leaderboardCategory === 'women' ? "Women's" : leaderboardCategory === 'men' ? "Men's / Open" : leaderboardCategory === 'mixed' ? "Mixed" : "All-Time";
                      const metric = leaderboardSortBy === 'sherpa' ? 'Sherpa Mentor Leader' : leaderboardSortBy === 'pitchers' ? 'Pitcher Leader' : leaderboardSortBy === 'tankards' ? 'Tankard Leader' : leaderboardSortBy === 'glasses' ? 'Glass Leader' : 'Total Hardware Leader';
                      return `${prefix} ${metric}`;
                    })()}
                  </div>
                  <h3 style={{ margin: '6px 0 6px 0', fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
                    {filteredLeaderboard[0].name}
                  </h3>
                  {filteredLeaderboard[0].isElite && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(251, 191, 36, 0.2)',
                        border: '1px solid rgba(251, 191, 36, 0.5)',
                        color: '#fbbf24',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {filteredLeaderboard[0].eliteBadgeText || '⭐ Spikeball Elite'}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                    {filteredLeaderboard[0].belts > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: '#fbbf24', fontWeight: 700 }}>{filteredLeaderboard[0].belts}</span> <BeltIcon size={15} /> Belt{filteredLeaderboard[0].belts > 1 ? 's' : ''}</div>
                    )}
                    <div><span style={{ color: '#fbbf24', fontWeight: 700 }}>{filteredLeaderboard[0].pitchers}</span> 🍺 Pitchers</div>
                    <div><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{filteredLeaderboard[0].tankards}</span> 🍻 Tankards</div>
                    <div><span style={{ color: '#fb923c', fontWeight: 700 }}>{filteredLeaderboard[0].glasses}</span> 🥃 Glasses</div>
                  </div>
                  {filteredLeaderboard[0].beltNumbers.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span>Belt Serials:</span> <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BeltIcon size={13} /> #{filteredLeaderboard[0].beltNumbers.join(', #')}</span>
                    </div>
                  )}
                  {filteredLeaderboard[0].pitcherNumbers.length > 0 && (
                    <div style={{ marginTop: filteredLeaderboard[0].beltNumbers.length > 0 ? '4px' : '10px', fontSize: '11px', color: '#94a3b8' }}>
                      Pitcher Serials: <span style={{ color: '#fbbf24', fontWeight: 600 }}>#{filteredLeaderboard[0].pitcherNumbers.join(', #')}</span>
                    </div>
                  )}
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(251, 191, 36, 0.15)' }}>
                      Total: {filteredLeaderboard[0].total}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      🎒 {filteredLeaderboard[0].sherpaScore} Sherpas
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      🏆 Cabinet →
                    </div>
                  </div>
                </div>

                {/* 2nd Place */}
                <div
                  onClick={() => setSelectedPlayer(filteredLeaderboard[1])}
                  className="glass-panel glow-silver glass-panel-interactive"
                  style={{ padding: '24px', textAlign: 'center', order: 2, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥈</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '0.05em' }}>
                    {(() => {
                      const prefix = leaderboardCategory === 'women' ? "Women's" : leaderboardCategory === 'men' ? "Men's / Open" : leaderboardCategory === 'mixed' ? "Mixed" : "All-Time";
                      const metric = leaderboardSortBy === 'sherpa' ? 'Sherpas' : leaderboardSortBy === 'pitchers' ? 'Pitchers' : leaderboardSortBy === 'tankards' ? 'Tankards' : leaderboardSortBy === 'glasses' ? 'Glasses' : 'Hardware';
                      return `${prefix} ${metric} Rank #2`;
                    })()}
                  </div>
                  <h3 style={{ margin: '6px 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                    {filteredLeaderboard[1].name}
                  </h3>
                  {filteredLeaderboard[1].isElite && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(251, 191, 36, 0.2)',
                        border: '1px solid rgba(251, 191, 36, 0.5)',
                        color: '#fbbf24',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {filteredLeaderboard[1].eliteBadgeText || '⭐ Spikeball Elite'}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                    {filteredLeaderboard[1].belts > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: '#fbbf24', fontWeight: 700 }}>{filteredLeaderboard[1].belts}</span> <BeltIcon size={14} /></div>
                    )}
                    <div><span style={{ color: '#fbbf24', fontWeight: 700 }}>{filteredLeaderboard[1].pitchers}</span> 🍺</div>
                    <div><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{filteredLeaderboard[1].tankards}</span> 🍻</div>
                    <div><span style={{ color: '#fb923c', fontWeight: 700 }}>{filteredLeaderboard[1].glasses}</span> 🥃</div>
                  </div>
                  {filteredLeaderboard[1].beltNumbers.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span>Belt Serials:</span> <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BeltIcon size={13} /> #{filteredLeaderboard[1].beltNumbers.join(', #')}</span>
                    </div>
                  )}
                  {filteredLeaderboard[1].pitcherNumbers.length > 0 && (
                    <div style={{ marginTop: filteredLeaderboard[1].beltNumbers.length > 0 ? '4px' : '10px', fontSize: '11px', color: '#94a3b8' }}>
                      Pitcher Serials: <span style={{ color: '#fbbf24', fontWeight: 600 }}>#{filteredLeaderboard[1].pitcherNumbers.join(', #')}</span>
                    </div>
                  )}
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(226, 232, 240, 0.15)' }}>
                      Total: {filteredLeaderboard[1].total}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      🎒 {filteredLeaderboard[1].sherpaScore} Sherpas
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      🏆 Cabinet →
                    </div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div
                  onClick={() => setSelectedPlayer(filteredLeaderboard[2])}
                  className="glass-panel glow-bronze glass-panel-interactive"
                  style={{ padding: '24px', textAlign: 'center', order: 3, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥉</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#fb923c', letterSpacing: '0.05em' }}>
                    {(() => {
                      const prefix = leaderboardCategory === 'women' ? "Women's" : leaderboardCategory === 'men' ? "Men's / Open" : leaderboardCategory === 'mixed' ? "Mixed" : "All-Time";
                      const metric = leaderboardSortBy === 'sherpa' ? 'Sherpas' : leaderboardSortBy === 'pitchers' ? 'Pitchers' : leaderboardSortBy === 'tankards' ? 'Tankards' : leaderboardSortBy === 'glasses' ? 'Glasses' : 'Hardware';
                      return `${prefix} ${metric} Rank #3`;
                    })()}
                  </div>
                  <h3 style={{ margin: '6px 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                    {filteredLeaderboard[2].name}
                  </h3>
                  {filteredLeaderboard[2].isElite && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(251, 191, 36, 0.2)',
                        border: '1px solid rgba(251, 191, 36, 0.5)',
                        color: '#fbbf24',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {filteredLeaderboard[2].eliteBadgeText || '⭐ Spikeball Elite'}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                    {filteredLeaderboard[2].belts > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: '#fbbf24', fontWeight: 700 }}>{filteredLeaderboard[2].belts}</span> <BeltIcon size={14} /></div>
                    )}
                    <div><span style={{ color: '#fbbf24', fontWeight: 700 }}>{filteredLeaderboard[2].pitchers}</span> 🍺</div>
                    <div><span style={{ color: '#e2e8f0', fontWeight: 700 }}>{filteredLeaderboard[2].tankards}</span> 🍻</div>
                    <div><span style={{ color: '#fb923c', fontWeight: 700 }}>{filteredLeaderboard[2].glasses}</span> 🥃</div>
                  </div>
                  {filteredLeaderboard[2].beltNumbers.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span>Belt Serials:</span> <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BeltIcon size={13} /> #{filteredLeaderboard[2].beltNumbers.join(', #')}</span>
                    </div>
                  )}
                  {filteredLeaderboard[2].pitcherNumbers.length > 0 && (
                    <div style={{ marginTop: filteredLeaderboard[2].beltNumbers.length > 0 ? '4px' : '10px', fontSize: '11px', color: '#94a3b8' }}>
                      Pitcher Serials: <span style={{ color: '#fbbf24', fontWeight: 600 }}>#{filteredLeaderboard[2].pitcherNumbers.join(', #')}</span>
                    </div>
                  )}
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fb923c', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(249, 115, 22, 0.15)' }}>
                      Total: {filteredLeaderboard[2].total}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      🎒 {filteredLeaderboard[2].sherpaScore} Sherpas
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      🏆 Cabinet →
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search & Sort Filter Bar for Leaderboard */}
            <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                <input
                  type="text"
                  placeholder={`Search ${leaderboardCategory === 'women' ? "women's" : leaderboardCategory === 'men' ? "men's/open" : leaderboardCategory === 'mixed' ? "mixed" : "all"} players or serial numbers (e.g. #1, #42)...`}
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 38px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                {leaderboardSearch && (
                  <button
                    onClick={() => setLeaderboardSearch('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Leaderboard Sort Buttons */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
                  Rank By:
                </span>
                <button
                  onClick={() => setLeaderboardSortBy('pitchers')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: leaderboardSortBy === 'pitchers' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardSortBy === 'pitchers' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                    color: leaderboardSortBy === 'pitchers' ? '#fbbf24' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🍺 Pitchers
                </button>
                <button
                  onClick={() => setLeaderboardSortBy('tankards')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: leaderboardSortBy === 'tankards' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardSortBy === 'tankards' ? 'rgba(226, 232, 240, 0.15)' : 'transparent',
                    color: leaderboardSortBy === 'tankards' ? '#e2e8f0' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🍻 Tankards
                </button>
                <button
                  onClick={() => setLeaderboardSortBy('glasses')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: leaderboardSortBy === 'glasses' ? '#fb923c' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardSortBy === 'glasses' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                    color: leaderboardSortBy === 'glasses' ? '#fb923c' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🥃 Glasses
                </button>
                <button
                  onClick={() => setLeaderboardSortBy('total')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: leaderboardSortBy === 'total' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardSortBy === 'total' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: leaderboardSortBy === 'total' ? '#38bdf8' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🏆 Total Hardware
                </button>
                <button
                  onClick={() => setLeaderboardSortBy('sherpa')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: leaderboardSortBy === 'sherpa' ? '#34d399' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: leaderboardSortBy === 'sherpa' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                    color: leaderboardSortBy === 'sherpa' ? '#34d399' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🎒 Sherpa Score
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                Showing <strong style={{ color: leaderboardCategory === 'women' ? '#f472b6' : leaderboardCategory === 'men' ? '#38bdf8' : leaderboardCategory === 'mixed' ? '#a78bfa' : '#fbbf24' }}>{filteredLeaderboard.length}</strong> players in <strong>{leaderboardCategory === 'women' ? "Women's Division" : leaderboardCategory === 'men' ? "Men's / Open Division" : leaderboardCategory === 'mixed' ? "Mixed Division" : "All Divisions"}</strong>
                {leaderboardSearch && <span> matching "<strong style={{ color: '#f8fafc' }}>{leaderboardSearch}</strong>"</span>}
              </div>
            </div>

            {/* Complete Leaderboard Table */}
            <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
              {filteredLeaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  No players found matching "{leaderboardSearch}" in this category.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#94a3b8' }}>Rank</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#94a3b8' }}>Player Name</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#fbbf24' }}>🍺 Pitchers</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#e2e8f0' }}>🍻 Tankards</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#fb923c' }}>🥃 Glasses</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#38bdf8' }}>Total Pieces</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, color: '#34d399' }}>🎒 Sherpas</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: '#94a3b8' }}>Numbered Pieces Won</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#94a3b8' }}>Cabinet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.map((player, idx) => (
                      <tr
                        key={player.name}
                        onClick={() => setSelectedPlayer(player)}
                        className="glass-panel-interactive"
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: idx < 3 && !leaderboardSearch ? 'rgba(251, 191, 36, 0.02)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: idx === 0 && !leaderboardSearch ? '#fbbf24' : idx === 1 && !leaderboardSearch ? '#e2e8f0' : idx === 2 && !leaderboardSearch ? '#fb923c' : '#64748b' }}>
                          {idx === 0 && !leaderboardSearch ? '🥇 #1' : idx === 1 && !leaderboardSearch ? '🥈 #2' : idx === 2 && !leaderboardSearch ? '🥉 #3' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{player.name}</span>
                            {player.isElite && (
                              <span
                                title={player.allEliteYears && player.allEliteYears.length > 0 ? `Spikeball Elite in: ${player.allEliteYears.join(', ')}` : `Spikeball Elite`}
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                                  border: '1px solid rgba(251, 191, 36, 0.4)',
                                  color: '#fbbf24',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  letterSpacing: '0.02em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                {player.eliteBadgeText || '⭐ Elite'}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#fbbf24' }}>🏆</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: player.pitchers > 0 ? '#fbbf24' : '#64748b' }}>
                          {player.pitchers}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: player.tankards > 0 ? '#e2e8f0' : '#64748b' }}>
                          {player.tankards}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: player.glasses > 0 ? '#fb923c' : '#64748b' }}>
                          {player.glasses}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#38bdf8', fontSize: '15px' }}>
                          {player.total}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: player.sherpaScore > 0 ? '#34d399' : '#64748b' }}>
                          {player.sherpaScore > 0 ? `🎒 ${player.sherpaScore}` : '0'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>
                          {player.beltNumbers.length > 0 && (
                            <span style={{ color: '#fbbf24', marginRight: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <BeltIcon size={13} /> #{player.beltNumbers.join(', #')}
                            </span>
                          )}
                          {player.pitcherNumbers.length > 0 && (
                            <span style={{ color: '#fbbf24', marginRight: '8px', fontWeight: 600 }}>
                              🍺 #{player.pitcherNumbers.join(', #')}
                            </span>
                          )}
                          {player.tankardNumbers.length > 0 && (
                            <span style={{ color: '#e2e8f0', marginRight: '8px', fontWeight: 600 }}>
                              🍻 #{player.tankardNumbers.join(', #')}
                            </span>
                          )}
                          {player.glassNumbers.length > 0 && (
                            <span style={{ color: '#fb923c', fontWeight: 600 }}>
                              🥃 #{player.glassNumbers.join(', #')}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayer(player);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(251, 191, 36, 0.4)',
                              backgroundColor: 'rgba(251, 191, 36, 0.12)',
                              color: '#fbbf24',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            🏆 Cabinet →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        {/* 3. BROWSE DATABASE & TOURNAMENT EXPLORER */}
        {viewMode === 'browse' && (
          <div className="animate-fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 160px)' }}>
            
            {/* Left Side: Tournament List */}
            <div className="glass-panel" style={{ width: '440px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Filter tournaments by name, location, year..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Circuit Filter Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {CIRCUIT_TABS.slice(0, 8).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setCircuitFilter(tab.key)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: circuitFilter === tab.key ? '#38bdf8' : 'rgba(255, 255, 255, 0.06)',
                        backgroundColor: circuitFilter === tab.key ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        color: circuitFilter === tab.key ? '#38bdf8' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Special Filter Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '2px' }}>
                  <button
                    onClick={() => setTournamentSpecialFilter('all')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: tournamentSpecialFilter === 'all' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
                      backgroundColor: tournamentSpecialFilter === 'all' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      color: tournamentSpecialFilter === 'all' ? '#ffffff' : '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    All Events
                  </button>
                  <button
                    onClick={() => setTournamentSpecialFilter(prev => prev === 'high_future' ? 'all' : 'high_future')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: tournamentSpecialFilter === 'high_future' ? '#c084fc' : 'rgba(168, 85, 247, 0.2)',
                      backgroundColor: tournamentSpecialFilter === 'high_future' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                      color: tournamentSpecialFilter === 'high_future' ? '#e9d5ff' : '#c084fc',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span>🔮</span> High Future Champs (10+)
                  </button>
                  <button
                    onClick={() => setTournamentSpecialFilter(prev => prev === 'heavyweight' ? 'all' : 'heavyweight')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: tournamentSpecialFilter === 'heavyweight' ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
                      backgroundColor: tournamentSpecialFilter === 'heavyweight' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                      color: tournamentSpecialFilter === 'heavyweight' ? '#e0f2fe' : '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span>🏆</span> Major Fields (30+)
                  </button>
                </div>

                {/* Sort & Glassware Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', gap: '6px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Sort:</span>
                    <select
                      value={tournamentSortBy}
                      onChange={(e) => setTournamentSortBy(e.target.value as any)}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="date_desc">📅 Date: Newest First</option>
                      <option value="date_asc">📅 Date: Oldest First</option>
                      <option value="future_champions">🔮 Most Future Glassware Champions</option>
                      <option value="total_champions">🏆 Most Total Glassware Champions</option>
                      <option value="glassware_awarded">🥂 Most Glassware Pieces Awarded</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => setGlasswareOnlyTournaments(prev => !prev)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: glasswareOnlyTournaments ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: glasswareOnlyTournaments ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        color: glasswareOnlyTournaments ? '#fbbf24' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🥂</span> {glasswareOnlyTournaments ? 'Hardware Only' : 'All Events'}
                    </button>

                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {filteredTournaments.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tournament List Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {filteredTournaments
                  .map(t => {
                    const isSelected = selectedTournament?.id === t.id;
                    const bStyle = getCircuitBadgeStyle(t.Circuit || t.circuit);
                    const s = tournamentStatsData[t.id] || { totalChampions: 0, futureChampions: 0, glasswareAwarded: 0 };
                    const glasswareCount = tournamentGlasswareCountMap.get(t.id) || s.glasswareAwarded || 0;

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTournament(t);
                          fetchTournamentDetails(t.id);
                          setTournamentDetailTab('analytics');
                          setParticipantSearch('');
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          marginBottom: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: bStyle.bg,
                            color: bStyle.color,
                            border: `1px solid ${bStyle.border}`,
                            fontSize: '10px',
                            fontWeight: 700
                          }}>
                            {t.Circuit || t.circuit || 'LOCAL'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {t.event_date || t.year || 'Unknown Date'}
                          </span>
                        </div>

                        <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#38bdf8' : '#f8fafc', marginBottom: '4px', lineHeight: 1.3 }}>
                          {t.name}
                        </div>

                        {t.location && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                            📍 {t.location}
                          </div>
                        )}

                        {/* Tournament Metrics Pill Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {s.futureChampions > 0 && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#c084fc',
                              backgroundColor: 'rgba(168, 85, 247, 0.15)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              🔮 {s.futureChampions} Future
                            </span>
                          )}

                          {s.totalChampions > 0 && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              🏆 {s.totalChampions} Champs
                            </span>
                          )}

                          {glasswareCount > 0 && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#fbbf24',
                              backgroundColor: 'rgba(251, 191, 36, 0.12)',
                              border: '1px solid rgba(251, 191, 36, 0.25)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              🥂 {glasswareCount} Pieces
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>

            {/* Right Side: Selected Tournament Detail & Analytics Explorer */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {selectedTournament ? (
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Tournament Header Banner */}
                  <div style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0.25) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          backgroundColor: getCircuitBadgeStyle(selectedTournament.Circuit || selectedTournament.circuit).bg,
                          color: getCircuitBadgeStyle(selectedTournament.Circuit || selectedTournament.circuit).color,
                          border: `1px solid ${getCircuitBadgeStyle(selectedTournament.Circuit || selectedTournament.circuit).border}`
                        }}>
                          {selectedTournament.Circuit || selectedTournament.circuit}
                        </span>
                        {tournamentAnalytics && tournamentAnalytics.totalGlasswareAtEvent > 0 ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.35)'
                          }}>
                            🏆 {tournamentAnalytics.totalGlasswareAtEvent} Glassware Pieces Awarded
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(148, 163, 184, 0.12)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.25)'
                          }}>
                            🚫 Non-Glassware Circuit
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        📅 {selectedTournament.event_date || selectedTournament.year} {selectedTournament.location && `• 📍 ${selectedTournament.location}`}
                      </div>
                    </div>

                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
                      {selectedTournament.name}
                    </h2>
                  </div>

                  {loadingDetails ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>Calculating Tournament Explorer Analytics...</div>
                    </div>
                  ) : !tournamentAnalytics || tournamentAnalytics.totalParticipants === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No player placement records found for this tournament.
                    </div>
                  ) : (
                    <>
                      {/* 4-KPI ANALYTICS DASHBOARD */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px'
                      }}>
                        {/* 1. Total Glassware Winners (Ever) */}
                        <div
                          onClick={() => setTournamentDetailTab('allwinners')}
                          className="glass-panel glass-panel-interactive glow-gold"
                          style={{ padding: '16px', cursor: 'pointer', position: 'relative' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em' }}>
                              Total Glassware Winners (Ever)
                            </span>
                            <span style={{ fontSize: '18px' }}>🏆</span>
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>
                            {tournamentAnalytics.totalEverWinners} <span style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 600 }}>/ {tournamentAnalytics.totalParticipants}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            <strong>{Math.round(tournamentAnalytics.everWinnersRatio * 100)}%</strong> of participating players have won glassware in their career
                          </div>
                        </div>

                        {/* 2. Future Glassware Winners */}
                        <div
                          onClick={() => setTournamentDetailTab('future')}
                          className="glass-panel glass-panel-interactive glow-purple"
                          style={{ padding: '16px', cursor: 'pointer', position: 'relative' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.05em' }}>
                              Future Glassware Winners
                            </span>
                            <span style={{ fontSize: '18px' }}>🔮</span>
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 800, color: '#c084fc' }}>
                            {tournamentAnalytics.futureWinnersCount} <span style={{ fontSize: '13px', color: '#c084fc', fontWeight: 600 }}>Future Champions</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            Had <strong>0 glassware</strong> entering this event, but earned hardware in subsequent tournaments
                          </div>
                        </div>

                        {/* 3. Breakthrough 1st Career Wins Here */}
                        <div
                          onClick={() => setTournamentDetailTab('divisions')}
                          className="glass-panel glass-panel-interactive"
                          style={{ padding: '16px', cursor: 'pointer', position: 'relative', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                              1st-Time Breakthroughs
                            </span>
                            <span style={{ fontSize: '18px' }}>⭐</span>
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8' }}>
                            {tournamentAnalytics.breakthroughWinnersCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Breakthroughs</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            Won their very first historical glassware piece at this event
                          </div>
                        </div>

                        {/* 4. Prior Existing Winners */}
                        <div
                          onClick={() => setTournamentDetailTab('allwinners')}
                          className="glass-panel glass-panel-interactive"
                          style={{ padding: '16px', cursor: 'pointer', position: 'relative', border: '1px solid rgba(45, 212, 191, 0.3)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#2dd4bf', letterSpacing: '0.05em' }}>
                              Prior Veteran Winners
                            </span>
                            <span style={{ fontSize: '18px' }}>👑</span>
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2dd4bf' }}>
                            {tournamentAnalytics.priorWinnersCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Veterans</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            Entered this event already possessing at least 1 glassware title
                          </div>
                        </div>
                      </div>

                      {/* Participation Roster Distribution Bar */}
                      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Participant Glassware Distribution ({tournamentAnalytics.totalParticipants} Players)
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                            {Math.round(tournamentAnalytics.everWinnersRatio * 100)}% Total Glassware Penetration
                          </span>
                        </div>

                        {/* Proportional Segment Bar */}
                        <div style={{ height: '14px', borderRadius: '999px', overflow: 'hidden', display: 'flex', backgroundColor: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          {tournamentAnalytics.breakthroughWinnersCount > 0 && (
                            <div
                              title={`${tournamentAnalytics.breakthroughWinnersCount} Breakthrough 1st Wins (${Math.round(tournamentAnalytics.breakthroughWinnersCount / tournamentAnalytics.totalParticipants * 100)}%)`}
                              style={{ width: `${(tournamentAnalytics.breakthroughWinnersCount / tournamentAnalytics.totalParticipants) * 100}%`, backgroundColor: '#fbbf24' }}
                            />
                          )}
                          {tournamentAnalytics.priorWinnersCount > 0 && (
                            <div
                              title={`${tournamentAnalytics.priorWinnersCount} Prior Veteran Champions (${Math.round(tournamentAnalytics.priorWinnersCount / tournamentAnalytics.totalParticipants * 100)}%)`}
                              style={{ width: `${(tournamentAnalytics.priorWinnersCount / tournamentAnalytics.totalParticipants) * 100}%`, backgroundColor: '#2dd4bf' }}
                            />
                          )}
                          {tournamentAnalytics.futureWinnersCount > 0 && (
                            <div
                              title={`${tournamentAnalytics.futureWinnersCount} Future Glassware Winners (${Math.round(tournamentAnalytics.futureWinnersCount / tournamentAnalytics.totalParticipants * 100)}%)`}
                              style={{ width: `${(tournamentAnalytics.futureWinnersCount / tournamentAnalytics.totalParticipants) * 100}%`, backgroundColor: '#c084fc' }}
                            />
                          )}
                          {tournamentAnalytics.nonGlasswareCount > 0 && (
                            <div
                              title={`${tournamentAnalytics.nonGlasswareCount} No Glassware Yet (${Math.round(tournamentAnalytics.nonGlasswareCount / tournamentAnalytics.totalParticipants * 100)}%)`}
                              style={{ width: `${(tournamentAnalytics.nonGlasswareCount / tournamentAnalytics.totalParticipants) * 100}%`, backgroundColor: '#334155' }}
                            />
                          )}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#fbbf24' }} />
                            <span style={{ color: '#cbd5e1' }}>⭐ Breakthrough 1st Wins ({tournamentAnalytics.breakthroughWinnersCount})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#2dd4bf' }} />
                            <span style={{ color: '#cbd5e1' }}>👑 Prior Veterans ({tournamentAnalytics.priorWinnersCount})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#c084fc' }} />
                            <span style={{ color: '#cbd5e1' }}>🔮 Future Champions ({tournamentAnalytics.futureWinnersCount})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#334155' }} />
                            <span style={{ color: '#64748b' }}>No Glassware ({tournamentAnalytics.nonGlasswareCount})</span>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Sub-Tabs */}
                      <div style={{
                        display: 'flex',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        gap: '4px',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => setTournamentDetailTab('analytics')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: tournamentDetailTab === 'analytics' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                            color: tournamentDetailTab === 'analytics' ? '#38bdf8' : '#94a3b8',
                            fontWeight: tournamentDetailTab === 'analytics' ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>📊</span> Analytics & Highlights
                        </button>

                        <button
                          onClick={() => setTournamentDetailTab('future')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: tournamentDetailTab === 'future' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                            color: tournamentDetailTab === 'future' ? '#c084fc' : '#94a3b8',
                            fontWeight: tournamentDetailTab === 'future' ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>🔮</span> Future Champions Showcase ({tournamentAnalytics.futureWinnersCount})
                        </button>

                        <button
                          onClick={() => setTournamentDetailTab('divisions')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: tournamentDetailTab === 'divisions' ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                            color: tournamentDetailTab === 'divisions' ? '#fbbf24' : '#94a3b8',
                            fontWeight: tournamentDetailTab === 'divisions' ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>📑</span> Divisions & Placements ({tournamentDetails?.length || 0})
                        </button>

                        <button
                          onClick={() => setTournamentDetailTab('allwinners')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: tournamentDetailTab === 'allwinners' ? 'rgba(45, 212, 191, 0.18)' : 'transparent',
                            color: tournamentDetailTab === 'allwinners' ? '#2dd4bf' : '#94a3b8',
                            fontWeight: tournamentDetailTab === 'allwinners' ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>👑</span> All Glassware Roster ({tournamentAnalytics.totalEverWinners})
                        </button>
                      </div>

                      {/* SUB-TAB 1: ANALYTICS & HIGHLIGHTS */}
                      {tournamentDetailTab === 'analytics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          
                          {/* 1. Divisions Overview Breakdown (Placed on top) */}
                          <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>📑</span>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                                  Division Breakdown ({tournamentDetails?.length || 0} Divisions)
                                </h3>
                              </div>
                              <button
                                onClick={() => setTournamentDetailTab('divisions')}
                                style={{
                                  padding: '7px 16px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(251, 191, 36, 0.18)',
                                  border: '1px solid rgba(251, 191, 36, 0.45)',
                                  color: '#fbbf24',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 0 14px rgba(251, 191, 36, 0.2)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>📋</span> View Full Placements →
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                              {tournamentDetails?.map(div => {
                                const divParticipants = tournamentAnalytics.participants.filter(p => p.divisionId === div.id);
                                const divEverWinners = divParticipants.filter(p => p.isGlasswareWinnerEver);
                                const divFutureWinners = divParticipants.filter(p => p.status === 'future_winner');

                                return (
                                  <div
                                    key={div.id}
                                    onClick={() => setTournamentDetailTab('divisions')}
                                    className="glass-panel-interactive"
                                    style={{
                                      padding: '14px',
                                      borderRadius: '10px',
                                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                                        {div.name}
                                      </span>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: div.awards_glassware ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                        color: div.awards_glassware ? '#fbbf24' : '#64748b'
                                      }}>
                                        {div.awards_glassware ? '🏆 Awards Glassware' : 'No Glassware'}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                                      <div><strong style={{ color: '#cbd5e1' }}>{div.placements.length}</strong> Teams</div>
                                      <div><strong style={{ color: '#fbbf24' }}>{divEverWinners.length}</strong> Glassware Winners</div>
                                      <div><strong style={{ color: '#c084fc' }}>{divFutureWinners.length}</strong> Future Champions</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Future Champions Spotlight */}
                          {tournamentAnalytics.futureWinnersCount > 0 ? (
                            <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '20px' }}>🔮</span>
                                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#c084fc' }}>
                                    Future Glassware Champions ({tournamentAnalytics.futureWinnersCount})
                                  </h3>
                                </div>
                                <button
                                  onClick={() => setTournamentDetailTab('future')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                    color: '#c084fc',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  View Full Showcase →
                                </button>
                              </div>

                              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                These players did not hold any glassware entering {selectedTournament.name}, but went on to win historical glassware in subsequent events:
                              </p>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                {tournamentAnalytics.futureWinners.slice(0, 6).map(fw => {
                                  const win = fw.firstFutureWin;
                                  const timeLabel = fw.daysToFirstWin ? (fw.daysToFirstWin < 30 ? `${fw.daysToFirstWin} days later` : fw.daysToFirstWin < 365 ? `${Math.round(fw.daysToFirstWin / 30)} months later` : `${(fw.daysToFirstWin / 365).toFixed(1)} years later`) : '';

                                  return (
                                    <div
                                      key={fw.playerName}
                                      style={{
                                        padding: '14px',
                                        borderRadius: '10px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid rgba(168, 85, 247, 0.2)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                                          {fw.playerName}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                          {fw.totalCareerPieces}x Career
                                        </span>
                                      </div>

                                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        Placed <strong style={{ color: '#cbd5e1' }}>#{fw.place}</strong> in {fw.divisionName}
                                      </div>

                                      {win && (
                                        <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.15)', fontSize: '11px' }}>
                                          <div style={{ color: '#c084fc', fontWeight: 700 }}>
                                            🚀 1st Win: {win.type_label}
                                          </div>
                                          <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                                            {win.tournament_name} ({timeLabel})
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏁</div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>No Future Glassware Winners</div>
                              <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#64748b' }}>
                                All participating glassware holders had already won their hardware prior to or at this event.
                              </p>
                            </div>
                          )}

                        </div>
                      )}

                      {/* SUB-TAB 2: FUTURE CHAMPIONS SHOWCASE */}
                      {tournamentDetailTab === 'future' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '24px' }}>🔮</span>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#c084fc' }}>
                                  Future Glassware Champions ({tournamentAnalytics.futureWinnersCount} Players)
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                  These players had not yet won any glassware at the time of {selectedTournament.name}, but went on to win historical glassware in subsequent tournaments.
                                </p>
                              </div>
                            </div>
                          </div>

                          {tournamentAnalytics.futureWinnersCount === 0 ? (
                            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                              No future glassware winners from this tournament.
                            </div>
                          ) : (
                            <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#94a3b8' }}>Player Name</th>
                                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#94a3b8' }}>Finish at this Event</th>
                                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#c084fc' }}>🚀 First Breakthrough Glassware Win</th>
                                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#94a3b8' }}>Time to 1st Win</th>
                                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#fbbf24' }}>Total Career Hardware</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tournamentAnalytics.futureWinners.map(fw => {
                                    const win = fw.firstFutureWin;
                                    const timeLabel = fw.daysToFirstWin ? (fw.daysToFirstWin < 30 ? `${fw.daysToFirstWin} days` : fw.daysToFirstWin < 365 ? `${Math.round(fw.daysToFirstWin / 30)} months` : `${(fw.daysToFirstWin / 365).toFixed(1)} years`) : '—';

                                    return (
                                      <tr key={fw.playerName} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#f8fafc', fontSize: '14px' }}>
                                          {fw.playerName}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>Place #{fw.place}</span> in {fw.divisionName} {fw.teamName && <span style={{ color: '#64748b' }}>({fw.teamName})</span>}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                          {win ? (
                                            <div>
                                              <span style={{ fontWeight: 800, color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                                {win.type_label}
                                              </span>
                                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                🏆 {win.tournament_name} ({win.date_won})
                                              </div>
                                            </div>
                                          ) : (
                                            <span style={{ color: '#64748b' }}>—</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#a5b4fc', fontFamily: 'monospace' }}>
                                          +{timeLabel}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 800, color: '#fbbf24' }}>
                                              {fw.totalCareerPieces} {fw.totalCareerPieces === 1 ? 'Piece' : 'Pieces'}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                              ({fw.careerPitchers > 0 && `${fw.careerPitchers}🍺 `}{fw.careerTankards > 0 && `${fw.careerTankards}🍻 `}{fw.careerGlasses > 0 && `${fw.careerGlasses}🥃`})
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-TAB 3: DIVISIONS & PLACEMENTS */}
                      {tournamentDetailTab === 'divisions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {tournamentDetails?.map(div => (
                            <div key={div.id} style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                                  {div.name}
                                </h4>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: div.awards_glassware ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                  color: div.awards_glassware ? '#fbbf24' : '#64748b',
                                  border: div.awards_glassware ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                  {div.awards_glassware ? '🏆 Awards Glassware' : 'No Glassware'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {div.placements.map((p: any) => {
                                  const players = getSquadPlayers(p.notes, p.player1_name, p.player2_name);
                                  const squadInfo = getSquadDisplayInfo(p.notes, p.player1_name, p.player2_name, ' • ');

                                  const renderPlayerStatusBadge = (part: AnalyzedTournamentParticipant | null | undefined) => {
                                    if (!part) return null;
                                    if (part.status === 'breakthrough') {
                                      return (
                                        <span title="First-time glassware breakthrough!" style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.18)', border: '1px solid rgba(251, 191, 36, 0.35)', padding: '1px 6px', borderRadius: '4px' }}>
                                          ⭐ 1st Win!
                                        </span>
                                      );
                                    }
                                    if (part.status === 'won_here') {
                                      return (
                                        <span title={`Podium winner here! ${part.totalCareerPieces}x career hardware`} style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '1px 6px', borderRadius: '4px' }}>
                                          🍺 Won Here ({part.totalCareerPieces}x)
                                        </span>
                                      );
                                    }
                                    if (part.status === 'prior_winner') {
                                      return (
                                        <span title={`Veteran: Entered this event already possessing ${part.priorWins.length} glassware title(s)`} style={{ fontSize: '10px', fontWeight: 700, color: '#2dd4bf', backgroundColor: 'rgba(45, 212, 191, 0.15)', border: '1px solid rgba(45, 212, 191, 0.35)', padding: '1px 6px', borderRadius: '4px' }}>
                                          👑 {part.priorWins.length}x Prior Winner
                                        </span>
                                      );
                                    }
                                    if (part.status === 'future_winner' && part.firstFutureWin) {
                                      return (
                                        <span title={`Future Champion! Won ${part.firstFutureWin.type_label} at ${part.firstFutureWin.tournament_name}`} style={{ fontSize: '10px', fontWeight: 700, color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.18)', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '1px 6px', borderRadius: '4px' }}>
                                          🔮 Future: {part.firstFutureWin.type_label}
                                        </span>
                                      );
                                    }
                                    return null;
                                  };

                                  return (
                                    <div
                                      key={p.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        backgroundColor: p.place === 1 ? 'rgba(251, 191, 36, 0.06)' : p.place === 2 ? 'rgba(226, 232, 240, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '12px',
                                          fontWeight: 800,
                                          backgroundColor: p.place === 1 ? '#fbbf24' : p.place === 2 ? '#e2e8f0' : p.place === 3 ? '#fb923c' : '#334155',
                                          color: '#000'
                                        }}>
                                          {p.place}
                                        </span>

                                        <div>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                            {p.team_name || 'No Team Name'}
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                                            {players.length > 0 ? (
                                              players.map((pName, pIdx) => {
                                                const part = tournamentAnalytics.participants.find(x => x.playerName.toLowerCase() === pName.toLowerCase());
                                                return (
                                                  <span key={pIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {pIdx > 0 && <span style={{ color: '#475569', marginRight: '2px' }}>•</span>}
                                                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{pName}</span>
                                                    {renderPlayerStatusBadge(part)}
                                                  </span>
                                                );
                                              })
                                            ) : (
                                              <span>{squadInfo.displayNotes || p.notes || 'Unknown Players'}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {p.glassware_awarded && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.12)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                            🍺 {p.glassware_type}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          ))}
                        </div>
                      )}

                      {/* SUB-TAB 4: ALL GLASSWARE ROSTER */}
                      {tournamentDetailTab === 'allwinners' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              placeholder="Search player in this tournament..."
                              value={participantSearch}
                              onChange={(e) => setParticipantSearch(e.target.value)}
                              style={{
                                flex: 1,
                                minWidth: '240px',
                                padding: '8px 12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              Showing <strong style={{ color: '#fbbf24' }}>{tournamentAnalytics.everWinners.filter(p => !participantSearch || p.playerName.toLowerCase().includes(participantSearch.toLowerCase())).length}</strong> of {tournamentAnalytics.totalEverWinners} Glassware Winners
                            </div>
                          </div>

                          <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#94a3b8' }}>Player</th>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#94a3b8' }}>Status at this Event</th>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#94a3b8' }}>Finish</th>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#fbbf24' }}>🍺 Pitchers</th>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#e2e8f0' }}>🍻 Tankards</th>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#fb923c' }}>🥃 Glasses</th>
                                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#38bdf8' }}>Total Pieces</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tournamentAnalytics.everWinners
                                  .filter(p => !participantSearch || p.playerName.toLowerCase().includes(participantSearch.toLowerCase()))
                                  .map(p => (
                                    <tr key={p.playerName} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#f8fafc', fontSize: '14px' }}>
                                        {p.playerName}
                                      </td>
                                      <td style={{ padding: '12px 14px' }}>
                                        {p.status === 'breakthrough' && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                            ⭐ 1st Career Win
                                          </span>
                                        )}
                                        {p.status === 'won_here' && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                            🍺 Won Here
                                          </span>
                                        )}
                                        {p.status === 'prior_winner' && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#2dd4bf', backgroundColor: 'rgba(45, 212, 191, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                            👑 Prior Winner ({p.priorWins.length}x)
                                          </span>
                                        )}
                                        {p.status === 'future_winner' && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                            🔮 Future Winner
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                                        Place #{p.place} in {p.divisionName}
                                      </td>
                                      <td style={{ padding: '12px 14px', fontWeight: 700, color: p.careerPitchers > 0 ? '#fbbf24' : '#64748b' }}>
                                        {p.careerPitchers}
                                      </td>
                                      <td style={{ padding: '12px 14px', fontWeight: 700, color: p.careerTankards > 0 ? '#e2e8f0' : '#64748b' }}>
                                        {p.careerTankards}
                                      </td>
                                      <td style={{ padding: '12px 14px', fontWeight: 700, color: p.careerGlasses > 0 ? '#fb923c' : '#64748b' }}>
                                        {p.careerGlasses}
                                      </td>
                                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#38bdf8', fontSize: '14px' }}>
                                        {p.totalCareerPieces}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '40px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>👈</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>Select a tournament to view details & glassware analytics</div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0 0' }}>
                    Explore total glassware winners and future champions for any tournament.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 4. TEAM DATABASE VIEW */}
        {viewMode === 'teams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Header & KPI Summary Cards (Uniform & Ultra-Compact) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px'
            }}>
              {/* 1. Top Dynasty Team */}
              <div
                onClick={() => teamKPIStats.topTeam && setSelectedTeam(teamKPIStats.topTeam)}
                className="glass-panel glow-gold"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '74px',
                  cursor: teamKPIStats.topTeam ? 'pointer' : 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em' }}>
                    #1 Dynasty Team
                  </span>
                  <span style={{ fontSize: '15px' }}>👑</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {teamKPIStats.topTeam?.name || 'None in Filter'}
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {teamKPIStats.topTeam ? (
                    <>
                      <strong>{teamKPIStats.topTeam.totalGlassware} Pieces</strong> ({teamKPIStats.topTeam.pitchers} 🍺 • {teamKPIStats.topTeam.tankards} 🍻 • {teamKPIStats.topTeam.glasses} 🥃)
                    </>
                  ) : (
                    'No matching teams'
                  )}
                </div>
              </div>

              {/* 2. Most Pitchers */}
              <div className="glass-panel" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em' }}>
                    Most 1st Place Pitchers
                  </span>
                  <span style={{ fontSize: '15px' }}>🍺</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {teamKPIStats.mostPitchersName}
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {teamKPIStats.mostPitchersCount > 0 ? (
                    <>
                      <strong>{teamKPIStats.mostPitchersCount} Pitcher Titles</strong> in selection
                    </>
                  ) : (
                    '0 Pitchers in selection'
                  )}
                </div>
              </div>

              {/* 3. Decorated Teams Count */}
              <div className="glass-panel" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.05em' }}>
                    Decorated Teams
                  </span>
                  <span style={{ fontSize: '15px' }}>👥</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#c084fc' }}>
                  {teamKPIStats.totalDecoratedTeams} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Teams</span>
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  Matching active filters & search
                </div>
              </div>

              {/* 4. Total Hardware Awarded */}
              <div className="glass-panel" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                    Total Hardware Awarded
                  </span>
                  <span style={{ fontSize: '15px' }}>🏆</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>
                  {teamKPIStats.totalPieces} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Pieces</span>
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {teamKPIStats.totalPitchers} 🍺 Pitchers in selection
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                
                {/* Search Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '240px' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search team name, roster players, tournaments, or piece # (e.g. #54)..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                    {teamSearch && (
                      <button
                        onClick={() => setTeamSearch('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Sort dropdown & View Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                    <span>Sort:</span>
                    <select
                      value={teamSortBy}
                      onChange={(e: any) => setTeamSortBy(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="total">🏆 Total Glassware</option>
                      <option value="pitchers">🍺 Pitchers (1st)</option>
                      <option value="tankards">🍻 Tankards (2nd)</option>
                      <option value="glasses">🥃 Glasses (3rd)</option>
                      <option value="name">🔤 Team Name (A-Z)</option>
                    </select>
                  </div>

                  {/* Cards vs Table View */}
                  <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => setTeamViewStyle('cards')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: teamViewStyle === 'cards' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                        color: teamViewStyle === 'cards' ? '#c084fc' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🎴 Cards
                    </button>
                    <button
                      onClick={() => setTeamViewStyle('table')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: teamViewStyle === 'table' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                        color: teamViewStyle === 'table' ? '#c084fc' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📑 Table
                    </button>
                  </div>
                </div>

              </div>

              {/* Quick Filter Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setTeamFilterType('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'all' ? '#c084fc' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'all' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'all' ? '#c084fc' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  All Teams ({teamsDatabase.length})
                </button>

                <button
                  onClick={() => setTeamFilterType('elite')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'elite' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'elite' ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'elite' ? '#fbbf24' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: teamFilterType === 'elite' ? '0 0 12px rgba(251, 191, 36, 0.3)' : 'none'
                  }}
                >
                  ⭐ Spikeball Elite ({teamsDatabase.filter(t => t.isElite).length})
                </button>

                <button
                  onClick={() => setTeamFilterType('men')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'men' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'men' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'men' ? '#38bdf8' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🚹 Men's / Open ({teamsDatabase.filter(t => t.categories.includes('men')).length})
                </button>

                <button
                  onClick={() => setTeamFilterType('women')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'women' ? '#f472b6' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'women' ? 'rgba(244, 114, 182, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'women' ? '#f472b6' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🚺 Women's ({teamsDatabase.filter(t => t.categories.includes('women')).length})
                </button>

                <button
                  onClick={() => setTeamFilterType('mixed')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'mixed' ? '#a78bfa' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'mixed' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'mixed' ? '#a78bfa' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🔀 Mixed ({teamsDatabase.filter(t => t.categories.includes('mixed')).length})
                </button>

                <button
                  onClick={() => setTeamFilterType('pitchers_only')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'pitchers_only' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'pitchers_only' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'pitchers_only' ? '#fbbf24' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🍺 Pitchers ({teamsDatabase.filter(t => t.pitchers > 0).length})
                </button>

                <button
                  onClick={() => setTeamFilterType('multi_hardware')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'multi_hardware' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'multi_hardware' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'multi_hardware' ? '#38bdf8' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⭐ Multi-Piece (2+) ({teamsDatabase.filter(t => t.totalGlassware >= 2).length})
                </button>

                <button
                  onClick={() => setTeamFilterType('squads')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: teamFilterType === 'squads' ? '#2dd4bf' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: teamFilterType === 'squads' ? 'rgba(45, 212, 191, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: teamFilterType === 'squads' ? '#2dd4bf' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  👥 Squads ({teamsDatabase.filter(t => t.rosterPlayers.length >= 3).length})
                </button>
              </div>
            </div>

            {/* TEAM DISPLAY (Cards or Table) */}
            {filteredTeams.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>No teams found matching "{teamSearch}"</div>
                <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Try searching by player name, tournament name, or clearing filters.</p>
              </div>
            ) : teamViewStyle === 'cards' ? (
              
              /* CARDS GRID VIEW */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '12px'
              }}>
                {filteredTeams.map((team, idx) => {
                  const isTop1 = idx === 0 && teamFilterType === 'all' && !teamSearch;
                  const isTop3 = idx < 3 && teamFilterType === 'all' && !teamSearch;

                  return (
                    <div
                      key={team.name}
                      onClick={() => setSelectedTeam(team)}
                      className={`glass-panel glass-panel-interactive ${isTop1 ? 'glow-gold' : isTop3 ? 'glow-purple' : ''}`}
                      style={{
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      {/* Top Header: Rank + Team Name */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fb923c' : 'rgba(255, 255, 255, 0.08)',
                              color: idx < 3 ? '#000' : '#94a3b8'
                            }}>
                              #{idx + 1}
                            </span>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                              {team.name}
                            </h3>
                            {team.isElite && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                color: '#fbbf24',
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                {team.eliteTitle || '⭐ Spikeball Elite'}
                              </span>
                            )}
                          </div>

                          <div style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38bdf8',
                            fontSize: '12px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            <span>🏆</span>
                            <span>{team.totalGlassware}</span>
                          </div>
                        </div>

                        {/* Roster Athletes */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {team.rosterPlayers.map((pName, pIdx) => {
                            const pElite = elite.isElitePlayer(pName);
                            return (
                              <span
                                key={pIdx}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: pElite ? '#fef08a' : '#e2e8f0',
                                  backgroundColor: pElite ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                  border: pElite ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <span>{pElite ? '⭐' : '👤'}</span>
                                <span>{pName}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Compact Hardware Summary Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <span style={{ color: team.pitchers > 0 ? '#fbbf24' : '#64748b' }}>
                          🍺 {team.pitchers} Pitcher{team.pitchers === 1 ? '' : 's'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                        <span style={{ color: team.tankards > 0 ? '#e2e8f0' : '#64748b' }}>
                          🍻 {team.tankards} Tankard{team.tankards === 1 ? '' : 's'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                        <span style={{ color: team.glasses > 0 ? '#fb923c' : '#64748b' }}>
                          🥃 {team.glasses} Glass{team.glasses === 1 ? '' : 'es'}
                        </span>
                      </div>

                      {/* Recent Titles Chips */}
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {team.hardwareList.slice(0, 4).map((h, hIdx) => {
                            const isPitcher = h.place === 1;
                            const isTankard = h.place === 2;
                            return (
                              <span
                                key={hIdx}
                                title={`${h.typeLabel} @ ${h.tournamentName} (${h.date})`}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: isPitcher ? 'rgba(251, 191, 36, 0.15)' : isTankard ? 'rgba(226, 232, 240, 0.12)' : 'rgba(249, 115, 22, 0.15)',
                                  color: isPitcher ? '#fbbf24' : isTankard ? '#e2e8f0' : '#fb923c',
                                  border: `1px solid ${isPitcher ? 'rgba(251, 191, 36, 0.3)' : isTankard ? 'rgba(226, 232, 240, 0.25)' : 'rgba(249, 115, 22, 0.3)'}`
                                }}
                              >
                                {h.typeLabel}
                              </span>
                            );
                          })}
                          {team.hardwareList.length > 4 && (
                            <span style={{ fontSize: '10px', color: '#94a3b8', alignSelf: 'center' }}>
                              +{team.hardwareList.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom action */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {team.firstDate.slice(0, 4)}–{team.latestDate.slice(0, 4)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>
                          View Cabinet →
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (

              /* LEADERBOARD TABLE VIEW */
              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
                        <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700, width: '50px' }}>Rank</th>
                        <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700 }}>Team Name</th>
                        <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700 }}>Athletes</th>
                        <th style={{ padding: '10px 14px', color: '#fbbf24', fontWeight: 700, width: '90px' }}>🍺 Pitchers</th>
                        <th style={{ padding: '10px 14px', color: '#e2e8f0', fontWeight: 700, width: '90px' }}>🍻 Tankards</th>
                        <th style={{ padding: '10px 14px', color: '#fb923c', fontWeight: 700, width: '90px' }}>🥃 Glasses</th>
                        <th style={{ padding: '10px 14px', color: '#38bdf8', fontWeight: 700, width: '100px' }}>🏆 Total</th>
                        <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700, width: '110px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeams.map((team, idx) => (
                        <tr
                          key={team.name}
                          onClick={() => setSelectedTeam(team)}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)')}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 800 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fb923c' : 'rgba(255, 255, 255, 0.08)',
                              color: idx < 3 ? '#000' : '#94a3b8'
                            }}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: '#f8fafc', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{team.name}</span>
                              {team.isElite && (
                                <span style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                                  border: '1px solid rgba(251, 191, 36, 0.4)',
                                  color: '#fbbf24',
                                  fontSize: '9px',
                                  fontWeight: 800
                                }}>
                                  {team.eliteTitle || '⭐ Elite'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {team.rosterPlayers.map((pName, pIdx) => {
                                const pElite = elite.isElitePlayer(pName);
                                return (
                                  <span key={pIdx} style={{ color: pElite ? '#fef08a' : '#cbd5e1', fontWeight: pElite ? 700 : 500 }}>
                                    {pElite ? `⭐ ${pName}` : pName}{pIdx < team.rosterPlayers.length - 1 ? ' • ' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: team.pitchers > 0 ? '#fbbf24' : '#64748b' }}>
                            {team.pitchers}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: team.tankards > 0 ? '#e2e8f0' : '#64748b' }}>
                            {team.tankards}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: team.glasses > 0 ? '#fb923c' : '#64748b' }}>
                            {team.glasses}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: '#38bdf8', fontSize: '14px' }}>
                            {team.totalGlassware}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeam(team);
                              }}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(168, 85, 247, 0.18)',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                color: '#c084fc',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Cabinet →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TEAM DETAIL MODAL (Trophy Cabinet) */}
            {selectedTeam && (
              <div
                onClick={() => setSelectedTeam(null)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.82)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: '200px',
                  paddingBottom: '40px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  overflowY: 'auto'
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="glass-panel"
                  style={{
                    maxWidth: '680px',
                    width: '100%',
                    maxHeight: 'calc(100vh - 250px)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '18px 20px',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(168, 85, 247, 0.25)',
                    position: 'relative'
                  }}
                >
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '22px' }}>🏆</span>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                          {selectedTeam.name}
                        </h2>
                        {selectedTeam.isElite && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(251, 191, 36, 0.2)',
                            border: '1px solid rgba(251, 191, 36, 0.5)',
                            color: '#fbbf24',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 0 12px rgba(251, 191, 36, 0.25)'
                          }}>
                            {selectedTeam.eliteTitle || '⭐ Spikeball Elite'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>Athletes:</span>
                        {selectedTeam.rosterPlayers.map((pName, pIdx) => {
                          const pElite = elite.isElitePlayer(pName);
                          return (
                            <span key={pIdx} style={{ color: pElite ? '#fef08a' : '#e2e8f0', fontWeight: 700, backgroundColor: pElite ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.08)', border: pElite ? '1px solid rgba(251, 191, 36, 0.3)' : 'none', padding: '1px 6px', borderRadius: '4px' }}>
                              {pElite ? '⭐ ' : '👤 '}{pName}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTeam(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Summary Counters */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${selectedTeam.belts > 0 ? 5 : 4}, 1fr)`,
                    gap: '6px',
                    marginBottom: '12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    {selectedTeam.belts > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><BeltIcon size={12} /> BELTS</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', marginTop: '1px' }}>{selectedTeam.belts}</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 800 }}>🍺 PITCHERS</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', marginTop: '1px' }}>{selectedTeam.pitchers}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: 800 }}>🍻 TANKARDS</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#e2e8f0', marginTop: '1px' }}>{selectedTeam.tankards}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#fb923c', fontWeight: 800 }}>🥃 GLASSES</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fb923c', marginTop: '1px' }}>{selectedTeam.glasses}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>🏆 TOTAL</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', marginTop: '1px' }}>{selectedTeam.totalGlassware}</div>
                    </div>
                  </div>

                  {/* Hardware Won Chronicle */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', minHeight: '120px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                      🏆 Trophy Cabinet ({selectedTeam.hardwareList.length} Titles — Most Recent First):
                    </div>
                    {selectedTeam.hardwareList.map((item, idx) => {
                      const gw = getGlasswareDetails(item.typeCategory || item.typeLabel, item.place, undefined, undefined, item.typeLabel);

                      return (
                        <div
                          key={idx}
                          onClick={() => navigateToTournament(item.tournamentId, item.tournamentName)}
                          className="glass-panel-interactive"
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.28)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            flexWrap: 'wrap',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: gw.badgeBg,
                              border: `1px solid ${gw.badgeColor}`,
                              color: gw.badgeColor,
                              fontWeight: 800,
                              fontSize: '12px',
                              whiteSpace: 'nowrap'
                            }}>
                              {gw.icon} {item.typeLabel}
                            </span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{item.tournamentName}</span>
                                <span style={{ fontSize: '11px', color: '#38bdf8' }}>↗</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                {item.divisionName} • 📅 {item.date}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Piece #{item.overallNumber}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: '#cbd5e1'
                            }}>
                              {item.circuit || 'NATS'}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.3)'
                            }}>
                              View in DB →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Modal Footer */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedTeam(null)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Close Cabinet
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PLAYER DETAIL MODAL (Trophy Cabinet) */}
            {selectedPlayer && (
              <div
                onClick={() => setSelectedPlayer(null)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.82)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: '200px',
                  paddingBottom: '40px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  overflowY: 'auto'
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="glass-panel"
                  style={{
                    maxWidth: '880px',
                    width: '100%',
                    maxHeight: 'calc(100vh - 240px)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '18px 20px',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(251, 191, 36, 0.25)',
                    position: 'relative'
                  }}
                >
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '24px' }}>🏆</span>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                          {selectedPlayer.name}
                        </h2>
                        {selectedPlayer.isElite && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(251, 191, 36, 0.2)',
                            border: '1px solid rgba(251, 191, 36, 0.5)',
                            color: '#fbbf24',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 0 12px rgba(251, 191, 36, 0.25)'
                          }}>
                            {selectedPlayer.allEliteYears && selectedPlayer.allEliteYears.length > 0
                              ? `⭐ Spikeball Elite (${selectedPlayer.allEliteYears.join(', ')})`
                              : `⭐ Spikeball Elite (${selectedPlayer.firstEliteYear || 'Veteran'})`}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        Personal Trophy Cabinet • {selectedPlayer.total} Career Titles ({selectedPlayer.pitchers} 🍺 Pitchers, {selectedPlayer.tankards} 🍻 Tankards, {selectedPlayer.glasses} 🥃 Glasses)
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPlayer(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* 2-Column Modal Body: Left Sidebar (Counters + Sherpas) | Right Content (Trophy List) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(240px, 280px) 1fr',
                    gap: '14px',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                  }}>
                    {/* LEFT SIDEBAR: Career Hardware Summary & Sherpa Mentorships */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {/* Summary Hardware Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}>
                        <div style={{ textAlign: 'center', padding: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 800 }}>🍺 PITCHERS</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>{selectedPlayer.pitchers}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: 800 }}>🍻 TANKARDS</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0', marginTop: '2px' }}>{selectedPlayer.tankards}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#fb923c', fontWeight: 800 }}>🥃 GLASSES</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#fb923c', marginTop: '2px' }}>{selectedPlayer.glasses}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>🏆 TOTAL</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{selectedPlayer.total}</div>
                        </div>
                      </div>

                      {/* Championship Belts Card */}
                      {selectedPlayer.belts > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          padding: '8px 12px',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BeltIcon size={18} />
                            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>Championship Belts</span>
                          </div>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24' }}>{selectedPlayer.belts}</span>
                        </div>
                      )}

                      {/* Sherpa Score Card & Mentorships Sidebar Section */}
                      <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(52, 211, 153, 0.08)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        flex: 1
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>🎒</span>
                            <span>Sherpa Score</span>
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(52, 211, 153, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.4)'
                          }}>
                            {selectedPlayer.sherpaScore}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                          Guided {selectedPlayer.sherpaList.length} doubles partner{selectedPlayer.sherpaList.length === 1 ? '' : 's'} to their 1st career glassware in that division.
                        </div>

                        {/* Sherpa Mentorships List */}
                        {selectedPlayer.sherpaList && selectedPlayer.sherpaList.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', overflowY: 'auto', maxHeight: '200px' }}>
                            {selectedPlayer.sherpaList.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  fontSize: '11px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                  border: '1px solid rgba(52, 211, 153, 0.18)',
                                  color: '#f8fafc',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                  <span style={{ fontWeight: 800, color: '#34d399' }}>🤝 {s.rookieName}</span>
                                  <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>{s.hardwareType}</span>
                                </div>
                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  {s.tournamentName} • {s.date}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                            No doubles partners guided to maiden glassware yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Full-Height Chronological Trophy Chronicle */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto',
                      paddingRight: '4px',
                      gap: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px', position: 'sticky', top: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(4px)', padding: '4px 0', zIndex: 2 }}>
                        🏆 Trophy Cabinet ({selectedPlayer.hardwareList.length} Titles — Most Recent First):
                      </div>
                      {selectedPlayer.hardwareList.map((item, idx) => {
                        const gw = getGlasswareDetails(item.typeCategory || item.typeLabel, item.place, undefined, undefined, item.typeLabel);

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedPlayer(null);
                              navigateToTournament(item.tournamentId, item.tournamentName);
                            }}
                            className="glass-panel-interactive"
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(0, 0, 0, 0.28)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              flexWrap: 'wrap',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: gw.badgeBg,
                                border: `1px solid ${gw.badgeColor}`,
                                color: gw.badgeColor,
                                fontWeight: 800,
                                fontSize: '12px',
                                whiteSpace: 'nowrap'
                              }}>
                                {gw.icon} {item.typeLabel}
                              </span>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{item.tournamentName}</span>
                                  <span style={{ fontSize: '11px', color: '#38bdf8' }}>↗</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span>{item.divisionName} • 📅 {item.date}</span>
                                  {item.teamName && item.teamName !== 'Individual / Doubles Entry' && (
                                    <span style={{ backgroundColor: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                      🛡️ {item.teamName}
                                    </span>
                                  )}
                                </div>
                                {/* Teammates List */}
                                {item.teammates.length > 0 && (
                                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>🤝 {item.teammates.length > 1 ? 'Squad:' : 'Partner:'}</span>
                                    {item.teammates.map((tName, tIdx) => (
                                      <span key={tIdx} style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: '#f8fafc' }}>
                                        {tName}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                Piece #{item.overallNumber}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                color: '#cbd5e1'
                              }}>
                                {item.circuit || 'NATS'}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#38bdf8',
                                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(56, 189, 248, 0.3)'
                              }}>
                                View in DB →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Close Cabinet
                    </button>
                  </div>
                </div>
              </div>
            )}

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748b',
        backgroundColor: 'rgba(9, 13, 22, 0.9)'
      }}>
        Roundnet Glassware Tracker • Chronological Numbered Series #1 to #{stats.totalGlassware} • {includePre2020 ? '2013–2026' : '2020–2026'}
      </footer>
      <Analytics />
    </div>
  );
}

