'use client'

import { Music } from 'lucide-react'

interface AudioViewerProps {
  url: string
  type?: string
  name: string
}

export function AudioViewer({ url, type, name }: AudioViewerProps) {
  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white/5 rounded-xl">
      <div className="p-6 bg-white/10 rounded-full">
        <Music className="h-16 w-16 text-white/80" />
      </div>
      <span className="text-white font-medium text-lg">{name}</span>
      <audio src={url} controls className="w-full max-w-md">
        {type && <source src={url} type={type} />}
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
