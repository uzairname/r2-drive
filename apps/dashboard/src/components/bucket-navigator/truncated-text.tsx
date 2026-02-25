'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@r2-drive/ui/components/tooltip'
import { useLayoutEffect, useRef, useState } from 'react'

interface TruncatedTextProps {
  children: string
  className?: string
}

function truncateMiddle(text: string, maxChars: number): string {
  if (maxChars <= 3) return '...'
  const ellipsis = '...'
  const availableLength = maxChars - ellipsis.length
  const startLength = Math.ceil(availableLength * 0.6)
  const endLength = Math.floor(availableLength * 0.4)
  return text.slice(0, startLength) + ellipsis + text.slice(-endLength)
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
  // Use a ref to always access the latest children value in the resize callback
  const childrenRef = useRef(children)
  childrenRef.current = children

  useLayoutEffect(() => {
    // Reset when children change
    setDisplayText(children)
    setIsTruncated(false)
  }, [children])

  useLayoutEffect(() => {
    const container = containerRef.current
    const measureSpan = measureRef.current
    if (!container || !measureSpan) return

    const calculateTruncation = () => {
      const text = childrenRef.current
      const availableWidth = container.clientWidth
      if (availableWidth === 0) return

      // Measure full text width
      measureSpan.textContent = text
      const fullWidth = measureSpan.getBoundingClientRect().width

      // If full text fits, no truncation needed
      if (fullWidth <= availableWidth) {
        setDisplayText(text)
        setIsTruncated(false)
        return
      }

      // Binary search to find the maximum number of characters that fit
      let low = 3 // Minimum: "..."
      let high = text.length - 1
      let bestFit = low

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const truncated = truncateMiddle(text, mid)
        measureSpan.textContent = truncated
        const width = measureSpan.getBoundingClientRect().width

        if (width <= availableWidth) {
          bestFit = mid
          low = mid + 1
        } else {
          high = mid - 1
        }
      }

      setDisplayText(truncateMiddle(text, bestFit))
      setIsTruncated(true)
    }

    // Initial calculation
    calculateTruncation()

    const resizeObserver = new ResizeObserver(() => {
      calculateTruncation()
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [children])

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
