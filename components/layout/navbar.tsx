'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { email, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login'); // Reindirizza alla pagina di login
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-gradient-to-b from-background/95 to-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-8">
        {/* Logo e Nome */}
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <TrendingUp className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">BetScore</span>
          </Link>
        </div>

        {/* Links del Navbar */}
        <div className="flex items-center gap-6">
          <Link 
            href="/"
            className="text-sm font-medium transition-colors hover:text-primary relative group"
          >
            Home
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </Link>
          <Link 
            href="/stats"
            className="text-sm font-medium transition-colors hover:text-primary relative group"
          >
            Stats
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </Link>
          {!email ? (
            <Button 
              variant="secondary" 
              size="sm"
              className="px-6 font-medium"
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>My Bets</DropdownMenuItem>
                <DropdownMenuItem>Account Balance</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleLogout}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
