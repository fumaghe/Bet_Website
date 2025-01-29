'use client';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useBetSlip, ConfirmedBetSlip, WalletHistoryEntry } from '@/app/BetSlipContext';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, CategoryScale } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrazione dei componenti di ChartJS
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale
);

export default function MyBetsPage() {
  const {
    confirmedBets,
    setBetStatus,
    wallet,
    updateWallet,
    clearConfirmedBets,
    removeConfirmedBetSlip,
    walletHistory,
  } = useBetSlip();

  const [balanceInput, setBalanceInput] = useState<string>('');

  // Ordinamento dalla più nuova alla più vecchia
  const sortedBets = confirmedBets.slice().reverse();

  // Conta totale scommesse e status
  const totalBets = sortedBets.length;
  const wonCount = sortedBets.filter((slip) => slip.status === 'won').length;
  const lostCount = sortedBets.filter((slip) => slip.status === 'lost').length;
  const pendingCount = sortedBets.filter((slip) => slip.status === 'pending').length;

  // Contatore delle quote prese
  const totalQuotes = sortedBets.reduce((acc, slip) => acc + slip.bets.length, 0);
  const takenQuotes = sortedBets.reduce(
    (acc, slip) => acc + slip.bets.filter((b) => b.status !== 'pending').length,
    0
  );

  // Statistiche aggiuntive
  const successRate = totalBets > 0 ? ((wonCount / totalBets) * 100).toFixed(2) : '0.00';

  // Preparazione dati per il grafico
  const chartData = {
    labels: walletHistory.map((entry: WalletHistoryEntry) =>
      new Date(entry.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Saldo nel Tempo (€)',
        data: walletHistory.map((entry: WalletHistoryEntry) => entry.balance),
        fill: false,
        borderColor: '#4caf50',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Andamento del Saldo',
      },
    },
  };

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
                <span>Totale Schedine: <strong>{totalBets}</strong></span>
                <span>
                  Vinte: <strong className="text-green-500">{wonCount}</strong>
                </span>
                <span>
                  Perse: <strong className="text-red-500">{lostCount}</strong>
                </span>
                <span>
                  In Attesa: <strong className="text-yellow-500">{pendingCount}</strong>
                </span>
                <span>
                  Tasso di Successo: <strong>{successRate}%</strong>
                </span>
                <span>
                  Quote Totali: <strong>{totalQuotes}</strong>
                </span>
                <span>
                  Quote Prese: <strong className="text-blue-500">{takenQuotes}</strong>
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

          {/* Grafico del saldo */}
          <Card className="p-4 bg-card border border-border text-card-foreground">
            <Line data={chartData} options={chartOptions} />
          </Card>

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
              // Determina lo stato complessivo della schedina
              const hasLost = slip.bets.some((b) => b.status === 'lost');
              const allWon = slip.bets.every((b) => b.status === 'won');
              const isPending = slip.bets.some((b) => b.status === 'pending') && !hasLost;

              const slipStatus: 'won' | 'lost' | 'pending' = hasLost ? 'lost' : allWon ? 'won' : 'pending';

              return (
                <Card
                  key={slip.id}
                  className="p-4 border border-border shadow-md mb-2 bg-card text-card-foreground"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <span>Schedina #{slip.id}</span>
                      {slipStatus === 'won' && (
                        <span className="text-green-500 text-sm font-normal">(VINTA)</span>
                      )}
                      {slipStatus === 'lost' && (
                        <span className="text-red-500 text-sm font-normal">(PERSA)</span>
                      )}
                      {slipStatus === 'pending' && (
                        <span className="text-yellow-500 text-sm font-normal">(IN ATTESA)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={slipStatus === 'won' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          slip.bets.forEach((b) => setBetStatus(slip.id, b.id, 'won'));
                        }}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Vinta
                      </Button>
                      <Button
                        variant={slipStatus === 'lost' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          slip.bets.forEach((b) => setBetStatus(slip.id, b.id, 'lost'));
                        }}
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
                        className="flex justify-between items-center"
                      >
                        <span>
                          <strong>{b.matchName}</strong> — {b.label}
                        </span>
                        <span className="ml-4 text-muted-foreground">
                          {b.odd.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={b.status === 'won' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setBetStatus(slip.id, b.id, 'won')}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            V
                          </Button>
                          <Button
                            variant={b.status === 'lost' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setBetStatus(slip.id, b.id, 'lost')}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            P
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm flex flex-wrap gap-4">
                    <p>
                      <strong>Importo:</strong> {slip.stake} €
                    </p>
                    <p>
                      <strong>Quota Totale:</strong> {slip.totalOdds.toFixed(2)}
                    </p>
                    <p>
                      <strong>Vincita Potenziale:</strong> {slip.potentialWin.toFixed(2)} €
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
