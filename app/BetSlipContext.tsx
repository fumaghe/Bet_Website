'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Singola selezione (Bet).
 */
export interface Bet {
  id: string;
  matchName: string;
  label: string;
  odd: number;
}

/**
 * Schedina confermata (ConfirmedBetSlip).
 */
export interface ConfirmedBetSlip {
  id: string;
  bets: Bet[];
  totalOdds: number;
  stake: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
}

/**
 * Interfaccia del contesto BetSlip
 */
interface BetSlipContextType {
  wallet: number;
  betSlip: Bet[];
  totalStake: number;
  confirmedBets: ConfirmedBetSlip[];

  // Metodi
  addBet: (bet: Omit<Bet, 'id'>) => void;
  removeBet: (betId: string) => void;
  updateBetOdd: (betId: string, odd: number) => void;
  updateTotalStake: (stake: number) => void;
  confirmBetSlip: () => void;
  setBetStatus: (betSlipId: string, newStatus: 'won' | 'lost' | 'pending') => void;

  // Metodi aggiunti per la gestione del saldo e delle schedine
  updateWallet: (newVal: number) => void;
  clearConfirmedBets: () => void;
  removeConfirmedBetSlip: (slipId: string) => void;
}

const BetSlipContext = createContext<BetSlipContextType>({
  wallet: 100,
  betSlip: [],
  totalStake: 0,
  confirmedBets: [],
  addBet: () => {},
  removeBet: () => {},
  updateBetOdd: () => {},
  updateTotalStake: () => {},
  confirmBetSlip: () => {},
  setBetStatus: () => {},
  updateWallet: () => {},
  clearConfirmedBets: () => {},
  removeConfirmedBetSlip: () => {},
});

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<number>(100);
  const [betSlip, setBetSlip] = useState<Bet[]>([]);
  const [totalStake, setTotalStake] = useState<number>(0);
  const [confirmedBets, setConfirmedBets] = useState<ConfirmedBetSlip[]>([]);

  // Caricamento da localStorage
  useEffect(() => {
    try {
      const dataString = localStorage.getItem('betSlipContext');
      if (dataString) {
        const data = JSON.parse(dataString);
        if (typeof data.wallet === 'number') setWallet(data.wallet);
        if (Array.isArray(data.betSlip)) setBetSlip(data.betSlip);
        if (typeof data.totalStake === 'number') setTotalStake(data.totalStake);
        if (Array.isArray(data.confirmedBets)) setConfirmedBets(data.confirmedBets);
      }
    } catch (err) {
      console.warn('Errore nel parsing di localStorage:', err);
    }
  }, []);

  // Salvataggio su localStorage
  useEffect(() => {
    const payload = {
      wallet,
      betSlip,
      totalStake,
      confirmedBets,
    };
    localStorage.setItem('betSlipContext', JSON.stringify(payload));
  }, [wallet, betSlip, totalStake, confirmedBets]);

  // Aggiunge una bet, evita duplicati
  const addBet = (bet: Omit<Bet, 'id'>) => {
    const exists = betSlip.find(
      (b) => b.label === bet.label && b.matchName === bet.matchName
    );
    if (exists) return;

    const newBet: Bet = {
      id: Date.now().toString(),
      ...bet,
    };
    setBetSlip((prev) => [...prev, newBet]);
  };

  // Rimuove una bet dal carrello
  const removeBet = (betId: string) => {
    setBetSlip((prev) => prev.filter((b) => b.id !== betId));
  };

  // Modifica la quota di una bet
  const updateBetOdd = (betId: string, odd: number) => {
    setBetSlip((prev) =>
      prev.map((b) => {
        if (b.id === betId) {
          return { ...b, odd };
        }
        return b;
      })
    );
  };

  // Aggiorna lo stake totale
  const updateTotalStake = (stake: number) => {
    setTotalStake(stake);
  };

  // Calcola la quota totale
  const calculateTotalOdds = (): number => {
    if (betSlip.length === 0) return 0;
    return betSlip.reduce((acc, bet) => acc * bet.odd, 1);
  };

  // Conferma la schedina
  const confirmBetSlip = () => {
    if (betSlip.length === 0 || totalStake <= 0) return;

    const totalOdds = calculateTotalOdds();
    const potentialWin = parseFloat((totalOdds * totalStake).toFixed(2));

    if (wallet < totalStake) {
      alert('Fondi insufficienti!');
      return;
    }

    // Scala stake dal wallet
    setWallet((prev) => parseFloat((prev - totalStake).toFixed(2)));

    // Crea la schedina
    const newConfirmed: ConfirmedBetSlip = {
      id: Date.now().toString(),
      bets: betSlip,
      totalOdds,
      stake: totalStake,
      potentialWin,
      status: 'pending',
    };

    setConfirmedBets((prev) => [...prev, newConfirmed]);
    setBetSlip([]);
    setTotalStake(0);
  };

  // Setta lo stato di una schedina
  const setBetStatus = (betSlipId: string, newStatus: 'won' | 'lost' | 'pending') => {
    setConfirmedBets((prev) =>
      prev.map((slip) => {
        if (slip.id !== betSlipId) return slip;
        if (slip.status === newStatus) return slip; // nessun cambio

        // Aggiorniamo il wallet se passiamo da pending->won, won->lost, etc.
        let updatedWallet = wallet;
        if (slip.status === 'pending') {
          if (newStatus === 'won') {
            updatedWallet += slip.potentialWin;
          }
        } else if (slip.status === 'won') {
          if (newStatus === 'lost') {
            updatedWallet -= slip.potentialWin;
          }
        } else if (slip.status === 'lost') {
          if (newStatus === 'won') {
            updatedWallet += slip.potentialWin;
          }
        }

        setWallet(parseFloat(updatedWallet.toFixed(2)));
        return { ...slip, status: newStatus };
      })
    );
  };

  // Aggiorna direttamente il wallet
  const updateWallet = (newVal: number) => {
    setWallet(parseFloat(newVal.toFixed(2)));
  };

  // Cancella tutte le schedine confermate
  const clearConfirmedBets = () => {
    setConfirmedBets([]);
  };

  // Rimuove una singola schedina
  const removeConfirmedBetSlip = (slipId: string) => {
    setConfirmedBets((prev) => prev.filter((s) => s.id !== slipId));
  };

  return (
    <BetSlipContext.Provider
      value={{
        wallet,
        betSlip,
        totalStake,
        confirmedBets,
        addBet,
        removeBet,
        updateBetOdd,
        updateTotalStake,
        confirmBetSlip,
        setBetStatus,
        updateWallet,
        clearConfirmedBets,
        removeConfirmedBetSlip,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  return useContext(BetSlipContext);
}
