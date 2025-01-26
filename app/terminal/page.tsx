'use client';

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Importato per gestire i link
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import {
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaSquare, // Icona per lo score
  FaFutbol, // Icona per il football/soccer
  FaBasketballBall, // Icona per il basketball
} from 'react-icons/fa'; // Icone aggiuntive
import { GiTennisBall } from 'react-icons/gi'; // Icona per il tennis
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'; // Tooltip components

import { cn } from '@/lib/utils'; // Import utility per classNames
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion

// Importazione del file JSON dei bookmaker
import bookmakerDataRaw from '../../odds-checker/files/data.json'; // Adatta il percorso secondo la tua struttura

/* Definizione dei Tipi per bookmakerData */
interface BookmakerInfo {
  'driver-url'?: string; // Reso opzionale
  // Aggiungi altri campi se presenti nel tuo data.json
}

type BookmakerData = Record<string, BookmakerInfo>;

// Cast di bookmakerDataRaw al tipo BookmakerData
const bookmakerData: BookmakerData = bookmakerDataRaw as BookmakerData;

/* Definizione dei Tipi */
export interface SportbookInfo {
  sport?: string;
  name: string;
  minute?: string;
  score?: string | string[];
  start?: string;
  period?: string;
  tournament?: string;
  time?: string;
}

interface Bet {
  sportbook: string;
  bet_type: string;
  odd: number;
  stake: number;
  win: number;
  outcome: string;
}

interface Arbitrage {
  bet_radar_id: string;
  cycle: number;
  probability: number;
  sportbooks: string[];
  staus: boolean;
  score: number;
  info: Record<string, SportbookInfo>;
  bets: Bet[];
  foundAt: number; // Timestamp in secondi
  isNew?: boolean; // Campo opzionale per indicare nuovi arbitraggis
}

interface ArbitrageContextType {
  arbitrages: Arbitrage[];
  selectedArbitrage: Arbitrage | null;
  selectArbitrage: (arb: Arbitrage) => void;
}

/* Creazione del Context */
const ArbitrageContext = createContext<ArbitrageContextType>({
  arbitrages: [],
  selectedArbitrage: null,
  selectArbitrage: () => {},
});

/* Helper Function per ottenere l'URL del bookmaker */
const getBookmakerUrl = (bookmaker: string): string | null => {
  const lowerCaseBookmaker = bookmaker.toLowerCase();
  if (
    bookmakerData[lowerCaseBookmaker] &&
    bookmakerData[lowerCaseBookmaker]['driver-url']
  ) {
    return bookmakerData[lowerCaseBookmaker]['driver-url'];
  }
  return null;
};

/* Helper Function per generare una chiave unica per ogni arbitraggio */
const generateArbitrageKey = (arbitrage: Arbitrage): string => {
  const { info, sportbooks, bets } = arbitrage;
  // Ottieni il nome della partita dal primo bookmaker
  const matchName = (info[sportbooks[0]]?.name || 'Match').toUpperCase();
  // Ordina i bookmaker per garantire coerenza
  const sortedBookmakers = [...sportbooks].sort().join(',');
  // Ottieni le win potenziali ordinate
  const sortedWins = [...bets]
    .map((bet) => bet.win.toFixed(2))
    .sort()
    .join(',');
  // Combina tutto in una chiave unica
  return `${matchName}|${sortedBookmakers}|${sortedWins}`;
};

/* Mappatura degli Sport alle Icone */
const sportIcons: Record<string, JSX.Element> = {
  football: <FaFutbol className="text-white" />,
  soccer: <FaFutbol className="text-white" />, // Alias per soccer
  basketball: <FaBasketballBall className="text-orange-500" />,
  basket: <FaBasketballBall className="text-orange-500" />, // Alias per basket
  tennis: <GiTennisBall className="text-lime-500" />,
  // Aggiungi altri sport e icone se necessario
};

