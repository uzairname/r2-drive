'use client'

interface VideoViewerProps {
  url: string
  type?: string
}

export function VideoViewer({ url, type }: VideoViewerProps) {
  return (
    <video
      src={url}
      controls
      autoPlay={false}
      className="max-w-full max-h-[calc(100vh-8rem)] rounded-lg"
    >
      {type && <source src={url} type={type} />}
      Your browser does not support the video tag.
    </video>
  )
}
