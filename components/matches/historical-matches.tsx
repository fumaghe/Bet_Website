'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { HistoricalMatch } from '@/lib/types/stats';
import { getHistoricalMatches, loadHistoricalMatches } from '@/lib/services/match-service';
import { Card } from '@/components/ui/card';

interface HistoricalMatchesProps {
  homeTeam?: string;
  awayTeam?: string;
}

export function HistoricalMatches({ homeTeam, awayTeam }: HistoricalMatchesProps) {
  const [matches, setMatches] = useState<HistoricalMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      await loadHistoricalMatches();
      setIsLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (homeTeam && awayTeam) {
      const historicalMatches = getHistoricalMatches(homeTeam, awayTeam);
      setMatches(historicalMatches);
    }
  }, [homeTeam, awayTeam]);

  const calculateStatistics = () => {
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;

    matches.forEach((match) => {
      if (match.goalsHome > match.goalsAway) {
        homeWins++;
      } else if (match.goalsAway > match.goalsHome) {
        awayWins++;
      } else {
        draws++;
      }
    });

    return { homeWins, awayWins, draws };
  };

  const getLastFiveResults = (team: string) => {
    const results = matches
      .filter((match) => match.homeTeam === team || match.awayTeam === team)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by descending date
      .slice(0, 5) // Get the 5 most recent matches
      .map((match) => {
        if (match.homeTeam === team) {
          if (match.goalsHome > match.goalsAway) return 'W';
          if (match.goalsHome < match.goalsAway) return 'L';
        } else {
          if (match.goalsAway > match.goalsHome) return 'W';
          if (match.goalsAway < match.goalsHome) return 'L';
        }
        return 'D';
      });
    return results;
  };

  const { homeWins, awayWins, draws } = calculateStatistics();
  const homeResults = getLastFiveResults(homeTeam || '');
  const awayResults = getLastFiveResults(awayTeam || '');

  return (
    <Card className="p-6 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-left">Precedenti</h2>

      {!isLoading && homeTeam && awayTeam && matches.length > 0 && (
        <div className="mb-4 flex justify-center items-center gap-6">
          <div className="flex flex-col items-center">
            <Image
              src={`/Bet_Website/images/teams/${homeTeam.toLowerCase().replace(/\s+/g, '_')}.png`}
              alt={homeTeam}
              width={30}
              height={30}
              className="object-contain"
            />
            <span className="text-lg font-bold mt-1">{homeWins}</span>
            <span className="text-xs text-gray-400">Vittorie</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-white">{draws}</span>
            </div>
            <span className="text-xs text-gray-400 mt-1">Pareggi</span>
          </div>
          <div className="flex flex-col items-center">
            <Image
              src={`/Bet_Website/images/teams/${awayTeam.toLowerCase().replace(/\s+/g, '_')}.png`}
              alt={awayTeam}
              width={30}
              height={30}
              className="object-contain"
            />
            <span className="text-lg font-bold mt-1">{awayWins}</span>
            <span className="text-xs text-gray-400">Vittorie</span>
          </div>
        </div>
      )}

      {!isLoading && homeTeam && awayTeam && (
        <div className="flex justify-between mt-2 mb-4">
          <div className="flex gap-1">
            {homeResults.map((result, index) => (
              <div
                key={index}
                className={`w-4 h-4 flex items-center justify-center rounded-md ${
                  result === 'W'
                    ? 'bg-green-500'
                    : result === 'L'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                } text-white text-[10px] ${
                  index === 0 ? 'border-2 border-yellow-500' : '' // Highlight the most recent result
                }`}
              >
                {result}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {awayResults.map((result, index) => (
              <div
                key={index}
                className={`w-4 h-4 flex items-center justify-center rounded-md ${
                  result === 'W'
                    ? 'bg-green-500'
                    : result === 'L'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                } text-white text-[10px] ${
                  index === 0 ? 'border-2 border-yellow-500' : '' // Highlight the most recent result
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !homeTeam || !awayTeam ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-center text-gray-500">
            Seleziona entrambe le squadre per visualizzare i precedenti.
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          Non ci sono precedenti tra {homeTeam} e {awayTeam}.
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[250px]">
          {matches.map((match, index) => {
            const isHomeTeamWinner = match.goalsHome > match.goalsAway;
            const isAwayTeamWinner = match.goalsAway > match.goalsHome;

            return (
              <div key={`${match.date}-${index}`}>
                <div className="text-center text-xs text-gray-400 mb-1">
                  {new Date(match.date).toLocaleDateString()}
                </div>

                <div className="text-white px-4 py-1 grid grid-cols-3 items-center">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`font-medium text-right ${
                        isHomeTeamWinner ? 'text-green-500' : 'text-white'
                      }`}
                      style={{
                        maxWidth: '80px',
                        fontSize: 'clamp(10px, 1.5vw, 14px)',
                        lineHeight: '1.2',
                        overflowWrap: 'break-word',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                      }}
                    >
                      {match.homeTeam}
                    </span>
                    <div className="relative w-5 h-5 flex-shrink-0">
                      <Image
                        src={`/Bet_Website/images/teams/${match.homeTeam
                          .toLowerCase()
                          .replace(/\s+/g, '_')}.png`}
                        alt={match.homeTeam}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-lg font-bold text-center">
                    {match.goalsHome} - {match.goalsAway}
                  </div>
                  <div className="flex items-center justify-start gap-2">
                    <div className="relative w-5 h-5 flex-shrink-0">
                      <Image
                        src={`/Bet_Website/images/teams/${match.awayTeam
                          .toLowerCase()
                          .replace(/\s+/g, '_')}.png`}
                        alt={match.awayTeam}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span
                      className={`font-medium text-left ${
                        isAwayTeamWinner ? 'text-green-500' : 'text-white'
                      }`}
                      style={{
                        maxWidth: '80px',
                        fontSize: 'clamp(10px, 1.5vw, 14px)',
                        lineHeight: '1.2',
                        overflowWrap: 'break-word',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                      }}
                    >
                      {match.awayTeam}
                    </span>
                  </div>
                </div>
                {index < matches.length - 1 && (
                  <hr className="border-t border-gray-700 my-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