/* Funzione di Estrazione e Mappatura dello Score */
function extractScore(
  info: Record<string, SportbookInfo>,
  bookmaker: string,
  sport: string
): string | null {
  try {
    let score = info[bookmaker]?.score;

    if (Array.isArray(score)) {
      score = score.join(" - ");
    }

    if (typeof score === "string") {
      const sportLower = sport.toLowerCase();

      // Gestione per Basket
      if (sportLower === "basket" && score.includes(" - ")) {
        const parts = score.split(" - ").map(part => part.trim());
        if (parts.every(part => part.includes("-"))) {
          const scores: [number, number][] = parts.map(part => {
            const [first, second] = part.split("-").map(Number);
            return [first, second];
          });
          const firstSum = scores.reduce((acc, curr) => acc + curr[0], 0);
          const secondSum = scores.reduce((acc, curr) => acc + curr[1], 0);
          return `${firstSum}-${secondSum}`;
        }
      }

      // Gestione per Tennis
      if (sportLower === "tennis" && score.includes(" - ")) {
        const parts = score.split(" - ");
        const digits: number[] = [];

        parts.forEach(part => {
          // Estrai i numeri da ogni parte
          const nums = part.match(/\d+/g);
          if (nums) {
            nums.forEach(num => {
              const digit = parseInt(num);
              if (!isNaN(digit)) {
                digits.push(digit);
              }
            });
          }
        });

        // Raggruppa in coppie ed escludi coppie con 0
        const pairs: string[] = [];
        for (let i = 0; i < digits.length - 1; i += 2) {
          const first = digits[i];
          const second = digits[i + 1];
          if (first !== 0 && second !== 0) {
            pairs.push(`${first}-${second}`);
          }
        }

        return pairs.join(' ');
      }

      // **Logica Specifica per Football (Calcio) - Ultimo Controllo**
      if (sportLower === "football") {
        if (score.includes("T#")) {
          // Formato con periodi, ad esempio: "1T#1 - 22T#1 - 1OT#"
          const parts = score.split(" - ");
          let homeGoals = 0;
          let awayGoals = 0;

          parts.forEach(part => {
            // Cerca pattern come '1T#1', '22T#1', ecc.
            const match = part.match(/(\d+)T#(\d+)/i);
            if (match) {
              const period = parseInt(match[1]);
              const y = parseInt(match[2]);

              if (!isNaN(period) && !isNaN(y)) {
                if (period === 1) {
                  // Primo Tempo
                  homeGoals += 1;
                  awayGoals += y + 1; // Esempio: y=1 → away +=2
                } else if (period === 2) {
                  // Secondo Tempo
                  homeGoals += 1;
                  awayGoals += y; // Esempio: y=1 → away +=1
                }
                // Overtime o altri periodi vengono ignorati
              }
            }
          });

          return `${homeGoals}-${awayGoals}`;
        } else {
          // Formato semplice, ad esempio: "0-0", "1-3"
          const simpleMatch = score.match(/^(\d+)\s*-\s*(\d+)$/);
          if (simpleMatch) {
            const home = parseInt(simpleMatch[1]);
            const away = parseInt(simpleMatch[2]);

            if (!isNaN(home) && !isNaN(away)) {
              return `${home}-${away}`;
            }
          }
        }
      }

      // **Altri Sport: Ritorna il Punteggio Originale**
      return score;
    }

    return score || null;
  } catch (error) {
    console.error("Errore nell'estrazione dello score:", error);
    return null;
  }
}

/* Provider del Context */
const ArbitrageProvider = ({ children }: { children: ReactNode }) => {
  const [arbitrages, setArbitrages] = useState<Arbitrage[]>([]);
  const [selectedArbitrage, setSelectedArbitrage] =
    useState<Arbitrage | null>(null);

  // Funzione per recuperare gli arbitraggis
  const fetchArbitrages = async () => {
    try {
      const response = await fetch('/api/arbs');
      if (response.ok) {
        const data: Arbitrage[] = await response.json();
        console.log('Arbitraggis recuperati:', data); // Log aggiuntivo per debugging

        // Ordina i dati dal più vecchio al più recente
        const sortedData = data.sort((a, b) => a.foundAt - b.foundAt);

        // Mantieni solo gli ultimi 10 arbitraggis
        const latestArbs = sortedData.slice(-10).reverse();

        // Filtra gli arbitraggis unici
        const uniqueArbsMap = new Map<string, Arbitrage>();
        latestArbs.forEach((arb) => {
          const key = generateArbitrageKey(arb);
          if (!uniqueArbsMap.has(key)) {
            uniqueArbsMap.set(key, { ...arb, isNew: true }); // Imposta isNew su true per i nuovi arbitraggis
          }
        });
        const uniqueArbs = Array.from(uniqueArbsMap.values());

        setArbitrages((prevArbs) => {
          // Combina i nuovi arbitraggis con quelli esistenti, evitando duplicati
          const combined = [...uniqueArbs, ...prevArbs];
          const combinedMap = new Map<string, Arbitrage>();
          combined.forEach((arb) => {
            const key = generateArbitrageKey(arb);
            if (!combinedMap.has(key)) {
              combinedMap.set(key, arb);
            }
          });
          return Array.from(combinedMap.values()).slice(0, 10);
        });

        // Rimuovi lo stato isNew dopo qualche secondo
        uniqueArbs.forEach((arb) => {
          setTimeout(() => {
            setArbitrages((prevArbs) =>
              prevArbs.map((a) =>
                a.bet_radar_id === arb.bet_radar_id &&
                a.cycle === arb.cycle &&
                a.foundAt === arb.foundAt
                  ? { ...a, isNew: false }
                  : a
              )
            );
          }, 3000); // Rimuovi isNew dopo 3 secondi
        });

        // Se il selectedArbitrage non è più nella lista, resetta la selezione
        if (selectedArbitrage) {
          const stillExists = uniqueArbs.find(
            (arb) =>
              arb.bet_radar_id === selectedArbitrage.bet_radar_id &&
              arb.cycle === selectedArbitrage.cycle &&
              arb.foundAt === selectedArbitrage.foundAt
          );
          if (!stillExists) {
            setSelectedArbitrage(null);
          }
        }
      } else {
        console.error(
          'Errore nel recupero degli arbitraggis:',
          response.statusText
        );
      }
    } catch (error) {
      console.error('Errore nel recupero degli arbitraggis:', error);
    }
  };

  // Effetto per fetchare gli arbitraggis al montaggio e ogni 5 secondi
  useEffect(() => {
    fetchArbitrages();
    const interval = setInterval(fetchArbitrages, 5000); // Poll ogni 5 secondi
    return () => clearInterval(interval);
  }, []);

  // Funzione per selezionare un arbitraggio
  const selectArbitrage = (arb: Arbitrage) => {
    setSelectedArbitrage(arb);
  };

  return (
    <ArbitrageContext.Provider
      value={{ arbitrages, selectedArbitrage, selectArbitrage }}
    >
      {children}
    </ArbitrageContext.Provider>
  );
};

/* Componente ControlPanel */
const ControlPanel = () => {
  const [status, setStatus] = useState<string>('stopped');
  const [loading, setLoading] = useState<boolean>(false);

  // Effetto per recuperare lo stato corrente
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status', {
          method: 'GET',
        });
        if (response.ok) {
          const data = await response.json();
          setStatus(data.staus ? 'running' : 'stopped'); // Assicurati che l'API restituisca 'staus'
        } else {
          console.error('Errore nel recupero dello stato:', response.statusText);
        }
      } catch (error) {
        console.error('Errore nel recupero dello stato:', error);
      }
    };

    fetchStatus();
  }, []);

  // Funzione per avviare l'arbitraggio
  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/start', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        setStatus('running');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Errore nell'avvio dell'arbitraggio:", error);
      alert("Errore nell'avvio dell'arbitraggio.");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per fermare l'arbitraggio
  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stop', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        setStatus('stopped');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Errore nell'arresto dell'arbitraggio:", error);
      alert("Errore nell'arresto dell'arbitraggio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-card p-4 rounded-lg shadow-md flex items-center justify-between">
      {/* A sinistra: Titolo */}
      <div className="flex items-center">
        <h2 className="text-lg font-bold text-white">Controllo Arbitraggio</h2>
      </div>

      {/* Al centro: Pulsanti Start e Stop */}
      <div className="flex items-center space-x-3">
        <button
          onClick={handleStart}
          className={`px-3 py-1 bg-green-500 text-white rounded-full text-sm flex items-center justify-center transition-opacity duration-200 ${
            loading || status === 'running'
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-green-600'
          }`}
          disabled={loading || status === 'running'}
        >
          {loading && status !== 'running' ? 'Avviando...' : 'Start'}
        </button>
        <button
          onClick={handleStop}
          className={`px-3 py-1 bg-red-500 text-white rounded-full text-sm flex items-center justify-center transition-opacity duration-200 ${
            loading || status === 'stopped'
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-red-600'
          }`}
          disabled={loading || status === 'stopped'}
        >
          {loading && status !== 'stopped' ? 'Fermando...' : 'Stop'}
        </button>
      </div>

      {/* A destra: Stato Attivo */}
      <div className="flex items-center space-x-2">
        {status === 'running' && (
          <>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-red-500">On Live</span>
          </>
        )}
        {status !== 'running' && (
          <span className="text-sm text-gray-400">Off</span>
        )}
      </div>
    </div>
  );
};

