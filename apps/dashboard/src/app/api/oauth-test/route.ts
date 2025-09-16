import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const cloudflareEnv = env as any;
    
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Test OAuth configuration
    const oauthConfig = {
      timestamp: new Date().toISOString(),
      requestUrl: request.url,
      requestHost: request.headers.get('host'),
      requestOrigin: request.headers.get('origin'),
      requestProtocol: url.protocol,
      computedBaseUrl: baseUrl,
      
      environment: {
        NEXTAUTH_URL_from_env: cloudflareEnv.NEXTAUTH_URL,
        NEXTAUTH_URL_from_process: process.env.NEXTAUTH_URL,
        GOOGLE_CLIENT_ID_exists: !!cloudflareEnv.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET_exists: !!cloudflareEnv.GOOGLE_CLIENT_SECRET,
        NEXTAUTH_SECRET_exists: !!cloudflareEnv.NEXTAUTH_SECRET,
      },
      
      expectedUrls: {
        authUrl: `${cloudflareEnv.NEXTAUTH_URL || baseUrl}/api/auth`,
        signInUrl: `${cloudflareEnv.NEXTAUTH_URL || baseUrl}/api/auth/signin`,
        callbackUrl: `${cloudflareEnv.NEXTAUTH_URL || baseUrl}/api/auth/callback/google`,
        signOutUrl: `${cloudflareEnv.NEXTAUTH_URL || baseUrl}/api/auth/signout`,
      },
      
      googleConsoleSettings: {
        requiredJSOrigins: [
          cloudflareEnv.NEXTAUTH_URL || baseUrl
        ],
        requiredRedirectURIs: [
          `${cloudflareEnv.NEXTAUTH_URL || baseUrl}/api/auth/callback/google`
        ]
      },
      
      securityChecks: {
        isHTTPS: url.protocol === 'https:',
        hasProperDomain: url.hostname !== 'localhost',
        corsCheck: request.headers.get('sec-fetch-site'),
      }
    };

    return NextResponse.json(oauthConfig, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'OAuth config test failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}