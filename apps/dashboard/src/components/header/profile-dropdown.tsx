'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { LogIn, LogOut, Settings, Shield, User } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { SignInDialog } from '../file-navigator/sign-in-dialog'

export interface ProfileDropdownProps {
  /** Callback for settings action */
  onSettings?: () => void
}

export function ProfileDropdown({ onSettings }: ProfileDropdownProps = {}) {
  const { data: session, status } = useSession()
  const [showSignInDialog, setShowSignInDialog] = useState(false)

  const isLoggedIn = !!session
  const userName = session?.user?.name
  const userEmail = session?.user?.email
  const avatarUrl = session?.user?.image
  const isAdmin = !!session?.user?.isAdmin

  // Generate initials from userName for fallback
  const initials = userName
    ? userName
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null

  const handleLogin = () => {
    setShowSignInDialog(true)
  }

  const handleGoogleSignIn = async () => {
    console.log('Initiating Google sign-in...')
    try {
      console.log('signing in')
      const result = await signIn('google', {
        callbackUrl: '/explorer',
        redirect: false,
      })
      console.log('sign-in result:', result)

      if (result?.error) {
        console.error('Sign-in error:', result.error)
      } else {
        setShowSignInDialog(false)
      }
    } catch (error) {
      console.error('Authentication failed:', error)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName ?? 'User Avatar'} />}
              <AvatarFallback className="bg-primary/10 text-primary">
                {isLoggedIn ? initials : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          {isLoggedIn ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    {isAdmin && (
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 px-2 bg-amber-100 text-amber-800 border-amber-200"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettings} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Not signed in</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Sign in to access your account
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogin} className="cursor-pointer">
                <LogIn className="mr-2 h-4 w-4" />
                <span>Sign in</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SignInDialog
        open={showSignInDialog}
        setShowDialog={setShowSignInDialog}
        isLoading={status === 'loading'}
      />
    </>
  )
}
