'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { BetRecommendation, loadAllBetsData, calculateRecommendedBets } from '@/lib/services/recommended-bets-service';
import { getTeamPerformance } from '@/lib/services/data-service';
import { TeamPerformance } from '@/lib/types/stats';
import { MdSportsSoccer } from 'react-icons/md';
import { useBetSlip } from '@/app/BetSlipContext';
import { cn } from '@/lib/utils'; // se non ce l'hai, rimuovi e usa className stringhe
// import { Button } from '@/components/ui/button'; // non servono bottoni qui

interface RecommendedBetsProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
}

/** Odd di esempio dalla probabilità (es. 50% -> 2.00). Non usate in tabella ma lasciata per coerenza. */
function computeOdds(probability: number): number {
  if (probability <= 0) return 1;
  return parseFloat((100 / probability).toFixed(2));
}

/** Restituisce home/away se presenti nella label, altrimenti null */
function getTeamFromBetLabel(label: string, homeTeam: string, awayTeam: string): string | null {
  const l = label.toLowerCase();
  if (l.includes(homeTeam.toLowerCase())) return homeTeam;
  if (l.includes(awayTeam.toLowerCase())) return awayTeam;
  return null;
}

/** Mercati con soglie (mostrati in tabella) */
type ThresholdMarket = 'Corner' | "Calci d'Angolo" | 'Falli' | 'Tiri' | 'Tiri in Porta' | 'Cartellini';
type Scope = 'TOTAL' | 'HOME' | 'AWAY';

type ParsedThresholdBet = {
  kind: ThresholdMarket;   // "Falli", "Corner", "Tiri", "Tiri in Porta", "Cartellini"
  side: 'Over' | 'Under';
  threshold: number;       // 9.5
  scope: Scope;            // TOTAL/HOME/AWAY
  teamName?: string;       // se HOME/AWAY
  original: BetRecommendation;
  label: string;
};

/** Parser label del service:
 *  - "Over 10.5 Calci d'Angolo Totali"
 *  - "Under 22.5 Falli Totali"
 *  - "Over 4.5 Corner Juventus"
 *  - "Under 11.5 Tiri Inter"
 *  - "Over 5.5 Tiri in Porta Totali"
 *  - "Over 2.5 Cartellini Milan"
 */
