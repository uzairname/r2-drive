import { useIsAdmin } from '@/hooks/use-admin'
import { usePermissions } from '@/hooks/use-permissions'
import { Path } from '@/lib/path'
import { Button } from '@r2-drive/ui/components/button'
import { Checkbox } from '@r2-drive/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@r2-drive/ui/components/dropdown-menu'
import { ScrollArea } from '@r2-drive/ui/components/scroll-area'
import { Skeleton } from '@r2-drive/ui/components/skeleton'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@r2-drive/ui/components/table'
import { formatBytes } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FolderOpen,
  Link2,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { ItemIcon } from './item-icon'

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    setIsTouch(query.matches)

    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  return isTouch
}

function FileRowActions({
  item,
  isTouchDevice,
  canWrite,
  isAdmin,
  onDownload,
  onShare,
  onRename,
  onDelete,
}: {
  item: UIR2Item
  isTouchDevice: boolean
  canWrite: boolean
  isAdmin: boolean
  onDownload: () => void
  onShare?: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 hover:bg-primary/10 ${isTouchDevice ? '' : 'invisible group-hover:visible'}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Actions for ${item.path.name}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </DropdownMenuItem>
        {isAdmin && onShare && (
          <DropdownMenuItem onClick={onShare}>
            <Link2 className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
        )}
        {canWrite && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRename} disabled={item.path.isFolder}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface TableSortProps {
  sortKey: 'name' | 'size' | 'lastModified'
  sortDirection: 'asc' | 'desc'
  onSort: (key: 'name' | 'size' | 'lastModified') => void
}

export function R2FileTable({
  items,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onFolderClick,
  onDeleteItem,
  onRenameItem,
  onDownloadItems,
  onShareItem,
  onPreviewItem,
  tableSort,
  isLoading,
}: {
  items: UIR2Item[]
  selectedItems: string[]
  onItemSelect: (key: string, shiftKey?: boolean) => void
  onSelectAll: () => void
  onFolderClick: (path: Path) => void
  onDeleteItem: (path: Path) => void
  onRenameItem: (path: Path) => void
  onDownloadItems: (paths: Path[]) => void
  onShareItem?: (path: Path) => void
  onPreviewItem?: (item: UIR2Item) => void
  tableSort?: TableSortProps
  isLoading?: boolean
}) {
  const { canWrite } = usePermissions()
  const { isAdmin } = useIsAdmin()
  const isTouchDevice = useIsTouchDevice()

  const handleRowClick = useCallback(
    (item: UIR2Item) => {
      if (item.path.isFolder) {
        onFolderClick(item.path)
      } else if (isTouchDevice && onPreviewItem) {
        // On touch devices, single tap opens preview for files
        onPreviewItem(item)
      }
    },
    [isTouchDevice, onFolderClick, onPreviewItem]
  )

  const renderSortIcon = (key: 'name' | 'size' | 'lastModified') => {
    if (!tableSort) return null
    if (tableSort.sortKey !== key)
      return <ArrowUpDown className="inline h-4 w-4 text-muted-foreground ml-1" />
    if (tableSort.sortDirection === 'asc')
      return <ArrowUp className="inline h-4 w-4 text-muted-foreground ml-1" />
    return <ArrowDown className="inline h-4 w-4 text-muted-foreground ml-1" />
  }

  const renderLoadingState = () => (
    <>
      {[...Array(5)].map((_, index) => (
        <TableRow key={index} className="border-b border-border">
          <TableCell>
            <div className="flex items-center justify-center">
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell></TableCell>
        </TableRow>
      ))}
    </>
  )

  const renderEmptyState = () => (
    <TableRow>
      <TableCell colSpan={5} className="text-center py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-muted p-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">This directory is empty</h3>
            <p className="text-sm text-muted-foreground">
              Upload files or create folders by dragging and dropping them here.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )

  const colGroup = (
    <colgroup>
      <col className="w-10" />
      <col className="min-w-[150px]" />
      <col className="w-20" />
      <col className="w-28" />
      <col className="w-12" />
    </colgroup>
  )

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <ScrollArea className="max-h-[70vh]">
        <table className="w-full min-w-[500px] text-sm">
          {colGroup}
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-card hover:bg-card border-b border-border">
              <TableHead className="cursor-pointer bg-card" onClick={onSelectAll}>
                <div className="flex items-center justify-center h-full w-full">
                  <Checkbox
                    checked={selectedItems.length === items.length && items.length > 0}
                    onCheckedChange={onSelectAll}
                    aria-label="Select all items"
                    className="cursor-pointer"
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-left cursor-pointer select-none bg-card"
                onClick={() => tableSort?.onSort('name')}
              >
                Name{renderSortIcon('name')}
              </TableHead>
              <TableHead
                className="text-left cursor-pointer select-none bg-card"
                onClick={() => tableSort?.onSort('size')}
              >
                Size{renderSortIcon('size')}
              </TableHead>
              <TableHead
                className="text-left cursor-pointer select-none bg-card"
                onClick={() => tableSort?.onSort('lastModified')}
              >
                Modified{renderSortIcon('lastModified')}
              </TableHead>
              <TableHead className="bg-card"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderLoadingState()
            ) : items.length === 0 ? (
              renderEmptyState()
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.path.key}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer group"
                  onClick={() => handleRowClick(item)}
                  onDoubleClick={() => !isTouchDevice && !item.path.isFolder && onPreviewItem?.(item)}
                >
                  <TableCell
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onItemSelect(item.path.key, e.shiftKey)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <div className="flex items-center justify-center h-full w-full">
                      <Checkbox
                        checked={selectedItems.includes(item.path.key)}
                        aria-label={`Select ${item.path.name}`}
                        className="cursor-pointer pointer-events-none"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        <ItemIcon item={item} />
                      </div>
                      <span className="font-medium text-foreground truncate" title={item.path.name}>
                        {item.path.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeof item.size === 'number' && !item.path.isFolder
                      ? formatBytes(item.size)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.lastModified?.toISOString().slice(0, 10) ?? '—'}
                  </TableCell>
                  <TableCell>
                    <FileRowActions
                      item={item}
                      isTouchDevice={isTouchDevice}
                      canWrite={canWrite(item.path.key)}
                      isAdmin={isAdmin}
                      onDownload={() => onDownloadItems([item.path])}
                      onShare={onShareItem ? () => onShareItem(item.path) : undefined}
                      onRename={() => onRenameItem(item.path)}
                      onDelete={() => onDeleteItem(item.path)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </ScrollArea>
    </div>
  )
}
