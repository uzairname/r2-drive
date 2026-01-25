import { NextRequest, NextResponse } from 'next/server'

const TOKEN_PARAM = 'token'
const TOKEN_COOKIE = 'r2-share-tokens'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const tokenParam = url.searchParams.get(TOKEN_PARAM)

  // If there's a token in the URL, add it to the cookie and redirect without the param
  if (tokenParam) {
    // Get existing tokens from cookie
    const existingCookie = request.cookies.get(TOKEN_COOKIE)?.value
    const existingTokens = existingCookie ? existingCookie.split(',').filter(Boolean) : []

    // Add new token if not already present
    if (!existingTokens.includes(tokenParam)) {
      existingTokens.push(tokenParam)
    }

    // Remove token from URL
    url.searchParams.delete(TOKEN_PARAM)

    // Redirect to the same path without the token param
    const response = NextResponse.redirect(url)

    // Set the cookie with all tokens
    response.cookies.set(TOKEN_COOKIE, existingTokens.join(','), {
      path: '/',
      httpOnly: false, // Allow client-side access for localStorage sync
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all paths except static files and api routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
