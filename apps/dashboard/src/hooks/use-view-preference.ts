'use client'

import { useEffect, useState } from 'react'

export type ViewMode = 'table' | 'gallery'

const STORAGE_KEY = 'r2-drive-view-preference'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    setIsMobile(query.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export function useViewPreference() {
  const [viewMode, setViewModeState] = useState<ViewMode>('table')
  const isMobile = useIsMobile()

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'table' || stored === 'gallery') {
      setViewModeState(stored)
    }
  }, [])

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  // Respect user's view mode preference regardless of screen size
  const effectiveViewMode: ViewMode = viewMode

  return {
    viewMode,
    setViewMode,
    isMobile,
    effectiveViewMode,
  }
}
