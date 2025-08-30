// lib/services/player-stats-service.ts

'use client';

import { parseCSV } from '../utils/csv-parser';
import { PlayerStats } from '../types/stats';

let leaguePlayers: PlayerStats[] = [];
let championsLeaguePlayers: PlayerStats[] = [];

/** Coalesce numeri: accetta number|string|undefined e torna un number valido (default 0) */
function num(val: any, def = 0): number {
  if (val === null || val === undefined || val === '') return def;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? def : n;
}

/** Coalesce interi */
function int(val: any, def = 0): number {
  if (val === null || val === undefined || val === '') return def;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return isNaN(n) ? def : n;
}

/** Coalesce stringhe “pulite” */
function str(val: any, def = 'Sconosciuto'): string {
  if (typeof val !== 'string') return def;
  const s = val.trim();
  return s.length ? s : def;
}

/**
 * Carica e normalizza i dati dei giocatori dai CSV.
 */
export async function loadPlayerStats() {
  try {
    const leagueResponse = await fetch('/Bet_Website/data/players/league_players.csv', { cache: 'no-store' });
    const championsResponse = await fetch('/Bet_Website/data/players/champions_league_players.csv', { cache: 'no-store' });

    if (!leagueResponse.ok || !championsResponse.ok) {
      throw new Error('Errore nel caricamento dei file CSV');
    }

    const leagueData = await leagueResponse.text();
    const championsData = await championsResponse.text();

    const parsedLeaguePlayers = await parseCSV(leagueData);
    const parsedChampionsPlayers = await parseCSV(championsData);

    leaguePlayers = normalizePlayerStats(parsedLeaguePlayers, 'league');
    championsLeaguePlayers = normalizePlayerStats(parsedChampionsPlayers, 'champions');

    console.log('Dati dei giocatori caricati correttamente.');
  } catch (error) {
    console.error('Error loading player stats:', error);
  }
}

/**
 * Normalizza i dati dei giocatori aggiungendo informazioni sulla lega.
 * Nota: nel CSV di Champions la colonna è "Pos." (con il punto).
 */
function normalizePlayerStats(data: any[], type: 'league' | 'champions'): PlayerStats[] {
  return data.map((row) => ({
    pos: int(row['Pos.']),
    name: str(row.Giocatore, 'Sconosciuto'),
    nationality: str(row.Nazione, 'Sconosciuta'),
    position: str(row.Ruolo, 'Sconosciuto'),
    team: str(row.Squadra, 'Sconosciuta'),
    league: type === 'league' ? str(row.Competizione, 'Serie A') : 'Champions League',
    age: int(row.Età),
    matches: int(row.PG),
    starts: int(row.Tit),
    minutes: int(row.Min),
    goals: int(row.Reti),
    assists: int(row.Assist),
    yellowCards: int(row['Amm.']),
    redCards: int(row['Esp.']),
    xG: num(row.xG),

    // opzionali: mai NaN
    shots: int(row['Tiri totali']),
    shotsOnTarget: int(row['Tiri in porta']),
    foulsCommitted: int(row['Falli commessi']),
    foulsDrawn: int(row['Falli subiti']),
    offsides: int(row.Fuorigioco),
    progressiveCarries: int(row.PrgC),
    progressivePasses: int(row.PrgP),
  }));
}

/**
 * Filtra per squadra + lega.
 */
export function getPlayerStats(team: string, league: string): PlayerStats[] {
  const players = league === 'Champions League' ? championsLeaguePlayers : leaguePlayers;
  return players.filter(
    (player) =>
      typeof player.team === 'string' &&
      player.team.toLowerCase() === team.toLowerCase()
  );
}

/**
 * Top N per statistica, con filtro minimo presenze.
 * Se la statistica non esiste su nessun giocatore (tutti undefined/null), torniamo []:
 * la UI si occuperà del fallback.
 */
export function getTopPlayersByStat(
  team: string,
  league: string,
  stat: keyof PlayerStats,
  limit: number = 10
): PlayerStats[] {
  const players = getPlayerStats(team, league);

  const minMatches = league === 'Champions League' ? 3 : 5;
  const filteredPlayers = players.filter(
    (player) => player.matches >= minMatches && player[stat] !== undefined && player[stat] !== null
  );

  const sortedPlayers = filteredPlayers.sort((a, b) => {
    const aValue = a[stat];
    const bValue = b[stat];
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return bValue - aValue;
    }
    return 0;
  });

  return sortedPlayers.slice(0, limit);
}

/**
 * Top giocatori per goals / assists / goals+assists.
 */
export function getLeagueTopPlayers(
  league: string,
  category: 'goals' | 'assists' | 'goalsAndAssists',
  limit: number = 20
): PlayerStats[] {
  const players =
    league === 'Champions League'
      ? championsLeaguePlayers
      : leaguePlayers.filter((p) => p.league === league);

  const sorted = [...players].sort((a, b) => {
    if (category === 'goals') {
      return b.goals - a.goals;
    } else if (category === 'assists') {
      return b.assists - a.assists;
    } else {
      return b.goals + b.assists - (a.goals + a.assists);
    }
  });

  return sorted.slice(0, limit);
}
