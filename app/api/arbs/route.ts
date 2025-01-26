// app/api/arbs/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Arbitrage } from '@/lib/types/arbitrage'; // Assicurati che il percorso sia corretto

export async function GET(request: Request) {
  // Definisci il percorso assoluto al file arbs.json
  const filePath = path.join(process.cwd(), 'odds-checker', 'files', 'arbs.json');

  try {
    // Leggi il file arbs.json
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);

    // Trasforma l'oggetto in un array di Arbitrage
    const arbitrages: Arbitrage[] = Object.values(jsonData).flat().map((arb: any) => ({
      ...arb,
      foundAt: parseFloat(arb.foundAt), // Converti foundAt in numero
    }));

    return NextResponse.json(arbitrages);
  } catch (error) {
    console.error('Errore nella lettura o parsing di arbs.json:', error);
    return NextResponse.json({ error: 'Errore nel recupero degli arbitraggis' }, { status: 500 });
  }
}