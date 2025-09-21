import { auth } from '@/auth'
import { Providers } from '@/components/providers'
import '@r2-drive/ui/globals.css'
import { Geist, Geist_Mono } from 'next/font/google'

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
