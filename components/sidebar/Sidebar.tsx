'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  onAddTrade: () => void
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▤' },
  { href: '/positions', label: 'Positions', icon: '◈' },
  { href: '/history', label: 'History', icon: '◷' },
  { href: '/analytics', label: 'Analytics', icon: '◉' },
]

export function Sidebar({ onAddTrade }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-52 h-screen bg-bg-panel border-r border-border flex flex-col fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <span className="text-white font-semibold text-sm tracking-wide">⬡ WheelTracker</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                ${active
                  ? 'bg-bg-hover text-white'
                  : 'text-text-muted hover:text-white hover:bg-bg-hover'
                }
              `}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Add Trade button */}
      <div className="px-3 pb-5">
        <button
          onClick={onAddTrade}
          className="w-full bg-accent-purple/90 hover:bg-accent-purple text-white text-sm font-medium py-2 rounded-md transition-colors"
        >
          + New Trade
        </button>
      </div>
    </aside>
  )
}
