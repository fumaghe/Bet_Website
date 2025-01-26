'use client';

import { parseCSV } from '../utils/csv-parser';
import { TeamStats } from '../types/stats';

let standings: Record<string, TeamStats[]> = {};

/**
 * Carica i dati delle classifiche da file CSV.
 */
export async function loadStandings(): Promise<void> {
  try {
    const leagues = ['serie_a', 'premier_league', 'la_liga', 'bundesliga', 'ligue_1', 'champions_league'];

    for (const league of leagues) {
      const response = await fetch(`/data/standings/${league}.csv`);
      const csvData = await response.text();
      const parsedData = await parseCSV<any>(csvData);

      standings[league] = parsedData.map(row => ({
        position: parseInt(row.Pos, 10),
        team: row.Squadra,
        played: parseInt(row.PG, 10),
        wins: parseInt(row.V, 10),
        draws: parseInt(row.N, 10),
        losses: parseInt(row.P, 10),
        goalsFor: parseInt(row.Rf, 10),
        goalsAgainst: parseInt(row.Rs, 10),
        goalDifference: parseInt(row.DR, 10),
        points: parseInt(row.Pt, 10),
        xG: parseFloat(row.xG),
        xGA: parseFloat(row.xGA),
        league: league,
      }));

      console.log(`Loaded standings for ${league}:`, standings[league]);
    }
  } catch (error) {
    console.error('Error loading standings:', error);
  }
}

/**
 * Restituisce i dati della classifica per una lega specifica.
 * @param league Nome della lega.
 * @returns Array di `TeamStats` per la lega specificata.
 */
export function getLeagueStandings(league: string): TeamStats[] {
  const normalizedLeague = league.toLowerCase().replace(/\s+/g, '_');
  console.log(`Fetching standings for league: ${normalizedLeague}`);
  return standings[normalizedLeague] || [];
}

/**
 * Restituisce i dati di una squadra specifica in una lega.
 * @param team Nome della squadra.
 * @param league Nome della lega.
 * @returns Oggetto `TeamStats` della squadra specificata, se trovato.
 */
export function getTeamStanding(team: string, league: string): TeamStats | undefined {
  const normalizedLeague = league.toLowerCase().replace(/\s+/g, '_');
  return standings[normalizedLeague]?.find(s => s.team === team);
}

/**
 * Restituisce tutte le classifiche caricate.
 * @returns Oggetto contenente tutte le classifiche per tutte le leghe.
 */
export function getAllStandings(): Record<string, TeamStats[]> {
  return standings;
}
