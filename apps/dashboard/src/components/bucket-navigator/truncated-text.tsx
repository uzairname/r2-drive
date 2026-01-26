'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@r2-drive/ui/components/tooltip'
import { truncateString } from '@r2-drive/ui/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface TruncatedTextProps {
  children: string
  className?: string
  maxLength?: number
}

// Average character width in pixels for text-sm (~14px) with a medium-weight proportional font
const CHAR_WIDTH_HEURISTIC = 7

export function TruncatedText({ children, className, maxLength }: TruncatedTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [calculatedMaxLength, setCalculatedMaxLength] = useState(maxLength ?? 40)

  useEffect(() => {
    if (maxLength !== undefined) {
      setCalculatedMaxLength(maxLength)
      return
    }

    const calculateMaxLength = () => {
      if (containerRef.current) {
        // Measure the parent's available width since span width depends on content
        const parent = containerRef.current.parentElement
        if (parent) {
          const parentWidth = parent.clientWidth
          // Account for other elements in the parent (like icons) by using a conservative estimate
          // The span should fill remaining space, so we use the parent width
          const chars = Math.floor(parentWidth / CHAR_WIDTH_HEURISTIC)
          setCalculatedMaxLength(Math.max(chars, 10))
        }
      }
    }

    // Initial calculation after mount
    calculateMaxLength()

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      calculateMaxLength()
    })

    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement)
    }

    return () => resizeObserver.disconnect()
  }, [maxLength])

  const truncated = truncateString(children, calculatedMaxLength)
  const isTruncated = truncated !== children

  return (
    <Tooltip open={isTruncated ? undefined : false}>
      <TooltipTrigger asChild>
        <span ref={containerRef} className={className}>
          {truncated}
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}
