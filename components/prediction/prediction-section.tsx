'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getLeagueStandings } from '@/lib/services/data-service';

interface PredictionSectionProps {
  onHomeTeamSelect: (team: string) => void;
  onAwayTeamSelect: (team: string) => void;
  selectedHomeTeam?: string;
  selectedAwayTeam?: string;
  selectedLeague?: string;
  onLeagueChange: (league: string) => void;
}

export function PredictionSection({
  onHomeTeamSelect,
  onAwayTeamSelect,
  selectedHomeTeam,
  selectedAwayTeam,
  selectedLeague,
  onLeagueChange,
}: PredictionSectionProps) {
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0);
  const [teams, setTeams] = useState<any[]>([]); // Squadre per la lega corrente
  const [homeTeamIndex, setHomeTeamIndex] = useState(0);
  const [awayTeamIndex, setAwayTeamIndex] = useState(0);

  const LEAGUES = [
    { name: 'Serie A', country: 'Italia', icon: '/Bet_Website/images/leagues/serie_a.png' },
    { name: 'Premier League', country: 'Inghilterra', icon: '/Bet_Website/images/leagues/premier_league.png' },
    { name: 'La Liga', country: 'Spagna', icon: '/Bet_Website/images/leagues/la_liga.png' },
    { name: 'Bundesliga', country: 'Germania', icon: '/Bet_Website/images/leagues/bundesliga.png' },
    { name: 'Ligue 1', country: 'Francia', icon: '/Bet_Website/images/leagues/ligue_1.png' },
    { name: 'Champions League', country: 'Europa', icon: '/Bet_Website/images/leagues/champions_league.png' },
  ];

  // Aggiorna il currentLeagueIndex in base alla lega selezionata
  useEffect(() => {
    if (selectedLeague) {
      const leagueIndex = LEAGUES.findIndex((l) => l.name === selectedLeague);
      if (leagueIndex !== -1) {
        setCurrentLeagueIndex(leagueIndex);
      }
    }
  }, [selectedLeague]);

  // Carica le squadre per la lega selezionata
  useEffect(() => {
    const loadTeams = async () => {
      const leagueToLoad = selectedLeague || LEAGUES[0].name; // Usa la lega di default se selectedLeague è undefined
      const standings = await getLeagueStandings(leagueToLoad);
      const teamsWithLogos = standings.map((team: any) => ({
        id: team.team.toLowerCase().replace(/\s+/g, '_'),
        name: team.team,
        logo: `/Bet_Website/images/teams/${team.team.toLowerCase().replace(/\s+/g, '_')}.png`,
        rating: Math.min(5, team.points / 10), // Esempio di calcolo del rating
      }));
      setTeams(teamsWithLogos);
      if (!selectedLeague) {
        onLeagueChange(leagueToLoad); // Aggiorna la lega corrente se non è selezionata
      }
    };
  
    loadTeams();
  }, [selectedLeague]); // Esegui quando selectedLeague cambia o all'inizio
  

  // Aggiorna homeTeamIndex in base alla squadra selezionata
  useEffect(() => {
    if (selectedHomeTeam) {
      const index = teams.findIndex((team) => team.name === selectedHomeTeam);
      if (index !== -1) {
        setHomeTeamIndex(index);
      }
    }
  }, [selectedHomeTeam, teams]);

  // Aggiorna awayTeamIndex in base alla squadra selezionata
  useEffect(() => {
    if (selectedAwayTeam) {
      const index = teams.findIndex((team) => team.name === selectedAwayTeam);
      if (index !== -1) {
        setAwayTeamIndex(index);
      }
    }
  }, [selectedAwayTeam, teams]);

  const handlePreviousLeague = () => {
    const newIndex = (currentLeagueIndex - 1 + LEAGUES.length) % LEAGUES.length;
    const newLeague = LEAGUES[newIndex].name;
    setCurrentLeagueIndex(newIndex);
    onLeagueChange(newLeague);
  };

  const handleNextLeague = () => {
    const newIndex = (currentLeagueIndex + 1) % LEAGUES.length;
    const newLeague = LEAGUES[newIndex].name;
    setCurrentLeagueIndex(newIndex);
    onLeagueChange(newLeague);
  };

  const handleHomeTeamSelect = () => {
    const teamName = teams[homeTeamIndex]?.name;
    if (teamName) {
      onHomeTeamSelect(teamName);
    }
  };

  const handleAwayTeamSelect = () => {
    const teamName = teams[awayTeamIndex]?.name;
    if (teamName) {
      onAwayTeamSelect(teamName);
    }
  };

  return (
    <Card className="max-w-[900px] mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6">
        <TeamSelector
          teams={teams}
          currentIndex={homeTeamIndex}
          onIndexChange={setHomeTeamIndex}
          onSelect={handleHomeTeamSelect}
          selectedTeam={selectedHomeTeam}
          label="Squadra Casa"
        />

        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handlePreviousLeague}>
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <AnimatePresence mode="wait">
              <motion.div
                key={LEAGUES[currentLeagueIndex].name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-20 h-20">
                  <Image
                    src={LEAGUES[currentLeagueIndex].icon}
                    alt={LEAGUES[currentLeagueIndex].name}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="text-sm font-bold mt-2">{LEAGUES[currentLeagueIndex].name}</h3>
                <p className="text-xs text-muted-foreground">{LEAGUES[currentLeagueIndex].country}</p>
              </motion.div>
            </AnimatePresence>

            <Button variant="ghost" size="icon" onClick={handleNextLeague}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <TeamSelector
          teams={teams}
          currentIndex={awayTeamIndex}
          onIndexChange={setAwayTeamIndex}
          onSelect={handleAwayTeamSelect}
          selectedTeam={selectedAwayTeam}
          label="Squadra Trasferta"
        />
      </div>
    </Card>
  );
}

