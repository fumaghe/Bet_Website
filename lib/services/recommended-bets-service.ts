// lib/services/recommended-bets-service.ts

import Papa from 'papaparse';

/** STANDINGS (serie_a.csv, etc.) */
export interface StandingsRow {
  ["Pos"]: string;
  ["Squadra"]: string;
  ["PG"]: string;
  ["V"]: string;
  ["N"]: string;
  ["P"]: string;
  ["Rf"]: string;  
  ["Rs"]: string;  
  ["DR"]: string;
  ["Pt"]: string;
  ["xG"]: string;  
  ["xGA"]: string;
  ["Lega"]: string;
}

/** TEAM PERFORMANCE (team_performance.csv) */
export interface TeamPerformanceRow {
  ["Pos."]: string;
  ["Squadra"]: string;
  ["Competizione"]: string;
  ["N. di giocatori"]: string;
  ["Età"]: string;
  ["Poss."]: string;
  ["PG"]: string;
  ["Tit"]: string;
  ["Min"]: string;
  ["90 min"]: string;
  ["Reti"]: string; 
  ["Assist"]: string;
  ["G+A"]: string;
  ["R - Rig"]: string;
  ["Rigori"]: string;
  ["Rig T"]: string;
  ["Amm."]: string;
  ["Esp."]: string;
  ["xG"]: string; 
  ["npxG"]: string;
  ["xAG"]: string;
  ["npxG+xAG"]: string;
  ["PrgC"]: string;
  ["PrgP"]: string;
  ["Falli commessi"]: string;
  ["Falli subiti"]: string;
  ["Fuorigioco"]: string;
}

/** OPPONENT PERFORMANCE (opponent_performance.csv) */
export type OpponentPerformanceRow = TeamPerformanceRow;

/** PLAYERS (league_players.csv) */
export interface PlayerRow {
  ["Pos."]: string;
  ["Giocatore"]: string;
  ["Nazione"]: string;
  ["Ruolo"]: string;
  ["Squadra"]: string;
  ["Competizione"]: string;
  ["Età"]: string;
  ["Nato"]: string;
  ["PG"]: string;
  ["Tit"]: string;
  ["Min"]: string;
  ["90 min"]: string;
  ["Reti"]: string;
  ["Assist"]: string;
  ["G+A"]: string;
  ["R - Rig"]: string;
  ["Rigori"]: string;
  ["Rig T"]: string;
  ["Amm."]: string;
  ["Esp."]: string;
  ["xG"]: string;
  ["npxG"]: string;
  ["xAG"]: string;
  ["npxG+xAG"]: string;
  ["PrgC"]: string;
  ["PrgP"]: string;
  ["Tiri totali"]: string;
  ["Tiri in porta"]: string;
  ["Falli commessi"]: string;
  ["Falli subiti"]: string;
  ["Fuorigioco"]: string;
}

/** ALL LEAGUES MATCHES (all_leagues_matches.csv) */
export interface MatchRow {
  ["Squadra Casa"]: string;
  ["Squadra Trasferta"]: string;
  ["Orario"]: string;
  ["Giorno"]: string;
  ["Campionato"]: string;
  ["xG Casa"]: string;
  ["Gol Casa"]: string;
  ["Gol Trasferta"]: string;
  ["xG Trasferta"]: string;
  ["Sett."]?: string;
}

export interface BetRecommendation {
  label: string;
  probability: number;  // 0..100
}

/** INTERFACCIA PER PUNTEGGI ESATTI */
export interface ScorelinePrediction {
  homeGoals: number;
  awayGoals: number;
  probability: number; // 0..100
}

// ----------------------------------------------------------------------------
//   GLOBAL DATA
// ----------------------------------------------------------------------------
let standingsData: StandingsRow[] = [];
let teamPerformanceData: TeamPerformanceRow[] = [];
let opponentPerformanceData: OpponentPerformanceRow[] = [];
let playersData: PlayerRow[] = [];
let matchesData: MatchRow[] = [];
let uniquePlayersData: PlayerRow[] = [];