/* Componente ArbitrageCard - Visualizzazione Compatta */
interface ArbitrageCardProps {
  arbitrage: Arbitrage;
  onSelect: () => void;
}

const ArbitrageCard: React.FC<ArbitrageCardProps> = ({
  arbitrage,
  onSelect,
}) => {
  const { sportbooks, probability, score, bets, info, isNew } = arbitrage;
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

  // Stato per l'evidenziazione temporanea
  useEffect(() => {
    if (isNew) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 3000); // Rimuovi evidenziazione dopo 3 secondi
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  // Ottieni i nomi dei bookmaker
  const bookmaker1 = sportbooks[0];
  const bookmaker2 = sportbooks[1];

  // Ottieni il nome del match dal primo bookmaker e mettilo in maiuscolo
  const matchName = (info[bookmaker1]?.name || 'Match').toUpperCase();

  // Calcola Stake Totale e Guadagno Minimo
  const totalStake = bets.reduce((acc, bet) => acc + bet.stake, 0);
  const minWin = Math.min(...bets.map((bet) => bet.win));
  const profit = minWin - totalStake;
  const profitPercentage = (profit / totalStake) * 100;

  // Estrai lo sport dal primo bookmaker
  const sport = info[bookmaker1]?.sport?.toLowerCase();
  const sportIcon = sportIcons[sport] || null;

  return (
    <motion.div
      onClick={onSelect}
      className={`p-4 bg-card border border-card-dark rounded-lg shadow-sm cursor-pointer hover:bg-card-dark transition-colors flex relative ${
        isHighlighted ? '   ' : ''
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Icona Sport in alto a destra */}
      {sportIcon && (
        <div className="absolute top-2 right-2 text-xl">
          {sportIcon}
        </div>
      )}

      {/* Sinistra: Percentuale Profitto */}
      <div className="flex flex-col items-center justify-center mr-4">
        <span
          className={cn(
            "text-2xl font-bold",
            profitPercentage > 0 ? "text-green-500" : "text-red-500"
          )}
        >
          {profitPercentage.toFixed(2)}%
        </span>
        <span className="text-xs text-gray-400">Profitto</span>
      </div>

      {/* Destra: Dettagli Principali */}
      <div className="flex-1">
        {/* Nome Evento in maiuscolo */}
        <h3 className="text-center text-sm font-semibold text-white uppercase mb-2">
          {matchName}
        </h3>
        {/* Informazioni Aggiuntive */}
        <div className="flex justify-between items-center text-xs text-gray-300">
          {/* Percentuale Arbitraggio */}
          <div className="flex items-center space-x-1">
            <FaInfoCircle className="text-blue-400" />
            <span>Prob: {probability.toFixed(2)}%</span>
          </div>
          {/* Stake Totale */}
          <div className="flex items-center space-x-1">
            <FaInfoCircle className="text-blue-400" />
            <span>Stake: {totalStake.toFixed(2)}</span>
          </div>
          {/* Icone degli Sportbook */}
          <div className="flex space-x-2">
            {sportbooks.map((bookmaker) => {
              const url = getBookmakerUrl(bookmaker);
              return url ? (
                <a
                  key={bookmaker}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()} // Previene la selezione dell'arbitraggio quando si clicca il link
                >
                  <div className="w-6 h-6 relative">
                    <Image
                      src={`/images/sportbooks/${bookmaker.toLowerCase()}.png`}
                      alt={bookmaker}
                      layout="fill"
                      objectFit="contain"
                      className="rounded" // Immagini quadrate
                      onError={(e) => {
                        // Fallback in caso di errore nel caricamento dell'immagine
                        (e.target as HTMLImageElement).src =
                          '/images/sportbooks/default.png';
                      }}
                    />
                  </div>
                </a>
              ) : (
                <div key={bookmaker} className="w-6 h-6 relative">
                  <Image
                    src={`/images/sportbooks/${bookmaker.toLowerCase()}.png`}
                    alt={bookmaker}
                    layout="fill"
                    objectFit="contain"
                    className="rounded" // Immagini quadrate
                    onError={(e) => {
                      // Fallback in caso di errore nel caricamento dell'immagine
                      (e.target as HTMLImageElement).src =
                        '/images/sportbooks/default.png';
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* Componente ArbitrageList */
const ArbitrageList = () => {
  const { arbitrages, selectArbitrage } = useContext(ArbitrageContext);

  return (
    <div className="bg-card p-4 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4 text-white">
        Opportunità di Arbitraggio
      </h3>
      {arbitrages.length === 0 ? (
        <p className="text-gray-400">Nessun arbitraggio trovato.</p>
      ) : (
        <motion.div
          className="space-y-2 max-h-96 overflow-y-auto"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          <AnimatePresence>
            {arbitrages.map((arb) => (
              <ArbitrageCard
                key={`${arb.bet_radar_id}-${arb.cycle}-${arb.foundAt}`}
                arbitrage={arb}
                onSelect={() => selectArbitrage(arb)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

/* Componente ArbitrageDetails - Visualizzazione Estesa */
const ArbitrageDetails = () => {
  const { selectedArbitrage } = useContext(ArbitrageContext);
  const [showMore, setShowMore] = useState<boolean>(false);

  if (!selectedArbitrage) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-md text-center text-gray-400">
        Seleziona un arbitraggio per vedere i dettagli.
      </div>
    );
  }

  const { probability, sportbooks, score, info, bets } = selectedArbitrage;

  // Ottieni i nomi dei bookmaker
  const bookmaker1 = sportbooks[0];
  const bookmaker2 = sportbooks[1];

  // Ottieni il nome del match dal primo bookmaker e mettilo in maiuscolo
  const matchName = (info[bookmaker1]?.name || 'Match').toUpperCase();

  // Calcola Stake Totale, Guadagno Minimo, Profitto e Percentuale di Profitto
  const totalStake = bets.reduce((acc, bet) => acc + bet.stake, 0);
  const minWin = Math.min(...bets.map((bet) => bet.win));
  const profit = minWin - totalStake;
  const profitPercentage = (profit / totalStake) * 100;

  // Calcola Stake e Guadagno per ciascun bookmaker
  const stakes = bets.reduce((acc, bet) => {
    acc[bet.sportbook] = (acc[bet.sportbook] || 0) + bet.stake;
    return acc;
  }, {} as Record<string, number>);

  const gains = bets.reduce((acc, bet) => {
    acc[bet.sportbook] = (acc[bet.sportbook] || 0) + bet.win;
    return acc;
  }, {} as Record<string, number>);

  // Mappa lo score utilizzando la funzione extractScore per ogni bookmaker
  const mappedScores: Record<string, string | null> = {};
  sportbooks.forEach((sportbook) => {
    const sport = info[sportbook]?.sport || '';
    mappedScores[sportbook] = extractScore(info, sportbook, sport);
  });

  return (
    <div className="bg-card p-6 rounded-lg shadow-md">
      {/* Header della Card */}
      <div className="mb-6">
        {/* Nome Evento in maiuscolo */}
        <h3 className="text-2xl font-bold text-center text-white mb-2">
          {matchName}
        </h3>
        {/* Percentuale di Profitto */}
        <div className="flex justify-center mb-4">
          <span
            className={cn(
              "text-4xl font-bold",
              profitPercentage > 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {profitPercentage.toFixed(2)}%
          </span>
        </div>
        {/* Icone degli Sportbook */}
        <div className="flex justify-center space-x-3">
          {sportbooks.map((sportbook) => {
            const url = getBookmakerUrl(sportbook);
            return url ? (
              <a
                key={sportbook}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} // Previene la selezione dell'arbitraggio quando si clicca il link
              >
                <div className="w-10 h-10 relative">
                  <Image
                    src={`/images/sportbooks/${sportbook.toLowerCase()}.png`}
                    alt={sportbook}
                    layout="fill"
                    objectFit="contain"
                    className="rounded" // Immagini quadrate
                    onError={(e) => {
                      // Fallback in caso di errore nel caricamento dell'immagine
                      (e.target as HTMLImageElement).src =
                        '/images/sportbooks/default.png';
                    }}
                  />
                </div>
              </a>
            ) : (
              <div key={sportbook} className="w-10 h-10 relative">
                <Image
                  src={`/images/sportbooks/${sportbook.toLowerCase()}.png`}
                  alt={sportbook}
                  layout="fill"
                  objectFit="contain"
                  className="rounded" // Immagini quadrate
                  onError={(e) => {
                    // Fallback in caso di errore nel caricamento dell'immagine
                    (e.target as HTMLImageElement).src =
                      '/images/sportbooks/default.png';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Sezione Score */}
      <div className="mb-6">
        <h5 className="font-semibold text-lg text-white mb-2">
          Score:
        </h5>
        <div className="flex space-x-4">
          {sportbooks.map((sportbook) => {
            const url = getBookmakerUrl(sportbook);
            const mappedScore = mappedScores[sportbook];
            return url ? (
              <a
                key={sportbook}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 relative">
                    <Image
                      src={`/images/sportbooks/${sportbook.toLowerCase()}.png`}
                      alt={sportbook}
                      layout="fill"
                      objectFit="contain"
                      className="rounded" // Immagini quadrate
                      onError={(e) => {
                        // Fallback in caso di errore nel caricamento dell'immagine
                        (e.target as HTMLImageElement).src =
                          '/images/sportbooks/default.png';
                      }}
                    />
                  </div>
                  <span className="flex items-center space-x-1">
                    <FaSquare className="text-green-400" />
                    <span>{mappedScore || 'N/A'}</span>
                  </span>
                </div>
              </a>
            ) : (
              <div key={sportbook} className="flex items-center space-x-2">
                <div className="w-6 h-6 relative">
                  <Image
                    src={`/images/sportbooks/${sportbook.toLowerCase()}.png`}
                    alt={sportbook}
                    layout="fill"
                    objectFit="contain"
                    className="rounded" // Immagini quadrate
                    onError={(e) => {
                      // Fallback in caso di errore nel caricamento dell'immagine
                      (e.target as HTMLImageElement).src =
                        '/images/sportbooks/default.png';
                    }}
                  />
                </div>
                <span className="flex items-center space-x-1">
                  <FaSquare className="text-green-400" />
                  <span>{mappedScore || 'N/A'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sezione Scommesse da Effettuare */}
      <div className="mb-6">
        <h5 className="font-semibold text-lg text-white mb-2">
          Scommesse da Effettuare:
        </h5>
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr>
              <th className="text-left">Bookmaker</th>
              <th className="text-left">Stake</th>
              <th className="text-left">Win</th>
              <th className="text-left">Outcome</th>
              <th className="text-left">Odd</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet, index) => {
              const url = getBookmakerUrl(bet.sportbook);
              return (
                <tr key={index} className="border-t border-card-dark">
                  <td className="py-2 flex items-center space-x-2">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-6 h-6 relative">
                          <Image
                            src={`/images/sportbooks/${bet.sportbook.toLowerCase()}.png`}
                            alt={bet.sportbook}
                            layout="fill"
                            objectFit="contain"
                            className="rounded" // Immagini quadrate
                            onError={(e) => {
                              // Fallback in caso di errore nel caricamento dell'immagine
                              (e.target as HTMLImageElement).src =
                                '/images/sportbooks/default.png';
                            }}
                          />
                        </div>
                      </a>
                    ) : (
                      <div className="w-6 h-6 relative">
                        <Image
                          src={`/images/sportbooks/${bet.sportbook.toLowerCase()}.png`}
                          alt={bet.sportbook}
                          layout="fill"
                          objectFit="contain"
                          className="rounded" // Immagini quadrate
                          onError={(e) => {
                            // Fallback in caso di errore nel caricamento dell'immagine
                            (e.target as HTMLImageElement).src =
                              '/images/sportbooks/default.png';
                          }}
                        />
                      </div>
                    )}
                    <span>{bet.sportbook}</span>
                  </td>
                  <td className="py-2">{bet.stake.toFixed(2)}</td>
                  <td className="py-2">{bet.win.toFixed(2)}</td>
                  <td className="py-2">{bet.outcome}</td>
                  <td className="py-2">{bet.odd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sezione Stake Totale e Profitto */}
      <div className="mb-6">
        <h5 className="font-semibold text-lg text-white mb-2">
          Stake Totale e Profitto:
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-300">
          {/* Stake Totale */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1 cursor-pointer">
                <FaInfoCircle className="text-blue-400" />
                <span>Stake Totale: {totalStake.toFixed(2)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Totale stake investito</TooltipContent>
          </Tooltip>

          {/* Guadagno Minimo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1 cursor-pointer">
                <FaInfoCircle className="text-blue-400" />
                <span>Guadagno Minimo: {minWin.toFixed(2)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Guadagno minimo tra i bookmaker</TooltipContent>
          </Tooltip>

          {/* Profitto */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1 cursor-pointer">
                <FaInfoCircle className="text-blue-400" />
                <span
                  className={`${
                    profit < 0 ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  Profitto: {profit.toFixed(2)} ({profitPercentage.toFixed(2)}%)
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Profitto derivato dall'arbitraggio</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Sezione Informazioni Bookmaker (Mostrata con "Show More") */}
      {showMore && (
        <div className="mb-6">
          <h5 className="font-semibold text-lg text-white mb-2">
            Informazioni Bookmaker:
          </h5>
          {sportbooks.map((sportbook: string) => {
            const url = getBookmakerUrl(sportbook);
            return (
              <div key={sportbook} className="mb-4">
                <h6 className="font-semibold text-md text-white mb-1">
                  {sportbook.charAt(0).toUpperCase() + sportbook.slice(1)}
                </h6>
                <ul className="list-none space-y-1 text-sm text-gray-400">
                  {info[sportbook]?.sport && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Sport: {info[sportbook].sport}</span>
                    </li>
                  )}
                  {info[sportbook]?.name && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Nome: {info[sportbook].name}</span>
                    </li>
                  )}
                  {info[sportbook]?.start && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Inizio: {info[sportbook].start}</span>
                    </li>
                  )}
                  {info[sportbook]?.period && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Periodo: {info[sportbook].period}</span>
                    </li>
                  )}
                  {info[sportbook]?.score && (
                    <li className="flex items-center space-x-1">
                      <FaSquare className="text-green-400" />
                      <span>
                        Score:{' '}
                        {Array.isArray(info[sportbook].score)
                          ? info[sportbook].score.join(', ')
                          : info[sportbook].score}
                      </span>
                    </li>
                  )}
                  {info[sportbook]?.tournament && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Torneo: {info[sportbook].tournament}</span>
                    </li>
                  )}
                  {info[sportbook]?.minute && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Minuto: {info[sportbook].minute}</span>
                    </li>
                  )}
                  {info[sportbook]?.time && (
                    <li className="flex items-center space-x-1">
                      <FaInfoCircle className="text-blue-400" />
                      <span>Tempo: {info[sportbook].time}</span>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Pulsante per Mostrare/Mascherare Informazioni Aggiuntive */}
      <div className="text-center">
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-blue-500 hover:underline flex items-center justify-center space-x-1"
        >
          {showMore ? (
            <>
              <FaChevronUp /> <span>Nascondi Dettagli</span>
            </>
          ) : (
            <>
              <FaChevronDown /> <span>Mostra Dettagli</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/* Componente RightColumn (opzionale) */
const RightColumn = () => {
  return (
    <div className="bg-background p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4 text-white">
        Future Implementations
      </h3>
      <p className="text-gray-400">
        Questa sezione sarà implementata in futuro.
      </p>
    </div>
  );
};

/* Componente Layout */
const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar in alto */}
      <Navbar />

      {/* Sidebar a sinistra */}
      <Sidebar />

      {/* Contenuto principale */}
      <main className="lg:pl-60 pt-8">
        <div className="container mx-auto px-4">
          {/* Controllo Arbitraggio - esteso in tutta la larghezza */}
          <ControlPanel />

          {/* Sezione principale: ArbitrageList e ArbitrageDetails */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
            {/* Colonna sinistra: ArbitrageList */}
            <div>
              <ArbitrageList />
            </div>

            {/* Colonna destra: ArbitrageDetails e RightColumn */}
            <div className="space-y-6">
              <ArbitrageDetails />
              <RightColumn />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/* Pagina Principale */
const TerminalPage = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Se hai bisogno di caricare dati iniziali, fallo qui
        // Ad esempio, puoi chiamare loadData se necessario
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
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <ArbitrageProvider>
      <TooltipProvider>
        <Layout />
      </TooltipProvider>
    </ArbitrageProvider>
  );
};

export default TerminalPage;
