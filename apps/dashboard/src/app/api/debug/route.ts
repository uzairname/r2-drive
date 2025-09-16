import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    // Get Cloudflare context
    const { env } = await getCloudflareContext();
    
    // Type assertion for environment variables
    const cloudflareEnv = env as any;
    
    // Check environment variables
    const debugInfo = {
      timestamp: new Date().toISOString(),
      url: request.url,
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
      },
      environment: {
        NEXTAUTH_URL: cloudflareEnv.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'NOT_SET',
        GOOGLE_CLIENT_ID: cloudflareEnv.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET',
        GOOGLE_CLIENT_SECRET: cloudflareEnv.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET',
        NEXTAUTH_SECRET: cloudflareEnv.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET',
        ADMIN_EMAILS: cloudflareEnv.ADMIN_EMAILS ? 'SET' : 'NOT_SET',
        R2_BUCKET_NAME: cloudflareEnv.R2_BUCKET_NAME || 'NOT_SET',
        ENABLE_AUTH: cloudflareEnv.ENABLE_AUTH || 'NOT_SET',
        ALLOWED_ORIGINS: cloudflareEnv.ALLOWED_ORIGINS || 'NOT_SET',
      },
      oauth: {
        expectedRedirectURI: `${cloudflareEnv.NEXTAUTH_URL || process.env.NEXTAUTH_URL}/api/auth/callback/google`,
        expectedJSOrigin: cloudflareEnv.NEXTAUTH_URL || process.env.NEXTAUTH_URL,
      },
      nodeEnv: process.env.NODE_ENV,
      platform: 'Cloudflare Workers',
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug endpoint failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}