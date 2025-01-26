'use client';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { StandingsTable } from '@/components/standings-table';

export default function BundesligaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-6">Bundesliga</h1>
            <StandingsTable league="Bundesliga" />
          </Card>
        </div>
      </main>
    </div>
  );
}