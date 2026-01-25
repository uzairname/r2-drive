'use client'

import { useIsAdmin } from '@/hooks/use-admin'
import { trpc } from '@/trpc/client'
import { Badge } from '@r2-drive/ui/components/badge'
import { Button } from '@r2-drive/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@r2-drive/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@r2-drive/ui/components/table'
import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, Link2, Loader2, Trash2, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'

function formatDate(date: Date | string | null): string {
  if (!date) return 'Never'
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

function TokenStatus({ isExpired }: { isExpired: boolean }) {
  if (isExpired) {
    return <Badge variant="secondary">Expired</Badge>
  }
  return <Badge variant="default">Active</Badge>
}

export default function SharesPage() {
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null)

  const tokensQuery = trpc.sharing.list.useQuery(undefined, {
    enabled: isAdmin,
  })

  const deleteMutation = trpc.sharing.delete.useMutation({
    onSuccess: () => {
      tokensQuery.refetch()
      setTokenToDelete(null)
    },
  })

  const copyLink = useCallback((tokenId: string) => {
    const baseUrl = window.location.origin
    const shareUrl = `${baseUrl}?token=${tokenId}`
    navigator.clipboard.writeText(shareUrl)
    setCopiedId(tokenId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You must be an admin to view this page.</p>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Go Home
        </Button>
      </div>
    )
  }

  const tokens = tokensQuery.data || []
  const activeTokens = tokens.filter((t) => !t.isExpired)
  const expiredTokens = tokens.filter((t) => t.isExpired)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-8 w-8" />
          Share Links
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage all share links for your files and folders
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTokens.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredTokens.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Share Links</CardTitle>
          <CardDescription>
            {tokens.length} total share link{tokens.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokensQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No share links created yet. Share a file or folder to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {token.label || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.permission === 'write' ? 'default' : 'secondary'}>
                        {token.permission}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TokenStatus isExpired={token.isExpired} />
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
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
