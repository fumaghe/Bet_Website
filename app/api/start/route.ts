// app/api/start/route.ts
import { NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { getPythonProcess, setPythonProcess } from '../../../lib/utils/process';

export async function POST() {
  if (getPythonProcess()) {
    return NextResponse.json({ message: 'Il processo Python è già in esecuzione.' }, { status: 400 });
  }

  // Definisci il percorso assoluto a main.py
  const scriptPath = path.join(process.cwd(), 'odds-checker', 'main.py');

  // Avvia il processo Python con stdin configurato come pipe
  const pythonProcess: ChildProcess = spawn('python', [scriptPath], {
    cwd: path.join(process.cwd(), 'odds-checker'),
    shell: true, // Necessario su Windows
    stdio: ['pipe', 'inherit', 'inherit'], // stdin come pipe
  });

  // Gestisci gli eventi del processo
  pythonProcess.on('close', (code: number) => {
    console.log(`Processo Python terminato con codice ${code}`);
    setPythonProcess(null);
  });

  pythonProcess.on('error', (err: Error) => {
    console.error('Errore nel processo Python:', err);
    setPythonProcess(null);
  });

  setPythonProcess(pythonProcess);
  return NextResponse.json({ message: 'Processo Python avviato.' }, { status: 200 });
}
