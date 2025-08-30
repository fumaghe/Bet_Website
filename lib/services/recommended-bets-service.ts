// lib/services/recommended-bets-service.ts

import Papa from 'papaparse';

/** ============================
 *  DATI E INTERFACCE
 *  ============================
 */

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
  ["Pos."]?: string; // opzionale per Champions
  ["Squadra"]: string;
  ["Competizione"]?: string; // opzionale per Champions
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
  ["Falli commessi"]?: string;
  ["Falli subiti"]?: string;
  ["Fuorigioco"]?: string;
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

/** CHAMPIONS LEAGUE */
export interface ChampionsAvversariRow extends TeamPerformanceRow {}
export interface ChampionsCasaRow extends TeamPerformanceRow {}
export interface ChampionsLeaguePlayerRow extends PlayerRow {}

/** ALL LEAGUES MATCHES (all_leagues_matches.csv) */
export interface MatchRow {
  ["Campionato"]: string;
  ["Giorno"]: string;            // "YYYY-MM-DD"
  ["Orario"]: string;            // "HH:mm:ss"
  ["Squadra Casa"]: string;
  ["Squadra Trasferta"]: string;

  ["xG Casa"]: string;
  ["Gol Casa"]: string;
  ["Gol Trasferta"]: string;
  ["xG Trasferta"]: string;

  ["Sett."]?: string;

  // Nuove colonne dal tuo esempio:
  ["FTResult"]?: string;         // H/D/A (o D per Draw)
  ["HTHome"]?: string;           // gol HT casa
  ["HTAway"]?: string;           // gol HT away
  ["HTResult"]?: string;         // H/D/A

  ["HomeShots"]?: string;
  ["AwayShots"]?: string;
  ["HomeTarget"]?: string;
  ["AwayTarget"]?: string;

  ["HomeFouls"]?: string;
  ["AwayFouls"]?: string;

  ["HomeCorners"]?: string;
  ["AwayCorners"]?: string;

  ["HomeYellow"]?: string;
  ["AwayYellow"]?: string;
  ["HomeRed"]?: string;
  ["AwayRed"]?: string;

  // NB: le quote bookmaker sono intenzionalmente non usate come richiesto
  ["OddHome"]?: string;
  ["OddDraw"]?: string;
  ["OddAway"]?: string;
  ["Over25"]?: string;
  ["Under25"]?: string;
}

export interface BetRecommendation {
  label: string;
  probability: number;  // 0..100
}

export interface ScorelinePrediction {
  homeGoals: number;
  awayGoals: number;
  probability: number; // 0..100
}

/** ============================
 *  GLOBAL STATE
 *  ============================
 */
let standingsData: StandingsRow[] = [];
let teamPerformanceData: TeamPerformanceRow[] = [];
let opponentPerformanceData: OpponentPerformanceRow[] = [];
let playersData: PlayerRow[] = [];
let matchesData: MatchRow[] = [];
let uniquePlayersData: PlayerRow[] = [];

let championsAvversariData: ChampionsAvversariRow[] = [];
let championsCasaData: ChampionsCasaRow[] = [];
let championsLeaguePlayersData: ChampionsLeaguePlayerRow[] = [];

let dataLoaded = false;

/** ============================
 *  LOAD
 *  ============================
 */
export async function loadAllBetsData() {
  if (dataLoaded) return;
  dataLoaded = true;

  // standings
  const possibleStandingsFiles = [
    '/Bet_Website/data/standings/serie_a.csv',
    '/Bet_Website/data/standings/ligue_1.csv',
    '/Bet_Website/data/standings/premier_league.csv',
    '/Bet_Website/data/standings/bundesliga.csv',
    '/Bet_Website/data/standings/la_liga.csv',
    '/Bet_Website/data/standings/champions_league.csv',
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
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<TeamPerformanceRow>(text, { header: true, skipEmptyLines: true });
      teamPerformanceData = parsed.data;
    }
  }
  // opponent_performance
  {
    const resp = await fetch('/Bet_Website/data/opponent_performance.csv');
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<OpponentPerformanceRow>(text, { header: true, skipEmptyLines: true });
      opponentPerformanceData = parsed.data;
    }
  }
  // players (league)
  {
    const resp = await fetch('/Bet_Website/data/players/league_players.csv');
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<PlayerRow>(text, { header: true, skipEmptyLines: true });
      playersData = parsed.data;
    }
  }
  // all_leagues_matches
  {
    const resp = await fetch('/Bet_Website/data/all_leagues_matches.csv');
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<MatchRow>(text, { header: true, skipEmptyLines: true });
      matchesData = parsed.data;
    }
  }

  // Champions specific
  {
    const resp = await fetch('/Bet_Website/data/champions_avversari.csv');
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<ChampionsAvversariRow>(text, { header: true, skipEmptyLines: true });
      championsAvversariData = parsed.data;
    }
  }
  {
    const resp = await fetch('/Bet_Website/data/champions_casa.csv');
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<ChampionsCasaRow>(text, { header: true, skipEmptyLines: true });
      championsCasaData = parsed.data;
    }
  }
  {
    const resp = await fetch('/Bet_Website/data/players/champions_league_players.csv');
    if (resp.ok) {
      const text = await resp.text();
      const parsed = Papa.parse<ChampionsLeaguePlayerRow>(text, { header: true, skipEmptyLines: true });
      championsLeaguePlayersData = parsed.data;
      playersData = playersData.concat(parsed.data);
    }
  }

  // uniquePlayersData (no duplicati, PG >= 5)
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

