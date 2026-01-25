'use client'

import { useEffect, useState } from 'react'

interface TextViewerProps {
  url: string
  filename: string
}

export function TextViewer({ url, filename }: TextViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchContent() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch file')
        const text = await response.text()
        if (!cancelled) {
          setContent(text)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load file')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchContent()
    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-white/60">Loading content...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-white/80">
        <p className="text-red-400 mb-2">Failed to load text file</p>
        <p className="text-sm text-white/60">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl max-h-[calc(100vh-8rem)] overflow-auto">
      <div className="bg-zinc-900 rounded-lg border border-white/10">
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
          <span className="text-white/80 text-sm font-mono">{filename}</span>
        </div>
        <pre className="p-4 text-sm text-white/90 font-mono whitespace-pre-wrap break-words overflow-x-auto">
          {content}
        </pre>
      </div>
    </div>
  )
}
