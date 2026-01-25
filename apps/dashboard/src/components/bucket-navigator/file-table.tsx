import { AdminOnly } from '@/hooks/use-admin'
import { usePermissions } from '@/hooks/use-permissions'
import { Path } from '@/lib/path'
import { Button } from '@r2-drive/ui/components/button'
import { Checkbox } from '@r2-drive/ui/components/checkbox'
import { Skeleton } from '@r2-drive/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@r2-drive/ui/components/table'
import { truncateString } from '@r2-drive/ui/lib/utils'
import { formatBytes } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, Download, FolderOpen, Link2, Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { ItemIcon } from './item-icon'

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
  tableSort?: TableSortProps
  isLoading?: boolean
}) {
  const { canWrite } = usePermissions()

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
              <Skeleton className="h-4 w-48" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          </TableCell>
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

  return (
    <div className="overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="border-b border-border">
              <TableHead className="w-12 cursor-pointer bg-card" onClick={onSelectAll}>
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
                className="text-left w-32 cursor-pointer select-none bg-card"
                onClick={() => tableSort?.onSort('size')}
              >
                Size{renderSortIcon('size')}
              </TableHead>
              <TableHead
                className="text-left w-48 cursor-pointer select-none bg-card"
                onClick={() => tableSort?.onSort('lastModified')}
              >
                Last Modified{renderSortIcon('lastModified')}
              </TableHead>
              <TableHead className="w-12 bg-card"></TableHead>
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
                  onClick={() => item.path.isFolder && onFolderClick(item.path)}
                >
                  <TableCell
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onItemSelect(item.path.key, e.shiftKey)
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
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ItemIcon item={item} />
                      <span className="font-medium text-foreground" title={item.path.name}>
                        {truncateString(item.path.name, 40)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeof item.size === 'number' && !item.path.isFolder
                      ? formatBytes(item.size)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {item.lastModified?.toISOString().slice(0, 10) ?? '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="invisible group-hover:visible transition-none h-8 w-8 p-0 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownloadItems([item.path])
                        }}
                        aria-label={`Download ${item.path.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AdminOnly>
                        {onShareItem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="invisible group-hover:visible transition-none h-8 w-8 p-0 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              onShareItem(item.path)
                            }}
                            aria-label={`Share ${item.path.name}`}
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                        )}
                      </AdminOnly>
                      {canWrite(item.path.key) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={item.path.isFolder}
                            className="invisible group-hover:visible transition-none h-8 w-8 p-0 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRenameItem(item.path)
                            }}
                            aria-label={`Rename ${item.path.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="invisible group-hover:visible transition-none h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteItem(item.path)
                            }}
                            aria-label={`Delete ${item.path.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