interface Team {
  id: string;
  name: string;
  logo: string;
  rating: number;
}

interface TeamSelectorProps {
  teams: Team[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSelect: () => void;
  selectedTeam?: string;
  label: string;
}

function TeamSelector({
  teams,
  currentIndex,
  onIndexChange,
  onSelect,
  selectedTeam,
  label,
}: TeamSelectorProps) {
  const currentTeam = teams[currentIndex];

  if (!currentTeam) return null;

  const handlePrevious = () => {
    const newIndex = (currentIndex - 1 + teams.length) % teams.length;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % teams.length;
    onIndexChange(newIndex);
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={cn(
          'text-lg',
          i < Math.floor(rating) ? 'text-primary' : 'text-muted-foreground/30'
        )}
      >
        ★
      </span>
    ));

  return (
    <div className="relative">
      <h4 className="text-xs font-medium text-muted-foreground mb-3">{label}</h4>

      <div className="relative bg-card rounded-md p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2"
          onClick={handlePrevious}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentTeam.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center"
          >
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center transition-all',
                selectedTeam === currentTeam.name && 'ring-2 ring-primary'
              )}
            >
              <Image
                src={currentTeam.logo}
                alt={currentTeam.name}
                width={55} // Ridotto il padding interno
                height={55} // Ridotto il padding interno
                className="object-contain" // Rimosso il padding extra
              />
            </div>
            <div className="text-center mt-2">
              <h4 className="text-sm font-bold mb-1">{currentTeam.name}</h4>
              <div className="flex justify-center mb-2">{renderStars(currentTeam.rating)}</div>
            </div>

            <Button
              className={cn(
                'w-full text-xs mt-2 transition-all',
                selectedTeam === currentTeam.name
                  ? 'bg-primary/20 hover:bg-primary/30 text-primary'
                  : 'bg-primary hover:bg-primary/90'
              )}
              onClick={onSelect}
            >
              {selectedTeam === currentTeam.name ? 'Selezionato' : 'Seleziona Squadra'}
            </Button>
          </motion.div>
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
