import { Button } from '@r2-drive/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@r2-drive/ui/components/dropdown-menu'
import { FolderPlus, Plus, Upload } from 'lucide-react'

export interface FileActionButtonsProps {
  onUploadFile: () => void
  onUploadFolder: () => void
  onCreateFolder: () => void
}

export function FileActionButtons({
  onUploadFile,
  onUploadFolder,
  onCreateFolder,
}: FileActionButtonsProps) {
  return (
    <div className="flex justify-left mt-4">
      {/* Desktop: Show individual buttons */}
      <div className="hidden md:flex gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={onUploadFile}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={onUploadFolder}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Folder
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={onCreateFolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Folder
        </Button>
      </div>

      {/* Mobile: Show dropdown */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onUploadFile}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUploadFolder}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateFolder}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
