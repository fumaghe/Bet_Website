'use client';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useBetSlip } from '@/app/BetSlipContext';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function MyBetsPage() {
  const {
    confirmedBets,
    setBetStatus,
    wallet,
    updateWallet,
    clearConfirmedBets,
    removeConfirmedBetSlip,
  } = useBetSlip();

  const [balanceInput, setBalanceInput] = useState<string>('');

  // Ordinamento dalla più nuova alla più vecchia
  const sortedBets = confirmedBets.slice().reverse();

  // Conta quante pending, quante won, quante lost
  const totalBets = sortedBets.length;
  const wonCount = sortedBets.filter((b) => b.status === 'won').length;
  const lostCount = sortedBets.filter((b) => b.status === 'lost').length;
  const pendingCount = sortedBets.filter((b) => b.status === 'pending').length;

  const handleUpdateBalance = () => {
    const newVal = parseFloat(balanceInput);
    if (!isNaN(newVal)) {
      updateWallet(newVal);
      setBalanceInput('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8 pb-8">
        <div className="container px-6 space-y-6">
          <h1 className="text-2xl font-bold mb-4">Le Mie Scommesse</h1>

          {/* Sezione portafoglio e statistiche */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Card className="p-4 bg-card border border-border text-card-foreground flex-1 w-full">
              <h2 className="font-semibold text-lg mb-2">Statistiche Schedine</h2>
              <div className="flex flex-col gap-1 text-sm">
                <span>Totale: <strong>{totalBets}</strong></span>
                <span>
                  Vinte: <strong className="text-green-500">{wonCount}</strong>
                </span>
                <span>
                  Perse: <strong className="text-red-500">{lostCount}</strong>
                </span>
                <span>
                  In Attesa: <strong className="text-yellow-500">{pendingCount}</strong>
                </span>
              </div>
            </Card>

            <Card className="p-4 bg-card border border-border text-card-foreground flex-1 max-w-sm w-full">
              <h2 className="font-semibold text-lg mb-2">Portafoglio</h2>
              <p className="text-xl font-bold mb-2">{wallet.toFixed(2)} €</p>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Nuovo saldo..."
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  className="w-24"
                />
                <Button variant="secondary" onClick={handleUpdateBalance}>
                  Aggiorna Saldo
                </Button>
              </div>
            </Card>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Le Tue Schedine</h2>
            <Button variant="destructive" onClick={clearConfirmedBets}>
              Resetta Tutto
            </Button>
          </div>

          {/* Elenco schedine */}
          {totalBets === 0 ? (
            <Card className="p-6 bg-card border border-border">
              <p className="text-muted-foreground">Non hai ancora effettuato scommesse.</p>
            </Card>
          ) : (
            sortedBets.map((slip) => {
              const isWon = slip.status === 'won';
              const isLost = slip.status === 'lost';
              const isPending = slip.status === 'pending';

              return (
                <Card
                  key={slip.id}
                  className="p-4 border border-border shadow-md mb-2 bg-card text-card-foreground"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <span>Schedina #{slip.id}</span>
                      {isWon && (
                        <span className="text-green-500 text-sm font-normal">(WON)</span>
                      )}
                      {isLost && (
                        <span className="text-red-500 text-sm font-normal">(LOST)</span>
                      )}
                      {isPending && (
                        <span className="text-yellow-500 text-sm font-normal">(PENDING)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isWon ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBetStatus(slip.id, 'won')}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Vinta
                      </Button>
                      <Button
                        variant={isLost ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBetStatus(slip.id, 'lost')}
                        className="flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Persa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeConfirmedBetSlip(slip.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Elimina
                      </Button>
                    </div>
                  </div>

                  {/* Selezioni */}
                  <div className="bg-muted/10 rounded p-3 text-sm flex flex-col gap-2 mb-3">
                    {slip.bets.map((b) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-start"
                      >
                        <span>
                          <strong>{b.matchName}</strong> — {b.label}
                        </span>
                        <span className="ml-4 text-muted-foreground">
                          {b.odd.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm flex flex-wrap gap-4">
                    <p>
                      <strong>Importo:</strong> {slip.stake}
                    </p>
                    <p>
                      <strong>Quota Totale:</strong> {slip.totalOdds.toFixed(2)}
                    </p>
                    <p>
                      <strong>Vincita Potenziale:</strong> {slip.potentialWin.toFixed(2)}
                    </p>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
