import { NextResponse } from 'next/server';
import { loadStats, getAllStats } from '@/lib/services/stats-service';

export async function GET() {
  await loadStats();
  const stats = getAllStats();
  return NextResponse.json(stats);
}