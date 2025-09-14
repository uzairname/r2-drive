"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AuthWrapperProps {
  children: React.ReactNode;
}

// This is a simple auth wrapper - in a real application, 
// you would implement proper authentication using Cloudflare Access
// or any other auth provider
export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  // For demo purposes, we're just setting isAuthenticated to true on button click
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">R2 Drive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Please login to access your R2 storage
            </p>
            <Button 
              className="w-full" 
              onClick={() => setIsAuthenticated(true)}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}