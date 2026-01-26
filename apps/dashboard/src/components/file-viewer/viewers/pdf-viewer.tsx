'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@r2-drive/ui/components/button'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface PdfViewerProps {
  url: string
}

// Debounce hook for zoom optimization
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Estimated page height for placeholder sizing (will be updated with actual dimensions)
const ESTIMATED_PAGE_HEIGHT = 792 // Standard letter size at 72 DPI
const ESTIMATED_PAGE_WIDTH = 612
const PAGE_GAP = 16

export function PdfViewer({ url }: PdfViewerProps) {
  const isMobile = useIsMobile()
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
  const [isInteracting, setIsInteracting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const pageDimensions = useRef<Map<number, { width: number; height: number }>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce scale for smoother zooming - render at full quality after zoom stops
  const debouncedScale = useDebouncedValue(scale, 150)

  // For mobile: fit PDF width to screen
  const [mobileWidth, setMobileWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (isMobile && containerRef.current) {
      // On mobile, fit to screen width (with padding)
      setMobileWidth(containerRef.current.clientWidth - 16)
    } else {
      setMobileWidth(undefined)
    }
  }, [isMobile])

  // Virtualization: only render pages near the viewport
  const visiblePages = useMemo(() => {
    if (!numPages) return new Set<number>()
    const buffer = 2 // Render 2 pages before and after current
    const start = Math.max(1, currentPage - buffer)
    const end = Math.min(numPages, currentPage + buffer)
    const pages = new Set<number>()
    for (let i = start; i <= end; i++) {
      pages.add(i)
    }
    return pages
  }, [currentPage, numPages])

  // Determine render scale - use lower quality during interactions for performance
  const renderScale = useMemo(() => {
    if (isMobile) return undefined
    // During interaction, use the immediate scale for responsiveness
    // After interaction settles, use debounced scale for quality
    return isInteracting ? scale : debouncedScale
  }, [isMobile, isInteracting, scale, debouncedScale])

  // Track interaction state for lower-res rendering during scroll/zoom
  const handleInteractionStart = useCallback(() => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current)
    }
    setIsInteracting(true)
  }, [])

  const handleInteractionEnd = useCallback(() => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current)
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false)
    }, 150)
  }, [])

  // Get page dimensions for placeholder sizing
  const getPageHeight = useCallback(
    (pageNum: number) => {
      const dims = pageDimensions.current.get(pageNum)
      if (dims) {
        return dims.height * (isMobile ? 1 : debouncedScale)
      }
      return ESTIMATED_PAGE_HEIGHT * (isMobile ? 1 : debouncedScale)
    },
    [isMobile, debouncedScale]
  )

  const getPageWidth = useCallback(
    (pageNum: number) => {
      if (isMobile && mobileWidth) return mobileWidth
      const dims = pageDimensions.current.get(pageNum)
      if (dims) {
        return dims.width * debouncedScale
      }
      return ESTIMATED_PAGE_WIDTH * debouncedScale
    },
    [isMobile, mobileWidth, debouncedScale]
  )

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  function onDocumentLoadError(err: Error) {
    setError(err.message)
  }

  const zoomIn = useCallback(() => {
    handleInteractionStart()
    setScale((prev) => Math.min(prev + 0.25, 3))
    handleInteractionEnd()
  }, [handleInteractionStart, handleInteractionEnd])

  const zoomOut = useCallback(() => {
    handleInteractionStart()
    setScale((prev) => Math.max(prev - 0.25, 0.5))
    handleInteractionEnd()
  }, [handleInteractionStart, handleInteractionEnd])

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el)
    } else {
      pageRefs.current.delete(pageNum)
    }
  }, [])

  // Store actual page dimensions when a page loads
  const handlePageLoadSuccess = useCallback(
    (pageNum: number) =>
      (page: { width: number; height: number; originalWidth: number; originalHeight: number }) => {
        pageDimensions.current.set(pageNum, {
          width: page.originalWidth,
          height: page.originalHeight,
        })
      },
    []
  )

  // Track current page based on scroll position with interaction detection
  useEffect(() => {
    const container = containerRef.current
    if (!container || !numPages) return

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      // Mark as interacting during scroll
      handleInteractionStart()

      // Debounce interaction end
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        handleInteractionEnd()
      }, 150)

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

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [numPages, handleInteractionStart, handleInteractionEnd])

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

  const pageIndicator = numPages ? (
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
  )

  const zoomControls = (
    <>
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
    </>
  )

  const pdfDocument = (
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
        Array.from({ length: numPages }, (_, index) => {
          const pageNum = index + 1
          const isVisible = visiblePages.has(pageNum)

          return (
            <div
              key={`page_${pageNum}`}
              ref={(el) => setPageRef(pageNum, el)}
              style={{
                // Use calculated dimensions for placeholder to maintain scroll position
                minHeight: isVisible ? undefined : getPageHeight(pageNum),
                minWidth: isVisible ? undefined : getPageWidth(pageNum),
              }}
            >
              {isVisible ? (
                <Page
                  pageNumber={pageNum}
                  width={isMobile ? mobileWidth : undefined}
                  scale={renderScale}
                  renderTextLayer={!isMobile && !isInteracting}
                  renderAnnotationLayer={!isMobile && !isInteracting}
                  onLoadSuccess={handlePageLoadSuccess(pageNum)}
                  loading={
                    <div
                      className="bg-white/5 animate-pulse rounded"
                      style={{
                        width: getPageWidth(pageNum),
                        height: getPageHeight(pageNum),
                      }}
                    />
                  }
                />
              ) : (
                // Placeholder for non-visible pages
                <div
                  className="bg-white/5 rounded"
                  style={{
                    width: getPageWidth(pageNum),
                    height: getPageHeight(pageNum),
                  }}
                />
              )}
            </div>
          )
        })}
    </Document>
  )

  // Mobile: pinch-to-zoom view with centered content
  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full">
        {/* Mobile Controls - page indicator only */}
        <div className="flex-shrink-0 flex items-center justify-center py-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            {pageIndicator}
          </div>
        </div>

        {/* PDF Document - pinch-to-zoom enabled, centered */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            minHeight: 0,
          }}
        >
          <div className="flex flex-col items-center min-h-full p-2 touch-manipulation">
            {pdfDocument}
          </div>
        </div>
      </div>
    )
  }

  // Desktop: normal view
  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Fixed Controls */}
      <div className="flex-shrink-0 flex items-center justify-center mb-4">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
          {pageIndicator}
          {zoomControls}
        </div>
      </div>

      {/* PDF Document - scrollable container with all pages */}
      <div ref={containerRef} className="flex-1 overflow-auto rounded-lg min-h-0">
        {pdfDocument}
      </div>
    </div>
  )
}
