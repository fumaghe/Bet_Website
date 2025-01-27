'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Match, TeamPerformance } from '@/lib/types/stats';
import Papa from 'papaparse';

import { getTeamPerformance } from '@/lib/services/data-service';
import { LEAGUES } from '@/lib/constants';

interface MatchCarouselProps {
  onMatchSelect: (homeTeam: string, awayTeam: string, league: string) => void;
}

export function MatchCarousel({ onMatchSelect }: MatchCarouselProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsData, setTeamsData] = useState<Record<string, TeamPerformance>>({});

  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const response = await fetch('/data/matches_season.csv');
        const csvText = await response.text();

        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        const matchData: Match[] = parsed.data.map((row: any) => ({
          id: `${row['Squadra Casa']}-${row['Squadra Trasferta']}-${row.Giorno}`,
          homeTeam: row['Squadra Casa'],
          awayTeam: row['Squadra Trasferta'],
          league: row.Campionato,
          date: row.Giorno,
          time: row.Orario,
          homeScore: undefined,
          awayScore: undefined,
        }));

        // Ottieni la data odierna nel formato YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        // Filtra solo le partite di oggi
        const todayMatches = matchData.filter((match) => match.date === today);

        // Ordina le partite di oggi per orario dalla meno recente alla più recente
        const sortedMatches = todayMatches.sort((a, b) => {
          const timeA = a.time.split(':').map(Number); // Converte "HH:MM" in [HH, MM]
          const timeB = b.time.split(':').map(Number);
          return timeA[0] - timeB[0] || timeA[1] - timeB[1]; // Confronta prima le ore, poi i minuti
        });

        // Prendi le ultime 10 partite ordinate
        const latestMatches = sortedMatches.slice(0, 40);
        setMatches(latestMatches);



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
  }, []);

  return (
    <ScrollArea className="w-full rounded-lg overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 p-2">
        {matches.map((match) => {
          const homeTeam = teamsData[match.homeTeam];
          const awayTeam = teamsData[match.awayTeam];
          const league = LEAGUES.find((l) => l.name === match.league);

          return (
            <Card
              key={match.id}
              onClick={() => onMatchSelect(match.homeTeam, match.awayTeam, match.league)}
              className={cn(
                'flex flex-col w-[190px] flex-shrink-0 p-3 transition-all',
                'hover:scale-105 hover:shadow-lg cursor-pointer'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{match.time}</span>
                {league && (
                  <div className="flex items-center gap-1">
                    <div className="relative w-4 h-4">
                      <img
                        src={league.icon}
                        alt={league.name}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-xs font-medium">{league.name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7">
                    {homeTeam && (
                      <img
                        src={homeTeam.logo}
                        alt={homeTeam.team}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">{match.homeTeam}</span>
                </div>
                {typeof match.homeScore === 'number' && (
                  <span className="text-lg font-bold">{match.homeScore}</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    {awayTeam && (
                      <img
                        src={awayTeam.logo}
                        alt={awayTeam.team}
                        className="w-full h-full object-cover"
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
