'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, TrendingUp, Trophy, BarChart3, Ticket, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LEAGUES } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS = [
  { icon: TrendingUp, label: 'Scommetti', href: '/' },
  { icon: Trophy, label: 'Competizioni', href: '/competitions' },
  { icon: BarChart3, label: 'Statistiche', href: '/stats' },
  { icon: Ticket, label: 'Le Mie Scommesse', href: '/my-bets' },
  { icon: Scale, label: 'Arbitraggio Live', href: '/terminal' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Bottone per aprire/chiudere la sidebar nella vista mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-56 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-r',
          'transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ScrollArea className="h-full">
          <div className="flex flex-col p-4">
            {/* Navigazione principale */}
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <Separator className="my-4" />

            {/* Competizioni */}
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-medium text-muted-foreground mb-2">
                Competizioni
              </h3>
              {LEAGUES.map((league) => {
                // Costruisci l'URL dinamico
                const leagueSlug = league.name.toLowerCase().replace(/\s+/g, '-'); // Converti il nome del campionato in formato slug

                return (
                  <Link
                    key={league.name}
                    href={`/leagues/${leagueSlug}`} // Percorso dinamico basato sullo slug
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      pathname === `/leagues/${leagueSlug}`
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <img
                      src={league.icon} // Icona del campionato
                      alt={league.name} // Alt per l'accessibilità
                      className="h-6 w-6 rounded-md"
                    />
                    <span>{league.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
