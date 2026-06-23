import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadTheme, saveTheme, type ThemeMode } from '../lib/storage'

interface ThemeValue {
  mode: ThemeMode
  toggle: () => void
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => loadTheme())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    saveTheme(mode)
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])
  const toggle = useCallback(() => setModeState((m) => (m === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeContext.Provider value={{ mode, toggle, setMode }}>{children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
