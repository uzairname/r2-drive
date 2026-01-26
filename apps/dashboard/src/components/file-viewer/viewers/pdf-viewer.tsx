'use client'

import { Button } from '@r2-drive/ui/components/button'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const [error, setError] = useState<string | null>(null)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  function onDocumentLoadError(err: Error) {
    setError(err.message)
  }

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5))

  if (error) {
    return (
      <div className="text-center text-white/80">
        <p className="text-red-400 mb-2">Failed to load PDF</p>
        <p className="text-sm text-white/60">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Fixed Controls */}
      <div className="flex-shrink-0 flex items-center justify-center mb-4">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
          <span className="text-white text-sm px-2">
            {numPages ? `${numPages} pages` : 'Loading...'}
          </span>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="text-white hover:bg-white/10 h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm px-1 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="text-white hover:bg-white/10 h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document - scrollable container with all pages */}
      <div className="flex-1 overflow-auto rounded-lg min-h-0">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center p-8">
              <span className="text-white/60">Loading PDF...</span>
            </div>
          }
          className="flex flex-col items-center gap-4"
        >
          {numPages &&
            Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            ))}
        </Document>
      </div>
    </div>
  )
}
