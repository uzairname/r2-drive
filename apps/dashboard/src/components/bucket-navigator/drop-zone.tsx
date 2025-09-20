import { Upload } from 'lucide-react'
import React, { ReactNode, useEffect, useState } from 'react'

interface DropZoneProps {
  onFileDrop?: (files: File[]) => void
  children: ReactNode
  className?: string
}

export function DropZone({ onFileDrop, children, className = '' }: DropZoneProps) {
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

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && onFileDrop) {
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
