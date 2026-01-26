'use client'

import { TOKEN_PARAM } from '@/lib/constants'
import { trpc } from '@/trpc/client'
import { Badge } from '@r2-drive/ui/components/badge'
import { Button } from '@r2-drive/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@r2-drive/ui/components/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@r2-drive/ui/components/table'
import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, Link2, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'

function formatDate(date: Date | string | null): string {
  if (!date) return 'Never'
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

interface SharesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SharesDrawer({ open, onOpenChange }: SharesDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null)

  const tokensQuery = trpc.sharing.list.useQuery(undefined, {
    enabled: open,
  })

  const deleteMutation = trpc.sharing.delete.useMutation({
    onSuccess: () => {
      tokensQuery.refetch()
      setTokenToDelete(null)
    },
  })

  const copyLink = useCallback((tokenId: string) => {
    const baseUrl = window.location.origin
    const shareUrl = `${baseUrl}?${TOKEN_PARAM}=${tokenId}`
    navigator.clipboard.writeText(shareUrl)
    setCopiedId(tokenId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const tokens = tokensQuery.data || []

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col px-0">
          <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 overflow-hidden">
            <SheetHeader className="px-6">
              <SheetTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Share Links
              </SheetTitle>
              <SheetDescription>
                Manage all share links for your files and folders
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-auto px-6 pb-4">
              {tokensQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No share links created yet. Share a file or folder to create one.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead className="max-w-[150px]">Label</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Accesses</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokens.map((token) => (
                        <TableRow key={token.id}>
                          <TableCell className="font-mono text-sm">
                            {token.pathPrefix === '' ? '/ (root)' : `/${token.pathPrefix}`}
                          </TableCell>
                          <TableCell
                            className="text-muted-foreground max-w-[150px] truncate"
                            title={token.label || undefined}
                          >
                            {token.label || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={token.permission === 'write' ? 'default' : 'secondary'}>
                              {token.permission}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(token.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {token.expiresAt ? formatDate(token.expiresAt) : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            {token.accessCount}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyLink(token.id)}
                                disabled={token.isExpired}
                                title="Copy link"
                              >
                                {copiedId === token.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTokenToDelete(token.id)}
                                title="Delete"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!tokenToDelete} onOpenChange={(open) => !open && setTokenToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Share Link
            </DialogTitle>
            <DialogDescription>
              This will permanently delete this share link record.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => tokenToDelete && deleteMutation.mutate({ tokenId: tokenToDelete })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
