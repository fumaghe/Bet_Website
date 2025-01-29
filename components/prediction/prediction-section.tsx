'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getLeagueStandings } from '@/lib/services/data-service';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Definizione dell'interfaccia Team
interface Team {
  id: string;
  name: string;
  logo: string;
  rating: number;
  league: string;
}

// Definizione delle props per PredictionSection
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
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState<number>(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamIndex, setHomeTeamIndex] = useState<number>(0);
  const [awayTeamIndex, setAwayTeamIndex] = useState<number>(0);

  const leagues = [
    { name: 'Serie A', country: 'Italia', icon: '/Bet_Website/images/leagues/serie_a.png' },
    { name: 'Premier League', country: 'Inghilterra', icon: '/Bet_Website/images/leagues/premier_league.png' },
    { name: 'La Liga', country: 'Spagna', icon: '/Bet_Website/images/leagues/la_liga.png' },
    { name: 'Bundesliga', country: 'Germania', icon: '/Bet_Website/images/leagues/bundesliga.png' },
    { name: 'Ligue 1', country: 'Francia', icon: '/Bet_Website/images/leagues/ligue_1.png' },
    { name: 'Champions League', country: 'Europa', icon: '/Bet_Website/images/leagues/champions_league.png' },
  ];

  // Stato per cache delle squadre per ogni lega
  const [leagueTeamsCache, setLeagueTeamsCache] = useState<{ [key: string]: Team[] }>({});

  // Aggiorna il currentLeagueIndex in base alla lega selezionata
  useEffect(() => {
    if (selectedLeague) {
      const leagueIndex = leagues.findIndex((l) => l.name === selectedLeague);
      if (leagueIndex !== -1) {
        setCurrentLeagueIndex(leagueIndex);
      }
    }
  }, [selectedLeague]);

  // Carica le squadre per la lega selezionata
  useEffect(() => {
    const loadTeams = async () => {
      const leagueToLoad = selectedLeague || leagues[0].name;

      if (!leagueTeamsCache[leagueToLoad]) {
        const standings = await getLeagueStandings(leagueToLoad);
        const teamsWithLogos: Team[] = standings.map((team: any) => ({
          id: team.team.toLowerCase().replace(/\s+/g, '_'),
          name: team.team,
          logo: `/Bet_Website/images/teams/${team.team.toLowerCase().replace(/\s+/g, '_')}.png`,
          rating: Math.min(5, team.points / 10),
          league: leagueToLoad,
        }));
        setLeagueTeamsCache((prev) => ({ ...prev, [leagueToLoad]: teamsWithLogos }));
        setTeams(teamsWithLogos);
      } else {
        setTeams(leagueTeamsCache[leagueToLoad]);
      }

      if (!selectedLeague) {
        onLeagueChange(leagueToLoad);
      }
    };

    loadTeams();
  }, [selectedLeague, leagueTeamsCache, onLeagueChange]);

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
    const newIndex = (currentLeagueIndex - 1 + leagues.length) % leagues.length;
    const newLeague = leagues[newIndex].name;
    setCurrentLeagueIndex(newIndex);
    onLeagueChange(newLeague);
  };

  const handleNextLeague = () => {
    const newIndex = (currentLeagueIndex + 1) % leagues.length;
    const newLeague = leagues[newIndex].name;
    setCurrentLeagueIndex(newIndex);
    onLeagueChange(newLeague);
  };

  // Nota: qui rimuoviamo il forzare il cambio lega quando si seleziona una squadra
  // per evitare conflitti in alcuni scenari.
  const handleTeamSelected = (team: Team, teamType: 'home' | 'away') => {
    if (teamType === 'home') {
      onHomeTeamSelect(team.name);
    } else {
      onAwayTeamSelect(team.name);
    }
  };

  return (
    <Card className="max-w-[900px] mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6">
        {teams.length > 0 ? (
          <TeamSelector
            teams={teams}
            currentIndex={homeTeamIndex}
            onIndexChange={setHomeTeamIndex}
            onSelect={(team) => handleTeamSelected(team, 'home')}
            selectedTeam={selectedHomeTeam}
            label="Squadra Casa"
            leagueTeamsCache={leagueTeamsCache}
            setLeagueTeamsCache={setLeagueTeamsCache}
            leagues={leagues}
            teamType="home"
          />
        ) : (
          <div className="flex justify-center items-center">Caricamento squadre...</div>
        )}

        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handlePreviousLeague}>
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <AnimatePresence mode="wait">
              {leagues[currentLeagueIndex] && (
                <motion.div
                  key={leagues[currentLeagueIndex].name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-20 h-20">
                    <Image
                      src={leagues[currentLeagueIndex].icon}
                      alt={leagues[currentLeagueIndex].name}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <h3 className="text-sm font-bold mt-2">{leagues[currentLeagueIndex].name}</h3>
                  <p className="text-xs text-muted-foreground">{leagues[currentLeagueIndex].country}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button variant="ghost" size="icon" onClick={handleNextLeague}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {teams.length > 0 ? (
          <TeamSelector
            teams={teams}
            currentIndex={awayTeamIndex}
            onIndexChange={setAwayTeamIndex}
            onSelect={(team) => handleTeamSelected(team, 'away')}
            selectedTeam={selectedAwayTeam}
            label="Squadra Trasferta"
            leagueTeamsCache={leagueTeamsCache}
            setLeagueTeamsCache={setLeagueTeamsCache}
            leagues={leagues}
            teamType="away"
          />
        ) : (
          <div className="flex justify-center items-center">Caricamento squadre...</div>
        )}
      </div>
    </Card>
  );
}

interface TeamSelectorProps {
  teams: Team[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSelect: (team: Team) => void;
  selectedTeam?: string;
  label: string;
  leagueTeamsCache: { [key: string]: Team[] };
  setLeagueTeamsCache: React.Dispatch<React.SetStateAction<{ [key: string]: Team[] }>>;
  leagues: { name: string; country: string; icon: string }[];
  teamType: 'home' | 'away';
}

function TeamSelector({
  teams,
  currentIndex,
  onIndexChange,
  onSelect,
  selectedTeam,
  label,
  leagueTeamsCache,
  setLeagueTeamsCache,
  leagues,
  teamType,
}: TeamSelectorProps) {
  const currentTeam = teams[currentIndex];

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handlePrevious = () => {
    if (teams.length === 0) return;
    const newIndex = (currentIndex - 1 + teams.length) % teams.length;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    if (teams.length === 0) return;
    const newIndex = (currentIndex + 1) % teams.length;
    onIndexChange(newIndex);
  };

  const searchTeams = async (searchQuery: string) => {
    if (!searchQuery) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const lowerQuery = searchQuery.toLowerCase();
    let foundTeams: Team[] = [];

    for (const league of leagues) {
      if (!leagueTeamsCache[league.name]) {
        const standings = await getLeagueStandings(league.name);
        const teamsWithLogos: Team[] = standings.map((team: any) => ({
          id: team.team.toLowerCase().replace(/\s+/g, '_'),
          name: team.team,
          logo: `/Bet_Website/images/teams/${team.team.toLowerCase().replace(/\s+/g, '_')}.png`,
          rating: Math.min(5, team.points / 10),
          league: league.name,
        }));
        setLeagueTeamsCache((prev) => ({ ...prev, [league.name]: teamsWithLogos }));
      }

      const teamsInLeague = leagueTeamsCache[league.name] || [];
      const matched = teamsInLeague.filter((team) =>
        team.name.toLowerCase().includes(lowerQuery)
      );
      foundTeams = [...foundTeams, ...matched];
    }

    setResults(foundTeams);
    setIsLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchTeams(query);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleTeamClick = (team: Team) => {
    onSelect(team);
    setIsDropdownOpen(false);
  };

  if (!currentTeam) return null;

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
                width={55}
                height={55}
                className="object-contain"
              />
            </div>
            <div className="text-center mt-2 relative" ref={dropdownRef}>
              <button
                className="text-sm font-bold mb-1 hover:underline focus:outline-none w-full text-center"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {currentTeam.name}
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 0.9 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="
                      absolute left-1/2 -translate-x-1/2
                      mt-2 min-w-[195px]
                      rounded-md shadow-lg z-50
                      bg-card/50 text-white
                      border-0
                    "
                  >
                    <div className="p-2">
                      <Input
                        placeholder="Cerca una squadra..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="mb-2"
                      />
                      {isLoading && <p className="text-center text-sm">Caricamento...</p>}
                      {!isLoading && results.length === 0 && query && (
                        <p className="text-center text-sm text-muted-foreground">Nessuna squadra trovata.</p>
                      )}
                      <ScrollArea className="h-48">
                        <ul className="space-y-2">
                          {results.map((team) => (
                            <li key={team.id}>
                              <button
                                className="flex items-center w-full p-2 hover:bg-white/10 rounded"
                                onClick={() => handleTeamClick(team)}
                              >
                                <Image
                                  src={team.logo}
                                  alt={team.name}
                                  width={30}
                                  height={30}
                                  className="object-contain mr-3"
                                />
                                <div className="flex-1 text-left">
                                  <p className="font-medium">{team.name}</p>
                                  <p className="text-xs text-muted-foreground">{team.league}</p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-center mb-2">{renderStars(currentTeam.rating)}</div>
            </div>

            <Button
              className={cn(
                'w-full text-xs mt-2 transition-all',
                selectedTeam === currentTeam.name
                  ? 'bg-primary/20 hover:bg-primary/30 text-primary'
                  : 'bg-primary hover:bg-primary/90'
              )}
              onClick={() => onSelect(currentTeam)}
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
