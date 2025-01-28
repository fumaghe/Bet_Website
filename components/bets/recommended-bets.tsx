// components/bets/recommended-bets.tsx

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { BetRecommendation, loadAllBetsData, calculateRecommendedBets } from '@/lib/services/recommended-bets-service';
import { getTeamPerformance } from '@/lib/services/data-service';
import { TeamPerformance } from '@/lib/types/stats'; 
import { BadgeDollarSign } from 'lucide-react';
import { MdSportsSoccer } from 'react-icons/md'; // Icona del pallone da calcio

interface RecommendedBetsProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
}

/**
 * Se la label contiene il nome di homeTeam o awayTeam,
 * restituisce la stringa corrispondente a uno dei due team; altrimenti null.
 */
function getTeamFromBetLabel(label: string, homeTeam: string, awayTeam: string): string | null {
  const labelLower = label.toLowerCase();
  if (labelLower.includes(homeTeam.toLowerCase())) {
    return homeTeam;
  }
  if (labelLower.includes(awayTeam.toLowerCase())) {
    return awayTeam;
  }
  return null;
}

export function RecommendedBets({ homeTeam, awayTeam, league }: RecommendedBetsProps) {
  const [bets, setBets] = useState<BetRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamsData, setTeamsData] = useState<Record<string, TeamPerformance>>({});

  useEffect(() => {
    async function loadDataAndCalculate() {
      setIsLoading(true);
      await loadAllBetsData();

      const tData: Record<string, TeamPerformance> = {};
      const homePerf = getTeamPerformance(homeTeam);
      const awayPerf = getTeamPerformance(awayTeam);

      if (homePerf) tData[homeTeam] = homePerf;
      if (awayPerf) tData[awayTeam] = awayPerf;
      
      setTeamsData(tData);

      const allBets = calculateRecommendedBets(homeTeam, awayTeam, league);
      const topTen = allBets.sort((a, b) => b.probability - a.probability).slice(0, 10);
      
      setBets(topTen);
      setIsLoading(false);
    }

    if (homeTeam && awayTeam && league) {
      loadDataAndCalculate();
    }
  }, [homeTeam, awayTeam, league]);

  if (!homeTeam || !awayTeam || !league) {
    return null;
  }

  return (
    <Card className="p-4 mt-4 bg-card text-card-foreground rounded-lg border border-border">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        Scommesse Consigliate
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : bets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun dato disponibile per questa partita.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bets.map((bet, idx) => {
            const referencedTeam = getTeamFromBetLabel(bet.label, homeTeam, awayTeam);
            const logo = referencedTeam && teamsData[referencedTeam]?.logo;

            return (
              <motion.div
                key={idx}
                className="relative p-4 bg-background rounded-lg border border-border overflow-hidden flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-card opacity-0 hover:opacity-10 transition-opacity pointer-events-none" />

                {/* Mostra il logo se disponibile, altrimenti un'icona di pallone da calcio */}
                {logo ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                      src={logo}
                      alt={referencedTeam}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <MdSportsSoccer className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                )}

                <div className="flex flex-col min-w-0">
                  <div className="text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                    {bet.label}
                  </div>
                  <div className="text-green-400 font-bold text-lg">
                    {bet.probability.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
