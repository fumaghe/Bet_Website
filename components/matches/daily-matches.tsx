'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Match, TeamPerformance } from '@/lib/types/stats';
import { getMatches, getTeamPerformance } from '@/lib/services/data-service';
import { cn } from '@/lib/utils';

interface DailyMatchesProps {
  highlightLeague?: string;
}

export function DailyMatches({ highlightLeague }: DailyMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsData, setTeamsData] = useState<Record<string, TeamPerformance>>({});

  useEffect(() => {
    const loadMatchData = async () => {
      const matchesData = getMatches();
      setMatches(matchesData);

      const teamData: Record<string, TeamPerformance> = {};
      matchesData.forEach(match => {
        if (!teamData[match.homeTeam]) {
          const homeTeamData = getTeamPerformance(match.homeTeam);
          if (homeTeamData) teamData[match.homeTeam] = homeTeamData;
        }
        if (!teamData[match.awayTeam]) {
          const awayTeamData = getTeamPerformance(match.awayTeam);
          if (awayTeamData) teamData[match.awayTeam] = awayTeamData;
        }
      });
      setTeamsData(teamData);
    };

    loadMatchData();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Orario</TableHead>
          <TableHead>Partita</TableHead>
          <TableHead className="w-32">Competizione</TableHead>
          <TableHead className="w-24 text-right">Risultato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map((match) => (
          <TableRow 
            key={match.id}
            className={cn(
              "transition-colors hover:bg-accent/50",
              match.league === highlightLeague && "bg-accent/20"
            )}
          >
            <TableCell className="font-medium">
              {match.date}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="relative w-6 h-6">
                    {teamsData[match.homeTeam] && (
                      <Image
                        src={teamsData[match.homeTeam].logo}
                        alt={match.homeTeam}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                  <span>{match.homeTeam}</span>
                </div>
                <span className="text-muted-foreground">vs</span>
                <div className="flex items-center gap-2">
                  <div className="relative w-6 h-6">
                    {teamsData[match.awayTeam] && (
                      <Image
                        src={teamsData[match.awayTeam].logo}
                        alt={match.awayTeam}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                  <span>{match.awayTeam}</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="relative w-4 h-4">
                  <Image
                    src={`/Bet_Website/images/leagues/${match.league.toLowerCase().replace(/\s+/g, '_')}.png`}
                    alt={match.league}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm">{match.league}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              {typeof match.homeScore === 'number' && typeof match.awayScore === 'number' ? (
                <span className="font-bold">
                  {match.homeScore} - {match.awayScore}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}