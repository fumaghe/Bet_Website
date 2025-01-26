// lib/utils/process.ts
import { ChildProcess } from 'child_process';

/**
 * Restituisce il processo Python attualmente in esecuzione, se presente.
 */
export const getPythonProcess = (): ChildProcess | null => {
  return (global as any).pythonProcess;
};

/**
 * Imposta il processo Python.
 * @param proc - Il processo Python da impostare.
 */
export const setPythonProcess = (proc: ChildProcess | null): void => {
  (global as any).pythonProcess = proc;
};

// Inizializza la variabile globale se non esiste già
if (typeof (global as any).pythonProcess === 'undefined') {
  (global as any).pythonProcess = null;
}