let dataLoaded = false;

// ----------------------------------------------------------------------------
//   LOAD ALL CSV
// ----------------------------------------------------------------------------
export async function loadAllBetsData() {
  if (dataLoaded) return;
  dataLoaded = true;

  // Load standings from multiple league files
  const possibleStandingsFiles = [
    '/Bet_Website/data/standings/serie_a.csv',
    '/Bet_Website/data/standings/ligue_1.csv',
    '/Bet_Website/data/standings/premier_league.csv',
    '/Bet_Website/data/standings/bundesliga.csv',
    '/Bet_Website/data/standings/laliga.csv',
  ];
  for (const file of possibleStandingsFiles) {
    try {
      const resp = await fetch(file);
      if (!resp.ok) continue;
      const text = await resp.text();
      const parsed = Papa.parse<StandingsRow>(text, { header: true, skipEmptyLines: true });
      standingsData = standingsData.concat(parsed.data);
    } catch {}
  }

  // team_performance
  {
    const resp = await fetch('/Bet_Website/data/team_performance.csv');
    const text = await resp.text();
    const parsed = Papa.parse<TeamPerformanceRow>(text, { header: true, skipEmptyLines: true });
    teamPerformanceData = parsed.data;
  }
  // opponent_performance
  {
    const resp = await fetch('/Bet_Website/data/opponent_performance.csv');
    const text = await resp.text();
    const parsed = Papa.parse<OpponentPerformanceRow>(text, { header: true, skipEmptyLines: true });
    opponentPerformanceData = parsed.data;
  }
  // players
  {
    const resp = await fetch('/Bet_Website/data/players/league_players.csv');
    const text = await resp.text();
    const parsed = Papa.parse<PlayerRow>(text, { header: true, skipEmptyLines: true });
    playersData = parsed.data;
  }
  // all_leagues_matches
  {
    const resp = await fetch('/Bet_Website/data/all_leagues_matches.csv');
    const text = await resp.text();
    const parsed = Papa.parse<MatchRow>(text, { header: true, skipEmptyLines: true });
    matchesData = parsed.data;
  }

  // Process uniquePlayersData: exclude players with multiple entries and PG >=5
  const playerCounts = new Map<string, number>();
  for (const player of playersData) {
    const name = normalizeName(player["Giocatore"]);
    playerCounts.set(name, (playerCounts.get(name) || 0) + 1);
  }
  uniquePlayersData = playersData.filter(p => 
    playerCounts.get(normalizeName(p["Giocatore"])) === 1 && 
    num(p["PG"]) >= 5
  );
}

// ----------------------------------------------------------------------------
//   UTILITY FUNCTIONS
// ----------------------------------------------------------------------------
function normalizeName(n: string): string {
  return n.trim().toLowerCase();
}

