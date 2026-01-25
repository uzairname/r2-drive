'use client'

import { Path } from '@/lib/path'
import { trpc } from '@/trpc/client'
import { Button } from '@r2-drive/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import { Input } from '@r2-drive/ui/components/input'
import { Label } from '@r2-drive/ui/components/label'
import { toast } from '@r2-drive/ui/components/sonner'
import { PathUtils } from '@r2-drive/utils/path'
import { safeAsync } from '@r2-drive/utils/result'
import { Edit } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface RenameDialogProps {
  show: boolean
  onOpenChange: (open: boolean) => void
  itemPath?: Path | null
  onSuccess?: () => void | Promise<void>
}

export function RenameDialog({
  show,
  onOpenChange,
  itemPath,
  onSuccess
}: RenameDialogProps) {

  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)

  const renameObject = trpc.r2.renameObject.useMutation()

  // Initialize with current name when dialog opens
  useEffect(() => {
    if (show && itemPath) {
      setNewName(itemPath.name)
      setIsRenaming(false)
      setError(null)
    }
  }, [show, itemPath])

  const handleConfirm = async () => {

    if (!itemPath) return

    if (!newName.trim()) {
      setError('Name cannot be empty')
      return
    }

    if (newName === itemPath?.name) {
      setError('New name must be different from the current name')
      return
    }

    if (/[/]/g.test(newName)) {
      setError('Name contains invalid characters')
      return
    }

    setError(null)
    setIsRenaming(true)

    console.log(`Renaming ${JSON.stringify(itemPath)} to ${newName}`)

    const newKey = PathUtils.rename(itemPath, newName).key

    const result = await safeAsync(() => renameObject.mutateAsync({
      oldPath: itemPath,
      newKey,
    }))

    if (!result.success) {
      setError(`Error renaming item: ${String(result.error)}`)
    } else {
      toast.success(`Renamed ${itemPath.name} to "${newName}"`)
      await onSuccess?.()
      onOpenChange?.(false)
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRenaming) {
      handleConfirm()
    }
  }

  return (
    <Dialog open={show} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Rename Item
          </DialogTitle>
          <DialogDescription>
            Enter a new name for &quot;{itemPath?.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">New Name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter new name"
              disabled={isRenaming}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isRenaming || !newName.trim()}
          >
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
