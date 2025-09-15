"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (folderName: string) => Promise<{ success: boolean; errorMessage?: string }>;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || isCreating) return;

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const result = await onCreateFolder(folderName.trim());
      if (result.success) {
        setFolderName("");
        onOpenChange(false);
      } else {
        setErrorMessage(result.errorMessage || "Failed to create folder");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      if (!newOpen) {
        setFolderName("");
        setErrorMessage(null);
      }
      onOpenChange(newOpen);
    }
  };

  const validateFolderName = (name: string) => {
    if (!name.trim()) return "Folder name cannot be empty";
    if (/[<>:"/\\|?*]/.test(name)) return "Folder name contains invalid characters";
    return null;
  };

  const validationError = folderName ? validateFolderName(folderName) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <input
              type="text"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isCreating}
              autoFocus
            />
            {(validationError && errorMessage) && (
              <p className="mt-2 text-sm text-red-600">
                {validationError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || !!validationError || isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}