export function num(v: string | undefined): number {
  if (!v) return 0;
  const parsed = parseFloat(v.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

/** Factorial for Poisson PMF. */
function factorial(n: number): number {
  if (n < 2) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) {
    r *= i;
  }
  return r;
}

/** Poisson PMF: P(X=k) = e^-lambda * lambda^k / k! */
function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

/** Probability that X >= floor(line)+1 in a Poisson distribution. */
export function poissonOver(lambda: number, line: number): number {
  // es: line=3.5 => floor(3.5)=3 => P(X>=4).
  const cut = Math.floor(line);
  let sumP = 0;
  for (let k = 0; k <= cut; k++) {
    sumP += poissonPMF(k, lambda);
  }
  return 1 - sumP;
}

/** Probability that X <= floor(line) in a Poisson distribution. */
export function poissonUnder(lambda: number, line: number): number {
  // es: line=3.5 => floor(3.5)=3 => P(X<=3).
  const cut = Math.floor(line);
  let sumP = 0;
  for (let k = 0; k <= cut; k++) {
    sumP += poissonPMF(k, lambda);
  }
  return sumP;
}

/** Sums P(X=k) in a Poisson distribution from m to n (clamped to 0..15). */
export function poissonRange(lambda: number, m: number, n: number): number {
  let sum = 0;
  const low = Math.max(0, m);
  const high = Math.min(n, 15);
  for (let k = low; k <= high; k++) {
    sum += poissonPMF(k, lambda);
  }
  return sum;
}

/** Convert a 0..1 probability to a 0..100 range, clamped to [0..99.9]. */
export function clampProb(p: number): number {
  let x = p * 100;
  if (x < 0) x = 0;
  if (x > 99.9) x = 99.9;
  return x;
}

// ----------------------------------------------------------------------------
//   DATA LOOKUPS
// ----------------------------------------------------------------------------
function getStandings(team: string, league: string): StandingsRow | null {
  return standingsData.find((sd) =>
    normalizeName(sd["Squadra"]) === normalizeName(team) &&
    normalizeName(sd["Lega"]) === normalizeName(league)
  ) || null;
}

function getTeamPerformance(team: string, league: string): TeamPerformanceRow | null {
  return teamPerformanceData.find((r) =>
    normalizeName(r["Squadra"]) === normalizeName(team) &&
    normalizeName(r["Competizione"]) === normalizeName(league)
  ) || null;
}

function getOpponentPerformance(team: string, league: string): OpponentPerformanceRow | null {
  return opponentPerformanceData.find((r) =>
    normalizeName(r["Squadra"]) === normalizeName(team) &&
    normalizeName(r["Competizione"]) === normalizeName(league)
  ) || null;
}

function filterDirectMatches(homeTeam: string, awayTeam: string): MatchRow[] {
  return matchesData.filter((m) => {
    const h = normalizeName(m["Squadra Casa"]);
    const a = normalizeName(m["Squadra Trasferta"]);
    return (
      (h === normalizeName(homeTeam) && a === normalizeName(awayTeam)) ||
      (h === normalizeName(awayTeam) && a === normalizeName(homeTeam))
    );
  });
}

/**
 * Restituisce le ultime N partite in casa per una squadra.
 */
function getLastNHomeMatches(team: string, league: string, N = 20): MatchRow[] {
  let homeMatches = matchesData.filter((m) =>
    normalizeName(m["Squadra Casa"]) === normalizeName(team) &&
    normalizeName(m["Campionato"]) === normalizeName(league)
  );

  homeMatches = homeMatches.sort((a, b) => (a["Giorno"] > b["Giorno"] ? 1 : -1));
  return homeMatches.slice(-N);
}

/**
 * Restituisce le ultime N partite in trasferta per una squadra.
 */
function getLastNAwayMatches(team: string, league: string, N = 20): MatchRow[] {
  let awayMatches = matchesData.filter((m) =>
    normalizeName(m["Squadra Trasferta"]) === normalizeName(team) &&
    normalizeName(m["Campionato"]) === normalizeName(league)
  );

  awayMatches = awayMatches.sort((a, b) => (a["Giorno"] > b["Giorno"] ? 1 : -1));
  return awayMatches.slice(-N);
}

function getLastNMatches(team: string, league: string, N = 20): MatchRow[] {
  let relevant = matchesData.filter((m) => {
    const isHome = normalizeName(m["Squadra Casa"]) === normalizeName(team);
    const isAway = normalizeName(m["Squadra Trasferta"]) === normalizeName(team);
    const camp = normalizeName(m["Campionato"]) === normalizeName(league);
    return camp && (isHome || isAway);
  });
  // sort
  relevant = relevant.sort((a, b) => (a["Giorno"] > b["Giorno"] ? 1 : -1));
  return relevant.slice(-N);
}

// ----------------------------------------------------------------------------
//   TEAM-LEVEL LOGIC
// ----------------------------------------------------------------------------

function computeOpponentRating(opponentTeam: string, league: string): number {
  // Compute the rating of the opponent team
  return computeTeamRating(opponentTeam, league);
}

function getTeamOffensiveStrength(team: string, league: string, isHome: boolean, opponentRating: number): number {
  const row = getTeamPerformance(team, league);
  if (!row) return 1;

  const pg = num(row["PG"]) || 1;
  const gf = num(row["Reti"]) / pg;
  const xg = num(row["xG"]) / pg;
  let off = (gf + xg) / 2;

  // Recupera le ultime 20 partite in casa o in trasferta
  const lastMatches = isHome
    ? getLastNHomeMatches(team, league, 20)
    : getLastNAwayMatches(team, league, 20);

  if (lastMatches.length > 0) {
    let sumGoals = 0;
    for (const m of lastMatches) {
      if (isHome) {
        sumGoals += num(m["Gol Casa"]);
      } else {
        sumGoals += num(m["Gol Trasferta"]);
      }
    }
    const recAvg = sumGoals / lastMatches.length;
    off = off * 0.7 + recAvg * 0.3;
  }

  // Adjust offensive strength based on opponent's rating
  // If opponent is strong (high rating), reduce offensive strength
  // If opponent is weak (low rating), increase offensive strength
  // Assuming rating is scaled around 50
  off *= 50 / opponentRating;

  if (off < 0.3) off = 0.3;
  return off;
}

function getTeamDefensiveStrength(team: string, league: string, isHome: boolean, opponentRating: number): number {
  const opp = getOpponentPerformance(team, league);
  if (!opp) return 1;

  const pg = num(opp["PG"]) || 1;
  const ga = num(opp["Reti"]) / pg;
  const xga = num(opp["xG"]) / pg;
  let defVal = (ga + xga) / 2;

  // Recupera le ultime 20 partite in casa o in trasferta
  const lastMatches = isHome
    ? getLastNHomeMatches(team, league, 20)
    : getLastNAwayMatches(team, league, 20);

  if (lastMatches.length > 0) {
    let sumConc = 0;
    for (const m of lastMatches) {
      if (isHome) {
        sumConc += num(m["Gol Trasferta"]); // Gol subiti in casa
      } else {
        sumConc += num(m["Gol Casa"]); // Gol subiti in trasferta
      }
    }
    const recAvg = sumConc / lastMatches.length;
    defVal = defVal * 0.7 + recAvg * 0.3;
  }

  // Adjust defensive strength based on opponent's rating
  // If opponent is strong (high rating), defensive strength is reduced
  // If opponent is weak (low rating), defensive strength is increased
  defVal *= opponentRating / 50;

  if (defVal < 0.2) defVal = 0.2;
  return defVal;
}

export function predictTeamGoals(team: string, opp: string, league: string, isHome: boolean): number {
  const opponentRating = computeOpponentRating(opp, league);
  const off = getTeamOffensiveStrength(team, league, isHome, opponentRating);
  const defOpp = getTeamDefensiveStrength(opp, league, !isHome, computeOpponentRating(team, league));
  let predicted = off * (defOpp / 1.3);

  if (isHome) predicted += 0.2;
  if (predicted < 0.2) predicted = 0.2;

  return predicted;
}

// ----------------------------------------------------------------------------
//   1X2
// ----------------------------------------------------------------------------

function computeTeamRating(team: string, league: string): number {
  let r = 50;
  const st = getStandings(team, league);
  if (st) {
    const pos = num(st["Pos"]);
    const tot = 20;
    r += (tot - pos) * 2;
    const xg = num(st["xG"]);
    const xga = num(st["xGA"]);
    const xgd = xg - xga;
    r += xgd * 0.5;
  }
  const last = getLastNMatches(team, league, 20); // Aggiornato a 20 partite
  let pts = 0;
  for (const m of last) {
    const home = normalizeName(m["Squadra Casa"]) === normalizeName(team);
    const gh = num(m["Gol Casa"]);
    const ga = num(m["Gol Trasferta"]);
    const tg = home ? gh : ga;
    const og = home ? ga : gh;
    if (tg > og) pts += 3;
    else if (tg === og) pts += 1;
  }
  r += pts;
  if (r < 1) r = 1;
  return r;
}

export function get1X2(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const homeR = computeTeamRating(homeTeam, league);
  const awayR = computeTeamRating(awayTeam, league);

  const direct = filterDirectMatches(homeTeam, awayTeam);
  let homeWins = 0;
  for (const m of direct) {
    const gh = num(m["Gol Casa"]);
    const ga = num(m["Gol Trasferta"]);
    const wasHome = normalizeName(m["Squadra Casa"]) === normalizeName(homeTeam);
    const hGoals = wasHome ? gh : ga;
    const aGoals = wasHome ? ga : gh;
    if (hGoals > aGoals) homeWins++;
  }
  let adjH = homeR + homeWins;
  let adjA = awayR + (direct.length - homeWins);
  if (adjH < 1) adjH = 1;
  if (adjA < 1) adjA = 1;

  const sum = adjH + adjA;
  let rawH = adjH / sum;
  let rawA = adjA / sum;
  const diff = Math.abs(rawH - rawA);
  let draw = 0.25 - diff * 0.5;
  if (draw < 0.05) draw = 0.05;
  if (draw > 0.4) draw = 0.4;

  const factor = 1 / (rawH + rawA);
  rawH *= factor * (1 - draw);
  rawA *= factor * (1 - draw);

  return [
    { label: "1 (Home Win)", probability: clampProb(rawH) },
    { label: "X (Draw)",     probability: clampProb(draw) },
    { label: "2 (Away Win)", probability: clampProb(rawA) },
    { label: "1X",           probability: clampProb(rawH + draw) },
    { label: "X2",           probability: clampProb(rawA + draw) },
    { label: "12",           probability: clampProb(rawH + rawA) },
  ];
}

// ----------------------------------------------------------------------------
//   Over/Under & Multigol
// ----------------------------------------------------------------------------

export function getOverUnderAndMultigol(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];
  
  // Previsione gol
  const ghHome = predictTeamGoals(homeTeam, awayTeam, league, true);
  const ghAway = predictTeamGoals(awayTeam, homeTeam, league, false);
  const lambdaTotal = ghHome + ghAway;
  
  // Scommesse Over/Under Totali con limite a 3.5
  const totalLines = [1.5, 2.5, 3.5];
  for (const line of totalLines) {
    const pOv = poissonOver(lambdaTotal, line);
    const pUn = poissonUnder(lambdaTotal, line);
    out.push({
      label: `Over ${line} Gol Totali`,
      probability: clampProb(pOv)
    });
    out.push({
      label: `Under ${line} Gol Totali`,
      probability: clampProb(pUn)
    });
  }

  // Scommesse Multigol Totali con limite a 3.5
  const mgRanges = [ [1,2], [1,3], [2,3] ];
  for (const [minG, maxG] of mgRanges) {
    const p = poissonRange(lambdaTotal, minG, maxG);
    out.push({
      label: `Multigol ${minG}-${maxG} Totali`,
      probability: clampProb(p)
    });
  }

  // Scommesse Over/Under per Squadra di Casa con limite a 3.5
  const homeLines = [0.5, 1.5, 2.5, 3.5];
  for (const line of homeLines) {
    const pOv = poissonOver(ghHome, line);
    const pUn = poissonUnder(ghHome, line);
    out.push({
      label: `Over ${line} Gol Casa ${homeTeam}`,
      probability: clampProb(pOv)
    });
    out.push({
      label: `Under ${line} Gol Casa ${homeTeam}`,
      probability: clampProb(pUn)
    });
  }

  // Scommesse Multigol per Squadra di Casa con limite a 3.5
  const mgRangesHome = [ [1,1], [2,2], [1,2], [2,3] ];
  for (const [minG, maxG] of mgRangesHome) {
    const p = poissonRange(ghHome, minG, maxG);
    out.push({
      label: `Multigol ${minG}-${maxG} Casa ${homeTeam}`,
      probability: clampProb(p)
    });
  }

  // Scommesse Over/Under per Squadra in Trasferta con limite a 3.5
  const awayLines = [0.5, 1.5, 2.5, 3.5];
  for (const line of awayLines) {
    const pOv = poissonOver(ghAway, line);
    const pUn = poissonUnder(ghAway, line);
    out.push({
      label: `Over ${line} Gol Trasferta ${awayTeam}`,
      probability: clampProb(pOv)
    });
    out.push({
      label: `Under ${line} Gol Trasferta ${awayTeam}`,
      probability: clampProb(pUn)
    });
  }

  // Scommesse Multigol per Squadra in Trasferta con limite a 3.5
  const mgRangesAway = [ [1,1], [2,2], [1,2], [2,3] ];
  for (const [minG, maxG] of mgRangesAway) {
    const p = poissonRange(ghAway, minG, maxG);
    out.push({
      label: `Multigol ${minG}-${maxG} Trasferta ${awayTeam}`,
      probability: clampProb(p)
    });
  }

  return out;
}

