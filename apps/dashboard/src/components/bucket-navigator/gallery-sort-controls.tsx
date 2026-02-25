'use client'

import { Button } from '@r2-drive/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@r2-drive/ui/components/select'
import { ArrowDown, ArrowUp } from 'lucide-react'

type SortKey = 'name' | 'size' | 'lastModified'
type SortDirection = 'asc' | 'desc'

interface GallerySortControlsProps {
  sortKey: SortKey
  sortDirection: SortDirection
  onSortKeyChange: (key: SortKey) => void
  onSortDirectionToggle: () => void
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'lastModified', label: 'Modified' },
] as const

export function GallerySortControls({
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionToggle,
}: GallerySortControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as SortKey)}>
        <SelectTrigger className="w-[100px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSortDirectionToggle}>
        {sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
