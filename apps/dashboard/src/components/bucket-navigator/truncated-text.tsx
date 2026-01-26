'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@r2-drive/ui/components/tooltip'
import { useCallback, useRef, useState } from 'react'

interface TruncatedTextProps {
  children: string
  className?: string
}

export function TruncatedText({ children, className }: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  const checkTruncation = useCallback(() => {
    const element = textRef.current
    if (element) {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }
  }, [])

  return (
    <Tooltip open={isTruncated ? undefined : false}>
      <TooltipTrigger asChild>
        <span
          ref={textRef}
          className={className}
          onMouseEnter={checkTruncation}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}
