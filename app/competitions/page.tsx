'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { loadData } from '@/lib/services/data-service';
import { StandingsTable } from '@/components/standings-table';

export default function CompetitionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState('Serie A');

  useEffect(() => {
    const initializeData = async () => {
      await loadData();
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <div className="grid gap-8">
            <Card className="p-6">
              <h1 className="text-2xl font-bold mb-6">{selectedLeague}</h1>
              <StandingsTable league={selectedLeague} />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}