/** ============================
 *  UTILS
 *  ============================
 */
function normalizeName(n: string): string {
  return (n || '').trim().toLowerCase();
}
export function num(v: string | undefined): number {
  if (!v) return 0;
  const parsed = parseFloat(v.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

/** Date parsing robusto */
function parseDateTime(m: MatchRow): number {
  const d = (m["Giorno"] || "").trim();
  const t = (m["Orario"] || "00:00:00").trim();
  // Se i tuoi orari sono locali, qui puoi togliere la Z o gestire timezone
  const iso = `${d}T${t}Z`;
  const ts = Date.parse(iso);
  return isNaN(ts) ? 0 : ts;
}

/** ============================
 *  PROBABILITA'
 *  ============================
 */
function factorial(n: number): number {
  if (n < 2) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

export function poissonOver(lambda: number, line: number): number {
  const cut = Math.floor(line);
  let sumP = 0;
  for (let k = 0; k <= cut; k++) sumP += poissonPMF(k, lambda);
  return 1 - sumP;
}
export function poissonUnder(lambda: number, line: number): number {
  const cut = Math.floor(line);
  let sumP = 0;
  for (let k = 0; k <= cut; k++) sumP += poissonPMF(k, lambda);
  return sumP;
}
export function poissonRange(lambda: number, m: number, n: number): number {
  let sum = 0;
  const low = Math.max(0, m);
  const high = Math.min(n, 15);
  for (let k = low; k <= high; k++) sum += poissonPMF(k, lambda);
  return sum;
}
export function clampProb(p: number): number {
  let x = p * 100;
  if (x < 0) x = 0;
  if (x > 99.9) x = 99.9;
  return x;
}

/** ============================
 *  LOOKUP
 *  ============================
 */
function getStandings(team: string, league: string): StandingsRow | null {
  return standingsData.find(sd =>
    normalizeName(sd["Squadra"]) === normalizeName(team) &&
    normalizeName(sd["Lega"]) === normalizeName(league)
  ) || null;
}
function getTeamPerformance(team: string, league: string): TeamPerformanceRow | null {
  if (normalizeName(league) === 'champions league') {
    return championsCasaData.find(r => normalizeName(r["Squadra"]) === normalizeName(team)) || null;
  }
  return teamPerformanceData.find(r =>
    normalizeName(r["Squadra"]) === normalizeName(team) &&
    normalizeName(r["Competizione"] || "") === normalizeName(league)
  ) || null;
}
function getOpponentPerformance(team: string, league: string): OpponentPerformanceRow | null {
  if (normalizeName(league) === 'champions league') {
    return championsAvversariData.find(r => normalizeName(r["Squadra"]) === normalizeName(team)) || null;
  }
  return opponentPerformanceData.find(r =>
    normalizeName(r["Squadra"]) === normalizeName(team) &&
    normalizeName(r["Competizione"] || "") === normalizeName(league)
  ) || null;
}

function filterDirectMatches(homeTeam: string, awayTeam: string, league: string): MatchRow[] {
  return matchesData.filter(m => {
    const h = normalizeName(m["Squadra Casa"]);
    const a = normalizeName(m["Squadra Trasferta"]);
    const camp = normalizeName(m["Campionato"]) === normalizeName(league);
    return camp && (
      (h === normalizeName(homeTeam) && a === normalizeName(awayTeam)) ||
      (h === normalizeName(awayTeam) && a === normalizeName(homeTeam))
    );
  });
}

/** Ultime N in casa */
function getLastNHomeMatches(team: string, league: string, N = 20): MatchRow[] {
  let homeMatches: MatchRow[] = [];
  if (normalizeName(league) === 'champions league') {
    homeMatches = championsCasaData.map(c => ({
      "Campionato": league,
      "Giorno": "Unknown",
      "Orario": "Unknown",
      "Squadra Casa": c["Squadra"],
      "Squadra Trasferta": "Unknown",
      "xG Casa": "0",
      "Gol Casa": c["Reti"],
      "Gol Trasferta": "0",
      "xG Trasferta": "0",
      "FTResult": undefined,
      "HTHome": undefined, "HTAway": undefined, "HTResult": undefined,
      "HomeShots": undefined, "AwayShots": undefined,
      "HomeTarget": undefined, "AwayTarget": undefined,
      "HomeFouls": undefined, "AwayFouls": undefined,
      "HomeCorners": undefined, "AwayCorners": undefined,
      "HomeYellow": undefined, "AwayYellow": undefined,
      "HomeRed": undefined, "AwayRed": undefined,
      "OddHome": undefined, "OddDraw": undefined, "OddAway": undefined,
      "Over25": undefined, "Under25": undefined,
      "Sett.": undefined
    }));
  } else {
    homeMatches = matchesData.filter(m =>
      normalizeName(m["Squadra Casa"]) === normalizeName(team) &&
      normalizeName(m["Campionato"]) === normalizeName(league)
    );
  }
  homeMatches = homeMatches.sort((a,b) => parseDateTime(a) - parseDateTime(b));
  return homeMatches.slice(-N);
}

/** Ultime N in trasferta */
function getLastNAwayMatches(team: string, league: string, N = 20): MatchRow[] {
  let awayMatches: MatchRow[] = [];
  if (normalizeName(league) === 'champions league') {
    awayMatches = championsAvversariData.map(c => ({
      "Campionato": league,
      "Giorno": "Unknown",
      "Orario": "Unknown",
      "Squadra Casa": "Unknown",
      "Squadra Trasferta": c["Squadra"],
      "xG Casa": "0",
      "Gol Casa": "0",
      "Gol Trasferta": c["Reti"],
      "xG Trasferta": "0",
      "FTResult": undefined,
      "HTHome": undefined, "HTAway": undefined, "HTResult": undefined,
      "HomeShots": undefined, "AwayShots": undefined,
      "HomeTarget": undefined, "AwayTarget": undefined,
      "HomeFouls": undefined, "AwayFouls": undefined,
      "HomeCorners": undefined, "AwayCorners": undefined,
      "HomeYellow": undefined, "AwayYellow": undefined,
      "HomeRed": undefined, "AwayRed": undefined,
      "OddHome": undefined, "OddDraw": undefined, "OddAway": undefined,
      "Over25": undefined, "Under25": undefined,
      "Sett.": undefined
    }));
  } else {
    awayMatches = matchesData.filter(m =>
      normalizeName(m["Squadra Trasferta"]) === normalizeName(team) &&
      normalizeName(m["Campionato"]) === normalizeName(league)
    );
  }
  awayMatches = awayMatches.sort((a,b) => parseDateTime(a) - parseDateTime(b));
  return awayMatches.slice(-N);
}

function getLastNMatches(team: string, league: string, N = 20): MatchRow[] {
  let relevant = matchesData.filter(m => {
    const isHome = normalizeName(m["Squadra Casa"]) === normalizeName(team);
    const isAway = normalizeName(m["Squadra Trasferta"]) === normalizeName(team);
    const camp = normalizeName(m["Campionato"]) === normalizeName(league);
    return camp && (isHome || isAway);
  });
  relevant = relevant.sort((a,b) => parseDateTime(a) - parseDateTime(b));
  return relevant.slice(-N);
}

/** ============================
 *  TEAM LEVEL: GOALS MODEL
 *  ============================
 */
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
  const last = getLastNMatches(team, league, 20);
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

function computeOpponentRating(opponentTeam: string, league: string): number {
  return computeTeamRating(opponentTeam, league);
}

/** Decadimento esponenziale (recency) su sequenze */
function expWeights(len: number, halfLife = 10): number[] {
  // peso_i = 2^(-(n-i)/halfLife)
  const ws: number[] = [];
  for (let i = 0; i < len; i++) {
    const age = (len - 1) - i;
    ws.push(Math.pow(2, -age / halfLife));
  }
  const s = ws.reduce((a,b)=>a+b,0) || 1;
  return ws.map(w => w / s);
}

/** media pesata con pesi w */
function weightedAvg(arr: number[], w: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0, sw = 0;
  for (let i = 0; i < arr.length; i++) {
    s += arr[i] * (w[i] ?? 1);
    sw += (w[i] ?? 1);
  }
  return sw > 0 ? s / sw : 0;
}

/** Offensive/Defensive strength arricchite da shots/target/corners */
function getTeamOffensiveStrength(team: string, league: string, isHome: boolean, opponentRating: number): number {
  const row = getTeamPerformance(team, league);
  const pg = row ? num(row["PG"]) || 1 : 1;
  const gf = row ? num(row["Reti"]) / pg : 1;
  const xg = row ? num(row["xG"]) / pg : 1;
  let off = (gf + xg) / 2;

  // feature extra recenti
  const lastMatches = isHome ? getLastNHomeMatches(team, league, 20) : getLastNAwayMatches(team, league, 20);
  if (lastMatches.length > 0) {
    const w = expWeights(lastMatches.length, 8);
    const goalsFor = lastMatches.map(m => isHome ? num(m["Gol Casa"]) : num(m["Gol Trasferta"]));
    const shotsFor = lastMatches.map(m => isHome ? num(m["HomeShots"]) : num(m["AwayShots"]));
    const targetFor = lastMatches.map(m => isHome ? num(m["HomeTarget"]) : num(m["AwayTarget"]));
    const cornersFor = lastMatches.map(m => isHome ? num(m["HomeCorners"]) : num(m["AwayCorners"]));

    const gfRec = weightedAvg(goalsFor, w);
    const sRec = weightedAvg(shotsFor, w);
    const tRec = weightedAvg(targetFor, w);
    const cRec = weightedAvg(cornersFor, w);

    // normalizzazione semplice: trasformo tiri/corner in contributo "gol attesi" con coefficienti
    const sCoef = 0.04;   // 25 tiri ~ 1 gol atteso (da calibrare)
    const tCoef = 0.12;   // 8.3 on target ~ 1 gol atteso
    const cCoef = 0.03;   // 33 corner ~ 1 gol atteso

    const proxyX = sRec * sCoef + tRec * tCoef + cRec * cCoef;
    off = 0.5 * off + 0.5 * (0.6 * gfRec + 0.4 * proxyX);
  }

  // aggiusta vs rating avversario
  off *= 50 / Math.max(1, opponentRating);

  // home boost piccolo
  if (isHome) off += 0.05;

  return Math.max(off, 0.2);
}

function getTeamDefensiveStrength(team: string, league: string, isHome: boolean, opponentRating: number): number {
  const opp = getOpponentPerformance(team, league);
  const pg = opp ? num(opp["PG"]) || 1 : 1;
  const ga = opp ? num(opp["Reti"]) / pg : 1; // qui "Reti" lato opponent_performance = gol concessi
  const xag = opp ? num(opp["xAG"] || "0") / pg : 1;
  let defVal = (ga + xag) / 2;

  const lastMatches = isHome ? getLastNHomeMatches(team, league, 20) : getLastNAwayMatches(team, league, 20);
  if (lastMatches.length > 0) {
    const w = expWeights(lastMatches.length, 8);
    const conc = lastMatches.map(m => isHome ? num(m["Gol Trasferta"]) : num(m["Gol Casa"]));
    const shotsA = lastMatches.map(m => isHome ? num(m["AwayShots"]) : num(m["HomeShots"]));
    const targetA = lastMatches.map(m => isHome ? num(m["AwayTarget"]) : num(m["HomeTarget"]));
    const cornersA = lastMatches.map(m => isHome ? num(m["AwayCorners"]) : num(m["HomeCorners"]));
    const concRec = weightedAvg(conc, w);
    const sARec = weightedAvg(shotsA, w);
    const tARec = weightedAvg(targetA, w);
    const cARec = weightedAvg(cornersA, w);

    const sCoef = 0.035;
    const tCoef = 0.10;
    const cCoef = 0.025;
    const proxyGA = sARec * sCoef + tARec * tCoef + cARec * cCoef;

    defVal = 0.5 * defVal + 0.5 * (0.6 * concRec + 0.4 * proxyGA);
  }

  // più alto = più "porosa"
  defVal *= Math.max(1, opponentRating) / 50;

  return Math.max(defVal, 0.15);
}

export function predictTeamGoals(team: string, opp: string, league: string, isHome: boolean): number {
  const opponentRating = computeOpponentRating(opp, league);
  const off = getTeamOffensiveStrength(team, league, isHome, opponentRating);
  const defOpp = getTeamDefensiveStrength(opp, league, !isHome, computeOpponentRating(team, league));
  let predicted = off * (defOpp / 1.25);
  if (isHome) predicted += 0.15;
  return Math.max(predicted, 0.2);
}

/** ============================
 *  1X2 CLASSICO (teniamolo)
 *  ============================
 */
export function get1X2(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const homeR = computeTeamRating(homeTeam, league);
  const awayR = computeTeamRating(awayTeam, league);

  const direct = filterDirectMatches(homeTeam, awayTeam, league);
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
  adjH = Math.max(1, adjH);
  adjA = Math.max(1, adjA);

  const sum = adjH + adjA;
  let rawH = adjH / sum;
  let rawA = adjA / sum;
  const diff = Math.abs(rawH - rawA);
  let draw = 0.25 - diff * 0.5;
  draw = Math.max(0.05, Math.min(0.4, draw));

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

/** ============================
 *  MERCATI GOAL
 *  ============================
 */
export function getOverUnderAndMultigol(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];

  const ghHome = predictTeamGoals(homeTeam, awayTeam, league, true);
  const ghAway = predictTeamGoals(awayTeam, homeTeam, league, false);
  const lambdaTotal = ghHome + ghAway;

  const totalLines = [1.5, 2.5, 3.5];
  for (const line of totalLines) {
    out.push({ label: `Over ${line} Gol Totali`,  probability: clampProb(poissonOver(lambdaTotal, line)) });
    out.push({ label: `Under ${line} Gol Totali`, probability: clampProb(poissonUnder(lambdaTotal, line)) });
  }

  const mgRanges = [[1,2],[1,3],[2,3]];
  for (const [minG,maxG] of mgRanges) {
    out.push({ label: `Multigol ${minG}-${maxG} Totali`, probability: clampProb(poissonRange(lambdaTotal, minG, maxG)) });
  }

  const homeLines = [0.5, 1.5, 2.5];
  for (const line of homeLines) {
    out.push({ label: `Over ${line} Gol Casa ${homeTeam}`,  probability: clampProb(poissonOver(ghHome, line)) });
    out.push({ label: `Under ${line} Gol Casa ${homeTeam}`, probability: clampProb(poissonUnder(ghHome, line)) });
  }
  const mgRangesHome = [[1,1],[2,2],[1,2],[2,3]];
  for (const [minG,maxG] of mgRangesHome) {
    out.push({ label: `Multigol ${minG}-${maxG} Casa ${homeTeam}`, probability: clampProb(poissonRange(ghHome, minG, maxG)) });
  }

  const awayLines = [0.5, 1.5, 2.5];
  for (const line of awayLines) {
    out.push({ label: `Over ${line} Gol Trasferta ${awayTeam}`,  probability: clampProb(poissonOver(ghAway, line)) });
    out.push({ label: `Under ${line} Gol Trasferta ${awayTeam}`, probability: clampProb(poissonUnder(ghAway, line)) });
  }
  const mgRangesAway = [[1,1],[2,2],[1,2],[2,3]];
  for (const [minG,maxG] of mgRangesAway) {
    out.push({ label: `Multigol ${minG}-${maxG} Trasferta ${awayTeam}`, probability: clampProb(poissonRange(ghAway, minG, maxG)) });
  }

  return out;
}

export function getGoalNoGoal(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const ghHome = predictTeamGoals(homeTeam, awayTeam, league, true);
  const ghAway = predictTeamGoals(awayTeam, homeTeam, league, false);

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

/** ============================
 *  MERCATI TEAM/DERIVATI DA NUOVE STATS
 *  ============================
 *  Strategia: stimare lambda con blend FOR (squadra) e AGAINST (avversaria)
 *  su base home/away, con recency (exp decay). Poi usare Poisson.
 */

type StatKeyPair = {
  forHomeKey: keyof MatchRow;     // es: "HomeCorners"
  forAwayKey: keyof MatchRow;     // es: "AwayCorners"
  agHomeKey: keyof MatchRow;      // cosa concede l'avv quando gioca in casa (es: "HomeCorners")
  agAwayKey: keyof MatchRow;      // cosa concede l'avv quando gioca away (es: "AwayCorners")
};

const STAT_MAP = {
  corners: {
    forHomeKey: "HomeCorners",
    forAwayKey: "AwayCorners",
    agHomeKey: "AwayCorners",  // concessi dalla squadra di casa all'avversario (i corner dell'away)
    agAwayKey: "HomeCorners",
  } as StatKeyPair,
  fouls: {
    forHomeKey: "HomeFouls",
    forAwayKey: "AwayFouls",
    agHomeKey: "AwayFouls",
    agAwayKey: "HomeFouls",
  } as StatKeyPair,
  shots: {
    forHomeKey: "HomeShots",
    forAwayKey: "AwayShots",
    agHomeKey: "AwayShots",
    agAwayKey: "HomeShots",
  } as StatKeyPair,
  target: {
    forHomeKey: "HomeTarget",
    forAwayKey: "AwayTarget",
    agHomeKey: "AwayTarget",
    agAwayKey: "HomeTarget",
  } as StatKeyPair,
  cardsYellow: {
    forHomeKey: "HomeYellow",
    forAwayKey: "AwayYellow",
    agHomeKey: "AwayYellow",
    agAwayKey: "HomeYellow",
  } as StatKeyPair,
  cardsRed: {
    forHomeKey: "HomeRed",
    forAwayKey: "AwayRed",
    agHomeKey: "AwayRed",
    agAwayKey: "HomeRed",
  } as StatKeyPair,
};

/** Estrae vettori FOR e AGAINST per una squadra in home/away */
function extractSeriesFor(team: string, league: string, stat: StatKeyPair, isHome: boolean, N = 30): number[] {
  const matches = isHome ? getLastNHomeMatches(team, league, N) : getLastNAwayMatches(team, league, N);
  return matches.map(m => num(m[ isHome ? stat.forHomeKey : stat.forAwayKey ] as string));
}
function extractSeriesAgainst(team: string, league: string, stat: StatKeyPair, isOpponentHome: boolean, N = 30): number[] {
  const matches = isOpponentHome ? getLastNHomeMatches(team, league, N) : getLastNAwayMatches(team, league, N);
  // ciò che concede il team avversario: vedi agHomeKey/agAwayKey
  return matches.map(m => num(m[ isOpponentHome ? stat.agHomeKey : stat.agAwayKey ] as string));
}

/** Blend FOR/AGAINST con pesi di recency */
function blendedLambda(
  forSeries: number[],
  againstSeries: number[],
  halfLife = 10,
  wFor = 0.55
): number {
  const len = Math.max(forSeries.length, againstSeries.length);
  if (len === 0) return 0;
  const w = expWeights(len, halfLife);

  const pad = (arr: number[], L: number) => {
    if (arr.length === L) return arr;
    // pad davanti con ultimi valori noti o zeri
    const needed = L - arr.length;
    const head = new Array(needed).fill(arr.length ? arr[0] : 0);
    return head.concat(arr);
  };

  const f = pad(forSeries, len);
  const a = pad(againstSeries, len);

  const fAvg = weightedAvg(f, w);
  const aAvg = weightedAvg(a, w);

  // blend semplice
  return Math.max(0, wFor * fAvg + (1 - wFor) * aAvg);
}

/** Stima lambda Totale per una stat (somma delle due squadre) */
function expectedTotalStat(
  homeTeam: string,
  awayTeam: string,
  league: string,
  stat: StatKeyPair
): number {
  const homeFor = extractSeriesFor(homeTeam, league, stat, true, 30);
  const awayAgainst = extractSeriesAgainst(awayTeam, league, stat, true, 30); // avversario come "opponent home" (perché noi stiamo a casa)
  const lambdaHome = blendedLambda(homeFor, awayAgainst, 10, 0.6);

  const awayFor = extractSeriesFor(awayTeam, league, stat, false, 30);
  const homeAgainst = extractSeriesAgainst(homeTeam, league, stat, false, 30);
  const lambdaAway = blendedLambda(awayFor, homeAgainst, 10, 0.6);

  return Math.max(0.1, lambdaHome + lambdaAway);
}

/** Stima lambda per Team specifico (home/away) */
function expectedTeamStat(
  team: string,
  opp: string,
  league: string,
  stat: StatKeyPair,
  isHome: boolean
): number {
  const forSeries = extractSeriesFor(team, league, stat, isHome, 30);
  const againstSeries = extractSeriesAgainst(opp, league, stat, isHome, 30);
  const lambda = blendedLambda(forSeries, againstSeries, 10, 0.6);

  // micro home boost su corner/tiri
  const boostKeys = [STAT_MAP.corners, STAT_MAP.shots, STAT_MAP.target];
  const needsBoost = boostKeys.includes(stat);
  const b = isHome && needsBoost ? 1.05 : 1.0;
  return Math.max(0.05, lambda * b);
}

/** ============================
 *  MERCATI CORNER / FALLI / TIRI / CARTELLINI
 *  ============================
 */
export function getCornersBets(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];
  const stat = STAT_MAP.corners;

  const lambdaTot = expectedTotalStat(homeTeam, awayTeam, league, stat);
  const linesTot = [7.5, 8.5, 9.5, 10.5];
  for (const L of linesTot) {
    out.push({ label: `Over ${L} Calci d'Angolo Totali`, probability: clampProb(poissonOver(lambdaTot, L)) });
    out.push({ label: `Under ${L} Calci d'Angolo Totali`, probability: clampProb(poissonUnder(lambdaTot, L)) });
  }

  const lambdaHome = expectedTeamStat(homeTeam, awayTeam, league, stat, true);
  const lambdaAway = expectedTeamStat(awayTeam, homeTeam, league, stat, false);
  const teamLines = [3.5, 4.5, 5.5];
  for (const L of teamLines) {
    out.push({ label: `Over ${L} Corner ${homeTeam}`, probability: clampProb(poissonOver(lambdaHome, L)) });
    out.push({ label: `Under ${L} Corner ${homeTeam}`, probability: clampProb(poissonUnder(lambdaHome, L)) });
    out.push({ label: `Over ${L} Corner ${awayTeam}`, probability: clampProb(poissonOver(lambdaAway, L)) });
    out.push({ label: `Under ${L} Corner ${awayTeam}`, probability: clampProb(poissonUnder(lambdaAway, L)) });
  }

  return out;
}

export function getFoulsBets(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];
  const stat = STAT_MAP.fouls;

  const lambdaTot = expectedTotalStat(homeTeam, awayTeam, league, stat);
  const linesTot = [22.5, 24.5, 26.5]; // dipende dalle leghe; tarabile
  for (const L of linesTot) {
    out.push({ label: `Over ${L} Falli Totali`, probability: clampProb(poissonOver(lambdaTot, L)) });
    out.push({ label: `Under ${L} Falli Totali`, probability: clampProb(poissonUnder(lambdaTot, L)) });
  }

  const lambdaHome = expectedTeamStat(homeTeam, awayTeam, league, stat, true);
  const lambdaAway = expectedTeamStat(awayTeam, homeTeam, league, stat, false);
  const teamLines = [9.5, 10.5, 11.5];
  for (const L of teamLines) {
    out.push({ label: `Over ${L} Falli ${homeTeam}`, probability: clampProb(poissonOver(lambdaHome, L)) });
    out.push({ label: `Under ${L} Falli ${homeTeam}`, probability: clampProb(poissonUnder(lambdaHome, L)) });
    out.push({ label: `Over ${L} Falli ${awayTeam}`, probability: clampProb(poissonOver(lambdaAway, L)) });
    out.push({ label: `Under ${L} Falli ${awayTeam}`, probability: clampProb(poissonUnder(lambdaAway, L)) });
  }

  return out;
}

export function getShotsBets(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];

  // Tiri totali
  {
    const stat = STAT_MAP.shots;
    const lambdaTot = expectedTotalStat(homeTeam, awayTeam, league, stat);
    for (const L of [21.5, 23.5, 25.5]) {
      out.push({ label: `Over ${L} Tiri Totali`, probability: clampProb(poissonOver(lambdaTot, L)) });
      out.push({ label: `Under ${L} Tiri Totali`, probability: clampProb(poissonUnder(lambdaTot, L)) });
    }
    const lambdaHome = expectedTeamStat(homeTeam, awayTeam, league, stat, true);
    const lambdaAway = expectedTeamStat(awayTeam, homeTeam, league, stat, false);
    for (const L of [9.5, 10.5, 11.5]) {
      out.push({ label: `Over ${L} Tiri ${homeTeam}`, probability: clampProb(poissonOver(lambdaHome, L)) });
      out.push({ label: `Under ${L} Tiri ${homeTeam}`, probability: clampProb(poissonUnder(lambdaHome, L)) });
      out.push({ label: `Over ${L} Tiri ${awayTeam}`, probability: clampProb(poissonOver(lambdaAway, L)) });
      out.push({ label: `Under ${L} Tiri ${awayTeam}`, probability: clampProb(poissonUnder(lambdaAway, L)) });
    }
  }

  // Tiri in porta
  {
    const stat = STAT_MAP.target;
    const lambdaTot = expectedTotalStat(homeTeam, awayTeam, league, stat);
    for (const L of [8.5, 9.5, 10.5]) {
      out.push({ label: `Over ${L} Tiri in Porta Totali`, probability: clampProb(poissonOver(lambdaTot, L)) });
      out.push({ label: `Under ${L} Tiri in Porta Totali`, probability: clampProb(poissonUnder(lambdaTot, L)) });
    }
    const lambdaHome = expectedTeamStat(homeTeam, awayTeam, league, stat, true);
    const lambdaAway = expectedTeamStat(awayTeam, homeTeam, league, stat, false);
    for (const L of [3.5, 4.5, 5.5]) {
      out.push({ label: `Over ${L} Tiri in Porta ${homeTeam}`, probability: clampProb(poissonOver(lambdaHome, L)) });
      out.push({ label: `Under ${L} Tiri in Porta ${homeTeam}`, probability: clampProb(poissonUnder(lambdaHome, L)) });
      out.push({ label: `Over ${L} Tiri in Porta ${awayTeam}`, probability: clampProb(poissonOver(lambdaAway, L)) });
      out.push({ label: `Under ${L} Tiri in Porta ${awayTeam}`, probability: clampProb(poissonUnder(lambdaAway, L)) });
    }
  }

  return out;
}

export function getCardsBets(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];

  // Cartellini: gialli + (rossi * 2) come proxy
  const yellow = STAT_MAP.cardsYellow;
  const red = STAT_MAP.cardsRed;

  const lamYTot = expectedTotalStat(homeTeam, awayTeam, league, yellow);
  const lamRTot = expectedTotalStat(homeTeam, awayTeam, league, red);
  const lamCardsTot = Math.max(0.1, lamYTot + 2 * lamRTot);

  for (const L of [4.5, 5.5, 6.5]) {
    out.push({ label: `Over ${L} Cartellini Totali`, probability: clampProb(poissonOver(lamCardsTot, L)) });
    out.push({ label: `Under ${L} Cartellini Totali`, probability: clampProb(poissonUnder(lamCardsTot, L)) });
  }

  const lamYH = expectedTeamStat(homeTeam, awayTeam, league, yellow, true);
  const lamRH = expectedTeamStat(homeTeam, awayTeam, league, red, true);
  const lamHomeCards = Math.max(0.05, lamYH + 2 * lamRH);

  const lamYA = expectedTeamStat(awayTeam, homeTeam, league, yellow, false);
  const lamRA = expectedTeamStat(awayTeam, homeTeam, league, red, false);
  const lamAwayCards = Math.max(0.05, lamYA + 2 * lamRA);

  for (const L of [1.5, 2.5, 3.5]) {
    out.push({ label: `Over ${L} Cartellini ${homeTeam}`, probability: clampProb(poissonOver(lamHomeCards, L)) });
    out.push({ label: `Under ${L} Cartellini ${homeTeam}`, probability: clampProb(poissonUnder(lamHomeCards, L)) });
    out.push({ label: `Over ${L} Cartellini ${awayTeam}`, probability: clampProb(poissonOver(lamAwayCards, L)) });
    out.push({ label: `Under ${L} Cartellini ${awayTeam}`, probability: clampProb(poissonUnder(lamAwayCards, L)) });
  }

  return out;
}

