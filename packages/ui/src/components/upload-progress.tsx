import React from "react";
import { Progress } from "./progress";
import { CheckCircle, XCircle, Upload, Zap } from "lucide-react";

export interface UploadProgressItem {
  fileName: string;
  progress: number; // 0-100
  completed: boolean;
  error?: string;
  isMultipart?: boolean;
}

export interface UploadProgressProps {
  uploads: UploadProgressItem[];
  isVisible: boolean;
  onClose?: () => void;
}

export function UploadProgress({ uploads, isVisible, onClose }: UploadProgressProps) {
  if (!isVisible || uploads.length === 0) return null;

  const completedUploads = uploads.filter(upload => upload.completed && !upload.error);
  const failedUploads = uploads.filter(upload => upload.error);
  
  const overallProgress = uploads.length > 0 
    ? Math.round((completedUploads.length / uploads.length) * 100)
    : 0;

  const hasLargeFiles = uploads.some(upload => upload.isMultipart);

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          <span className="font-medium text-sm">
            Uploading {uploads.length} file{uploads.length !== 1 ? 's' : ''}
          </span>
          {hasLargeFiles && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Zap className="h-3 w-3" />
              <span>Multipart</span>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Overall Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Individual File Progress */}
      <div className="max-h-32 overflow-y-auto space-y-2">
        {uploads.map((upload, index) => (
          <div key={`${upload.fileName}-${index}`} className="text-xs">
            <div className="flex items-center gap-2 mb-1">
              {upload.error ? (
                <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
              ) : upload.completed ? (
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <div className="h-3 w-3 border border-muted-foreground rounded-full animate-spin flex-shrink-0" />
              )}
              <span className="truncate flex-1" title={upload.fileName}>
                {upload.fileName}
              </span>
              {upload.isMultipart && !upload.error && (
                <div title="Large file upload">
                  <Zap className="h-3 w-3 text-blue-500 flex-shrink-0" />
                </div>
              )}
              <span className="text-muted-foreground">
                {upload.error ? "Failed" : upload.completed ? "Done" : `${upload.progress}%`}
              </span>
            </div>
            {!upload.completed && !upload.error && (
              <Progress value={upload.progress} className="h-1" />
            )}
            {upload.error && (
              <div className="text-destructive text-xs mt-1 truncate" title={upload.error}>
                {upload.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {(completedUploads.length > 0 || failedUploads.length > 0) && (
        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
          {completedUploads.length > 0 && (
            <div>✓ {completedUploads.length} completed</div>
          )}
          {failedUploads.length > 0 && (
            <div className="text-destructive">✗ {failedUploads.length} failed</div>
          )}
          {hasLargeFiles && (
            <div className="text-blue-600 mt-1">⚡ Multipart uploads used for large files</div>
          )}
        </div>
      )}
    </div>
  );
}