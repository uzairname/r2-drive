'use client'

import { UIR2Item } from '@r2-drive/utils/types/item'
import { useCallback, useMemo, useState } from 'react'

interface UseFileViewerReturn {
  isOpen: boolean
  currentItem: UIR2Item | null
  currentIndex: number
  previewableItems: UIR2Item[]
  openViewer: (item: UIR2Item) => void
  closeViewer: () => void
  goToNext: () => void
  goToPrevious: () => void
  goToIndex: (index: number) => void
}

export function useFileViewer(allItems: UIR2Item[]): UseFileViewerReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Filter to only files (exclude folders)
  const previewableItems = useMemo(
    () => allItems.filter((item) => !item.path.isFolder),
    [allItems]
  )

  const currentItem = useMemo(
    () => (isOpen && previewableItems[currentIndex]) || null,
    [isOpen, previewableItems, currentIndex]
  )

  const openViewer = useCallback(
    (item: UIR2Item) => {
      const index = previewableItems.findIndex((i) => i.path.key === item.path.key)
      if (index !== -1) {
        setCurrentIndex(index)
        setIsOpen(true)
      }
    },
    [previewableItems]
  )

  const closeViewer = useCallback(() => {
    setIsOpen(false)
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % previewableItems.length)
  }, [previewableItems.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + previewableItems.length) % previewableItems.length)
  }, [previewableItems.length])

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < previewableItems.length) {
        setCurrentIndex(index)
      }
    },
    [previewableItems.length]
  )

  return {
    isOpen,
    currentItem,
    currentIndex,
    previewableItems,
    openViewer,
    closeViewer,
    goToNext,
    goToPrevious,
    goToIndex,
  }
}
