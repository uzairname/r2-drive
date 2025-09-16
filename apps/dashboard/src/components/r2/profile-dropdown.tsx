"use client";

import React, { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { User, LogIn, LogOut, Settings, Shield } from "lucide-react";
import { SignInDialog } from "./sign-in-dialog";

export interface ProfileDropdownProps {
  /** Callback for settings action */
  onSettings?: () => void;
  /** Callback for help action */
  onHelp?: () => void;
}

export function ProfileDropdown({
  onSettings,
  onHelp,
}: ProfileDropdownProps = {}) {
  const { data: session, status } = useSession();
  const [showSignInDialog, setShowSignInDialog] = useState(false);

  const isLoggedIn = !!session;
  const userName = session?.user?.name || "Guest User";
  const userEmail = session?.user?.email || "guest@example.com";
  const avatarUrl = session?.user?.image;
  const isAdmin = session?.user?.isAdmin || false;

  // Generate initials from userName for fallback
  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogin = () => {
    setShowSignInDialog(true);
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn('google', { 
        callbackUrl: '/explorer',
        redirect: false 
      });
      
      if (result?.error) {
        console.error('Sign-in error:', result.error);
      } else {
        setShowSignInDialog(false);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleSettings = () => {
    onSettings?.();
  };

  const handleHelp = () => {
    onHelp?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
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
                    <Badge variant="secondary" className="text-xs h-5 px-2 bg-amber-100 text-amber-800 border-amber-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
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
      onOpenChange={setShowSignInDialog}
      onGoogleSignIn={handleGoogleSignIn}
      isLoading={status === "loading"}
    />
    </>
  );
}