// app/page.tsx

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

// IMPORT delle interfacce e funzioni dal servizio di scommesse consigliate
import { 
  calculateRecommendedBets, 
  calculateScorelinePredictions, 
  BetRecommendation, 
  clampProb, 
  ScorelinePrediction 
} from '@/lib/services/recommended-bets-service';

// IMPORT del componente che mostra le scommesse consigliate
import { RecommendedBets } from '@/components/bets/recommended-bets';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [homeTeam, setHomeTeam] = useState<string | undefined>();
  const [awayTeam, setAwayTeam] = useState<string | undefined>();
  const [league, setLeague] = useState<string | undefined>();

  // Variabili di stato per le raccomandazioni e le predizioni dei punteggi
  const [recommendations, setRecommendations] = useState<BetRecommendation[]>([]);
  const [scorelinePredictions, setScorelinePredictions] = useState<ScorelinePrediction[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      await loadData();       // Carica le informazioni esistenti
      await loadPlayerStats(); 
      setIsLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (homeTeam && awayTeam && league) {
        // Calcola le scommesse consigliate
        const recs = calculateRecommendedBets(homeTeam, awayTeam, league);
        
        // Normalizza le probabilità per sommare esattamente a 100%
        const normalizedRecs = normalizeProbabilities(recs);
        setRecommendations(normalizedRecs);

        // Calcola le predizioni delle linee di punteggio esatto
        const exactScores = calculateScorelinePredictions(homeTeam, awayTeam, league);
        setScorelinePredictions(exactScores);
      } else {
        setRecommendations([]);
        setScorelinePredictions([]);
      }
    };

    fetchRecommendations();
  }, [homeTeam, awayTeam, league]);

  // Funzione per normalizzare le probabilità
  const normalizeProbabilities = (recs: BetRecommendation[]): BetRecommendation[] => {
    // Copia l'array per evitare mutazioni
    const roundedRecs = recs.map(r => ({
      ...r,
      probability: Math.round(r.probability * 10) / 10, // Arrotonda a una decimale
    }));

    // Calcola la somma delle probabilità arrotondate
    let total = roundedRecs.reduce((acc, r) => acc + r.probability, 0);
    let difference = Math.round((100 - total) * 10) / 10; // Differenza da correggere

    // Se la somma è già 100, ritorna le raccomandazioni arrotondate
    if (difference === 0) {
      return roundedRecs;
    }

    // Ordina le raccomandazioni per probabilità decrescente
    const sortedRecs = [...roundedRecs].sort((a, b) => b.probability - a.probability);

    // Distribuisce la differenza aggiungendo o sottraendo 0.1 fino a correggere la somma
    for (let rec of sortedRecs) {
      if (difference === 0) break;

      if (difference > 0) {
        rec.probability += 0.1;
        difference -= 0.1;
      } else if (difference < 0 && rec.probability >= 0.1) {
        rec.probability -= 0.1;
        difference += 0.1;
      }
    }

    // Arrotonda nuovamente per evitare problemi di precisione
    const finalRecs = sortedRecs.map(r => ({
      ...r,
      probability: Math.round(r.probability * 10) / 10,
    }));

    return finalRecs;
  };

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

  const predictionTypes = ['1', 'X', '2'] as const;

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
                  {/* Generazione dinamica delle PredictionCard "1", "X", "2" */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {predictionTypes.map((type) => {
                      // Trova la raccomandazione corrispondente al tipo
                      const recommendation = recommendations.find(r => r.label.startsWith(type + ' '));
                      return (
                        <PredictionCard 
                          key={type}
                          type={type} // Ora TypeScript riconosce 'type' come "1" | "X" | "2"
                          percentage={recommendation ? recommendation.probability : 0} 
                          matchCount={10} // Puoi aggiornare questo valore se disponibile
                          confidence="medium" // Puoi personalizzare in base alla probabilità
                        />
                      );
                    })}
                  </div>

                  {/* Sezione per le linee di punteggio esatto con card più piccole e interattive */}
                  <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-4">Predizioni Punteggio Esatto</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {scorelinePredictions.map((score, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative p-1 rounded-lg cursor-pointer group"
                        >
                          {/* Wrapper per il bordo gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-card to-card/50 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          {/* Contenuto della card */}
                          <div className="relative p-3 border border-border rounded-lg shadow-md bg-card overflow-hidden transition-colors duration-300 group-hover:border-transparent">
                            <div className="flex flex-col items-center">
                              <span className="text-xl font-bold mb-2 text-white group-hover:bg-gradient-to-br from-primary to-primary/70 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                                {`${score.homeGoals} - ${score.awayGoals}`}
                              </span>
                              <span className="text-sm text-muted-foreground">{`${score.probability.toFixed(2)}%`}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </Card>

                  {/* Seleziona le 5 bet consigliate */}
                  <RecommendedBets
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    league={league}
                  />

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
