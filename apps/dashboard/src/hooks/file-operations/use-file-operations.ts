import { Path } from '@/lib/path'
import { useFileDelete } from './use-file-delete'
import { useFileDownload } from './use-file-download'
import { useFileUpload } from './use-file-upload'

export function useFileOperations({
  path,
  onFilesChange,
}: {
  path: Path
  onFilesChange: () => Promise<void>
}) {
  const upload = useFileUpload({ path, onFilesChange })
  const delete_ = useFileDelete({ onFilesChange })
  const download = useFileDownload()

  return {
    upload,
    delete: delete_,
    download,
  }
}
