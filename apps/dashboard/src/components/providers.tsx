'use client'

import { PermissionsProvider } from '@/hooks/use-permissions'
import { trpc } from '@/trpc/client'
import { Toaster } from '@r2-drive/ui/components/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode, useState } from 'react'

function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Share tokens are now handled server-side via cookies (set by middleware)
  // No need to pass them in headers - the tRPC handler reads from cookies
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

export function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  return (
    <TRPCProvider>
      <SessionProvider session={session}>
        <PermissionsProvider>
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
        </PermissionsProvider>
      </SessionProvider>
    </TRPCProvider>
  )
}