// ----------------------------------------------------------------------------
//   Goal / NoGoal
// ----------------------------------------------------------------------------

export function getGoalNoGoal(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const ghHome = predictTeamGoals(homeTeam, awayTeam, league, true);
  const ghAway = predictTeamGoals(awayTeam, homeTeam, league, false);
  const lambdaTotal = ghHome + ghAway;

  const pHome0 = poissonPMF(0, ghHome);
  const pAway0 = poissonPMF(0, ghAway);
  const pBoth0 = pHome0 * pAway0;
  const pGoal = 1 - (pHome0 + pAway0 - pBoth0);
  const pNoGoal = 1 - pGoal;

  return [
    { label: "Goal (Entrambe segnano)", probability: clampProb(pGoal) },
    { label: "NoGoal",                  probability: clampProb(pNoGoal) },
  ];
}

// ----------------------------------------------------------------------------
//   PLAYER PROPS
// ----------------------------------------------------------------------------

function shotsPerMatch(player: PlayerRow): number {
  const shots = num(player["Tiri totali"]);
  const pg = num(player["PG"]);
  if (pg <= 0) return 0;
  return shots / pg;
}

function shotsOnTargetPerMatch(player: PlayerRow): number {
  const sOnT = num(player["Tiri in porta"]);
  const pg = num(player["PG"]);
  if (pg <= 0) return 0;
  return sOnT / pg;
}

