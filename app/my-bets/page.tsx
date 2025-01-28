'use client';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBetSlip } from '@/app/BetSlipContext';
import { CheckCircle, XCircle } from 'lucide-react';

export default function MyBetsPage() {
  const { confirmedBets, setBetStatus, wallet } = useBetSlip();

  // Calcola quante pending, quante won, quante lost
  const totalBets = confirmedBets.length;
  const wonCount = confirmedBets.filter((b) => b.status === 'won').length;
  const lostCount = confirmedBets.filter((b) => b.status === 'lost').length;
  const pendingCount = confirmedBets.filter((b) => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <Card className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Le Mie Schedine</h1>

            {totalBets === 0 ? (
              <p className="text-muted-foreground">Non hai ancora effettuato scommesse.</p>
            ) : (
              confirmedBets.map((slip) => (
                <div
                  key={slip.id}
                  className="border-b border-border pb-4 mb-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">
                      Schedina #{slip.id} ({slip.status.toUpperCase()})
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* Seleziona Vinta */}
                      <Button
                        variant={slip.status === 'won' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBetStatus(slip.id, 'won')}
                      >
                        <CheckCircle className="mr-1 w-4 h-4" />
                        Vinta
                      </Button>

                      {/* Seleziona Persa */}
                      <Button
                        variant={slip.status === 'lost' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBetStatus(slip.id, 'lost')}
                      >
                        <XCircle className="mr-1 w-4 h-4" />
                        Persa
                      </Button>
                    </div>
                  </div>
                  <div>
                    {/* Lista di selezioni */}
                    {slip.bets.map((b) => (
                      <div key={b.id} className="text-sm flex justify-between">
                        <span>
                          <strong>{b.matchName}</strong> - {b.label}
                        </span>
                        <span>Quota: {b.odd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Info stake, quota totale, vincita potenziale */}
                  <div className="mt-2 text-sm flex flex-wrap gap-4">
                    <div>
                      <strong>Importo:</strong> {slip.stake}
                    </div>
                    <div>
                      <strong>Quota Totale:</strong> {slip.totalOdds.toFixed(2)}
                    </div>
                    <div>
                      <strong>Vincita Potenziale:</strong> {slip.potentialWin.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Statistiche finali + Portafoglio */}
            <div className="space-y-2">
              <p className="text-sm">Totale Schedine: {totalBets}</p>
              <p className="text-sm">Vinte: {wonCount}</p>
              <p className="text-sm">Perse: {lostCount}</p>
              <p className="text-sm">In Attesa: {pendingCount}</p>
              <p className="text-lg font-bold mt-3">
                Saldo Attuale: {wallet.toFixed(2)} €
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