/** ============================
 *  PLAYER PROPS (già presenti)
 *  ============================
 */
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

function findTopShooters(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players].sort((a,b) => shotsPerMatch(b) - shotsPerMatch(a)).slice(0, n);
}
function findTopShootersOnTarget(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players].sort((a,b) => shotsOnTargetPerMatch(b) - shotsOnTargetPerMatch(a)).slice(0, n);
}
function findTopCardPronePlayers(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players].sort((a,b) => cardsPerMatch(b) - cardsPerMatch(a)).slice(0, n);
}
function findTopFoulsCommittedPlayers(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players].sort((a,b) => foulsCommittedPerMatch(b) - foulsCommittedPerMatch(a)).slice(0, n);
}
function findTopOffsidesPlayers(players: PlayerRow[], n: number = 5): PlayerRow[] {
  return [...players].sort((a,b) => offsidesPerMatch(b) - offsidesPerMatch(a)).slice(0, n);
}

function pickShotLinesForOver(avg: number): number[] {
  const lines: number[] = [];
  for (let line = 1.5; line <= Math.min(Math.ceil(avg), 3.5); line += 1.0) lines.push(line);
  return lines;
}
function pickCardLine(avg: number): number[] {
  const lines: number[] = [];
  if (avg < 0.8) lines.push(0.5);
  if (avg >= 1.5) lines.push(1.5);
  return lines;
}
function pickFoulsLineForOver(avg: number): number[] {
  const lines: number[] = [];
  for (let line = 1.5; line <= Math.min(Math.ceil(avg), 3.5); line += 1.0) lines.push(line);
  return lines;
}
function pickOffsidesLineForOver(avg: number): number[] {
  const lines: number[] = [];
  for (let line = 0.5; line <= Math.min(Math.ceil(avg), 3.5); line += 1.0) lines.push(line);
  return lines;
}