function cardsPerMatch(player: PlayerRow): number {
  const pg = num(player["PG"]);
  if (pg <= 0) return 0;
  const y = num(player["Amm."]);
  const r = num(player["Esp."]);
  return (y + r * 2) / pg;
}

function foulsCommittedPerMatch(player: PlayerRow): number {
  const pg = num(player["PG"]);
  if (pg <= 0) return 0;
  return num(player["Falli commessi"]) / pg;
}

function offsidesPerMatch(player: PlayerRow): number {
  const pg = num(player["PG"]);
  if (pg <= 0) return 0;
  return num(player["Fuorigioco"]) / pg;
}

/**
 * Restituisce i top N giocatori ordinati per tiri totali.
 */
function findTopShooters(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players]
    .sort((a, b) => shotsPerMatch(b) - shotsPerMatch(a))
    .slice(0, n);
}

/**
 * Restituisce i top N giocatori ordinati per tiri in porta.
 */
function findTopShootersOnTarget(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players]
    .sort((a, b) => shotsOnTargetPerMatch(b) - shotsOnTargetPerMatch(a))
    .slice(0, n);
}

/**
 * Restituisce i top N giocatori ordinati per cartellini.
 */
function findTopCardPronePlayers(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players]
    .sort((a, b) => cardsPerMatch(b) - cardsPerMatch(a))
    .slice(0, n);
}

