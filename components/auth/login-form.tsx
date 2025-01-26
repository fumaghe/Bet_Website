'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/auth-context'; // Importa il contesto di autenticazione

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth(); // Usa il contesto per aggiornare lo stato dell'utente

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!email.includes('@')) {
        throw new Error('Inserisci un indirizzo email valido');
      }
      if (password.length < 6) {
        throw new Error('La password deve essere di almeno 6 caratteri');
      }

      // Simula una chiamata API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Logica dummy per il login
      const dummyToken = 'dummy_token';
      login(email, dummyToken); // Aggiorna il contesto con email e token

      toast({
        title: 'Login effettuato',
        description: 'Benvenuto su BetScore!',
      });

      // Reindirizza alla pagina richiesta o alla home
      const from = searchParams.get('from') || '/';
      router.push(from);
    } catch (err: any) {
      setError(err.message || 'Errore durante il login. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative"
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="nome@esempio.com"
          value={email}
          disabled={isLoading}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-gray-300">
            Password
          </Label>
          <Button variant="link" className="px-0 text-xs text-green-400 hover:underline">
            Password dimenticata?
          </Button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="********"
          value={password}
          disabled={isLoading}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-medium bg-green-500 hover:bg-green-600 text-white transition-colors duration-300"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Accesso in corso...
          </div>
        ) : (
          'Accedi'
        )}
      </Button>

      <div className="text-center text-sm text-gray-400">
        Non hai un account?{' '}
        <Button variant="link" className="px-1 text-sm text-green-400 hover:underline">
          Registrati
        </Button>
      </div>
    </form>
  );
}
