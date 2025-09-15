import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Trash2, Download } from "lucide-react";

export interface R2SelectionInfoProps {
  count: number;
  onDelete?: () => void;
  onDownload?: () => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
}

export function R2SelectionInfo({ count, onDelete, onDownload, isDeleting, isDownloading }: R2SelectionInfoProps) {
  if (count === 0) return null;
  return (
    <div className="mt-4 p-3 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {count} item{count !== 1 ? "s" : ""} selected
        </p>
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