/**
 * Restituisce i top N giocatori ordinati per falli commessi.
 */
function findTopFoulsCommittedPlayers(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players]
    .sort((a, b) => foulsCommittedPerMatch(b) - foulsCommittedPerMatch(a))
    .slice(0, n);
}

/**
 * Restituisce i top N giocatori ordinati per fuorigioco.
 */
function findTopOffsidesPlayers(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players]
    .sort((a, b) => offsidesPerMatch(b) - offsidesPerMatch(a))
    .slice(0, n);
} 

/** 
 * Dato un avgShots, restituisce tutte le linee "Over" a intervalli di 1.0,
 * partendo da 1.5 fino a raggiungere o superare la media, fino a un massimo di 3.5.
 * Esempio:
 *  - se media=1.88 => [1.5, 2.5]
 *  - se media=3.11 => [1.5, 2.5, 3.5]
 *  
 *  Se la media è <1.5, non aggiunge nessuna linea.
 */
function pickShotLinesForOver(avg: number): number[] {
  const lines: number[] = [];
  
  // Inizia da 1.5 e aggiungi linee a intervalli di 1.0 fino a superare la media, massimo 3.5
  for (let line = 1.5; line <= Math.min(Math.ceil(avg), 3.5); line += 1.0) {
    lines.push(line);
  }

  return lines;
} 

