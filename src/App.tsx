import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Table2,
  ListChecks,
  GitFork,
  BarChart3,
  MonitorPlay,
  Settings2,
} from 'lucide-react'
import { Header, type NavItem } from './components/Header'
import { StoreProvider } from './state/store'
import { ThemeProvider } from './state/theme'
import { Dashboard } from './views/Dashboard'
import { Teams } from './views/Teams'
import { Standings } from './views/Standings'
import { Matches } from './views/Matches'
import { Bracket } from './views/Bracket'
import { Stats } from './views/Stats'
import { Projector } from './views/Projector'
import { Settings } from './views/Settings'
import { FoosballRod } from './components/brand'

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Áttekintés', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'teams', label: 'Csapatok', icon: <Users className="h-4 w-4" /> },
  { key: 'standings', label: 'Tabella', icon: <Table2 className="h-4 w-4" /> },
  { key: 'matches', label: 'Mérkőzések', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'bracket', label: 'Kieséses', icon: <GitFork className="h-4 w-4" /> },
  { key: 'stats', label: 'Statisztika', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'projector', label: 'Kivetítő', icon: <MonitorPlay className="h-4 w-4" /> },
  { key: 'settings', label: 'Beállítások', icon: <Settings2 className="h-4 w-4" /> },
]

const KEYS = new Set(NAV.map((n) => n.key))

function readHash(): string {
  const h = window.location.hash.replace(/^#\/?/, '')
  return KEYS.has(h) ? h : 'dashboard'
}

function Shell() {
  const [view, setView] = useState<string>(readHash())

  useEffect(() => {
    const onHash = () => setView(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (key: string) => {
    window.location.hash = `/${key}`
    setView(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header items={NAV} active={view} onNavigate={navigate} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {view === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {view === 'teams' && <Teams />}
        {view === 'standings' && <Standings />}
        {view === 'matches' && <Matches />}
        {view === 'bracket' && <Bracket />}
        {view === 'stats' && <Stats />}
        {view === 'projector' && <Projector />}
        {view === 'settings' && <Settings />}
      </main>
      <footer className="border-t border-slate-200 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 text-center text-xs text-slate-400">
          <FoosballRod className="h-4 w-16 text-slate-300 dark:text-slate-700" />
          <span>
            Céges csocsóbajnokság · készítette az <strong>E-Group ICT Software Zrt.</strong> · az
            adatok a böngésződben tárolódnak
          </span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ThemeProvider>
  )
}
