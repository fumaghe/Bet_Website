import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';
import { BetSlipProvider } from '@/app/BetSlipContext'; // Assicurati che il percorso sia corretto

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BetScore',
  description: 'Piattaforma per statistiche e predizioni sportive',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BetSlipProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BetSlipProvider>
      </body>
    </html>
  );
}
