import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  segments: {
    name: string;
    href: string;
  }[];
}

export function Breadcrumb({ segments, className, ...props }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/"
            className="overflow-hidden text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          const isLastItem = index === segments.length - 1;
          return (
            <React.Fragment key={segment.href}>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                {isLastItem ? (
                  <span className="font-medium text-foreground" aria-current="page">
                    {segment.name}
                  </span>
                ) : (
                  <Link
                    href={segment.href}
                    className="hover:text-foreground"
                  >
                    {segment.name}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}