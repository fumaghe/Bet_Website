'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Match, TeamPerformance } from '@/lib/types/stats';
import Papa from 'papaparse';

import { getTeamPerformance } from '@/lib/services/data-service';

interface MatchCarouselProps {
  league: string; // Manteniamo il filtro per lega
  onMatchSelect?: (homeTeam: string, awayTeam: string, league: string) => void;
}

export function MatchCarousel({ league, onMatchSelect }: MatchCarouselProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsData, setTeamsData] = useState<Record<string, TeamPerformance>>({});

  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const response = await fetch('/data/partite_corretto.csv');
        const csvText = await response.text();

        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        const allMatches: Match[] = parsed.data.map((row: any) => ({
          id: `${row['Squadra Casa']}-${row['Squadra Trasferta']}-${row.Giorno}-${row.Orario}`,
          homeTeam: row['Squadra Casa'],
          awayTeam: row['Squadra Trasferta'],
          league: row.Campionato,
          date: row.Giorno,
          time: row.Orario,
          homeScore: row['Punteggio Casa'] ? parseInt(row['Punteggio Casa']) : undefined,
          awayScore: row['Punteggio Trasferta'] ? parseInt(row['Punteggio Trasferta']) : undefined,
        }));

        // Ottenere la data e l'orario correnti
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endDate = new Date(todayStart);
        endDate.setDate(todayStart.getDate() + 3); // Fino a 3 giorni dopo

        // Filtra per lega
        const leagueMatches = allMatches.filter(match => match.league === league);

        // Filtra le partite entro il range di date
        const filteredMatches = leagueMatches.filter(match => {
          const matchDate = new Date(match.date);
          const matchDayStart = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());

          // Verifica se la partita è tra oggi e i prossimi 3 giorni
          if (matchDayStart < todayStart || matchDayStart > endDate) {
            return false;
          }

          const matchDateTime = new Date(`${match.date}T${match.time}`);
          if (match.date === todayStart.toISOString().split('T')[0]) {
            return matchDateTime >= now;
          }
          return true;
        });

        // Ordina le partite per data e orario
        const sortedMatches = filteredMatches.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });

        // Prendi le prime 40 partite
        const latestMatches = sortedMatches.slice(0, 40);
        setMatches(latestMatches);

        // Ottieni i dati delle squadre
        const teamData: Record<string, TeamPerformance> = {};
        for (const match of latestMatches) {
          if (!teamData[match.homeTeam]) {
            const homeTeamData = getTeamPerformance(match.homeTeam);
            if (homeTeamData) teamData[match.homeTeam] = homeTeamData;
          }
          if (!teamData[match.awayTeam]) {
            const awayTeamData = getTeamPerformance(match.awayTeam);
            if (awayTeamData) teamData[match.awayTeam] = awayTeamData;
          }
        }
        setTeamsData(teamData);
      } catch (error: unknown) {
        console.error('Errore durante il caricamento dei dati delle partite:', error);
      }
    };

    loadMatchData();
  }, [league]);

  // Funzione per formattare il giorno relativo
  const formatDay = (matchDate: string): string => {
    const today = new Date();
    const matchDay = new Date(matchDate);

    // Imposta entrambe le date all'inizio del giorno (00:00) per ignorare l'orario
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const matchDayStart = new Date(matchDay.getFullYear(), matchDay.getMonth(), matchDay.getDate());

    const diffTime = matchDayStart.getTime() - todayStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Domani';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return new Intl.DateTimeFormat('it-IT', options).format(matchDay);
  };

  return (
    <ScrollArea className="w-full rounded-lg overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 p-2">
        {matches.map((match) => {
          const homeTeam = teamsData[match.homeTeam];
          const awayTeam = teamsData[match.awayTeam];

          // Calcola il giorno relativo
          const dayLabel = formatDay(match.date);

          return (
            <Card
              key={match.id}
              onClick={() => onMatchSelect?.(match.homeTeam, match.awayTeam, match.league)}
              className={cn(
                'flex flex-col w-[190px] flex-shrink-0 p-3 transition-all',
                'hover:scale-105 hover:shadow-lg cursor-pointer'
              )}
            >
              {/* Giorno e Orario */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{dayLabel}</span>
                <span className="text-xs text-muted-foreground">{match.time}</span>
              </div>

              {/* Squadra di Casa */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7">
                    {homeTeam && (
                      <Image
                        src={homeTeam.logo}
                        alt={homeTeam.team}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">{match.homeTeam}</span>
                </div>
                {typeof match.homeScore === 'number' && (
                  <span className="text-lg font-bold">{match.homeScore}</span>
                )}
              </div>

              {/* Squadra in Trasferta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    {awayTeam && (
                      <Image
                        src={awayTeam.logo}
                        alt={awayTeam.team}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">{match.awayTeam}</span>
                </div>
                {typeof match.awayScore === 'number' && (
                  <span className="text-lg font-bold">{match.awayScore}</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
