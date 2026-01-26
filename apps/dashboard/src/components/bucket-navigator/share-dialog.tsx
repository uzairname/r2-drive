'use client'

import { TOKEN_PARAM } from '@/lib/constants'
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
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemPath: Path | null
}

type Permission = 'read' | 'write'
type Expiration = 'never' | '1d' | '7d' | '30d' | '90d'

const EXPIRATION_OPTIONS: { value: Expiration; label: string; ms: number | null }[] = [
  { value: 'never', label: 'Never', ms: null },
  { value: '1d', label: '1 day', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { value: '90d', label: '90 days', ms: 90 * 24 * 60 * 60 * 1000 },
]

export function ShareDialog({ open, onOpenChange, itemPath }: ShareDialogProps) {
  const [permission, setPermission] = useState<Permission>('read')
  const [expiration, setExpiration] = useState<Expiration>('never')
  const [label, setLabel] = useState('')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = trpc.sharing.create.useMutation()

  const handleCreate = useCallback(async () => {
    if (!itemPath) return

    const expirationOption = EXPIRATION_OPTIONS.find((o) => o.value === expiration)
    const expiresIn = expirationOption?.ms || undefined

    try {
      const result = await createMutation.mutateAsync({
        pathPrefix: itemPath.key,
        permission,
        label: label.trim() || undefined,
        expiresIn,
      })

      // Generate the share link
      const baseUrl = window.location.origin
      const shareUrl = `${baseUrl}?${TOKEN_PARAM}=${result.token}`
      setGeneratedLink(shareUrl)
    } catch (error) {
      console.error('Failed to create share link:', error)
    }
  }, [itemPath, permission, expiration, label, createMutation])

  const handleCopy = useCallback(() => {
    if (!generatedLink) return

    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedLink])

  const handleClose = useCallback(() => {
    setPermission('read')
    setExpiration('never')
    setLabel('')
    setGeneratedLink(null)
    setCopied(false)
    onOpenChange(false)
  }, [onOpenChange])

  const pathDisplay = itemPath
    ? itemPath.key === ''
      ? 'Root folder'
      : itemPath.isFolder
        ? `Folder: ${itemPath.name}`
        : `File: ${itemPath.name}`
    : ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Create Share Link
          </DialogTitle>
          <DialogDescription className="text-left">{pathDisplay}</DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-4">
            {/* Permission Selection */}
            <div className="space-y-2">
              <Label>Permission</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={permission === 'read' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPermission('read')}
                  className="flex-1"
                >
                  Read Only
                </Button>
                <Button
                  type="button"
                  variant={permission === 'write' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPermission('write')}
                  className="flex-1"
                >
                  Read & Write
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {permission === 'read'
                  ? 'Users can view and download files'
                  : 'Users can view, download, upload, rename, and delete files'}
              </p>
            </div>

            {/* Expiration Selection */}
            <div className="space-y-2">
              <Label>Expires</Label>
              <div className="flex flex-wrap gap-2">
                {EXPIRATION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={expiration === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpiration(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Optional Label */}
            <div className="space-y-2">
              <Label htmlFor="share-label">Label (optional)</Label>
              <Input
                id="share-label"
                type="text"
                placeholder="e.g., Shared with team"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link will have {permission} access
                {expiration !== 'never'
                  ? ` for ${EXPIRATION_OPTIONS.find((o) => o.value === expiration)?.label}`
                  : ''}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {generatedLink ? 'Done' : 'Cancel'}
          </Button>
          {!generatedLink && (
            <Button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