export function getPlayerBets(players: PlayerRow[], teamName: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];

  const topShooters = findTopShooters(players, 5);
  for (const shooter of topShooters) {
    const avg = shotsPerMatch(shooter);
    if (avg > 0) {
      for (const ln of pickShotLinesForOver(avg)) {
        out.push({ label: `Over ${ln} Tiri ${shooter["Giocatore"]} (${teamName})`, probability: clampProb(poissonOver(avg, ln)) });
      }
    }
  }

  const topShootersOnTarget = findTopShootersOnTarget(players, 5);
  for (const shooter of topShootersOnTarget) {
    const avg = shotsOnTargetPerMatch(shooter);
    if (avg > 0) {
      for (const ln of pickShotLinesForOver(avg)) {
        out.push({ label: `Over ${ln} Tiri in Porta ${shooter["Giocatore"]} (${teamName})`, probability: clampProb(poissonOver(avg, ln)) });
      }
    }
  }

  const topCardPronePlayers = findTopCardPronePlayers(players, 5);
  for (const player of topCardPronePlayers) {
    const avg = cardsPerMatch(player);
    if (avg > 0) {
      for (const line of pickCardLine(avg)) {
        out.push({ label: `Over ${line} Cartellini ${player["Giocatore"]} (${teamName})`, probability: clampProb(poissonOver(avg, line)) });
      }
    }
  }

  const topFoulsCommittedPlayers = findTopFoulsCommittedPlayers(players, 5);
  for (const player of topFoulsCommittedPlayers) {
    const avg = foulsCommittedPerMatch(player);
    if (avg > 0) {
      for (const ln of pickFoulsLineForOver(avg)) {
        out.push({ label: `Over ${ln} Falli Commmessi ${player["Giocatore"]} (${teamName})`, probability: clampProb(poissonOver(avg, ln)) });
      }
    }
  }

  const topOffsidesPlayers = findTopOffsidesPlayers(players, 5);
  for (const player of topOffsidesPlayers) {
    const avg = offsidesPerMatch(player);
    if (avg > 0) {
      for (const ln of pickOffsidesLineForOver(avg)) {
        out.push({ label: `Over ${ln} Fuorigioco ${player["Giocatore"]} (${teamName})`, probability: clampProb(poissonOver(avg, ln)) });
      }
    }
  }

  return out;
}

