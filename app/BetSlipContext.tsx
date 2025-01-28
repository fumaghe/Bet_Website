'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Singola selezione nella schedina (es: "Milan vs Inter - 1", con quota X)
 */
export interface Bet {
  id: string;          // univoco
  matchName: string;   // es: "Milan vs Inter"
  label: string;       // es: "1", "Over 2.5", "Risultato 2-1", ecc.
  odd: number;         // quota
}

/**
 * Una schedina confermata. Contiene varie selezioni e lo stato
 */
export interface ConfirmedBetSlip {
  id: string;
  bets: Bet[];
  totalOdds: number;       // Moltiplicato di tutte le quote
  stake: number;           // Importo scommesso
  potentialWin: number;    // stake * totalOdds
  status: 'pending' | 'won' | 'lost'; // stato della schedina
}

/**
 * Stato globale del contesto
 */
interface BetSlipContextType {
  wallet: number;
  betSlip: Bet[];
  totalStake: number;
  confirmedBets: ConfirmedBetSlip[];
  addBet: (bet: Omit<Bet, 'id'>) => void;
  removeBet: (betId: string) => void;
  updateBetOdd: (betId: string, odd: number) => void;  // per modificare la quota manualmente
  updateTotalStake: (stake: number) => void;           // stake unico per la multipla
  confirmBetSlip: () => void;                          // conferma la schedina
  setBetStatus: (betSlipId: string, newStatus: 'won' | 'lost' | 'pending') => void;
  // eventuali metodi per gestire il portafoglio
  deposit: (amount: number) => void;
}

const BetSlipContext = createContext<BetSlipContextType>({
  wallet: 100,         // default
  betSlip: [],
  totalStake: 0,
  confirmedBets: [],
  addBet: () => {},
  removeBet: () => {},
  updateBetOdd: () => {},
  updateTotalStake: () => {},
  confirmBetSlip: () => {},
  setBetStatus: () => {},
  deposit: () => {},
});

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<number>(100);  // saldo iniziale
  const [betSlip, setBetSlip] = useState<Bet[]>([]);
  const [totalStake, setTotalStake] = useState<number>(0);
  const [confirmedBets, setConfirmedBets] = useState<ConfirmedBetSlip[]>([]);

  /**
   * Carica i dati da localStorage all'avvio
   */
  useEffect(() => {
    try {
      const dataString = localStorage.getItem('betSlipContext');
      if (dataString) {
        const data = JSON.parse(dataString);
        if (data.wallet !== undefined) setWallet(data.wallet);
        if (Array.isArray(data.betSlip)) setBetSlip(data.betSlip);
        if (typeof data.totalStake === 'number') setTotalStake(data.totalStake);
        if (Array.isArray(data.confirmedBets)) setConfirmedBets(data.confirmedBets);
      }
    } catch (err) {
      console.warn('Errore nel parsing di localStorage:', err);
    }
  }, []);

  /**
   * Salva i dati su localStorage ad ogni modifica
   */
  useEffect(() => {
    const payload = {
      wallet,
      betSlip,
      totalStake,
      confirmedBets,
    };
    localStorage.setItem('betSlipContext', JSON.stringify(payload));
  }, [wallet, betSlip, totalStake, confirmedBets]);

  /**
   * Aggiunge una selezione alla schedina (evita duplicati)
   */
  const addBet = (bet: Omit<Bet, 'id'>) => {
    // Se esiste già la stessa label & matchName, non la duplicare.
    const exists = betSlip.find(
      (b) => b.label === bet.label && b.matchName === bet.matchName
    );
    if (exists) return;

    const newBet: Bet = {
      id: Date.now().toString(),
      matchName: bet.matchName,
      label: bet.label,
      odd: bet.odd,
    };
    setBetSlip((prev) => [...prev, newBet]);
  };

  /**
   * Rimuove una selezione dalla schedina
   */
  const removeBet = (betId: string) => {
    setBetSlip((prev) => prev.filter((b) => b.id !== betId));
  };

  /**
   * Permette di modificare la quota manualmente
   */
  const updateBetOdd = (betId: string, odd: number) => {
    setBetSlip((prev) =>
      prev.map((b) => (b.id === betId ? { ...b, odd } : b))
    );
  };

  /**
   * Modifica l'importo totale (stake) per la multipla
   */
  const updateTotalStake = (stake: number) => {
    setTotalStake(stake);
  };

  /**
   * Calcola la quota totale di tutte le selezioni
   */
  const calculateTotalOdds = (): number => {
    if (betSlip.length === 0) return 0;
    return betSlip.reduce((acc, bet) => acc * bet.odd, 1);
  };

  /**
   * Conferma la schedina. Viene scalato il saldo, si crea un record in confirmedBets.
   */
  const confirmBetSlip = () => {
    if (betSlip.length === 0 || totalStake <= 0) return;

    const totalOdds = calculateTotalOdds();
    const potentialWin = parseFloat((totalOdds * totalStake).toFixed(2));

    // Se il wallet non è sufficiente, blocca l'operazione
    if (wallet < totalStake) {
      alert('Fondi insufficienti per confermare la schedina.');
      return;
    }

    // Scala lo stake dal wallet
    setWallet((prev) => parseFloat((prev - totalStake).toFixed(2)));

    // Crea una nuova schedina confermata
    const newConfirmedBetSlip: ConfirmedBetSlip = {
      id: Date.now().toString(),
      bets: betSlip,
      totalOdds,
      stake: totalStake,
      potentialWin,
      status: 'pending',
    };

    setConfirmedBets((prev) => [...prev, newConfirmedBetSlip]);

    // Reset della schedina e dello stake
    setBetSlip([]);
    setTotalStake(0);
  };

  /**
   * Cambia lo stato di una schedina (pending -> won/lost, lost->won, etc.)
   * e aggiorna il wallet di conseguenza.
   */
  const setBetStatus = (betSlipId: string, newStatus: 'won' | 'lost' | 'pending') => {
    setConfirmedBets((prev) =>
      prev.map((slip) => {
        if (slip.id !== betSlipId) return slip;
        if (slip.status === newStatus) {
          // Nessuna modifica se lo stato è uguale
          return slip;
        }

        // Se stiamo cambiando stato, ecco la logica:
        const oldStatus = slip.status;
        let updatedWallet = wallet;

        // Se passiamo da 'pending' a 'won'
        if (oldStatus === 'pending' && newStatus === 'won') {
          updatedWallet += slip.potentialWin; // vinci
        }
        // Se passiamo da 'pending' a 'lost'
        if (oldStatus === 'pending' && newStatus === 'lost') {
          // non succede nulla, stake era già scalato
        }
        // Se passiamo da 'won' a 'lost'
        if (oldStatus === 'won' && newStatus === 'lost') {
          updatedWallet -= slip.potentialWin; // tolgo la vincita precedentemente aggiunta
        }
        // Se passiamo da 'lost' a 'won'
        if (oldStatus === 'lost' && newStatus === 'won') {
          updatedWallet += slip.potentialWin; // aggiungo la vincita
        }

        setWallet(parseFloat(updatedWallet.toFixed(2)));

        return { ...slip, status: newStatus };
      })
    );
  };

  /**
   * Deposita fondi nel wallet
   */
  const deposit = (amount: number) => {
    if (amount <= 0) return;
    setWallet((prev) => parseFloat((prev + amount).toFixed(2)));
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
        deposit,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  return useContext(BetSlipContext);
}
