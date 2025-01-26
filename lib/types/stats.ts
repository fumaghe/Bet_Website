// lib/types/stats.ts

export interface TeamStats {
  position: number;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  xG: number;
  xGA: number;
  league: string;
}

export interface TeamPerformance {
  team: string;
  league: string;
  players: number;
  age: number;
  possession: number;
  matches: number;
  goals: number;
  assists: number;
  goalsAndAssists: number;
  xG: number;
  npxG: number;
  xAG: number;
  rating: number;
  logo: string;
  recentForm?: string; // Aggiungi questa proprietà
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
  homeScore?: number;
  awayScore?: number;
}

export interface League {
  name: string;
  country: string;
  icon: string;
}

// Nuova interfaccia MatchDaily
export interface MatchDaily {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
  xGHome: number;
  golHome: number;
  golAway: number;
  xGAway: number;
  sett: number;
}

export interface PlayerStats {
  pos: number;
  name: string;
  nationality: string;
  position: string;
  team: string;
  league: string;
  age: number;
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  xG: number;
  shots: number;
  shotsOnTarget: number;
  foulsCommitted: number;
  foulsDrawn: number;
  offsides: number;
  progressiveCarries: number;
  progressivePasses: number;
}

export type NumericPlayerStatsKeys =
  | 'goals'
  | 'assists'
  | 'xG'
  | 'shots'
  | 'shotsOnTarget'
  | 'yellowCards'
  | 'redCards'
  | 'foulsCommitted'
  | 'foulsDrawn'
  | 'matches'
  | 'minutes'
  | 'offsides'
  | 'progressiveCarries'
  | 'progressivePasses';

export interface HistoricalMatch {
  homeTeam: string;
  awayTeam: string;
  time: string;
  date: string;
  competition: string;
  xGHome: number;
  goalsHome: number;
  goalsAway: number;
  xGAway: number;
  week: number;
}

// Aggiungi l'interfaccia MatchDetailsType
export interface MatchDetailsType extends Match {
  xGHome: number;
  xGAway: number;
  golHome: number; // Aggiunto
  golAway: number; // Aggiunto
  // Aggiungi altre proprietà se necessario
}

// lib/types/stats.ts

export interface CsvMatchRow {
  'Squadra Casa': string;
  'Squadra Trasferta': string;
  'Orario': string;
  'Giorno': string;
  'Campionato': string;
  'xG Casa': string;
  'Gol Casa': string;
  'Gol Trasferta': string;
  'xG Trasferta': string;
  'Sett.': string;
}

// ... (le altre interfacce esistenti)
