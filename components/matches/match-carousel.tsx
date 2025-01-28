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

  // Helper function to format how we display the match status/time
  function getMatchStatus(dateString: string, timeString: string) {
    // Current time
    const now = new Date();

    // Prepare "today" and "tomorrow" in YYYY-MM-DD
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatYmd = (d: Date) => d.toISOString().split('T')[0];
    const todayYmd = formatYmd(today);
    const tomorrowYmd = formatYmd(tomorrow);

    // Construct a Date object for the match date+time
    // Note: CSV presumably is "YYYY-MM-DD" for date and "HH:MM" for time
    const matchDateTime = new Date(`${dateString}T${timeString}:00`);

    // Identify if the match is today, tomorrow, or another date
    if (dateString === tomorrowYmd) {
      // Match is tomorrow
      return `Domani ${timeString}`;
    } else if (dateString !== todayYmd) {
      // Not today, not tomorrow => just show the time or do your custom logic
      return timeString;
    }

    // If we reach here, it's a match for "today"
    if (matchDateTime > now) {
      // Match has not started yet => show time normally
      return timeString;
    } else {
      // Match has started or finished
      const diffMs = now.getTime() - matchDateTime.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // If the match is within 1h 50m from start, we consider it Live
      if (diffMinutes < 110) {
        // You can add a pulsing dot or icon as you prefer
        return 'Live 🔴';
      } else {
        // Otherwise, it is finished
        return 'Finita';
      }
    }
  }

  useEffect(() => {
    const loadMatchData = async () => {
      try {
        // Fetch CSV
        const response = await fetch('/Bet_Website/data/matches_season.csv');
        const csvText = await response.text();

        // Parse CSV
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        // Convert each row into a Match object
        const matchData: Match[] = parsed.data.map((row: any) => ({
          id: `${row['Squadra Casa']}-${row['Squadra Trasferta']}-${row.Giorno}`,
          homeTeam: row['Squadra Casa'],
          awayTeam: row['Squadra Trasferta'],
          league: row.Campionato,
          date: row.Giorno, // 'YYYY-MM-DD'
          time: row.Orario, // 'HH:MM'
          homeScore: undefined,
          awayScore: undefined,
        }));

        // Prepare "today" and "tomorrow" in YYYY-MM-DD
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formatYmd = (d: Date) => d.toISOString().split('T')[0];
        const todayYmd = formatYmd(today);
        const tomorrowYmd = formatYmd(tomorrow);

        // Filter only matches for TODAY or TOMORROW
        const filteredMatches = matchData.filter(
          (match) => match.date === todayYmd || match.date === tomorrowYmd
        );

        // Sort matches by date, then by time ascending
        const sortedMatches = filteredMatches.sort((a, b) => {
          // Compare date first
          if (a.date < b.date) return -1;
          if (a.date > b.date) return 1;

          // Same date => compare time
          const [hourA, minA] = a.time.split(':').map(Number);
          const [hourB, minB] = b.time.split(':').map(Number);
          if (hourA < hourB) return -1;
          if (hourA > hourB) return 1;
          return minA - minB;
        });

        // Example: if you only want the first 40 matches of that sorted list
        const latestMatches = sortedMatches.slice(0, 40);
        setMatches(latestMatches);

        // Load performance data for each involved team
        const teamData: Record<string, TeamPerformance> = {};
        for (const match of latestMatches) {
          if (!teamData[match.homeTeam]) {
            const homeTeamData = getTeamPerformance(match.homeTeam);
            if (homeTeamData) {
              teamData[match.homeTeam] = homeTeamData;
            }
          }
          if (!teamData[match.awayTeam]) {
            const awayTeamData = getTeamPerformance(match.awayTeam);
            if (awayTeamData) {
              teamData[match.awayTeam] = awayTeamData;
            }
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

          // Get label for the time (e.g. "Domani 16:30", "Live 🔴", "Finita", etc.)
          const matchLabel = getMatchStatus(match.date, match.time);

          return (
            <Card
              key={match.id}
              onClick={() =>
                onMatchSelect(match.homeTeam, match.awayTeam, match.league)
              }
              className={cn(
                'flex flex-col w-[190px] flex-shrink-0 p-3 transition-all',
                'hover:scale-105 hover:shadow-lg cursor-pointer'
              )}
            >
              {/* Top row: time/league */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  {matchLabel}
                </span>
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

              {/* Home team row */}
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

              {/* Away team row */}
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
