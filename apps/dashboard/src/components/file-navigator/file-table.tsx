import { AdminOnly } from '@/hooks/use-admin'
import { Path } from '@/lib/path'
import { R2Item } from '@/lib/r2-client'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { truncateString } from '@workspace/ui/lib/utils'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Download,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  Folder,
  Image,
  Music,
  Trash2,
  Video,
} from 'lucide-react'
import React from 'react'
import { formatFileSize, getMimeType } from '../../lib/file-utils'

function itemToIcon(item: R2Item) {
  return item.path.isFolder ? (
    <Folder className="h-5 w-5 text-primary" />
  ) : (
    (() => {
      const mimeType = getMimeType(item.path.name)
      if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
      if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-pink-500" />
      if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />
      if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" /> // No FilePdf, use FileText
      if (
        mimeType === 'application/zip' ||
        mimeType === 'application/x-rar-compressed' ||
        mimeType === 'application/x-7z-compressed' ||
        mimeType === 'application/x-tar' ||
        mimeType === 'application/gzip'
      )
        return <Archive className="h-5 w-5 text-orange-500" />
      if (mimeType === 'application/json') return <FileJson className="h-5 w-5 text-green-500" />
      if (mimeType === 'text/plain' || mimeType === 'text/markdown')
        return <FileText className="h-5 w-5 text-muted-foreground" />
      if (
        mimeType === 'text/html' ||
        mimeType === 'text/css' ||
        mimeType === 'text/javascript' ||
        mimeType === 'text/typescript' ||
        mimeType === 'application/xml'
      )
        return <FileCode className="h-5 w-5 text-yellow-500" />
      if (
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'text/csv' ||
        mimeType === 'text/tab-separated-values'
      )
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />
      if (
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
        return <FileText className="h-5 w-5 text-blue-700" /> // No FileWord, use FileText
      if (
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
        return <FileType2 className="h-5 w-5 text-orange-600" /> // No FilePpt, use FileType2
      return <FileType2 className="h-5 w-5 text-muted-foreground" />
    })()
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
  onDownloadItem,
  tableSort,
}: {
  items: R2Item[]
  selectedItems: string[]
  onItemSelect: (key: string) => void
  onSelectAll: () => void
  onFolderClick: (path: Path) => void
  onDeleteItem?: (path: Path) => void
  onDownloadItem?: (path: Path) => void
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
    <div className="border border-border rounded-lg bg-card overflow-hidden">
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
                    {itemToIcon(item)}
                    <span className="font-medium text-foreground" title={item.path.name}>
                      {truncateString(item.path.name, 40)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {typeof item.size === 'number' && !item.path.isFolder
                    ? formatFileSize(item.size)
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
                    {onDownloadItem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownloadItem(item.path)
                        }}
                        aria-label={`Download ${item.path.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}

                    <AdminOnly>
                      {onDeleteItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteItem(item.path)
                          }}
                          aria-label={`Delete ${item.path.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