function parseThresholdLabel(
  bet: BetRecommendation,
  homeTeam: string,
  awayTeam: string
): ParsedThresholdBet | null {
  const label = bet.label.trim();
  const re = /^(Over|Under)\s+(\d+(?:\.\d+)?)\s+(Calci d'Angolo|Corner|Falli|Tiri in Porta|Tiri|Cartellini)\s+(Totali|.+)$/i;
  const m = label.match(re);
  if (!m) return null;

  const side = (m[1] as 'Over' | 'Under');
  const threshold = parseFloat(m[2]);
  const market = m[3] as ThresholdMarket;
  const scopeToken = m[4];

  let scope: Scope = 'TOTAL';
  let teamName: string | undefined = undefined;

  if (/^Totali$/i.test(scopeToken)) {
    scope = 'TOTAL';
  } else {
    const t = scopeToken.trim();
    if (t.toLowerCase() === homeTeam.toLowerCase()) {
      scope = 'HOME';
      teamName = homeTeam;
    } else if (t.toLowerCase() === awayTeam.toLowerCase()) {
      scope = 'AWAY';
      teamName = awayTeam;
    } else {
      return null;
    }
  }

  return { kind: market, side, threshold, scope, teamName, original: bet, label: bet.label };
}

/** Raggruppa bet threshold in: groups[kind][scope][threshold] = { overProb, underProb } */
function groupThresholdBets(
  bets: BetRecommendation[],
  homeTeam: string,
  awayTeam: string
) {
  type Node = {
    overProb?: number;
    underProb?: number;
    overBet?: ParsedThresholdBet;
    underBet?: ParsedThresholdBet;
  };
  const groups: Record<string, Record<Scope, Record<number, Node>>> = {};

  for (const b of bets) {
    const parsed = parseThresholdLabel(b, homeTeam, awayTeam);
    if (!parsed) continue;

    const kindKey = parsed.kind; // stringa
    groups[kindKey] ??= { TOTAL: {}, HOME: {}, AWAY: {} };
    groups[kindKey][parsed.scope] ??= {};

    const th = parsed.threshold;
    groups[kindKey][parsed.scope][th] ??= {};

    const node = groups[kindKey][parsed.scope][th];
    if (parsed.side === 'Over') {
      node.overProb = parsed.original.probability;
      node.overBet = parsed;
    } else {
      node.underProb = parsed.original.probability;
      node.underBet = parsed;
    }
  }
  return groups;
}

/** === UI helpers === */

/** Badgetta il nome dello scope (Totali o Team) */
function ScopeBadge({ scope, homeTeam, awayTeam }: { scope: Scope; homeTeam: string; awayTeam: string }) {
  const label = scope === 'TOTAL' ? 'Totali' : scope === 'HOME' ? homeTeam : awayTeam;
  return (
    <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

/** Pill con percentuale e colore dinamico */
function ProbPill({ value, tone = 'over' }: { value?: number; tone?: 'over' | 'under' }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  const strong = value >= 70;
  const mid = value >= 55;
  const color =
    tone === 'over'
      ? strong ? 'bg-emerald-500/15 text-emerald-400'
        : mid ? 'bg-emerald-500/10 text-emerald-300'
        : 'bg-emerald-500/5 text-emerald-200'
      : strong ? 'bg-sky-500/15 text-sky-400'
        : mid ? 'bg-sky-500/10 text-sky-300'
        : 'bg-sky-500/5 text-sky-200';

  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', color)}>
      {value.toFixed(1)}%
    </span>
  );
}

/** Progress bar sottile per dare un colpo d’occhio */
function ThinBar({ value, tone = 'over' }: { value?: number; tone?: 'over' | 'under' }) {
  if (value === undefined) {
    return <div className="h-1 w-full rounded bg-muted/30" />;
  }
  const width = Math.max(0, Math.min(100, value));
  const barColor = tone === 'over' ? 'bg-emerald-500' : 'bg-sky-500';
  return (
    <div className="h-1 w-full rounded bg-muted/30">
      <div className={cn('h-1 rounded', barColor)} style={{ width: `${width}%` }} />
    </div>
  );
}

/** Skeleton per caricamento */
function SkeletonRow() {
  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-2"><div className="h-3 w-10 rounded bg-muted/30" /></td>
      <td className="px-4 py-2"><div className="h-3 w-16 rounded bg-muted/30" /></td>
      <td className="px-4 py-2"><div className="h-3 w-16 rounded bg-muted/30" /></td>
    </tr>
  );
}

export function RecommendedBets({ homeTeam, awayTeam, league }: RecommendedBetsProps) {
  const [bets, setBets] = useState<BetRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamsData, setTeamsData] = useState<Record<string, TeamPerformance>>({});
  const { addBet } = useBetSlip();

  useEffect(() => {
    async function loadDataAndCalculate() {
      setIsLoading(true);
      await loadAllBetsData();

      const tData: Record<string, TeamPerformance> = {};
      const homePerf = getTeamPerformance(homeTeam);
      const awayPerf = getTeamPerformance(awayTeam);
      if (homePerf) tData[homeTeam] = homePerf;
      if (awayPerf) tData[awayTeam] = awayPerf;
      setTeamsData(tData);

      const allBets = calculateRecommendedBets(homeTeam, awayTeam, league);
      const ordered = [...allBets].sort((a, b) => b.probability - a.probability);
      setBets(ordered);
      setIsLoading(false);
    }

    if (homeTeam && awayTeam && league) loadDataAndCalculate();
  }, [homeTeam, awayTeam, league]);

  const groups = useMemo(() => groupThresholdBets(bets, homeTeam, awayTeam), [bets, homeTeam, awayTeam]);

  // Altre bet (1X2, GG/NG, Multigol, Player props, ecc.)
  const otherBets = useMemo(() => bets.filter(b => !parseThresholdLabel(b, homeTeam, awayTeam)), [bets, homeTeam, awayTeam]);

  if (!homeTeam || !awayTeam || !league) return null;

  const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children }) => (
    <h3 className="text-[15px] tracking-wide font-semibold mt-6 mb-2 text-foreground">
      {children}
    </h3>
  );

  type TableProps = {
    title: string;
    scope: Scope;
    rows: Array<{ threshold: number; over?: ParsedThresholdBet; under?: ParsedThresholdBet }>;
  };

  const ThresholdTable: React.FC<TableProps> = ({ title, scope, rows }) => {
    const scopeLabel = scope === 'TOTAL' ? 'Totali' : scope === 'HOME' ? homeTeam : awayTeam;

    return (
      <div className="rounded-2xl border border-border bg-gradient-to-b from-background/60 to-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-medium">{title}</div>
            <ScopeBadge scope={scope} homeTeam={homeTeam} awayTeam={awayTeam} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/40">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Soglia</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Over %</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Under %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <SkeletonRow /><SkeletonRow /><SkeletonRow />
                </>
              ) : rows.length === 0 ? (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-3 text-muted-foreground" colSpan={3}>
                    Nessun dato per {title} • {scopeLabel}
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const overBet = r.over;
                  const underBet = r.under;
                  const overProb = overBet?.original.probability;
                  const underProb = underBet?.original.probability;

                  return (
                    <tr
                      key={`${title}-${scope}-${r.threshold}-${i}`}
                      className={cn(
                        'border-t border-border/60 transition-colors',
                        i % 2 === 0 ? 'bg-background/30' : 'bg-background/10',
                        'hover:bg-card/30'
                      )}
                    >
                      <td className="px-4 py-2 font-medium">{r.threshold}</td>

                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <ProbPill value={overProb} tone="over" />
                          <ThinBar value={overProb} tone="over" />
                        </div>
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <ProbPill value={underProb} tone="under" />
                          <ThinBar value={underProb} tone="under" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /** Converte la mappa in righe ordinate per soglia */
  function buildRowsFor(kindKey: string, scope: Scope) {
    const byScope = groups[kindKey]?.[scope];
    if (!byScope) return [];
    const thresholds = Object.keys(byScope)
      .map(k => parseFloat(k))
      .filter(n => !Number.isNaN(n))
      .sort((a, b) => a - b);

    return thresholds.map(th => {
      const node = byScope[th];
      return {
        threshold: th,
        over: node.overBet,
        under: node.underBet,
      };
    });
  }

  /** Card per “Altre scommesse” */
  const renderOtherBetCard = (bet: BetRecommendation, idx: number) => {
    const referencedTeam = getTeamFromBetLabel(bet.label, homeTeam, awayTeam);
    const logo = referencedTeam && teamsData[referencedTeam]?.logo;

    return (
      <motion.div
        key={`${bet.label}-${idx}`}
        className="relative p-4 rounded-2xl border border-border bg-gradient-to-b from-background/60 to-card/60 backdrop-blur-sm overflow-hidden flex items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.02 }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-card/50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        {logo ? (
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image src={logo} alt={referencedTeam || 'Team Logo'} fill className="object-contain" />
          </div>
        ) : (
          <MdSportsSoccer className="w-8 h-8 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <div className="text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
            {bet.label}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <ProbPill value={bet.probability} tone="over" />
            <ThinBar value={bet.probability} tone="over" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="p-5 md:p-6 mt-4 bg-card/70 text-card-foreground rounded-2xl border border-border/80 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-wide">Scommesse Consigliate</h2>
        <div className="text-xs text-muted-foreground">
          {homeTeam} <span className="opacity-60">vs</span> {awayTeam} • {league}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />
        </div>
      ) : (
        <>
          {/* CORNER */}
          <SectionTitle>Calci d&apos;Angolo (Over/Under per soglia)</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThresholdTable
              title="Corner"
              scope="TOTAL"
              rows={buildRowsFor("Calci d'Angolo", 'TOTAL').concat(buildRowsFor('Corner', 'TOTAL'))}
            />
            <ThresholdTable
              title="Corner"
              scope="HOME"
              rows={buildRowsFor("Calci d'Angolo", 'HOME').concat(buildRowsFor('Corner', 'HOME'))}
            />
            <ThresholdTable
              title="Corner"
              scope="AWAY"
              rows={buildRowsFor("Calci d'Angolo", 'AWAY').concat(buildRowsFor('Corner', 'AWAY'))}
            />
          </div>

          {/* FALLI */}
          <SectionTitle>Falli (Over/Under per soglia)</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThresholdTable title="Falli" scope="TOTAL" rows={buildRowsFor('Falli', 'TOTAL')} />
            <ThresholdTable title="Falli" scope="HOME" rows={buildRowsFor('Falli', 'HOME')} />
            <ThresholdTable title="Falli" scope="AWAY" rows={buildRowsFor('Falli', 'AWAY')} />
          </div>

          {/* TIRI */}
          <SectionTitle>Tiri (Over/Under per soglia)</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThresholdTable title="Tiri Totali" scope="TOTAL" rows={buildRowsFor('Tiri', 'TOTAL')} />
            <ThresholdTable title="Tiri Totali" scope="HOME" rows={buildRowsFor('Tiri', 'HOME')} />
            <ThresholdTable title="Tiri Totali" scope="AWAY" rows={buildRowsFor('Tiri', 'AWAY')} />
          </div>

          {/* TIRI IN PORTA */}
          <SectionTitle>Tiri in Porta (Over/Under per soglia)</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThresholdTable title="Tiri in Porta" scope="TOTAL" rows={buildRowsFor('Tiri in Porta', 'TOTAL')} />
            <ThresholdTable title="Tiri in Porta" scope="HOME" rows={buildRowsFor('Tiri in Porta', 'HOME')} />
            <ThresholdTable title="Tiri in Porta" scope="AWAY" rows={buildRowsFor('Tiri in Porta', 'AWAY')} />
          </div>

          {/* CARTELLINI */}
          <SectionTitle>Cartellini (Over/Under per soglia)</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThresholdTable title="Cartellini" scope="TOTAL" rows={buildRowsFor('Cartellini', 'TOTAL')} />
            <ThresholdTable title="Cartellini" scope="HOME" rows={buildRowsFor('Cartellini', 'HOME')} />
            <ThresholdTable title="Cartellini" scope="AWAY" rows={buildRowsFor('Cartellini', 'AWAY')} />
          </div>

          {/* ALTRE SCOMMESSE */}
          <SectionTitle>Altre scommesse</SectionTitle>
          {otherBets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna altra scommessa disponibile.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {otherBets.slice(0, 18).map(renderOtherBetCard)}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
