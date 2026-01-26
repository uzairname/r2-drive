import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  onClick?: () => void
  delay?: number
}

interface UseLongPressResult {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchCancel: () => void
}

/**
 * Hook for detecting long press (press and hold) gestures on touch devices.
 * Used to enable selection mode in gallery view.
 */
export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
}: UseLongPressOptions): UseLongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isLongPressRef.current = false
      const touch = e.touches[0]
      if (touch) {
        startPosRef.current = { x: touch.clientX, y: touch.clientY }
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        onLongPress()
        // Vibrate to give haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }, delay)
    },
    [onLongPress, delay]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isLongPressRef.current) {
        // Prevent the click event from firing after long press
        e.preventDefault()
      } else if (onClick && !timerRef.current) {
        // Timer was cleared (moved too much), don't trigger click
      } else if (onClick) {
        // Normal tap - onClick will be handled by the click event
      }
      clear()
      startPosRef.current = null
    },
    [clear, onClick]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel long press if finger moves too much (10px threshold)
      if (startPosRef.current && e.touches[0]) {
        const touch = e.touches[0]
        const deltaX = Math.abs(touch.clientX - startPosRef.current.x)
        const deltaY = Math.abs(touch.clientY - startPosRef.current.y)
        if (deltaX > 10 || deltaY > 10) {
          clear()
        }
      }
    },
    [clear]
  )

  const onTouchCancel = useCallback(() => {
    clear()
    startPosRef.current = null
  }, [clear])

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onTouchCancel,
  }
}
