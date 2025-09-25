import { Path } from '@/lib/path'
import { useFileDelete } from './use-file-delete'
import { useFileDownload } from './use-file-download'
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

  return {
    upload,
    delete: delete_,
    download,
  }
}
