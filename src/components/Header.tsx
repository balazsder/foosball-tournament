import { Moon, Sun, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import { useTheme } from '../state/theme'
import { Logo } from './brand'
import { Button } from './ui/primitives'

export interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
}

export function Header({
  items,
  active,
  onNavigate,
}: {
  items: NavItem[]
  active: string
  onNavigate: (key: string) => void
}) {
  const { mode, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <button
          className="flex items-center gap-2"
          onClick={() => onNavigate('dashboard')}
          aria-label="Kezdőlap"
        >
          <Logo />
        </button>

        <nav className="ml-2 hidden flex-1 items-center gap-1 lg:flex">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => onNavigate(it.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                active === it.key
                  ? 'bg-egroup-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Téma váltása">
            {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menü"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="grid grid-cols-2 gap-1 border-t border-slate-200 px-3 py-2 dark:border-slate-800 lg:hidden">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => {
                onNavigate(it.key)
                setOpen(false)
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold',
                active === it.key
                  ? 'bg-egroup-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
