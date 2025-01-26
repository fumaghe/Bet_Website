'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getLeagueStandings, loadStandings } from '@/lib/services/standings-service';
import { TeamStats } from '@/lib/types/stats';

interface StandingsTableProps {
  league: string;
  selectedHomeTeam?: string;
  selectedAwayTeam?: string;
}

export function StandingsTable({ league, selectedHomeTeam, selectedAwayTeam }: StandingsTableProps) {
  const [standings, setStandings] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        await loadStandings(); // Ensure standings are loaded
        const leagueStandings = getLeagueStandings(league);
        setStandings(leagueStandings);
        console.log(`Standings for ${league}:`, leagueStandings);
      } catch (error) {
        console.error(`Errore durante il caricamento della classifica per la lega ${league}:`, error);
        setStandings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [league]);

  if (loading) {
    return <p className="text-muted-foreground">Caricamento classifica...</p>;
  }

  if (!standings.length) {
    return <p className="text-muted-foreground">Nessuna classifica disponibile per {league}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border shadow-md">
      {/* Container per la tabella con altezza limitata e scrollbar */}
      <div className="max-h-[300px] overflow-y-auto">
        <Table className="table-auto w-full text-muted-foreground">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20px] text-center">Pos</TableHead>
              <TableHead className="w-[40px] text-center">Logo</TableHead>
              <TableHead className="w-[20px] text-right">Punti</TableHead>
              <TableHead className="w-[20px] text-right">Giocate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team) => (
              <TableRow
                key={team.team}
                className={cn(
                  'hover:bg-secondary transition',
                  (team.team === selectedHomeTeam || team.team === selectedAwayTeam) && 'bg-primary/10'
                )}
              >
                <TableCell className="text-center">{team.position}</TableCell>
                <TableCell className="text-center">
                  <div className="relative w-7 h-7 mx-auto">
                    <img
                      src={`/images/teams/${team.team.toLowerCase().replace(/\s+/g, '_')}.png`}
                      alt={team.team}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">{team.points}</TableCell>
                <TableCell className="text-right">{team.played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
