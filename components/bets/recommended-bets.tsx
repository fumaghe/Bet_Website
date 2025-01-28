// components/bets/recommended-bets.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BetRecommendation, loadAllBetsData, calculateRecommendedBets } from '@/lib/services/recommended-bets-service';

interface RecommendedBetsProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
}

export function RecommendedBets({ homeTeam, awayTeam, league }: RecommendedBetsProps) {
  const [bets, setBets] = useState<BetRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDataAndCalculate() {
      setIsLoading(true);

      // Carico tutti i CSV la prima volta
      await loadAllBetsData();

      // Calcolo le scommesse
      const allBets = calculateRecommendedBets(homeTeam, awayTeam, league);

      // Ordino e prendo le prime 5
      const topFive = allBets.sort((a, b) => b.probability - a.probability).slice(0, 45);

      setBets(topFive);
      setIsLoading(false);
    }

    if (homeTeam && awayTeam && league) {
      loadDataAndCalculate();
    }
  }, [homeTeam, awayTeam, league]);

  if (!homeTeam || !awayTeam || !league) {
    return null; // Non mostriamo nulla se i dati non sono disponibili
  }

  return (
    <Card className="p-4 mt-4 bg-gray-800 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Le 5 Bets Consigliate</h2>
      {isLoading ? (
        <p className="text-gray-400">Caricamento...</p>
      ) : bets.length === 0 ? (
        <p className="text-gray-400">Nessun dato disponibile per questa partita.</p>
      ) : (
        <div className="space-y-2">
          {bets.map((bet, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="font-medium">{bet.label}</span>
              <span className="text-green-400 font-bold">
                {bet.probability.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
