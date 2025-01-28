'use client';

import React, { useState, useMemo } from 'react';
import { useBetSlip } from '@/app/BetSlipContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function BetSlip() {
  const {
    betSlip,
    removeBet,
    updateBetOdd,
    totalStake,
    updateTotalStake,
    confirmBetSlip,
  } = useBetSlip();

  const [isOpen, setIsOpen] = useState<boolean>(true);

  const totalOdds = useMemo(() => {
    if (betSlip.length === 0) return 0;
    return betSlip.reduce((acc, bet) => acc * bet.odd, 1);
  }, [betSlip]);

  const potentialWin = parseFloat((totalOdds * totalStake).toFixed(2));

  return (
    <div
      className="
        fixed bottom-0 right-0 z-50 
        w-[300px] max-w-full
        m-4
      "
    >
      <Card
        className="
          relative overflow-hidden 
          border border-border 
          bg-card text-foreground 
          text-sm shadow-md
          rounded-md
        "
      >
        {/* Header con pulsante per aprire/chiudere */}
        <div
          className={`
            bg-primary text-primary-foreground px-4 
            flex items-center justify-between 
            transition-all duration-300
            ${isOpen ? 'py-3' : 'py-2 h-12'}
          `}
        >
          <span className="font-bold tracking-wide text-sm">Schedina</span>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>
        </div>

        {isOpen && (
          <div className="p-4 space-y-4">
            {betSlip.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessuna selezione.</p>
            ) : (
              <>
                {betSlip.map((bet) => (
                  <div
                    key={bet.id}
                    className="border-b border-border pb-3 mb-3 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{bet.matchName}</span>
                        <span className="text-xs text-muted-foreground">{bet.label}</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeBet(bet.id)}
                        className="self-center"
                      >
                        X
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Quota:</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        value={bet.odd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > 0) updateBetOdd(bet.id, val);
                        }}
                        className="w-16 bg-background text-foreground text-sm"
                      />
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Importo:</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={totalStake}
                      onChange={(e) => updateTotalStake(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-background text-foreground text-sm"
                    />
                  </div>

                  <div className="text-sm">
                    Quota Totale:{' '}
                    <span className="font-semibold">{totalOdds.toFixed(2)}</span>
                  </div>
                  <div className="text-sm">
                    Vincita Potenziale:{' '}
                    <span className="font-semibold">{potentialWin}</span>
                  </div>

                  <Button
                    onClick={confirmBetSlip}
                    className="
                      w-full mt-2 
                      bg-green-600 hover:bg-green-700 
                      text-white
                    "
                  >
                    Conferma Schedina
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
