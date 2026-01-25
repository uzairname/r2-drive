import { Path } from '@/lib/path'
import { useFileDelete } from './use-file-delete'
import { useFileDownload } from './use-file-download'
import { useFileRename } from './use-file-rename'
import { useFileUpload } from './use-file-upload'

export function useFileOperations({
  path,
  onFilesChange,
  currentFiles,
}: {
  path: Path
  onFilesChange: () => Promise<void>
  currentFiles: string[]
}) {
  const upload = useFileUpload({ path, onFilesChange, currentFiles })
  const delete_ = useFileDelete({ onFilesChange })
  const download = useFileDownload()
  const rename = useFileRename({ path, onFilesChange })

  return {
    upload,
    delete: delete_,
    download,
    rename,
  }
}
