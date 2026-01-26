import { ProfileDropdown } from './header/profile-dropdown'
import { ThemeToggle } from './header/theme-toggle'

export function Header() {
  return (
    <>
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Cloudflare R2 Drive</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </header>
    </>
  )
}