/** ============================
 *  CORRECT SCORE
 *  ============================
 */
export function calculateScorelinePredictions(
  homeTeam: string,
  awayTeam: string,
  league: string
): ScorelinePrediction[] {
  const expectedHomeGoals = predictTeamGoals(homeTeam, awayTeam, league, true);
  const expectedAwayGoals = predictTeamGoals(awayTeam, homeTeam, league, false);

  const maxGoals = 6; // esteso a 6 per coda
  const predictions: ScorelinePrediction[] = [];

  for (let home = 0; home <= maxGoals; home++) {
    for (let away = 0; away <= maxGoals; away++) {
      const prob = poissonPMF(home, expectedHomeGoals) * poissonPMF(away, expectedAwayGoals);
      if (prob > 0) {
        predictions.push({ homeGoals: home, awayGoals: away, probability: clampProb(prob) });
      }
    }
  }
  return predictions.sort((a,b) => b.probability - a.probability).slice(0, 10);
}

/** ============================
 *  HALF-TIME BET (sperimentale)
 *  ============================
 *  Usa storico HT (HTHome/HTAway). Se mancano, approssima con 45/90 dei lambda gol.
 */
export function getHalfTimeBets(homeTeam: string, awayTeam: string, league: string): BetRecommendation[] {
  const out: BetRecommendation[] = [];

  const lastH = getLastNHomeMatches(homeTeam, league, 30);
  const lastA = getLastNAwayMatches(awayTeam, league, 30);

  const wH = expWeights(lastH.length, 8);
  const wA = expWeights(lastA.length, 8);

  const hth = weightedAvg(lastH.map(m => num(m["HTHome"])), wH);
  const hta = weightedAvg(lastA.map(m => num(m["HTAway"])), wA);

  let lamHT = 0;
  if (hth > 0 || hta > 0) {
    lamHT = Math.max(0.05, hth + hta);
  } else {
    // fallback: 45/90 dei gol attesi full-time
    const ghHome = predictTeamGoals(homeTeam, awayTeam, league, true) * 0.5;
    const ghAway = predictTeamGoals(awayTeam, homeTeam, league, false) * 0.5;
    lamHT = Math.max(0.05, ghHome + ghAway);
  }

  for (const L of [0.5, 1.5]) {
    out.push({ label: `HT Over ${L} Gol`, probability: clampProb(poissonOver(lamHT, L)) });
    out.push({ label: `HT Under ${L} Gol`, probability: clampProb(poissonUnder(lamHT, L)) });
  }

  // Esito HT ~ semplice, da storico HTResult
  const htMatches = [...lastH, ...lastA].filter(m => m["HTResult"]);
  if (htMatches.length >= 10) {
    const w = expWeights(htMatches.length, 8);
    let h=0,d=0,a=0, sw=0;
    htMatches.forEach((m,i)=>{
      const r = (m["HTResult"] || "").toUpperCase();
      const wi = w[Math.max(0, w.length - htMatches.length + i)];
      sw += wi;
      if (r === 'H') h += wi;
      else if (r === 'D') d += wi;
      else if (r === 'A') a += wi;
    });
    if (sw > 0) {
      out.push({ label: "HT 1", probability: clampProb(h / sw) });
      out.push({ label: "HT X", probability: clampProb(d / sw) });
      out.push({ label: "HT 2", probability: clampProb(a / sw) });
    }
  }

  return out;
}

