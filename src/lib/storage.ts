import type { Tournament } from '../types'

const KEY = 'egroup-foosball-tournament:v1'
const THEME_KEY = 'egroup-foosball-tournament:theme'

export function loadTournament(): Tournament | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Tournament
    // minimal shape guard
    if (!data || !Array.isArray(data.teams) || !Array.isArray(data.matches)) return null
    return data
  } catch {
    return null
  }
}

export function saveTournament(t: Tournament): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    // storage full or unavailable — fail silently, app keeps working in-memory
  }
}

export function clearTournament(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export type ThemeMode = 'light' | 'dark'

export function loadTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function saveTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* ignore */
  }
}
