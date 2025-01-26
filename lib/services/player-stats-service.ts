// lib/services/player-stats-service.ts

'use client';

import { parseCSV } from '../utils/csv-parser';
import { PlayerStats } from '../types/stats';

let leaguePlayers: PlayerStats[] = [];
let championsLeaguePlayers: PlayerStats[] = [];

/**
 * Carica e normalizza i dati dei giocatori dai CSV.
 */
export async function loadPlayerStats() {
  try {
    const leagueResponse = await fetch('/data/players/league_players.csv');
    const championsResponse = await fetch('/data/players/champions_league_players.csv');

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
    console.log('League Players:', leaguePlayers);
    console.log('Champions League Players:', championsLeaguePlayers);
  } catch (error) {
    console.error('Error loading player stats:', error);
  }
}

/**
 * Normalizza i dati dei giocatori aggiungendo informazioni sulla lega.
 * @param data Dati grezzi dei giocatori dal CSV.
 * @param type Tipo di lega ('league' o 'champions').
 * @returns Array di PlayerStats normalizzati.
 */
function normalizePlayerStats(data: any[], type: 'league' | 'champions'): PlayerStats[] {
  return data.map(row => ({
    pos: parseInt(row.Pos) || 0,
    name: row.Giocatore || 'Sconosciuto',
    nationality: row.Nazione || 'Sconosciuta',
    position: row.Ruolo || 'Sconosciuto',
    team: typeof row.Squadra === 'string' && row.Squadra.trim() !== '' ? row.Squadra : 'Sconosciuta',
    league: type === 'league' ? row.Competizione || 'Serie A' : 'Champions League',
    age: parseInt(row.Età) || 0,
    matches: parseInt(row.PG) || 0,
    starts: parseInt(row.Tit) || 0,
    minutes: parseInt(row.Min) || 0,
    goals: parseInt(row.Reti) || 0,
    assists: parseInt(row.Assist) || 0,
    yellowCards: parseInt(row['Amm.']) || 0,
    redCards: parseInt(row['Esp.']) || 0,
    xG: parseFloat(row.xG) || 0,
    shots: parseInt(row['Tiri totali']) || 0,
    shotsOnTarget: parseInt(row['Tiri in porta']) || 0,
    foulsCommitted: parseInt(row['Falli commessi']) || 0,
    foulsDrawn: parseInt(row['Falli subiti']) || 0,
    offsides: parseInt(row.Fuorigioco) || 0,
    progressiveCarries: parseInt(row.PrgC) || 0,
    progressivePasses: parseInt(row.PrgP) || 0
  }));
}

/**
 * Ottiene i giocatori filtrati per squadra e lega.
 * @param team Nome della squadra
 * @param league Nome della lega
 * @returns Array di PlayerStats filtrati
 */
export function getPlayerStats(team: string, league: string): PlayerStats[] {
  const players = league === 'Champions League' ? championsLeaguePlayers : leaguePlayers;
  return players.filter(player => 
    typeof player.team === 'string' && player.team.toLowerCase() === team.toLowerCase()
  );
}

/**
 * Ottiene i top N giocatori ordinati per una specifica statistica, applicando filtri sui match.
 * @param team Nome della squadra
 * @param league Nome della lega
 * @param stat La statistica per cui ordinare
 * @param limit Numero massimo di giocatori da restituire
 * @returns Array di PlayerStats ordinati e limitati
 */
export function getTopPlayersByStat(
  team: string, 
  league: string, 
  stat: keyof PlayerStats, 
  limit: number = 10
): PlayerStats[] {
  const players = getPlayerStats(team, league);
  console.log(`Filtrando i giocatori per ${team} nella lega ${league} per la statistica ${stat}`);

  // Applica il filtro sulle partite giocate
  const minMatches = league === 'Champions League' ? 3 : 5;
  const filteredPlayers = players.filter(player => 
    player.matches >= minMatches && player[stat] !== undefined && player[stat] !== null
  );

  console.log(`Giocatori filtrati per ${stat}:`, filteredPlayers);

  // Ordina i giocatori in ordine decrescente basato sulla statistica
  const sortedPlayers = filteredPlayers.sort((a, b) => {
    const aValue = a[stat];
    const bValue = b[stat];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return bValue - aValue;
    }
    return 0;
  });

  // Restituisce i primi 'limit' giocatori
  const topPlayers = sortedPlayers.slice(0, limit);
  console.log(`Top ${limit} giocatori per ${stat}:`, topPlayers);

  return topPlayers;
}

export function getLeagueTopPlayers(league: string, category: 'goals' | 'assists' | 'goalsAndAssists', limit: number = 20): PlayerStats[] {
  const players = league === 'Champions League' ? championsLeaguePlayers : leaguePlayers.filter(p => p.league === league);
  
  return [...players]
    .sort((a, b) => {
      if (category === 'goals') {
        return b.goals - a.goals;
      } else if (category === 'assists') {
        return b.assists - a.assists;
      } else {
        return (b.goals + b.assists) - (a.goals + a.assists);
      }
    })
    .slice(0, limit);
}