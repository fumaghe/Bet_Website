// lib/types/arbitrage.ts

export interface Bet {
  odd: number;
  sportbook: string;
  stake: number;
  win: number;
  bet_type: string;
  outcome: string;
  bet_radar_id: string;
}

export interface SportbookInfo {
  sport?: string;
  name: string;
  minute?: string;
  score?: string | string[];
  start?: string;
  period?: string;
  tournament?: string;
  time?: string;
}

export interface ArbitrageInfo {
  [sportbook: string]: SportbookInfo;
}

export interface Arbitrage {
  foundAt: number; // Timestamp in secondi
  bet_radar_id: string;
  cycle: number;
  probability: number;
  sportbooks: string[];
  staus: boolean; // Assicurati che il campo sia 'staus'
  score: number;
  info: ArbitrageInfo;
  bets: Bet[];
}

export interface ArbitrageData {
  [timestamp: string]: Arbitrage[];
}