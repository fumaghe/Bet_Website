// app/leagues/matches/daily-matches.tsx

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Papa from 'papaparse';
import { getTeamPerformance } from '@/lib/services/data-service';
import { MatchDaily, TeamPerformance } from '@/lib/types/stats';

// Tipi di proprietà
interface DailyMatchesProps {
  league: string;
  year: number;
  highlightLeague?: string;
}

interface CsvMatchRow {
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

// Funzioni utilitarie
const normalizeLeague = (name: string): string => {
  return name.replace(/[\s-]/g, '').toLowerCase();
};

const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat('it-IT', options).format(date); // e.g., "12 ago"
};

const formatDateRange = (earliestDate: Date, latestDate: Date): string => {
  const formattedEarliest = formatDateShort(earliestDate.toISOString().split('T')[0]);
  const formattedLatest = formatDateShort(latestDate.toISOString().split('T')[0]);
  return `${formattedEarliest} - ${formattedLatest}`;
};

// Componenti Sotto-Componenti
const SettSelector: React.FC<{
  sortedSetts: number[];
  selectedSett: number | null;
  onPrev: () => void;
  onNext: () => void;
  matchesBySett: Record<number, MatchDaily[]>;
}> = ({ sortedSetts, selectedSett, onPrev, onNext, matchesBySett }) => {
  if (selectedSett === null) return null;

  const settMatches = matchesBySett[selectedSett];
  let dateRange = '';
  if (settMatches && settMatches.length > 0) {
    const dates = settMatches.map(match => new Date(match.date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    dateRange = formatDateRange(earliestDate, latestDate);
  }

  const currentIndex = sortedSetts.indexOf(selectedSett);

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onPrev}
        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={currentIndex === 0}
        aria-label="Sett precedente"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <div className="text-lg font-semibold">{dateRange}</div>
      <button
        onClick={onNext}
        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={currentIndex === sortedSetts.length - 1}
        aria-label="Sett successivo"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

const MatchItem: React.FC<{
  match: MatchDaily;
  teamsData: Record<string, TeamPerformance>;
}> = ({ match, teamsData }) => {
  const homeTeam = teamsData[match.homeTeam];
  const awayTeam = teamsData[match.awayTeam];

  // Determina il vincitore
  const result = `${match.golHome} - ${match.golAway}`;
  const winner =
    match.golHome > match.golAway
      ? 'home'
      : match.golHome < match.golAway
      ? 'away'
      : 'draw';

  return (
    <Link
      href={`/leagues/matches/${encodeURIComponent(match.id)}`}
      className="block border-b py-2 px-4 hover: transition-colors"
    >
      {/* Orario sopra il risultato */}
      <div className="text-sm text-gray-500 mb-1 text-center">{match.time}</div>
      
      <div className="flex items-center justify-between">
        {/* Home Team */}
        <div className="flex items-center space-x-2 flex-1">
          {homeTeam && (
            <Image
              src={homeTeam.logo}
              alt={match.homeTeam}
              width={24}
              height={24}
              className="object-contain"
            />
          )}
          <span className={`font-medium ${winner === 'home' ? 'text-green-600' : ''}`}>
            {match.homeTeam}
          </span>
        </div>

        {/* Risultato */}
        <div className="text-lg font-bold w-16 text-center">{result}</div>

        {/* Away Team */}
        <div className="flex items-center space-x-2 flex-1 justify-end">
          <span className={`font-medium ${winner === 'away' ? 'text-green-600' : ''}`}>
            {match.awayTeam}
          </span>
          {awayTeam && (
            <Image
              src={awayTeam.logo}
              alt={match.awayTeam}
              width={24}
              height={24}
              className="object-contain"
            />
          )}
        </div>
      </div>
    </Link>
  );
};

const DayGroup: React.FC<{
  dayKey: string;
  matches: MatchDaily[];
  teamsData: Record<string, TeamPerformance>;
}> = ({ dayKey, matches, teamsData }) => {
  const formattedDay = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(dayKey));

  return (
    <div key={dayKey}>
      {/* Giorno con testo più piccolo */}
      <h2 className="text-lg font-semibold mb-4">{formattedDay}</h2>
      <div className="space-y-2">
        {matches.map(match => (
          <MatchItem key={match.id} match={match} teamsData={teamsData} />
        ))}
      </div>
    </div>
  );
};

// Componente Principale
export function DailyMatches({ league, year, highlightLeague }: DailyMatchesProps) {
  const [matchesBySett, setMatchesBySett] = useState<Record<number, MatchDaily[]>>({});
  const [sortedSetts, setSortedSetts] = useState<number[]>([]);
  const [selectedSett, setSelectedSett] = useState<number | null>(null);
  const [teamsData, setTeamsData] = useState<Record<string, TeamPerformance>>({});
  const [error, setError] = useState<string | null>(null);

  // Caricamento Dati delle Partite
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        console.log('Inizio caricamento dati delle partite...');
        const response = await fetch('/data/all_leagues_matches.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log('CSV caricato con successo.');

        const parsed = Papa.parse<CsvMatchRow>(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        console.log('CSV parsato:', parsed.data.length, 'righe trovate.');

        // Log delle leghe presenti nel CSV
        const uniqueLeagues = [...new Set(parsed.data.map(row => row['Campionato'].trim().toLowerCase()))];
        console.log('Leagues found in CSV:', uniqueLeagues);

        // Filtra le partite per la lega specificata e l'anno
        const filteredData = parsed.data.filter((row: CsvMatchRow) => {
          const matchLeague = normalizeLeague(row['Campionato']);
          const matchDate = new Date(row['Giorno']);
          const matchYear = matchDate.getFullYear();
          return matchLeague === normalizeLeague(league) && matchYear === year;
        });
        console.log(`Partite filtrate per la lega "${league}" e l'anno "${year}":`, filteredData.length);

        if (filteredData.length === 0) {
          throw new Error(`Nessuna partita trovata per la lega "${league}" e l'anno "${year}". Verifica il nome della lega e l'anno nel CSV.`);
        }

        const allMatches: MatchDaily[] = filteredData.map((row: CsvMatchRow) => ({
          id: `${row['Squadra Casa']}-${row['Squadra Trasferta']}-${row['Giorno']}-${row['Orario']}`,
          homeTeam: row['Squadra Casa'],
          awayTeam: row['Squadra Trasferta'],
          league: row['Campionato'],
          date: row['Giorno'],
          time: row['Orario'],
          xGHome: parseFloat(row['xG Casa']) || 0,
          golHome: parseInt(row['Gol Casa']) || 0,
          golAway: parseInt(row['Gol Trasferta']) || 0,
          xGAway: parseFloat(row['xG Trasferta']) || 0,
          sett: parseInt(row['Sett.']) || 0,
        }));

        console.log('Partite mappate:', allMatches);

        // Raggruppa le partite per Sett.
        const grouped: Record<number, MatchDaily[]> = {};
        allMatches.forEach(match => {
          if (!grouped[match.sett]) {
            grouped[match.sett] = [];
          }
          grouped[match.sett].push(match);
        });
        console.log('Partite raggruppate per Sett.:', Object.keys(grouped).length);

        setMatchesBySett(grouped);

        // Ordina i Sett. in base alla data più vicina
        const settDates: { sett: number; earliestDate: Date; latestDate: Date }[] = Object.keys(grouped).map(settStr => {
          const sett = parseInt(settStr, 10);
          const dates = grouped[sett].map(match => new Date(match.date));
          const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
          return { sett, earliestDate, latestDate };
        });

        settDates.sort((a, b) => a.earliestDate.getTime() - b.earliestDate.getTime());
        const sortedSettsList = settDates.map(item => item.sett);
        console.log('Sett. ordinati:', sortedSettsList);
        setSortedSetts(sortedSettsList);

        // Ottieni i dati delle squadre
        const teamData: Record<string, TeamPerformance> = {};
        allMatches.forEach(match => {
          if (!teamData[match.homeTeam]) {
            const homeTeamData = getTeamPerformance(match.homeTeam);
            if (homeTeamData) teamData[match.homeTeam] = homeTeamData;
          }
          if (!teamData[match.awayTeam]) {
            const awayTeamData = getTeamPerformance(match.awayTeam);
            if (awayTeamData) teamData[match.awayTeam] = awayTeamData;
          }
        });
        console.log('Dati delle squadre caricati:', Object.keys(teamData).length);
        setTeamsData(teamData);

        // Trova il Sett. più vicino a oggi (Sett. con earliestDate >= oggi)
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let closestSett: number | null = null;
        for (const item of settDates) {
          if (item.earliestDate >= todayStart) {
            closestSett = item.sett;
            break;
          }
        }
        if (closestSett === null && settDates.length > 0) {
          // Se non c'è Sett. futuro, scegli l'ultimo Sett.
          closestSett = settDates[settDates.length - 1].sett;
        }
        console.log('Sett. selezionato:', closestSett);
        setSelectedSett(closestSett);
      } catch (error: unknown) {
        console.error('Errore durante il caricamento dei dati delle partite:', error);
        setError((error as Error).message);
      }
    };

    loadMatchData();
  }, [league, year]);

  // Gestione Navigazione Sett.
  const handlePrevSett = () => {
    if (selectedSett === null) return;
    const currentIndex = sortedSetts.indexOf(selectedSett);
    if (currentIndex > 0) {
      setSelectedSett(sortedSetts[currentIndex - 1]);
    }
  };

  const handleNextSett = () => {
    if (selectedSett === null) return;
    const currentIndex = sortedSetts.indexOf(selectedSett);
    if (currentIndex < sortedSetts.length - 1) {
      setSelectedSett(sortedSetts[currentIndex + 1]);
    }
  };

  // Rendering Condizionale
  if (error) {
    return <div className="text-red-500">Errore: {error}</div>;
  }

  if (selectedSett === null) {
    return <div>Caricamento...</div>;
  }

  const matchesToDisplay = matchesBySett[selectedSett] || {};

  // Raggruppa le partite per giorno
  const matchesByDay: Record<string, MatchDaily[]> = {};
  matchesToDisplay.forEach(match => {
    const dayKey = new Date(match.date).toDateString();
    if (!matchesByDay[dayKey]) {
      matchesByDay[dayKey] = [];
    }
    matchesByDay[dayKey].push(match);
  });

  // Ordina i giorni
  const sortedDays = Object.keys(matchesByDay).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div>
      {/* Selettore per Sett. */}
      <SettSelector
        sortedSetts={sortedSetts}
        selectedSett={selectedSett}
        onPrev={handlePrevSett}
        onNext={handleNextSett}
        matchesBySett={matchesBySett}
      />

      {/* Matches Grouped by Day */}
      <div className="space-y-8">
        {sortedDays.map(dayKey => {
          const matches = matchesByDay[dayKey];
          return (
            <DayGroup
              key={dayKey}
              dayKey={dayKey}
              matches={matches}
              teamsData={teamsData}
            />
          );
        })}
      </div>
    </div>
  );
}
