// app/api/status/route.ts
import { NextResponse } from 'next/server';
import { getPythonProcess } from '../../../lib/utils/process';

export async function GET() {
  const pythonProcess = getPythonProcess();
  if (pythonProcess) {
    return NextResponse.json({ status: 'running' }, { status: 200 });
  } else {
    return NextResponse.json({ status: 'stopped' }, { status: 200 });
  }
}
