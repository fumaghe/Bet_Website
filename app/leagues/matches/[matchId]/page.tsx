// app/leagues/matches/[matchId]/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { getMatchDetails, getTeamPerformance } from '@/lib/services/data-service';
import { MatchDetailsType, TeamPerformance } from '@/lib/types/stats';

interface MatchPageProps {
  params: {
    matchId: string;
  };
}

export default function MatchPage({ params }: MatchPageProps) {
  const router = useRouter();
  const { matchId } = params;
  const [match, setMatch] = useState<MatchDetailsType | null>(null);
  const [homeTeam, setHomeTeam] = useState<TeamPerformance | undefined>(undefined);
  const [awayTeam, setAwayTeam] = useState<TeamPerformance | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        const decodedMatchId = decodeURIComponent(matchId); // Decodifica l'ID
        const matchData = getMatchDetails(decodedMatchId);
        if (!matchData) {
          throw new Error('Partita non trovata.');
        }
        setMatch(matchData);

        const home = getTeamPerformance(matchData.homeTeam);
        const away = getTeamPerformance(matchData.awayTeam);
        setHomeTeam(home);
        setAwayTeam(away);
      } catch (err: unknown) {
        console.error('Errore nel recupero dei dettagli della partita:', err);
        setError((err as Error).message);
      }
    };

    fetchMatchDetails();
  }, [matchId]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Sidebar />
        <main className="lg:pl-60 pt-8">
          <div className="container px-6">
            <div className="text-red-500">Errore: {error}</div>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Torna Indietro
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Sidebar />
        <main className="lg:pl-60 pt-8">
          <div className="container px-6">
            <div>Caricamento...</div>
          </div>
        </main>
      </div>
    );
  }

  const result = `${match.golHome} - ${match.golAway}`;
  const winner =
    match.golHome > match.golAway
      ? 'home'
      : match.golHome < match.golAway
      ? 'away'
      : 'draw';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="lg:pl-60 pt-8">
        <div className="container px-6">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Torna Indietro
          </button>

          <div className="border p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Dettagli Partita</h1>
            <div className="flex items-center justify-between mb-4">
              {/* Squadra di Casa */}
              <div className="flex items-center space-x-2">
                {homeTeam && (
                  <Image
                    src={homeTeam.logo}
                    alt={homeTeam.team}
                    width={50}
                    height={50}
                    className="object-contain"
                  />
                )}
                <span className="text-xl font-semibold">{match.homeTeam}</span>
              </div>

              {/* Risultato */}
              <div className="text-3xl font-bold">{result}</div>

              {/* Squadra Trasferta */}
              <div className="flex items-center space-x-2">
                <span className="text-xl font-semibold">{match.awayTeam}</span>
                {awayTeam && (
                  <Image
                    src={awayTeam.logo}
                    alt={awayTeam.team}
                    width={50}
                    height={50}
                    className="object-contain"
                  />
                )}
              </div>
            </div>

            {/* Informazioni Aggiuntive */}
            <div className="space-y-2">
              <div>
                <strong>Data:</strong> {new Date(match.date).toLocaleDateString('it-IT')}
              </div>
              <div>
                <strong>Orario:</strong> {match.time}
              </div>
              <div>
                <strong>Campionato:</strong> {match.league}
              </div>
              {/* Aggiungi ulteriori dettagli se necessario */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
