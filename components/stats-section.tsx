'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { StandingsTable } from '@/components/standings-table';
import { PlayerRankings } from '@/components/stats/player-ranking';
import { motion } from 'framer-motion';
import { getTeamStats } from '@/lib/services/team-service';
import { loadPlayerStats } from '@/lib/services/player-stats-service';

interface StatsSectionProps {
  selectedLeague?: string;
  selectedHomeTeam?: string;
  selectedAwayTeam?: string;
}

export function StatsSection({ 
  selectedLeague = 'Serie A', 
  selectedHomeTeam, 
  selectedAwayTeam 
}: StatsSectionProps) {
  const [homeTeamStats, setHomeTeamStats] = useState<any>(null);
  const [awayTeamStats, setAwayTeamStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      await loadPlayerStats();
      setIsLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    const fetchTeamStats = async () => {
      if (selectedHomeTeam) {
        const stats = await getTeamStats(selectedHomeTeam, selectedLeague, 'team');
        setHomeTeamStats(stats);
      }
      if (selectedAwayTeam) {
        const stats = await getTeamStats(selectedAwayTeam, selectedLeague, 'opponent');
        setAwayTeamStats(stats);
      }
    };

    fetchTeamStats();
  }, [selectedHomeTeam, selectedAwayTeam, selectedLeague]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={selectedLeague}
      >
        <Card className="overflow-hidden border shadow-md">
          <div className="p-6 bg-gradient-to-br from-card to-card/50">
            <h2 className="text-xl font-bold mb-4">
              Classifica {selectedLeague}
            </h2>
            <StandingsTable league={selectedLeague} />
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PlayerRankings league={selectedLeague} />
      </motion.div>
    </div>
  );
}
