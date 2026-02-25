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
  if (maxChars >= text.length) return text
  if (maxChars <= 3) return '...'
  const ellipsis = '...'
  const availableLength = maxChars - ellipsis.length
  const startLength = Math.ceil(availableLength * 0.6)
  const endLength = Math.floor(availableLength * 0.4)
  return text.slice(0, startLength) + ellipsis + text.slice(-endLength)
}

// Shared measurement element for all TruncatedText instances
let sharedMeasureSpan: HTMLSpanElement | null = null

function getMeasureSpan(): HTMLSpanElement {
  if (!sharedMeasureSpan) {
    sharedMeasureSpan = document.createElement('span')
    sharedMeasureSpan.setAttribute('aria-hidden', 'true')
    Object.assign(sharedMeasureSpan.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      top: '-9999px',
      left: '-9999px',
    })
    document.body.appendChild(sharedMeasureSpan)
  }
  return sharedMeasureSpan
}

/**
 * Truncates text in the middle to fit exactly within its container.
 * Uses CSS text-overflow as fallback, with JS-based middle truncation when possible.
 */
export function TruncatedText({ children, className }: TruncatedTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [displayText, setDisplayText] = useState(children)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const calculateTruncation = () => {
      const text = children
      const containerRect = container.getBoundingClientRect()
      const availableWidth = containerRect.width

      // Skip calculation if container has no width yet - keep showing full text
      // CSS text-overflow: ellipsis will handle it as fallback
      if (availableWidth < 20) {
        setDisplayText(text)
        setIsTruncated(false)
        return
      }

      // Get measurement span and copy font styles from container
      const measureSpan = getMeasureSpan()
      const computedStyle = window.getComputedStyle(container)
      measureSpan.style.font = computedStyle.font
      measureSpan.style.fontFamily = computedStyle.fontFamily
      measureSpan.style.fontSize = computedStyle.fontSize
      measureSpan.style.fontWeight = computedStyle.fontWeight
      measureSpan.style.letterSpacing = computedStyle.letterSpacing

      // Measure full text width
      measureSpan.textContent = text
      const fullWidth = measureSpan.getBoundingClientRect().width

      // If full text fits (with small buffer for sub-pixel rounding), no truncation needed
      if (fullWidth <= availableWidth + 1) {
        setDisplayText(text)
        setIsTruncated(false)
        return
      }

      // Binary search to find the maximum number of characters that fit
      let low = 4 // Minimum meaningful truncation: "a..."
      let high = text.length - 1
      let bestFit = 4 // Start with minimum

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

      const truncated = truncateMiddle(text, bestFit)
      setDisplayText(truncated)
      setIsTruncated(truncated !== text)
    }

    // Use requestAnimationFrame to ensure layout is complete
    const rafId = requestAnimationFrame(() => {
      calculateTruncation()
    })

    const resizeObserver = new ResizeObserver(() => {
      calculateTruncation()
    })

    resizeObserver.observe(container)
    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [children])

  return (
    <Tooltip open={isTruncated ? undefined : false}>
      <TooltipTrigger asChild>
        <span
          ref={containerRef}
          className={className}
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {displayText}
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}
