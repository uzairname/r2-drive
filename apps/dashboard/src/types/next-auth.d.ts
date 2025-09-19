import { DefaultSession, DefaultUser } from 'next-auth'

// Extend the session and user types to include isAdmin

declare module 'next-auth' {
  interface Session {
    user?: {
      isAdmin?: boolean
    } & DefaultSession['user']
  }
  interface User extends DefaultUser {
    isAdmin?: boolean
  }
}
