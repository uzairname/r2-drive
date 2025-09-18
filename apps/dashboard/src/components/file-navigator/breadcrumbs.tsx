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
import { Path, Paths } from "@/lib/path-system/path";

const max_visible_segments = 4

export interface R2BreadcrumbsProps {
  bucketName: string;
  path: Path;
  onClick: (path: Path) => void;
}

export function R2Breadcrumbs({ bucketName, path, onClick }: R2BreadcrumbsProps) {
  const [copied, setCopied] = React.useState(false);
  const successToast = useSuccessToast();

  const handleCopyLink = async () => {
    const pathParam = Paths.toURLSearchParams(path);
    const url = pathParam
      ? `${window.location.origin}/explorer?${pathParam}`
      : `${window.location.origin}/explorer`;

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);

    successToast(
      path.parts.length > 0
        ? `Copied link to folder "${path.name}"`
        : "Copied link to bucket root",
      { title: "Link Copied" }
    );
  };

  // Common breadcrumb button component
  const BreadcrumbButton = ({
    children,
    path,
    isFirst = false
  }: {
    children: React.ReactNode;
    path: Path;
    isFirst?: boolean;
  }) => (
    <Button variant="ghost" size="sm" onClick={() => onClick(path)} className="h-8 px-2">
      {isFirst && <HardDrive className="h-4 w-4 mr-1" />}
      {children}
    </Button>
  );

  // Common separator component
  const Separator = () => <ChevronRight className="h-4 w-4 text-muted-foreground" />;

  
  const renderBreadcrumbsContent = () => {
    if (path.parts.length === 0) {
      // For root level, no additional breadcrumbs
      return null
    }
    
    // For truncated view

    // List of intermediate folders as Paths, excluding root (which is rendered separately)
    const intermediatePaths = path.parts.map((_, index) => Paths.slice(path, index + 1));

    if (path.parts.length > max_visible_segments) {
      const lastTwoSegments = intermediatePaths.slice(-2);
      const hiddenSegments = intermediatePaths.slice(0, -2);

      return (
        <>
          {path.parts.length > 3 && (
            <>
              <Separator />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px]">
                  {hiddenSegments.map((segment, index) => {
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => onClick(segment)}
                      >
                        {segment.name || bucketName}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {lastTwoSegments.map((segment, index) => {
            const actualIndex = path.parts.length - 2 + index;
            return (
              <div key={actualIndex} className="flex items-center gap-2">
                <Separator />
                <BreadcrumbButton path={segment}>
                  {segment.name}
                </BreadcrumbButton>
              </div>
            );
          })}
        </>
      );
    }

    // For full view
    return (
      <>
        {intermediatePaths.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <Separator />
            <BreadcrumbButton path={segment}>
              {segment.name}
            </BreadcrumbButton>
          </div>
        ))}
      </>
    );
  };

  return (
    <nav className="overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm h-10">
          <BreadcrumbButton path={Paths.getRoot()} isFirst>
            {bucketName}
          </BreadcrumbButton>
          {renderBreadcrumbsContent()}
        </div>

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
