import { Button } from '@r2-drive/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@r2-drive/ui/components/dropdown-menu'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { Download, Link2, MoreVertical, Pencil, Trash2 } from 'lucide-react'

export function FileRowActions({
  item,
  isTouchDevice,
  canWrite,
  isAdmin,
  onDownload,
  onShare,
  onRename,
  onDelete,
  className,
}: {
  item: UIR2Item
  isTouchDevice: boolean
  canWrite: boolean
  isAdmin: boolean
  onDownload: () => void
  onShare?: () => void
  onRename: () => void
  onDelete: () => void
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 hover:bg-primary/10 ${isTouchDevice ? '' : 'invisible group-hover:visible'} ${className ?? ''}`}
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
