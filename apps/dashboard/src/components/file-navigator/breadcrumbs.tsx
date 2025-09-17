import React from "react";
import { Button } from "@workspace/ui/components/button";
import { ChevronRight, HardDrive, MoreHorizontal, Link, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useSuccessToast } from "@workspace/ui/components/toast";

export interface R2BreadcrumbsProps {
  path: string[];
  onClick: (index: number) => void;
}

export function R2Breadcrumbs({ path, onClick }: R2BreadcrumbsProps) {
  const [copied, setCopied] = React.useState(false);
  const successToast = useSuccessToast();
  
  if (!path.length) return null;

  const handleCopyLink = async () => {
    const pathParam = path.slice(1).join("/"); // Remove bucket name from URL path
    const url = pathParam 
      ? `${window.location.origin}/explorer?path=${encodeURIComponent(pathParam)}`
      : `${window.location.origin}/explorer`;
    
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
    
    successToast(
      pathParam 
        ? `Copied link to folder "${pathParam}"`
        : "Copied link to bucket root",
      { title: "Link Copied" }
    );
  };

  // Determine if we need to truncate
  const maxVisibleSegments = 4; // Show first, last, and 2 in between, or truncate if more
  const shouldTruncate = path.length > maxVisibleSegments;

  const renderTruncatedBreadcrumbs = () => {
    const firstSegment = path[0];
    const lastTwoSegments = path.slice(-2);
    const hiddenSegments = path.slice(1, -2); // Segments between first and last two
    
    return (
      <div className="flex items-center gap-2 text-sm h-10">
        {/* First segment (bucket) */}
        <Button variant="ghost" size="sm" onClick={() => onClick(0)} className="h-8 px-2">
          <HardDrive className="h-4 w-4 mr-1" />
          {firstSegment}
        </Button>
        
        {path.length > 3 && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px]">
                {hiddenSegments.map((segment, index) => {
                  const actualIndex = index + 1; // +1 because we skip the first segment
                  return (
                    <DropdownMenuItem
                      key={actualIndex}
                      onClick={() => onClick(actualIndex)}
                      className="cursor-pointer"
                    >
                      {segment}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        
        {/* Last two segments */}
        {lastTwoSegments.map((segment, index) => {
          const actualIndex = path.length - 2 + index;
          return (
            <div key={actualIndex} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button variant="ghost" size="sm" onClick={() => onClick(actualIndex)} className="h-8 px-2">
                {segment}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFullBreadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm h-10">
      <Button variant="ghost" size="sm" onClick={() => onClick(0)} className="h-8 px-2">
        <HardDrive className="h-4 w-4 mr-1" />
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
  );

  return (
    <nav className="overflow-hidden">
      <div className="flex items-center justify-between">
        {shouldTruncate ? renderTruncatedBreadcrumbs() : renderFullBreadcrumbs()}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          className="h-8 px-2 ml-4 flex-shrink-0"
          title="Copy shareable link to current folder"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Link className="h-4 w-4" />
          )}
        </Button>
      </div>
    </nav>
  );
}
