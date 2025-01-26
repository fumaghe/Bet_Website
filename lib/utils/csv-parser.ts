'use client';

import Papa from 'papaparse';

export async function parseCSV<T>(csvContent: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as T[]);
      },
      error: (error: Error) => { // Tipo esplicito per error
        reject(error);
      }
    });    
  });
}
