import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context'; // Importa il contesto di autenticazione

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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
