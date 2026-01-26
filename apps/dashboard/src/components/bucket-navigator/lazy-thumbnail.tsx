'use client'

import { Skeleton } from '@r2-drive/ui/components/skeleton'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { useEffect, useRef, useState } from 'react'
import { ItemIcon } from './item-icon'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function LazyThumbnail({ item }: { item: UIR2Item }) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const hasStartedLoading = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && !hasStartedLoading.current) {
          hasStartedLoading.current = true
          setLoadState('loading')
        }
      },
      {
        rootMargin: '100px', // Start loading slightly before visible
        threshold: 0,
      }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const previewUrl = `/api/preview?key=${encodeURIComponent(item.path.key)}`

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square flex items-center justify-center overflow-hidden rounded"
    >
      {loadState === 'idle' && (
        <div className="text-muted-foreground">
          <ItemIcon item={item} size="lg" />
        </div>
      )}

      {loadState === 'loading' && (
        <>
          <Skeleton className="absolute inset-0" />
          {/* Hidden image to trigger load */}
          <img
            src={previewUrl}
            alt=""
            className="sr-only"
            onLoad={() => setLoadState('loaded')}
            onError={() => setLoadState('error')}
          />
        </>
      )}

      {loadState === 'loaded' && (
        <img
          src={previewUrl}
          alt={item.path.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {loadState === 'error' && (
        <div className="text-muted-foreground">
          <ItemIcon item={item} size="lg" />
        </div>
      )}
    </div>
  )
}
