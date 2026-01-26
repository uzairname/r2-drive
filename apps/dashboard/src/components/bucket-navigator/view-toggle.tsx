import { ViewMode } from '@/hooks/use-view-preference'
import { Button } from '@r2-drive/ui/components/button'
import { LayoutGrid, List } from 'lucide-react'

export function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: ViewMode
  onToggle: (mode: ViewMode) => void
}) {
  return (
    <div className="hidden md:flex items-center gap-1">
      <Button
        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => onToggle('table')}
        aria-label="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => onToggle('gallery')}
        aria-label="Gallery view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}
