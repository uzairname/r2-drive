import { NextResponse } from 'next/server';

export async function GET() {
  // Debug endpoint to check environment variables (remove after debugging)
  const envDebug = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  console.log('Environment Debug:', envDebug);

  return NextResponse.json(envDebug);
}