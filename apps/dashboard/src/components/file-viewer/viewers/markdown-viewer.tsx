'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  url: string
  filename: string
}

export function MarkdownViewer({ url, filename }: MarkdownViewerProps) {
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
        <p className="text-red-400 mb-2">Failed to load markdown file</p>
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
        <div className="p-6 prose prose-invert prose-zinc max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || ''}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
