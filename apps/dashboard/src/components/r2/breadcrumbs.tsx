import React from "react";
import { Button } from "@workspace/ui/components/button";
import { ChevronRight, Home } from "lucide-react";

export interface R2BreadcrumbsProps {
  path: string[];
  onClick: (index: number) => void;
}

export function R2Breadcrumbs({ path, onClick }: R2BreadcrumbsProps) {
  if (!path.length) return null;
  return (
    <nav>
      <div className="flex items-center gap-2 text-sm h-10">
        <Button variant="ghost" size="sm" onClick={() => onClick(0)} className="h-8 px-2">
          <Home className="h-4 w-4 mr-1" />
          {path[0]}
        </Button>
        {path.slice(1).map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button variant="ghost" size="sm" onClick={() => onClick(index + 1)} className="h-8 px-2">
              {segment}
            </Button>
          </div>
        ))}
      </div>
    </nav>
  );
}
