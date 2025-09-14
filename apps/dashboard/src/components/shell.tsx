"use client";

import * as React from "react";
import Link from "next/link";
import { FileIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type ShellProps = React.HTMLAttributes<HTMLDivElement>

export function Shell({ children, className, ...props }: ShellProps) {
  return (
    <div className={cn("min-h-screen", className)} {...props}>
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <FileIcon className="h-6 w-6" />
            <span className="font-bold">R2 Drive</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}