import { Path, Paths } from '@/lib/path'
import { Button } from '@r2-drive/ui/components/button'
import { Check, Link } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

export interface CopyLinkButtonProps {
  path: Path
}

export function CopyLinkButton({ path }: CopyLinkButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyLink = async () => {
    // Generate the shareable link
    const pathParam = Paths.toURLSearchParams(path)
    const url = pathParam
      ? `${window.location.origin}/explorer?${pathParam}`
      : `${window.location.origin}/explorer`

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)

    toast.success(
      path.parts.length > 0 ? `Copied link to folder "${path.name}"` : 'Copied link to bucket root',
      { description: 'Link Copied' }
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopyLink}
      className="h-8 px-2 ml-4 flex-shrink-0"
      title="Copy shareable link to current folder"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link className="h-4 w-4" />}
    </Button>
  )
}