/** 
 * Per i cartellini di solito si fa Over 0.5, o Over 1.5.  
 * Se la media è sotto 0.8, preferiamo 0.5 
 * Se la media >= 1.5, aggiungiamo anche Over 1.5
 */
function pickCardLine(avg: number): number {
  if (avg < 0.8) return 0.5;
  return 1.5;
}

/** 
 * Per i falli commessi di solito si fa Over 1.5, Over 2.5, ecc.
 * Similarmente alle altre categorie, limitato a 3.5
 */
function pickFoulsLineForOver(avg: number): number[] {
  const lines: number[] = [];

  for (let line = 1.5; line <= Math.min(Math.ceil(avg), 3.5); line += 1.0) {
    lines.push(line);
  }

  return lines;
}

/** 
 * Per i fuorigioco di solito si fa Over 0.5, Over 1.5, ecc.
 * Similarmente alle altre categorie, limitato a 3.5
 */
function pickOffsidesLineForOver(avg: number): number[] {
  const lines: number[] = [];

  for (let line = 0.5; line <= Math.min(Math.ceil(avg), 3.5); line += 1.0) {
    lines.push(line);
  }

  return lines;
}

/**
 * Genera le scommesse "Over" per le varie statistiche dei giocatori.
 * Include Tiri Totali, Tiri in Porta, Cartellini, Falli Commmessi e Fuorigioco.
 */
export function getPlayerBets(players: PlayerRow[], teamName: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];

  // 1) TOP 5 SHOOTERS => TIRI TOT
  const topShooters = findTopShooters(players, 5);
  for (const shooter of topShooters) {
    const avg = shotsPerMatch(shooter); 
    if (avg > 0) {
      const lines = pickShotLinesForOver(avg);
      for (const ln of lines) {
        const pOv = poissonOver(avg, ln);
        out.push({
          label: `Over ${ln} Tiri ${shooter["Giocatore"]} (${teamName})`,
          probability: clampProb(pOv),
        });
      }
    }
  }

  // 2) TOP 5 SHOOTERS ON TARGET => TIRI IN PORTA
  const topShootersOnTarget = findTopShootersOnTarget(players, 5);
  for (const shooter of topShootersOnTarget) {
    const avg = shotsOnTargetPerMatch(shooter);
    if (avg > 0) {
      const lines = pickShotLinesForOver(avg);
      for (const ln of lines) {
        const pOv = poissonOver(avg, ln);
        out.push({
          label: `Over ${ln} Tiri in Porta ${shooter["Giocatore"]} (${teamName})`,
          probability: clampProb(pOv),
        });
      }
    }
  }

  // 3) TOP 5 CARTELLINI
  const topCardPronePlayers = findTopCardPronePlayers(players, 5);
  for (const player of topCardPronePlayers) {
    const avg = cardsPerMatch(player);
    if (avg > 0) {
      const lines = [pickCardLine(avg)];
      if (avg >= 1.5) {
        lines.push(1.5);
      }
      for (const line of lines) {
        const pOv = poissonOver(avg, line);
        out.push({
          label: `Over ${line} Cartellini ${player["Giocatore"]} (${teamName})`,
          probability: clampProb(pOv),
        });
      }
    }
  }

  // 4) TOP 5 FALLI COMMESSI
  const topFoulsCommittedPlayers = findTopFoulsCommittedPlayers(players, 5);
  for (const player of topFoulsCommittedPlayers) {
    const avg = foulsCommittedPerMatch(player);
    if (avg > 0) {
      const lines = pickFoulsLineForOver(avg);
      for (const ln of lines) {
        const pOv = poissonOver(avg, ln);
        out.push({
          label: `Over ${ln} Falli Commmessi ${player["Giocatore"]} (${teamName})`,
          probability: clampProb(pOv),
        });
      }
    }
  }

  // 5) TOP 5 FUORIGIOCO
  const topOffsidesPlayers = findTopOffsidesPlayers(players, 5);
  for (const player of topOffsidesPlayers) {
    const avg = offsidesPerMatch(player);
    if (avg > 0) {
      const lines = pickOffsidesLineForOver(avg);
      for (const ln of lines) {
        const pOv = poissonOver(avg, ln);
        out.push({
          label: `Over ${ln} Fuorigioco ${player["Giocatore"]} (${teamName})`,
          probability: clampProb(pOv),
        });
      }
    }
  }

  return out;
}

