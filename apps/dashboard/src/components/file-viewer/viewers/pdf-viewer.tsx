'use client'

import { Button } from '@r2-drive/ui/components/button'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [pdfComponents, setPdfComponents] = useState<{
    Document: typeof import('react-pdf').Document
    Page: typeof import('react-pdf').Page
  } | null>(null)

  // Dynamically import react-pdf only on client side
  useEffect(() => {
    Promise.all([
      import('react-pdf'),
      // @ts-expect-error CSS imports
      import('react-pdf/dist/Page/AnnotationLayer.css'),
      // @ts-expect-error CSS imports
      import('react-pdf/dist/Page/TextLayer.css'),
    ]).then(([module]) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${module.pdfjs.version}/build/pdf.worker.min.mjs`
      setPdfComponents({ Document: module.Document, Page: module.Page })
    })
  }, [])
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isEditingPage, setIsEditingPage] = useState(false)
  const [pageInputValue, setPageInputValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  function onDocumentLoadError(err: Error) {
    setError(err.message)
  }

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5))

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el)
    } else {
      pageRefs.current.delete(pageNum)
    }
  }, [])

  // Track current page based on scroll position
  useEffect(() => {
    const container = containerRef.current
    if (!container || !numPages) return

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.top + containerRect.height / 2

      let closestPage = 1
      let closestDistance = Infinity

      pageRefs.current.forEach((el, pageNum) => {
        const rect = el.getBoundingClientRect()
        const pageCenter = rect.top + rect.height / 2
        const distance = Math.abs(pageCenter - containerCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestPage = pageNum
        }
      })

      setCurrentPage(closestPage)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [numPages])

  const jumpToPage = useCallback((pageNum: number) => {
    const pageEl = pageRefs.current.get(pageNum)
    if (pageEl && containerRef.current) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handlePageClick = () => {
    if (!numPages) return
    setPageInputValue(String(currentPage))
    setIsEditingPage(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInputValue, 10)
    if (!isNaN(pageNum) && numPages && pageNum >= 1 && pageNum <= numPages) {
      jumpToPage(pageNum)
    }
    setIsEditingPage(false)
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingPage(false)
    }
  }

  if (error) {
    return (
      <div className="text-center text-white/80">
        <p className="text-red-400 mb-2">Failed to load PDF</p>
        <p className="text-sm text-white/60">{error}</p>
      </div>
    )
  }

  if (!pdfComponents) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-white/60">Loading PDF viewer...</span>
      </div>
    )
  }

  const { Document, Page } = pdfComponents

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Fixed Controls */}
      <div className="flex-shrink-0 flex items-center justify-center mb-4">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
          {numPages ? (
            isEditingPage ? (
              <div className="flex items-center text-white text-sm px-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  onBlur={handlePageInputSubmit}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-8 bg-white/20 rounded text-center outline-none"
                />
                <span className="ml-1">/ {numPages}</span>
              </div>
            ) : (
              <button
                onClick={handlePageClick}
                className="text-white text-sm px-2 hover:bg-white/10 rounded cursor-pointer"
              >
                {currentPage} / {numPages}
              </button>
            )
          ) : (
            <span className="text-white text-sm px-2">Loading...</span>
          )}
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
      <div ref={containerRef} className="flex-1 overflow-auto rounded-lg min-h-0">
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
              <div key={`page_${index + 1}`} ref={(el) => setPageRef(index + 1, el)}>
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>
            ))}
        </Document>
      </div>
    </div>
  )
}
