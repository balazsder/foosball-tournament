import type { GameScore, Match } from '../types'

/** The final is a best-of-three series: first to two game wins. */
export const SERIES_WINS_NEEDED = 2
/** The deciding third game (at 1–1) is played to this many goals. */
export const DECIDER_GOALS = 7

export function isSeries(m: Match): boolean {
  return m.stage === 'knockout' && m.round === 'FINAL'
}

/** Games won by each side. */
export function seriesWins(games: GameScore[]): { a: number; b: number } {
  return {
    a: games.filter((g) => g.a > g.b).length,
    b: games.filter((g) => g.b > g.a).length,
  }
}

export function isSeriesDecided(games: GameScore[]): boolean {
  const w = seriesWins(games)
  return Math.max(w.a, w.b) >= SERIES_WINS_NEEDED
}

/**
 * Validate the games entered so far (a series may be saved mid-way).
 * Returns a Hungarian error message, or null when the games are consistent.
 */
export function validateSeries(games: GameScore[]): string | null {
  if (games.length === 0) return 'Legalább egy játszma eredményét add meg.'
  for (let i = 0; i < games.length; i++) {
    const g = games[i]
    if (g.a === g.b) return `${i + 1}. játszma: csocsóban nincs döntetlen.`
    if (i > 0 && isSeriesDecided(games.slice(0, i)))
      return 'A párharc már eldőlt — további játszma nem kell.'
    if (i === 2 && (Math.max(g.a, g.b) !== DECIDER_GOALS || Math.min(g.a, g.b) >= DECIDER_GOALS))
      return `A döntő játszma ${DECIDER_GOALS} gólig tart — a győztesnek pontosan ${DECIDER_GOALS} gólja legyen.`
  }
  return null
}

/** Goals scored by each side: summed over the games of a series, else the match score. */
export function matchGoals(m: Match): { a: number; b: number } | null {
  if (m.games?.length) {
    return {
      a: m.games.reduce((s, g) => s + g.a, 0),
      b: m.games.reduce((s, g) => s + g.b, 0),
    }
  }
  if (m.scoreA === null || m.scoreB === null) return null
  return { a: m.scoreA, b: m.scoreB }
}

/** "10:8, 6:10, 7:5" */
export function formatGames(games: GameScore[]): string {
  return games.map((g) => `${g.a}:${g.b}`).join(', ')
}

/** Short status line for a series, e.g. "Állás 1:1 · 3. játszma 7 gólig". */
export function seriesStatus(m: Match): string {
  const games = m.games ?? []
  if (games.length === 0) return `2 nyert játszmáig · döntő játszma ${DECIDER_GOALS} gólig`
  const w = seriesWins(games)
  if (isSeriesDecided(games)) return `Végeredmény ${w.a}:${w.b}`
  const next = games.length + 1
  return `Állás ${w.a}:${w.b} · ${next}. játszma${next === 3 ? ` ${DECIDER_GOALS} gólig` : ''}`
}