// ----------------------------------------------------------------------------
//   FUNZIONE PER CALCOLARE LE PREDIZIONI DEI PUNTEGGI ESATTI
// ----------------------------------------------------------------------------

/**
 * Restituisce le predizioni delle linee di punteggio esatto più probabili.
 * Limita le predizioni a un massimo di 3 gol per squadra.
 */
export function calculateScorelinePredictions(
  homeTeam: string,
  awayTeam: string,
  league: string
): ScorelinePrediction[] {
  // Calcola i gol attesi per entrambe le squadre
  const expectedHomeGoals = predictTeamGoals(homeTeam, awayTeam, league, true);
  const expectedAwayGoals = predictTeamGoals(awayTeam, homeTeam, league, false);

  // Definisci la funzione Poisson
  const poisson = (k: number, lambda: number): number => {
    return poissonPMF(k, lambda);
  };

  const maxGoals = 3; // Limitiamo a 3 gol per squadra
  const predictions: ScorelinePrediction[] = [];

  for (let home = 0; home <= maxGoals; home++) {
    for (let away = 0; away <= maxGoals; away++) {
      const prob = poisson(home, expectedHomeGoals) * poisson(away, expectedAwayGoals);
      if (prob > 0) {
        predictions.push({
          homeGoals: home,
          awayGoals: away,
          probability: clampProb(prob),
        });
      }
    }
  }

  // Ordina le predizioni per probabilità decrescente e prendi le prime 5
  return predictions.sort((a, b) => b.probability - a.probability).slice(0, 4);
}

// ----------------------------------------------------------------------------
//   FUNZIONE PRINCIPALE
// ----------------------------------------------------------------------------
export function calculateRecommendedBets(
  homeTeam: string,
  awayTeam: string,
  league: string
): BetRecommendation[] {
  const bets: BetRecommendation[] = [];

  // 1) 1X2
  bets.push(...get1X2(homeTeam, awayTeam, league));

  // 2) Over/Under + Multigol
  bets.push(...getOverUnderAndMultigol(homeTeam, awayTeam, league));

  // 3) Goal/NoGoal
  bets.push(...getGoalNoGoal(homeTeam, awayTeam, league));

  // 4) Giocatori
  const homePlayers = uniquePlayersData.filter((p) =>
    normalizeName(p["Squadra"]) === normalizeName(homeTeam) &&
    normalizeName(p["Competizione"]) === normalizeName(league)
  );
  const awayPlayers = uniquePlayersData.filter((p) =>
    normalizeName(p["Squadra"]) === normalizeName(awayTeam) &&
    normalizeName(p["Competizione"]) === normalizeName(league)
  );

  bets.push(...getPlayerBets(homePlayers, homeTeam));
  bets.push(...getPlayerBets(awayPlayers, awayTeam));

  return bets;
}
