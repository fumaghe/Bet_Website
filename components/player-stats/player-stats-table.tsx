// components/player-stats/player-stats-table.tsx

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PlayerStats, NumericPlayerStatsKeys } from '@/lib/types/stats';
import { useMemo } from 'react';

interface PlayerStatsTableProps {
  players: PlayerStats[];
  statLabel: string;
  displayMode: 'total' | 'perMatch';
}

/**
 * Mapping tra label testuale mostrata e la chiave effettiva su `PlayerStats`.
 * Se in PlayerStats hai aggiunto o modificato chiavi, aggiorna qui.
 */
function statLabelToKey(label: string): NumericPlayerStatsKeys {
  const mapping: { [key: string]: NumericPlayerStatsKeys } = {
    'Reti': 'goals',
    'Assist': 'assists',
    'xG': 'xG',
    'Tiri totali': 'shots',
    'Tiri in porta': 'shotsOnTarget',
    'Amm.': 'yellowCards',
    'Esp.': 'redCards',
    'Falli commessi': 'foulsCommitted',
    'Falli subiti': 'foulsDrawn',
    'PG': 'matches',
    'Min': 'minutes',
    'Fuorigioco': 'offsides',
    'PrgC': 'progressiveCarries',
    'PrgP': 'progressivePasses',
  };

  return mapping[label] || 'minutes'; // fallback se non trovato
}

export function PlayerStatsTable({ players, statLabel, displayMode }: PlayerStatsTableProps) {
  const statKey = useMemo(() => statLabelToKey(statLabel), [statLabel]);

  // Ordinamento decrescente in base alla statistica (totale o per match)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (displayMode === 'total') {
        // Valore totale
        aValue = a[statKey] as number;
        bValue = b[statKey] as number;
      } else {
        // Valore "x match" (qui usiamo x partite, potresti voler fare x90 min)
        // ma nel tuo codice stai facendo "per match" in base a a.matches
        aValue = a.matches > 0 ? (a[statKey] as number) / a.matches : 0;
        bValue = b.matches > 0 ? (b[statKey] as number) / b.matches : 0;
      }

      return bValue - aValue; // decrescente
    });
  }, [players, statKey, displayMode]);

  // Se non ci sono giocatori
  if (!players || players.length === 0) {
    return <div className="text-muted-foreground">Nessun dato disponibile.</div>;
  }

  return (
    <Table className="border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      <TableHeader className="bg-green-500">
        <TableRow>
          <TableHead className="px-4 py-2 text-white text-sm font-semibold uppercase tracking-wider">
            Giocatore
          </TableHead>
          <TableHead className="px-4 py-2 text-white text-sm font-semibold uppercase tracking-wider text-right">
            {displayMode === 'total' ? statLabel : `${statLabel} xMatch`}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPlayers.map((player) => {
          // Calcolo del valore da mostrare
          let statValue: number;
          if (displayMode === 'total') {
            statValue = player[statKey] as number;
          } else {
            statValue = player.matches > 0
              ? Number(((player[statKey] as number) / player.matches).toFixed(2))
              : 0;
          }

          return (
            <TableRow
              key={player.name}
              className="hover:bg-blu-50 transition-colors duration-300"
            >
              <TableCell className="px-4 py-3 font-medium text-sm">
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="text-xs text-gray-500">{player.position}</div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-right">
                {statValue}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default PlayerStatsTable;
