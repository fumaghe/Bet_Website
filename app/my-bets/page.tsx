'use client';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';

export default function MyBetsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-6">Le Mie Scommesse</h1>
            <p className="text-muted-foreground">Non hai ancora effettuato scommesse.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}