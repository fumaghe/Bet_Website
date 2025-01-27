'use client';

import { parseCSV } from '../utils/csv-parser';
import { HistoricalMatch } from '../types/stats';

// Definisci il tipo dei dati CSV
type MatchCSVRow = {
  'Squadra Casa': string;
  'Squadra Trasferta': string;
  'Orario': string;
  'Giorno': string;
  'Campionato': string;
  'xG Casa': string; // I dati CSV sono sempre stringhe
  'Gol Casa': string;
  'Gol Trasferta': string;
  'xG Trasferta': string;
  'Sett.': string;
};

// Array per salvare i dati elaborati
let historicalMatches: HistoricalMatch[] = [];

// Funzione per caricare i dati delle partite
export async function loadHistoricalMatches() {
  try {
    const response = await fetch('/Bet_Website/data/all_leagues_matches.csv');
    const data = await response.text();

    // Specifica il tipo generico per parseCSV
    const parsedData = await parseCSV<MatchCSVRow>(data);

    // Mappa i dati del CSV nei tuoi tipi definiti
    historicalMatches = parsedData.map(match => ({
      homeTeam: match['Squadra Casa'],
      awayTeam: match['Squadra Trasferta'],
      time: match['Orario'],
      date: match['Giorno'],
      competition: match['Campionato'],
      xGHome: parseFloat(match['xG Casa']),
      goalsHome: parseInt(match['Gol Casa']),
      goalsAway: parseInt(match['Gol Trasferta']),
      xGAway: parseFloat(match['xG Trasferta']),
      week: parseInt(match['Sett.']),
    }));
  } catch (error) {
    console.error('Error loading historical matches:', error);
  }
}

// Funzione per ottenere le partite tra due squadre
export function getHistoricalMatches(team1: string, team2: string): HistoricalMatch[] {
  return historicalMatches
    .filter(match =>
      (match.homeTeam === team1 && match.awayTeam === team2) ||
      (match.homeTeam === team2 && match.awayTeam === team1)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
