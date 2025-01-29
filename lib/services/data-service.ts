// lib/services/data-service.ts

'use client';

import { parseCSV } from '../utils/csv-parser';
import { TeamStats, Match, TeamPerformance, League, MatchDetailsType, CsvMatchRow } from '../types/stats';
import Papa from 'papaparse'; // Assicurati di importare PapaParse

let leagueStats: Record<string, TeamStats[]> = {};
let matches: MatchDetailsType[] = []; // Cambiato a MatchDetailsType[]

export const LEAGUES: League[] = [
  {
    name: 'Serie A',
    country: 'Italia',
    icon: '/Bet_Website/images/leagues/serie_a.png',
  },
  {
    name: 'Premier League',
    country: 'Inghilterra',
    icon: '/Bet_Website/images/leagues/premier_league.png',
  },
  {
    name: 'La Liga',
    country: 'Spagna',
    icon: '/Bet_Website/images/leagues/la_liga.png',
  },
  {
    name: 'Bundesliga',
    country: 'Germania',
    icon: '/Bet_Website/images/leagues/bundesliga.png',
  },
  {
    name: 'Ligue 1',
    country: 'Francia',
    icon: '/Bet_Website/images/leagues/ligue_1.png',
  },
  {
    name: 'Champions League',
    country: 'Europa',
    icon: '/Bet_Website/images/leagues/champions_league.png',
  },
];

/**
 * Funzione per normalizzare il nome della lega.
 * Trasforma il nome in minuscolo e sostituisce gli spazi con underscore.
 * @param name Nome della lega
 * @returns Nome normalizzato
 */
export const normalizeLeagueName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Funzione per normalizzare il nome della squadra.
 * Trasforma il nome in minuscolo e sostituisce gli spazi con underscore.
 * @param name Nome della squadra
 * @returns Nome normalizzato
 */
export const normalizeTeamName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Funzione per normalizzare i dati delle squadre.
 * @param row Riga del CSV
 * @param league Nome della lega
 * @returns Oggetto TeamStats normalizzato
 */
function normalizeTeamStats(row: any, league: string): TeamStats {
  return {
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
    league: league, // Assegniamo la lega correttamente
  };
}

/**
 * Funzione principale per caricare i dati.
 * Carica le classifiche delle leghe e le partite da file CSV.
 */
export async function loadData() {
  try {
    const leagues = [
      'serie_a',
      'premier_league',
      'la_liga',
      'bundesliga',
      'ligue_1',
      'champions_league',
    ];

    // Carica le classifiche per ogni lega
    for (const league of leagues) {
      const response = await fetch(`/Bet_Website/data/standings/${league}.csv`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      const parsedData = await parseCSV<any>(data);
      leagueStats[league] = parsedData.map(row => normalizeTeamStats(row, league));
      console.log(`Classifica caricata per la lega: ${league}`, leagueStats[league]);
    }

    // Carica tutte le partite dal CSV
    const matchesResponse = await fetch(`/Bet_Website/data/all_leagues_matches.csv`);
    if (!matchesResponse.ok) {
      throw new Error(`Failed to load matches: ${matchesResponse.status}`);
    }
    const matchesCsv = await matchesResponse.text();
    const parsedMatches = Papa.parse<CsvMatchRow>(matchesCsv, {
      header: true,
      skipEmptyLines: true,
    });

    // Verifica che Papa.parse abbia correttamente parsato i dati
    if (parsedMatches.errors.length > 0) {
      console.error('Error parsing matches CSV:', parsedMatches.errors);
      throw new Error('Error parsing matches CSV.');
    }

    // Mappa le partite in MatchDetailsType
    matches = parsedMatches.data.map((row: CsvMatchRow) => ({
      id: `${normalizeTeamName(row['Squadra Casa'])}-${normalizeTeamName(row['Squadra Trasferta'])}-${row['Giorno']}-${row['Orario']}`,
      homeTeam: row['Squadra Casa'],
      awayTeam: row['Squadra Trasferta'],
      league: row['Campionato'],
      date: row['Giorno'],
      time: row['Orario'],
      xGHome: parseFloat(row['xG Casa']) || 0,
      xGAway: parseFloat(row['xG Trasferta']) || 0,
      golHome: parseInt(row['Gol Casa']) || 0,
      golAway: parseInt(row['Gol Trasferta']) || 0,
    }));

    console.log('Dati caricati con successo.', matches);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

/**
 * Funzione per ottenere la classifica di una lega.
 * @param league Nome della lega
 * @returns Array di TeamStats
 */
export function getLeagueStandings(league: string): TeamStats[] {
  const normalizedLeague = normalizeLeagueName(league);
  return leagueStats[normalizedLeague] || [];
}

/**
 * Funzione per ottenere tutte le partite.
 * @returns Array di MatchDetailsType
 */
export function getMatches(): MatchDetailsType[] {
  return matches;
}

/**
 * Funzione per ottenere le performance di una squadra.
 * @param teamName Nome della squadra
 * @returns Oggetto TeamPerformance o undefined
 */
export function getTeamPerformance(teamName: string): TeamPerformance | undefined {
  const normalizedTeamName = normalizeTeamName(teamName);
  const allTeams = Object.entries(leagueStats).flatMap(([league, teams]) =>
    teams.map((team) => ({ ...team, league }))
  ); // Unisce tutte le squadre con la loro lega

  const teamStats = allTeams.find(
    (team) => normalizeTeamName(team.team) === normalizedTeamName
  );

  if (teamStats) {
    return {
      team: teamStats.team,
      league: teamStats.league,
      players: 0, // Placeholder, puoi aggiornare con dati reali
      age: 0, // Placeholder
      possession: 0, // Placeholder
      matches: teamStats.played,
      goals: teamStats.goalsFor,
      assists: 0, // Placeholder
      goalsAndAssists: teamStats.goalsFor, // Aggiorna se hai dati reali
      xG: teamStats.xG,
      npxG: 0, // Placeholder
      xAG: 0, // Placeholder
      rating: 3, // Placeholder
      logo: `/Bet_Website/images/teams/${normalizeTeamName(teamStats.team)}.png`,
    };
  }

  return undefined;
}

/**
 * Funzione per ottenere i dettagli di una partita.
 * @param matchId ID della partita
 * @returns Oggetto MatchDetailsType o null
 */
export function getMatchDetails(matchId: string): MatchDetailsType | null {
  const match = matches.find(m => m.id === matchId);
  if (!match) return null;

  // Se necessario, aggiungi altre proprietà qui
  return match;
}
