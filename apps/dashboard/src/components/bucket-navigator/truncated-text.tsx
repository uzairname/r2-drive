'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@r2-drive/ui/components/tooltip'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface TruncatedTextProps {
  children: string
  className?: string
}

/**
 * Truncates text in the middle to fit exactly within its container.
 * Uses binary search with actual DOM measurements for pixel-perfect fitting.
 */
export function TruncatedText({ children, className }: TruncatedTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [displayText, setDisplayText] = useState(children)
  const [isTruncated, setIsTruncated] = useState(false)

  const truncateMiddle = useCallback(
    (text: string, maxChars: number): string => {
      if (maxChars <= 3) return '...'
      const ellipsis = '...'
      const availableLength = maxChars - ellipsis.length
      const startLength = Math.ceil(availableLength * 0.6)
      const endLength = Math.floor(availableLength * 0.4)
      return text.slice(0, startLength) + ellipsis + text.slice(-endLength)
    },
    []
  )

  const measureText = useCallback((text: string): number => {
    if (!measureRef.current) return 0
    measureRef.current.textContent = text
    return measureRef.current.getBoundingClientRect().width
  }, [])

  const calculateTruncation = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const availableWidth = container.clientWidth
    if (availableWidth === 0) return

    const fullWidth = measureText(children)

    // If full text fits, no truncation needed
    if (fullWidth <= availableWidth) {
      setDisplayText(children)
      setIsTruncated(false)
      return
    }

    // Binary search to find the maximum number of characters that fit
    let low = 3 // Minimum: "..."
    let high = children.length - 1
    let bestFit = low

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const truncated = truncateMiddle(children, mid)
      const width = measureText(truncated)

      if (width <= availableWidth) {
        bestFit = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    setDisplayText(truncateMiddle(children, bestFit))
    setIsTruncated(true)
  }, [children, measureText, truncateMiddle])

  useLayoutEffect(() => {
    calculateTruncation()

    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      calculateTruncation()
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [calculateTruncation])

  return (
    <Tooltip open={isTruncated ? undefined : false}>
      <TooltipTrigger asChild>
        <span
          ref={containerRef}
          className={className}
          style={{ display: 'block', overflow: 'hidden', minWidth: 0 }}
        >
          {displayText}
          {/* Hidden span for measuring text width */}
          <span
            ref={measureRef}
            aria-hidden
            style={{
              position: 'absolute',
              visibility: 'hidden',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}
