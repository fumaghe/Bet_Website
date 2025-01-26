// app/api/stop/route.ts
import { NextResponse } from 'next/server';
import { getPythonProcess, setPythonProcess } from '../../../lib/utils/process';

export async function POST() {
  const pythonProcess = getPythonProcess();

  if (!pythonProcess) {
    return NextResponse.json({ message: 'Nessun processo Python in esecuzione.' }, { status: 400 });
  }

  try {
    // Invia il comando 'stop' tramite stdin
    pythonProcess.stdin?.write('stop\n');
    setPythonProcess(null); // Rimuovi il riferimento al processo

    return NextResponse.json({ message: 'Comando di terminazione inviato al processo Python.' }, { status: 200 });
  } catch (error) {
    console.error('Errore nell\'arresto del processo Python:', error);
    return NextResponse.json({ message: 'Errore nell\'arresto del processo Python.' }, { status: 500 });
  }
}
