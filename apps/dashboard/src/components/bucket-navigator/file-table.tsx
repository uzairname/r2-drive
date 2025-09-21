import { AdminOnly } from '@/hooks/use-admin'
import { Path } from '@/lib/path'
import { Button } from '@r2-drive/ui/components/button'
import { Checkbox } from '@r2-drive/ui/components/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@r2-drive/ui/components/table'
import { truncateString } from '@r2-drive/ui/lib/utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, Download, Trash2 } from 'lucide-react'
import React from 'react'
import { formatBytes } from '../../lib/file-utils'
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
  onDownloadItems,
  tableSort,
}: {
  items: UIR2Item[]
  selectedItems: string[]
  onItemSelect: (key: string) => void
  onSelectAll: () => void
  onFolderClick: (path: Path) => void
  onDeleteItem: (path: Path) => void
  onDownloadItems: (paths: Path[]) => void
  tableSort?: TableSortProps
}) {
  const renderSortIcon = (key: 'name' | 'size' | 'lastModified') => {
    if (!tableSort) return null
    if (tableSort.sortKey !== key)
      return <ArrowUpDown className="inline h-4 w-4 text-muted-foreground ml-1" />
    if (tableSort.sortDirection === 'asc')
      return <ArrowUp className="inline h-4 w-4 text-muted-foreground ml-1" />
    return <ArrowDown className="inline h-4 w-4 text-muted-foreground ml-1" />
  }

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
            {items.map((item) => (
              <TableRow
                key={item.path.key}
                className="border-b border-border hover:bg-muted/50 cursor-pointer group"
                onClick={() => item.path.isFolder && onFolderClick(item.path)}
              >
                <TableCell
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onItemSelect(item.path.key)
                  }}
                >
                  <div className="flex items-center justify-center h-full w-full">
                    <Checkbox
                      checked={selectedItems.includes(item.path.key)}
                      onCheckedChange={() => onItemSelect(item.path.key)}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                      aria-label={`Select ${item.path.name}`}
                      className="cursor-pointer"
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
                      className="invisible group-hover:visible transition-all h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDownloadItems([item.path])
                      }}
                      aria-label={`Download ${item.path.name}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AdminOnly>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="invisible group-hover:visible transition-all h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteItem(item.path)
                        }}
                        aria-label={`Delete ${item.path.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AdminOnly>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
