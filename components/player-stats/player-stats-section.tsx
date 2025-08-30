'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerStatsTable } from '@/components/player-stats/player-stats-table';
import { loadPlayerStats, getTopPlayersByStat } from '@/lib/services/player-stats-service';
import { PlayerStats, NumericPlayerStatsKeys } from '@/lib/types/stats';

import { FaFutbol, FaAssistiveListeningSystems, FaBullseye } from 'react-icons/fa';
import { AiOutlineLineChart, AiFillFire } from 'react-icons/ai';
import { MdOutlineSportsSoccer, MdOutlineAccessTime, MdOutlineBlock } from 'react-icons/md';
import { BsFillSquareFill } from 'react-icons/bs';
import { Switch } from '@/components/ui/switch';

interface PlayerStatsSectionProps {
  homeTeam?: string;
  awayTeam?: string;
  league: string;
}

const STAT_CATEGORIES = [
  {
    id: 'scoring',
    label: 'Scoring',
    stats: [
      { key: 'goals', label: 'Reti', icon: <FaFutbol className="h-4 w-4" /> },
      { key: 'assists', label: 'Assist', icon: <FaAssistiveListeningSystems className="h-4 w-4" /> },
      { key: 'xG', label: 'xG', icon: <AiOutlineLineChart className="h-4 w-4" /> },
      { key: 'shots', label: 'Tiri totali', icon: <AiFillFire className="h-4 w-4" /> },
      { key: 'shotsOnTarget', label: 'Tiri in porta', icon: <MdOutlineSportsSoccer className="h-4 w-4" /> },
    ],
  },
  {
    id: 'discipline',
    label: 'Discipline',
    stats: [
      { key: 'yellowCards', label: 'Amm.', icon: <BsFillSquareFill className="h-4 w-4 text-yellow-400" /> },
      { key: 'redCards', label: 'Esp.', icon: <BsFillSquareFill className="h-4 w-4 text-red-500" /> },
      { key: 'foulsCommitted', label: 'Falli commessi', icon: <MdOutlineBlock className="h-4 w-4" /> },
      { key: 'foulsDrawn', label: 'Falli subiti', icon: <FaBullseye className="h-4 w-4" /> },
    ],
  },
  {
    id: 'general',
    label: 'General',
    stats: [
      { key: 'matches', label: 'PG', icon: <MdOutlineAccessTime className="h-4 w-4" /> },
      { key: 'minutes', label: 'Min', icon: <MdOutlineAccessTime className="h-4 w-4" /> },
      { key: 'offsides', label: 'Fuorigioco', icon: <MdOutlineBlock className="h-4 w-4" /> },
      { key: 'progressiveCarries', label: 'PrgC', icon: <AiOutlineLineChart className="h-4 w-4" /> },
      { key: 'progressivePasses', label: 'PrgP', icon: <AiOutlineLineChart className="h-4 w-4" /> },
    ],
  },
];

