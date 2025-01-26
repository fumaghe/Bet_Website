// app/leagues/serie-a/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { StandingsTable } from '@/app/leagues/matches/standings-table';
import { MatchCarousel } from '@/app/leagues/matches/match-carousel';
import { DailyMatches } from '@/app/leagues/matches/daily-matches';
import { loadData } from '@/lib/services/data-service';

export default function SerieAPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, []);

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

  const currentLeague = 'Serie A'; // Definisci la lega corrente
  const currentYear = 2024; // Definisci l'anno corrente

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">Prossimi Match</h2>
                  <MatchCarousel league={currentLeague} />
                </div>
              </Card>

              <Card className="p-6">
                <DailyMatches league={currentLeague} year={currentYear} highlightLeague={currentLeague} />
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Classifica Serie A</h2>
                <StandingsTable league={currentLeague} limit={20} />
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
