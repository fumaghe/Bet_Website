'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
  BetRecommendation,
  loadAllBetsData,
  calculateRecommendedBets,
} from '@/lib/services/recommended-bets-service';

interface RecommendedBetsProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
}

/**
 * Raggruppa le scommesse in macro-categorie in base al loro label.
 * Ritorna un array di oggetti: { category: string; bets: BetRecommendation[] }.
 */
function groupBetsByCategory(bets: BetRecommendation[]) {
  const categories: Record<string, BetRecommendation[]> = {
    '1X2': [],
    'Over/Under': [],
    'Multigol': [],
    'Goal/NoGoal': [],
    'Giocatori': [],
  };

  for (const bet of bets) {
    const labelLower = bet.label.toLowerCase();

    if (
      labelLower.includes('home win') ||
      labelLower.includes('(draw)') ||
      labelLower.includes('(away win)') ||
      labelLower.includes('1x') ||
      labelLower.includes('x2') ||
      labelLower.includes('12')
    ) {
      categories['1X2'].push(bet);
    } else if (labelLower.includes('over') || labelLower.includes('under')) {
      categories['Over/Under'].push(bet);
    } else if (labelLower.includes('multigol')) {
      categories['Multigol'].push(bet);
    } else if (
      labelLower.includes('goal (entrambe segnano)') ||
      labelLower.includes('nogoal')
    ) {
      categories['Goal/NoGoal'].push(bet);
    } else {
      categories['Giocatori'].push(bet);
    }
  }

  // Converti in array e ordina ogni gruppo per probabilità
  const grouped = Object.entries(categories)
    .map(([category, catBets]) => {
      const sortedBets = [...catBets].sort((a, b) => b.probability - a.probability);
      return { category, bets: sortedBets };
    })
    .filter((g) => g.bets.length > 0);

  return grouped;
}

/**
 * Card di Categoria:
 * - Mostra il nome della categoria.
 * - Al click, si espande con un'animazione per mostrare le 4 scommesse più probabili.
 */
function CategoryCard({
  category,
  bets,
}: {
  category: string;
  bets: BetRecommendation[];
}) {
  // Stato locale per l'espansione/collasso della card
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  // Al massimo mostriamo 4 bets per la categoria
  const topBets = bets.slice(0, 4);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* HEADER CATEGORIA */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={toggleExpand}
        className="p-3 cursor-pointer group relative"
      >
        {/* Bordo gradient al passaggio del mouse */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary to-primary/70 rounded-lg pointer-events-none transition-opacity duration-300" />
        <h3 className="relative text-lg font-semibold text-foreground">
          {category}
        </h3>
      </motion.div>

      {/* CONTENUTO ESPANDIBILE */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expandable-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-4 overflow-hidden"
          >
            {/* Mostra le top 4 bets */}
            <div className="mt-3 grid grid-cols-1 gap-2">
              {topBets.map((bet, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative p-2 rounded-lg cursor-pointer group"
                >
                  {/* Wrapper per il bordo gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* Contenuto della card */}
                  <div className="relative p-3 border border-border rounded-lg bg-card text-foreground shadow-sm overflow-hidden transition-colors duration-300 group-hover:border-transparent">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium mb-1 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary/70 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                        {bet.label}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {bet.probability.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RecommendedBets({ homeTeam, awayTeam, league }: RecommendedBetsProps) {
  const [bets, setBets] = useState<BetRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDataAndCalculate() {
      setIsLoading(true);
      // Carica CSV e calcola le scommesse
      await loadAllBetsData();
      const allBets = calculateRecommendedBets(homeTeam, awayTeam, league);

      // Ordina e prendi le prime 45
      const topFortyFive = allBets
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 45);

      setBets(topFortyFive);
      setIsLoading(false);
    }

    if (homeTeam && awayTeam && league) {
      loadDataAndCalculate();
    }
  }, [homeTeam, awayTeam, league]);

  // Se mancano dati, non mostrare nulla
  if (!homeTeam || !awayTeam || !league) return null;

  // Mostra primo piano (top 3) e poi raggruppa il resto
  const topThree = bets.slice(0, 3);
  const grouped = groupBetsByCategory(bets.slice(3));

  return (
    <Card className="p-4 mt-4 bg-card text-foreground rounded-lg border border-border shadow-md">
      <h2 className="text-xl font-bold mb-4">Scommesse Consigliate</h2>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : bets.length === 0 ? (
        <p className="text-muted-foreground">
          Nessun dato disponibile per questa partita.
        </p>
      ) : (
        <>
          {/* SEZIONE TOP 3 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">In Primo Piano</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {topThree.map((bet, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative p-1 rounded-lg cursor-pointer group"
                >
                  {/* Wrapper per il bordo gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* Contenuto della card */}
                  <div className="relative p-3 border border-border rounded-lg bg-background text-foreground shadow-sm overflow-hidden transition-colors duration-300 group-hover:border-transparent">
                    <div className="flex flex-col">
                      {/* Nome Scommessa */}
                      <span className="text-sm font-medium mb-1 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary/70 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                        {bet.label}
                      </span>
                      {/* Percentuale */}
                      <span className="text-sm font-bold text-white">
                        {bet.probability.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ELENCO CATEGORIE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grouped.map((group) => (
              <CategoryCard
                key={group.category}
                category={group.category}
                bets={group.bets}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
