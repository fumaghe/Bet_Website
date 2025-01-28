'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
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

import {
  calculateRecommendedBets,
  calculateScorelinePredictions,
  BetRecommendation,
  ScorelinePrediction,
} from '@/lib/services/recommended-bets-service';
import { RecommendedBets } from '@/components/bets/recommended-bets';
import { BetSlip } from '@/components/bet-slip'; // Componente del carrello
import { useBetSlip } from './BetSlipContext';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [homeTeam, setHomeTeam] = useState<string | undefined>();
  const [awayTeam, setAwayTeam] = useState<string | undefined>();
  const [league, setLeague] = useState<string | undefined>();

  const [recommendations, setRecommendations] = useState<BetRecommendation[]>([]);
  const [scorelinePredictions, setScorelinePredictions] = useState<ScorelinePrediction[]>([]);

  const { addBet } = useBetSlip();

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await loadData();
      await loadPlayerStats();
      setIsLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (homeTeam && awayTeam && league) {
      const recs = calculateRecommendedBets(homeTeam, awayTeam, league);
      setRecommendations(recs);

      const exactScores = calculateScorelinePredictions(homeTeam, awayTeam, league);
      setScorelinePredictions(exactScores);
    } else {
      setRecommendations([]);
      setScorelinePredictions([]);
    }
  }, [homeTeam, awayTeam, league]);

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

  // Esempio di 1, X, 2
  const predictionTypes = ['1', 'X', '2'] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            {/* Colonna principale */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {predictionTypes.map((type) => {
                      // Troviamo la raccomandazione corrispondente
                      const recommendation = recommendations.find((r) => r.label.startsWith(`${type} `));
                      const probability = recommendation?.probability ?? 0;
                      const defaultOdd = probability > 0 ? parseFloat((100 / probability).toFixed(2)) : 2;

                      return (
                        <div
                          key={type}
                          className="cursor-pointer"
                          onClick={() => {
                            // Aggiunge la selezione al carrello
                            addBet({
                              matchName: `${homeTeam} vs ${awayTeam}`,
                              label: recommendation?.label || `Scommessa ${type}`,
                              odd: defaultOdd,
                            });
                          }}
                        >
                          <PredictionCard
                            type={type}
                            percentage={probability}
                            matchCount={10}
                            confidence="medium"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-4">Predizioni Punteggio Esatto</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {scorelinePredictions.map((score, index) => {
                        const probability = score.probability;
                        const defaultOdd = probability > 0 ? parseFloat((100 / probability).toFixed(2)) : 3;

                        return (
                          <motion.div
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative p-1 rounded-lg cursor-pointer group"
                            onClick={() => {
                              addBet({
                                matchName: `${homeTeam} vs ${awayTeam}`,
                                label: `Risultato Esatto ${score.homeGoals}-${score.awayGoals}`,
                                odd: defaultOdd,
                              });
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-card to-card/50 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative p-3 border border-border rounded-lg shadow-md bg-card overflow-hidden transition-colors duration-300 group-hover:border-transparent">
                              <div className="flex flex-col items-center">
                                <span className="text-xl font-bold mb-2 text-white group-hover:bg-gradient-to-br from-primary to-primary/70 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                                  {`${score.homeGoals} - ${score.awayGoals}`}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {`${score.probability.toFixed(2)}%`}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </Card>

                  <RecommendedBets homeTeam={homeTeam} awayTeam={awayTeam} league={league} />

                  <TeamStats teamHome={homeTeam} teamAway={awayTeam} league={league} />

                  <PlayerStatsSection homeTeam={homeTeam} awayTeam={awayTeam} league={league} />
                </motion.div>
              )}
            </div>

            {/* Colonna di destra (statistiche, partite storiche, etc.) */}
            <div className="space-y-6">
              <StatsSection
                selectedLeague={league}
                selectedHomeTeam={homeTeam}
                selectedAwayTeam={awayTeam}
              />
              {homeTeam && awayTeam && (
                <HistoricalMatches homeTeam={homeTeam} awayTeam={awayTeam} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Carrello Scommesse fluttuante in basso a destra */}
      <BetSlip />
    </div>
  );
}
