import { auth } from '@/auth'
import { Providers } from '@/components/providers'
import '@r2-drive/ui/globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

export const metadata: Metadata = {
  title: {
    default: 'R2 Drive',
    template: '%s | R2 Drive',
  },
  description: 'File explorer for Cloudflare R2 storage',
  manifest: '/manifest.json',
  themeColor: '#000000',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'R2 Drive',
  },
  formatDetection: {
    telephone: false,
  },
}

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetch the server-side session and pass it to the client SessionProvider
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
