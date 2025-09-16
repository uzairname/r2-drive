"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Chrome, HardDrive } from "lucide-react";

export interface SignInDialogProps {
  /** Whether the dialog is open */
  open?: boolean;
  /** Callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback when Google sign-in is clicked */
  onGoogleSignIn?: () => void;
  /** Whether the sign-in process is loading */
  isLoading?: boolean;
}

export function SignInDialog({
  open = false,
  onOpenChange,
  onGoogleSignIn,
  isLoading = false,
}: SignInDialogProps) {
  const handleGoogleSignIn = () => {
    onGoogleSignIn?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <HardDrive className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Welcome to R2 Drive</DialogTitle>
          <DialogDescription className="text-base">
            Sign in for write access to this bucket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 text-base font-medium"
                variant="outline"
              >
                <Chrome className="mr-3 h-5 w-5" />
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
