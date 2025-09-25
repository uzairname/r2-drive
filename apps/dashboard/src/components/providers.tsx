'use client'

import { trpc } from '@/trpc/client'
import { Toaster } from '@r2-drive/ui/components/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode, useState } from 'react'

export function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  const [queryClient] = useState(() => new QueryClient())

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            {children}
            <Toaster position="top-right" />
          </NextThemesProvider>
        </SessionProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