/** ============================
 *  MAIN
 *  ============================
 */
export function calculateRecommendedBets(
  homeTeam: string,
  awayTeam: string,
  league: string
): BetRecommendation[] {
  const bets: BetRecommendation[] = [];

  // 1) 1X2
  bets.push(...get1X2(homeTeam, awayTeam, league));

  // 2) Gol markets
  bets.push(...getOverUnderAndMultigol(homeTeam, awayTeam, league));
  bets.push(...getGoalNoGoal(homeTeam, awayTeam, league));

  // 3) Corner / Falli / Tiri / Cartellini
  bets.push(...getCornersBets(homeTeam, awayTeam, league));
  bets.push(...getFoulsBets(homeTeam, awayTeam, league));
  bets.push(...getShotsBets(homeTeam, awayTeam, league));
  bets.push(...getCardsBets(homeTeam, awayTeam, league));

  // 4) Half-Time (sperimentale)
  bets.push(...getHalfTimeBets(homeTeam, awayTeam, league));

  // 5) Player props (stat-based)
  const homePlayers = uniquePlayersData.filter(p =>
    normalizeName(p["Squadra"]) === normalizeName(homeTeam) &&
    (normalizeName(p["Competizione"] || "") === normalizeName(league) || normalizeName(league) === 'champions league')
  );
  const awayPlayers = uniquePlayersData.filter(p =>
    normalizeName(p["Squadra"]) === normalizeName(awayTeam) &&
    (normalizeName(p["Competizione"] || "") === normalizeName(league) || normalizeName(league) === 'champions league')
  );
  bets.push(...getPlayerBets(homePlayers, homeTeam));
  bets.push(...getPlayerBets(awayPlayers, awayTeam));

  return bets;
}
