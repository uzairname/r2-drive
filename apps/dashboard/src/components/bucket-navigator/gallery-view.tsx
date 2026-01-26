import { useIsAdmin } from '@/hooks/use-admin'
import { usePermissions } from '@/hooks/use-permissions'
import { Path } from '@/lib/path'
import { Checkbox } from '@r2-drive/ui/components/checkbox'
import { Skeleton } from '@r2-drive/ui/components/skeleton'
import { getMimeType } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { FolderOpen } from 'lucide-react'
import { useCallback } from 'react'
import { FileRowActions } from './file-row-actions'
import { useIsTouchDevice } from './file-table'
import { ItemIcon } from './item-icon'
import { LazyThumbnail } from './lazy-thumbnail'
import { TruncatedText } from './truncated-text'

function isImageItem(item: UIR2Item): boolean {
  if (item.path.isFolder) return false
  const mimeType = item.contentType || getMimeType(item.path.name)
  return mimeType.startsWith('image/')
}

interface GalleryViewProps {
  items: UIR2Item[]
  selectedItems: string[]
  onItemSelect: (key: string, shiftKey?: boolean) => void
  onFolderClick: (path: Path) => void
  onDeleteItem: (path: Path) => void
  onRenameItem: (path: Path) => void
  onDownloadItems: (paths: Path[]) => void
  onShareItem?: (path: Path) => void
  onPreviewItem?: (item: UIR2Item) => void
  isLoading?: boolean
}

function GalleryTile({
  item,
  isSelected,
  isSelectionMode,
  onSelect,
  onClick,
  onDoubleClick,
  isTouchDevice,
  canWrite,
  isAdmin,
  onDownload,
  onShare,
  onRename,
  onDelete,
}: {
  item: UIR2Item
  isSelected: boolean
  isSelectionMode: boolean
  onSelect: (shiftKey?: boolean) => void
  onClick: () => void
  onDoubleClick: () => void
  isTouchDevice: boolean
  canWrite: boolean
  isAdmin: boolean
  onDownload: () => void
  onShare?: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`group relative flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border hover:bg-muted/50'
      }`}
      onClick={(e) => {
        if (isSelectionMode || e.shiftKey) {
          onSelect(e.shiftKey)
        } else {
          onClick()
        }
      }}
      onDoubleClick={onDoubleClick}
    >
      {/* Checkbox - top left */}
      <div
        className={`absolute top-2 left-2 z-10 transition-opacity ${
          isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(e.shiftKey)
        }}
      >
        <Checkbox
          checked={isSelected}
          aria-label={`Select ${item.path.name}`}
          className="cursor-pointer pointer-events-none"
        />
      </div>

      {/* Actions menu - top right */}
      <div
        className={`absolute top-2 right-2 z-10 ${
          isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <FileRowActions
          item={item}
          isTouchDevice={true}
          canWrite={canWrite}
          isAdmin={isAdmin}
          onDownload={onDownload}
          onShare={onShare}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>

      {/* Thumbnail or icon - center */}
      <div className="my-2 w-full px-1">
        {isImageItem(item) ? (
          <LazyThumbnail item={item} />
        ) : (
          <div className="aspect-square flex items-center justify-center">
            <ItemIcon item={item} size="lg" />
          </div>
        )}
      </div>

      {/* File name - bottom */}
      <TruncatedText className="text-sm font-medium text-foreground text-center w-full px-1">
        {item.path.name}
      </TruncatedText>
    </div>
  )
}

function GalleryLoadingState() {
  return (
    <>
      {[...Array(12)].map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center p-3 rounded-lg border border-border bg-card"
        >
          <Skeleton className="h-12 w-12 my-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </>
  )
}

function GalleryEmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="mt-4 space-y-2 text-center">
        <h3 className="text-lg font-medium text-foreground">This directory is empty</h3>
        <p className="text-sm text-muted-foreground">
          Upload files or create folders by dragging and dropping them here.
        </p>
      </div>
    </div>
  )
}

export function GalleryView({
  items,
  selectedItems,
  onItemSelect,
  onFolderClick,
  onDeleteItem,
  onRenameItem,
  onDownloadItems,
  onShareItem,
  onPreviewItem,
  isLoading,
}: GalleryViewProps) {
  const { canWrite } = usePermissions()
  const { isAdmin } = useIsAdmin()
  const isTouchDevice = useIsTouchDevice()
  const isSelectionMode = selectedItems.length > 0

  const handleTileClick = useCallback(
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

  const handleTileDoubleClick = useCallback(
    (item: UIR2Item) => {
      if (!isTouchDevice && !item.path.isFolder && onPreviewItem) {
        onPreviewItem(item)
      }
    },
    [isTouchDevice, onPreviewItem]
  )

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="max-h-[70vh] overflow-auto overscroll-contain">
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {isLoading ? (
              <GalleryLoadingState />
            ) : items.length === 0 ? (
              <GalleryEmptyState />
            ) : (
              items.map((item) => (
                <GalleryTile
                  key={item.path.key}
                  item={item}
                  isSelected={selectedItems.includes(item.path.key)}
                  isSelectionMode={isSelectionMode}
                  onSelect={(shiftKey) => onItemSelect(item.path.key, shiftKey)}
                  onClick={() => handleTileClick(item)}
                  onDoubleClick={() => handleTileDoubleClick(item)}
                  isTouchDevice={isTouchDevice}
                  canWrite={canWrite(item.path.key)}
                  isAdmin={isAdmin}
                  onDownload={() => onDownloadItems([item.path])}
                  onShare={onShareItem ? () => onShareItem(item.path) : undefined}
                  onRename={() => onRenameItem(item.path)}
                  onDelete={() => onDeleteItem(item.path)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
