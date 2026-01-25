import JSZip from 'jszip'

/**
 * Compresses multiple files into a single zip archive.
 * Preserves folder structure using webkitRelativePath when available.
 */
export async function compressFiles(files: File[]): Promise<File> {
  const zip = new JSZip()

  for (const file of files) {
    // Use webkitRelativePath if available (for folder uploads), otherwise just the filename
    const path = file.webkitRelativePath || file.name
    const arrayBuffer = await file.arrayBuffer()
    zip.file(path, arrayBuffer)
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // Generate a timestamp-based filename for the archive
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const archiveName = `upload-${timestamp}.zip`

  return new File([blob], archiveName, { type: 'application/zip' })
}
