'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlayerStats } from '@/lib/types/stats';
import { getLeagueTopPlayers } from '@/lib/services/player-stats-service';


interface PlayerRankingsProps {
  league: string;
}

export function PlayerRankings({ league }: PlayerRankingsProps) {
  const [activeTab, setActiveTab] = useState('goals');

  const topScorers = getLeagueTopPlayers(league, 'goals');
  const topAssists = getLeagueTopPlayers(league, 'assists');
  const topContributors = getLeagueTopPlayers(league, 'goalsAndAssists');

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Classifiche Giocatori</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger 
          value="goals"
          className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
        >
          Gol
        </TabsTrigger>
        <TabsTrigger 
          value="assists"
          className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
        >
          Assist
        </TabsTrigger>
        <TabsTrigger 
          value="contributions"
          className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
        >
          Gol+Ass
        </TabsTrigger>
      </TabsList>


        <TabsContent value="goals">
          <PlayerTable 
            players={topScorers}
            statKey="goals"
            statLabel="Gol"
          />
        </TabsContent>

        <TabsContent value="assists">
          <PlayerTable 
            players={topAssists}
            statKey="assists"
            statLabel="Assist"
          />
        </TabsContent>

        <TabsContent value="contributions">
          <PlayerTable 
            players={topContributors}
            statKey="goalsAndAssists"
            statLabel="G+A"
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

interface PlayerTableProps {
  players: PlayerStats[];
  statKey: 'goals' | 'assists' | 'goalsAndAssists';
  statLabel: string;
}

function PlayerTable({ players, statKey, statLabel }: PlayerTableProps) {
  // Funzione per ottenere solo il cognome
  const getLastName = (fullName: string) => {
    const parts = fullName.split(' ');
    return parts[parts.length - 1];
  };

  return (
    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '50px' }}>Pos</TableHead>
            <TableHead style={{ width: '150px' }}>Giocatore</TableHead>
            <TableHead style={{ width: '120px' }}>Squadra</TableHead>
            <TableHead style={{ width: '80px', textAlign: 'right' }}>{statLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player, index) => (
            <TableRow key={`${player.name}-${player.team}`}>
              <TableCell style={{ width: '50px' }}>{index + 1}</TableCell>
              <TableCell className="font-medium" style={{ width: '150px' }}>
                <div>
                  <div>{getLastName(player.name)}</div>
                  <div className="text-xs text-muted-foreground">{player.position}</div>
                </div>
              </TableCell>
              <TableCell style={{ width: '120px' }}>{player.team}</TableCell>
              <TableCell style={{ width: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                {statKey === 'goalsAndAssists' 
                  ? player.goals + player.assists
                  : player[statKey]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
