'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getTeamStats } from '@/lib/services/team-service';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  FaFutbol,
  FaShieldAlt,
  FaChartLine,
  FaExclamationTriangle,
  FaRunning,
  FaFlag,
} from 'react-icons/fa';
import { GiWhistle, GiCardPlay } from 'react-icons/gi';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Button } from '@/components/ui/button';

interface TeamStatsProps {
  teamHome: string;
  teamAway: string;
  league: string;
}

export function TeamStats({ teamHome, teamAway, league }: TeamStatsProps) {
  const [statsHome, setStatsHome] = useState<any | null>(null);
  const [statsAway, setStatsAway] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Stato per gestire la selezione della visualizzazione
  const [viewMode, setViewMode] = useState<'total' | 'perMatch'>('total');
  const [comparisonMode, setComparisonMode] = useState<'teams' | 'league'>('teams');

  // Stato per gestire la fonte dei dati
  const [dataSource, setDataSource] = useState<'team' | 'opponent'>('team');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [teamStatsHome, teamStatsAway] = await Promise.all([
          getTeamStats(teamHome, league, dataSource),
          getTeamStats(teamAway, league, dataSource),
        ]);
        setStatsHome(teamStatsHome);
        setStatsAway(teamStatsAway);
      } catch (error) {
        console.error('Error loading team stats:', error);
        setStatsHome(null);
        setStatsAway(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [teamHome, teamAway, league, dataSource]);

  if (loading) {
    return <p className="text-muted-foreground">Caricamento statistiche...</p>;
  }

  if (!statsHome || !statsAway) {
    return (
      <p className="text-muted-foreground">
        Statistiche non disponibili per una o entrambe le squadre.
      </p>
    );
  }

  // Definizione dell'array dei dati delle statistiche
  const statsData = [
    {
      label: 'Reti Fatte',
      icon: <FaFutbol />,
      homeValue: statsHome.goalsFor,
      awayValue: statsAway.goalsFor,
      homePerMatch: statsHome.perMatchGoalsFor,
      awayPerMatch: statsAway.perMatchGoalsFor,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['Reti Fatte'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['Reti Fatte'],
      description: 'Totale delle reti segnate dalla squadra.',
      isPositiveStat: true,
    },
    {
      label: 'Reti Subite',
      icon: <FaShieldAlt />,
      homeValue: statsHome.goalsAgainst,
      awayValue: statsAway.goalsAgainst,
      homePerMatch: statsHome.perMatchGoalsAgainst,
      awayPerMatch: statsAway.perMatchGoalsAgainst,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['Reti Subite'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['Reti Subite'],
      description: 'Totale delle reti subite dalla squadra.',
      isPositiveStat: false,
    },
    {
      label: 'xG',
      icon: <FaChartLine />,
      homeValue: statsHome.xG,
      awayValue: statsAway.xG,
      homePerMatch: statsHome.perMatchXG,
      awayPerMatch: statsAway.perMatchXG,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['xG'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['xG'],
      description: 'Gol attesi in base alla qualità dei tiri.',
      isPositiveStat: true,
    },
    {
      label: 'xAG',
      icon: <FaExclamationTriangle />,
      homeValue: statsHome.xAG,
      awayValue: statsAway.xAG,
      homePerMatch: statsHome.perMatchXAG,
      awayPerMatch: statsAway.perMatchXAG,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['xAG'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['xAG'],
      description: 'Gol attesi contro in base ai tiri subiti.',
      isPositiveStat: false,
    },
    {
      label: 'Falli Comessi',
      icon: <GiWhistle />,
      homeValue: statsHome.foulsCommitted,
      awayValue: statsAway.foulsCommitted,
      homePerMatch: statsHome.perMatchFoulsCommitted,
      awayPerMatch: statsAway.perMatchFoulsCommitted,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['Falli Comessi'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['Falli Comessi'],
      description: 'Totale dei falli commessi dalla squadra.',
      isPositiveStat: false,
    },
    {
      label: 'Ammonizioni',
      icon: <GiCardPlay />,
      homeValue: statsHome.yellowCards,
      awayValue: statsAway.yellowCards,
      homePerMatch: statsHome.perMatchYellowCards,
      awayPerMatch: statsAway.perMatchYellowCards,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['Ammonizioni'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['Ammonizioni'],
      description: 'Totale delle ammonizioni ricevute dalla squadra.',
      isPositiveStat: false,
    },
    {
      label: 'Falli Subiti',
      icon: <FaRunning />,
      homeValue: statsHome.foulsSuffered,
      awayValue: statsAway.foulsSuffered,
      homePerMatch: statsHome.perMatchFoulsSuffered,
      awayPerMatch: statsAway.perMatchFoulsSuffered,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['Falli Subiti'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['Falli Subiti'],
      description: 'Totale dei falli subiti dalla squadra.',
      isPositiveStat: true,
    },
    {
      label: 'Fuorigioco',
      icon: <FaFlag />,
      homeValue: statsHome.offside,
      awayValue: statsAway.offside,
      homePerMatch: statsHome.perMatchOffside,
      awayPerMatch: statsAway.perMatchOffside,
      homeLeagueAverage: statsHome.leagueAverage[viewMode]['Fuorigioco'],
      awayLeagueAverage: statsAway.leagueAverage[viewMode]['Fuorigioco'],
      description: 'Totale dei fuorigioco della squadra.',
      isPositiveStat: false,
    },
  ];

  const renderStatCard = ({
    label,
    icon,
    homeValue,
    awayValue,
    homePerMatch,
    awayPerMatch,
    homeLeagueAverage,
    awayLeagueAverage,
    description,
    isPositiveStat,
  }: any) => {
    let homeDisplayValue = viewMode === 'total' ? homeValue : homePerMatch;
    let awayDisplayValue = viewMode === 'total' ? awayValue : awayPerMatch;

    if (comparisonMode === 'league') {
      // Confronto con la media della lega
      const renderComparisonCard = (teamName: string, teamValue: number, leagueAvg: number) => {
        const isBetter = isPositiveStat
          ? teamValue >= leagueAvg
          : teamValue <= leagueAvg;

        const total = teamValue + leagueAvg;
        const teamPercentage = total ? (teamValue / total) * 100 : 50;
        const leaguePercentage = total ? (leagueAvg / total) * 100 : 50;

        return (
          <Card
            key={`${label}-${teamName}`}
            className="p-4 bg-gradient-to-br from-card to-card/50 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="text-primary">{icon}</div>
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div className="text-muted-foreground cursor-pointer">ℹ️</div>
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" align="center" className="tooltip-content">
                    {description}
                    <Tooltip.Arrow className="tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
            <div className="flex items-center justify-between">
              {/* Team Stat */}
              <div className="text-center">
                <p
                  className={`text-lg font-bold ${
                    isBetter ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {teamValue.toFixed(2)}
                </p>
                <p className="text-xs">{teamName}</p>
              </div>

              {/* Vertical Separator */}
              <div className="w-px h-12 bg-muted-foreground"></div>

              {/* League Average */}
              <div className="text-center">
                <p
                  className={`text-lg font-bold ${
                    !isBetter ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {leagueAvg.toFixed(2)}
                </p>
                <p className="text-xs">Media</p>
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="relative mt-4 h-4 bg-muted/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(teamPercentage / (teamPercentage + leaguePercentage)) * 100}%` }}
                transition={{ duration: 1 }}
                className="absolute left-0 top-0 h-full bg-primary"
              ></motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(leaguePercentage / (teamPercentage + leaguePercentage)) * 100}%`,
                }}
                transition={{ duration: 1 }}
                className="absolute right-0 top-0 h-full bg-secondary"
              ></motion.div>
            </div>
          </Card>
        );
      };

      return (
        <>
          {renderComparisonCard(teamHome, homeDisplayValue, homeLeagueAverage)}
          {renderComparisonCard(teamAway, awayDisplayValue, awayLeagueAverage)}
        </>
      );
    } else {
      // Confronto tra squadre
      const isHomeBetter = isPositiveStat
        ? homeDisplayValue >= awayDisplayValue
        : homeDisplayValue <= awayDisplayValue;

      const total = homeDisplayValue + awayDisplayValue;
      const homePercentage = total ? (homeDisplayValue / total) * 100 : 50;
      const awayPercentage = total ? (awayDisplayValue / total) * 100 : 50;

      return (
        <Card
          key={label}
          className="p-4 bg-gradient-to-br from-card to-card/50 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-primary">{icon}</div>
              <span className="text-sm font-semibold">{label}</span>
            </div>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="text-muted-foreground cursor-pointer">ℹ️</div>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="center" className="tooltip-content">
                  {description}
                  <Tooltip.Arrow className="tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
          <div className="flex items-center justify-between">
            {/* Home Team Stat */}
            <div className="text-center">
              <p
                className={`text-lg font-bold ${
                  isHomeBetter ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {homeDisplayValue.toFixed(2)}
              </p>
              <p className="text-xs">{teamHome}</p>
            </div>

            {/* Vertical Separator */}
            <div className="w-px h-12 bg-muted-foreground"></div>

            {/* Away Team Stat */}
            <div className="text-center">
              <p
                className={`text-lg font-bold ${
                  !isHomeBetter ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {awayDisplayValue.toFixed(2)}
              </p>
              <p className="text-xs">{teamAway}</p>
            </div>
          </div>

          {/* Horizontal Bar Chart */}
          <div className="relative mt-4 h-4 bg-muted/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${homePercentage}%` }}
              transition={{ duration: 1 }}
              className="absolute left-0 top-0 h-full bg-primary"
            ></motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${awayPercentage}%` }}
              transition={{ duration: 1 }}
              className="absolute right-0 top-0 h-full bg-secondary"
            ></motion.div>
          </div>
        </Card>
      );
    }
  };

  return (
    <Tooltip.Provider>
      <div className="space-y-4">
        {/* Pulsanti per la selezione della visualizzazione e della fonte dei dati */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pulsanti View Mode */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'total' ? 'default' : 'outline'}
              onClick={() => setViewMode('total')}
            >
              Totale
            </Button>
            <Button
              variant={viewMode === 'perMatch' ? 'default' : 'outline'}
              onClick={() => setViewMode('perMatch')}
            >
              xMatch
            </Button>
          </div>

          {/* Divider */}
          <div className="border-l border-gray-300 h-6 mx-2"></div>

          {/* Pulsanti Comparison Mode */}
          <div className="flex items-center gap-2">
            <Button
              variant={comparisonMode === 'teams' ? 'default' : 'outline'}
              onClick={() => setComparisonMode('teams')}
            >
              Confronto
            </Button>
            <Button
              variant={comparisonMode === 'league' ? 'default' : 'outline'}
              onClick={() => setComparisonMode('league')}
            >
              AVGSimilar
            </Button>
          </div>

          {/* Divider */}
          <div className="border-l border-gray-300 h-6 mx-2"></div>

          {/* Pulsanti Data Source */}
          <div className="flex items-center gap-2">
            <Button
              variant={dataSource === 'team' ? 'default' : 'outline'}
              onClick={() => setDataSource('team')}
            >
              Squadra
            </Button>
            <Button
              variant={dataSource === 'opponent' ? 'default' : 'outline'}
              onClick={() => setDataSource('opponent')}
            >
              Avversari
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {statsData.map(renderStatCard)}
        </motion.div>
      </div>
    </Tooltip.Provider>
  );
}
