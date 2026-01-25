'use client'

import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface ImageViewerProps {
  url: string
  alt: string
}

export function ImageViewer({ url, alt }: ImageViewerProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="text-center text-white/80">
        <p className="text-red-400">Failed to load image</p>
      </div>
    )
  }

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={5}
      centerOnInit
      wheel={{ step: 0.1 }}
      doubleClick={{ mode: 'toggle', step: 2 }}
    >
      <TransformComponent
        wrapperClass="!w-full !h-full"
        contentClass="!w-full !h-full flex items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className={`max-w-full max-h-[calc(100vh-8rem)] object-contain transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </TransformComponent>
    </TransformWrapper>
  )
}