export function PlayerStatsSection({ homeTeam, awayTeam, league }: PlayerStatsSectionProps) {
  const [activeCategory, setActiveCategory] = useState('scoring');
  const [homeTopStats, setHomeTopStats] = useState<{ [key: string]: PlayerStats[] }>({});
  const [awayTopStats, setAwayTopStats] = useState<{ [key: string]: PlayerStats[] }>({});

  const [selectedStats, setSelectedStats] = useState<{ [categoryId: string]: string[] }>({
    scoring: ['goals'],
    discipline: ['yellowCards'],
    general: ['matches'],
  });

  const [displayMode, setDisplayMode] = useState<'total' | 'perMatch'>('total');

  useEffect(() => {
    (async () => {
      await loadPlayerStats();
      fetchStats();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeTeam, awayTeam, league]);

  const fetchStats = () => {
    if (homeTeam) {
      const newHomeTopStats: { [key: string]: PlayerStats[] } = {};
      for (const category of STAT_CATEGORIES) {
        for (const stat of category.stats) {
          newHomeTopStats[stat.key] = getTopPlayersByStat(
            homeTeam,
            league,
            stat.key as NumericPlayerStatsKeys,
            10
          );
        }
      }
      setHomeTopStats(newHomeTopStats);
    }

    if (awayTeam) {
      const newAwayTopStats: { [key: string]: PlayerStats[] } = {};
      for (const category of STAT_CATEGORIES) {
        for (const stat of category.stats) {
          newAwayTopStats[stat.key] = getTopPlayersByStat(
            awayTeam,
            league,
            stat.key as NumericPlayerStatsKeys,
            10
          );
        }
      }
      setAwayTopStats(newAwayTopStats);
    }
  };

  const handleStatToggle = (categoryId: string, statKey: string) => {
    setSelectedStats((prev) => {
      const categoryStats = prev[categoryId] || [];
      if (categoryStats.includes(statKey)) {
        return {
          ...prev,
          [categoryId]: categoryStats.filter((key) => key !== statKey),
        };
      } else {
        return {
          ...prev,
          [categoryId]: [...categoryStats, statKey],
        };
      }
    });
  };

  const handleDisplayModeChange = () => {
    setDisplayMode((prev) => (prev === 'total' ? 'perMatch' : 'total'));
  };

  /** piccolo blocco riutilizzabile per fallback vuoto */
  const EmptyState = ({ title }: { title: string }) => (
    <div className="rounded-md border border-dashed border-gray-600 p-6 text-center text-sm text-gray-300">
      Nessun dato disponibile per <span className="font-semibold">{title}</span> con i filtri attuali.
    </div>
  );

  return (
    <Card className="p-6 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Statistiche Giocatori</h2>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex mb-6 bg-darkblu-600 rounded-md">
          {STAT_CATEGORIES.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className={`flex-1 py-2 px-4 text-center rounded-md text-sm font-medium ${
                activeCategory === category.id
                  ? 'bg-gray-700 text-white'
                  : 'hover:bg-gray-600 text-white-400'
              }`}
            >
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STAT_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-6">
            {/* Bottoni di selezione delle statistiche */}
            <div className="flex flex-wrap gap-4 mb-4">
              {category.stats.map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => handleStatToggle(category.id, stat.key)}
                  className={`py-2 px-4 flex items-center gap-2 rounded-md text-sm font-medium ${
                    selectedStats[category.id]?.includes(stat.key)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-white-300 hover:bg-gray-600'
                  }`}
                >
                  {stat.icon}
                  {stat.label}
                </button>
              ))}
            </div>

            {/* Tabelle / fallback per le statistiche selezionate */}
            <div className="space-y-4">
              {selectedStats[category.id]?.map((statKey) => {
                const foundStat = category.stats.find((s) => s.key === statKey);
                const statLabel = foundStat ? foundStat.label : statKey;

                const homeData = homeTeam ? homeTopStats[statKey] ?? [] : [];
                const awayData = awayTeam ? awayTopStats[statKey] ?? [] : [];

                const homeHasData = homeData.length > 0;
                const awayHasData = awayData.length > 0;

                const nothingToShow =
                  (homeTeam && !homeHasData) && (!awayTeam || !awayHasData) ||
                  (awayTeam && !awayHasData) && (!homeTeam || !homeHasData);

                return (
                  <div key={statKey}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-green-400">
                        {foundStat?.icon}
                        {statLabel}
                      </h2>
                      <div className="flex items-center">
                        <span className="text-sm mr-2">TOT</span>
                        <Switch
                          checked={displayMode === 'perMatch'}
                          onCheckedChange={handleDisplayModeChange}
                        />
                        <span className="text-sm ml-2">x90</span>
                      </div>
                    </div>

                    {/* Se non c'è nessun dato per questa statistica, mostra fallback */}
                    {(!homeTeam && !awayTeam) || nothingToShow ? (
                      <EmptyState title={statLabel} />
                    ) : (
                      <div className="grid gap-6 lg:grid-cols-2">
                        {homeTeam && (
                          <div>
                            <h4 className="text-md font-medium mb-2">{homeTeam}</h4>
                            {homeHasData ? (
                              <PlayerStatsTable
                                players={homeData}
                                statLabel={statLabel}
                                displayMode={displayMode}
                              />
                            ) : (
                              <EmptyState title={`${statLabel} — ${homeTeam}`} />
                            )}
                          </div>
                        )}

                        {awayTeam && (
                          <div>
                            <h4 className="text-md font-medium mb-2">{awayTeam}</h4>
                            {awayHasData ? (
                              <PlayerStatsTable
                                players={awayData}
                                statLabel={statLabel}
                                displayMode={displayMode}
                              />
                            ) : (
                              <EmptyState title={`${statLabel} — ${awayTeam}`} />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {(!selectedStats[category.id] || selectedStats[category.id].length === 0) && (
                <p>Nessuna statistica selezionata.</p>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
