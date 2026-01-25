import { Upload } from 'lucide-react'
import React, { ReactNode, useEffect, useState } from 'react'

interface DropZoneProps {
  onFileDrop?: (files: File[]) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}

/**
 * Recursively traverses directories from DataTransferItems and returns all files.
 * This handles folder drag-and-drop by using the FileSystem API.
 */
async function getAllFilesFromDataTransferItems(items: DataTransferItem[]): Promise<File[]> {
  const files: File[] = []

  async function traverseEntry(entry: FileSystemEntry, path = ''): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      
      // Set the webkitRelativePath to match folder upload behavior
      if (path) {
        Object.defineProperty(file, 'webkitRelativePath', {
          value: path + file.name,
          writable: false,
        })
      }
      
      files.push(file)
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      
      // Read all entries in the directory
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
      })
      
      // Recursively traverse each entry
      const newPath = path + entry.name + '/'
      await Promise.all(entries.map((entry) => traverseEntry(entry, newPath)))
    }
  }

  // Process all items
  for (const item of items) {
    const entry = item.webkitGetAsEntry()
    if (entry) {
      await traverseEntry(entry)
    }
  }

  return files
}

export function DropZone({ onFileDrop, children, className = '', disabled = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  // Reset drag state when drag operations end globally
  useEffect(() => {
    const handleGlobalDragEnd = () => setIsDragOver(false)
    const handleGlobalDrop = () => setIsDragOver(false)

    document.addEventListener('dragend', handleGlobalDragEnd)
    document.addEventListener('drop', handleGlobalDrop)

    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
      document.removeEventListener('drop', handleGlobalDrop)
    }
  }, [])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Only hide overlay if leaving the container bounds
    const rect = e.currentTarget.getBoundingClientRect()
    const { clientX: x, clientY: y } = e

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const items = Array.from(e.dataTransfer.items)
    if (items.length > 0 && onFileDrop) {
      const files = await getAllFilesFromDataTransferItems(items)
      onFileDrop(files)
    }
  }

  return (
    <div
      className={`relative ${className} ${
        isDragOver ? 'border-primary border-2 bg-primary/5' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div
          className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center pointer-events-none"
          style={{ minHeight: '200px' }}
        >
          <div className="bg-card/95 rounded-lg p-6 border border-primary/20 shadow-lg">
            <div className="flex flex-col items-center gap-3 text-primary">
              <Upload className="h-8 w-8" />
              <p className="text-lg font-medium">Drop files or folders here</p>
              <p className="text-sm text-muted-foreground">
                Release to upload to current directory
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
