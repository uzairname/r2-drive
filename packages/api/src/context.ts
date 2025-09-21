import * as trpcNext from '@trpc/server/adapters/next';

export async function createContext(opts: trpcNext.CreateNextContextOptions) {
  return {
    // Add your context here
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
