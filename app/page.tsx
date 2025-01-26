'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MatchCarousel } from '@/components/matches/match-carousel';
import { PredictionSection } from '@/components/prediction/prediction-section';
import { StatsSection } from '@/components/stats-section';
import { TeamStats } from '@/components/team-stats';
import { PredictionCard } from '@/components/prediction-card';
import { PlayerStatsSection } from '@/components/player-stats/player-stats-section';
import { HistoricalMatches } from '@/components/matches/historical-matches';
import { motion } from 'framer-motion';
import { loadData } from '@/lib/services/data-service';
import { loadPlayerStats } from '@/lib/services/player-stats-service';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [homeTeam, setHomeTeam] = useState<string | undefined>();
  const [awayTeam, setAwayTeam] = useState<string | undefined>();
  const [league, setLeague] = useState<string | undefined>();

  useEffect(() => {
    const initializeData = async () => {
      await loadData(); 
      await loadPlayerStats(); 
      setIsLoading(false);
    };
    initializeData();
  }, []);

  const handleMatchSelect = (home: string, away: string, league: string) => {
    setHomeTeam(home);
    setAwayTeam(away);
    setLeague(league);
  };

  const handleHomeTeamSelect = (team: string) => {
    setHomeTeam(team);
  };

  const handleAwayTeamSelect = (team: string) => {
    setAwayTeam(team);
  };

  const handleLeagueChange = (newLeague: string) => {
    setLeague(newLeague);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="overflow-hidden">
                <MatchCarousel onMatchSelect={handleMatchSelect} />
              </Card>

              <PredictionSection
                selectedHomeTeam={homeTeam}
                selectedAwayTeam={awayTeam}
                selectedLeague={league}
                onHomeTeamSelect={handleHomeTeamSelect}
                onAwayTeamSelect={handleAwayTeamSelect}
                onLeagueChange={handleLeagueChange}
              />

              {homeTeam && awayTeam && league && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <PredictionCard 
                      type="1" 
                      percentage={50} 
                      matchCount={10} 
                      confidence="medium" 
                    />
                    <PredictionCard 
                      type="X" 
                      percentage={30} 
                      matchCount={10} 
                      confidence="low" 
                    />
                    <PredictionCard 
                      type="2" 
                      percentage={20} 
                      matchCount={10} 
                      confidence="high" 
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 transition-colors h-12 text-lg font-medium"
                  >
                    Fai una Predizione
                  </Button>
                  <TeamStats 
                    teamHome={homeTeam} 
                    teamAway={awayTeam} 
                    league={league} 
                  />
                  
                  <PlayerStatsSection 
                    homeTeam={homeTeam} 
                    awayTeam={awayTeam} 
                    league={league} 
                  />
                </motion.div>
              )}
            </div>

            <div className="relative">
              <div className="lg:sticky lg:top-24 space-y-6">
                <StatsSection
                  selectedLeague={league}
                  selectedHomeTeam={homeTeam}
                  selectedAwayTeam={awayTeam}
                />
                {homeTeam && awayTeam && (
                  <HistoricalMatches 
                    homeTeam={homeTeam} 
                    awayTeam={awayTeam} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
