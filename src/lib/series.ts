import type { GameScore, Match } from '../types'

/** The final is a best-of-three series: first to two game wins. */
export const SERIES_WINS_NEEDED = 2
/** The deciding third game (at 1–1) is played to this many goals. */
export const DECIDER_GOALS = 7
/** Every other game is capped at this many goals. */
export const GAME_GOALS = 5

export function isSeries(m: Match): boolean {
  return m.stage === 'knockout' && m.round === 'FINAL'
}

/** Goal limit of a single-game match: the bronze match goes to 7, everything else to 5. */
export function goalLimit(m: Match): number {
  return m.stage === 'knockout' && m.round === 'BRONZE' ? DECIDER_GOALS : GAME_GOALS
}

/** Goal limit of game i (0-based) of the final: the third game goes to 7. */
export function seriesGoalLimit(i: number): number {
  return i === 2 ? DECIDER_GOALS : GAME_GOALS
}

/** Keep a typed score within 0..limit (digits only; empty stays empty). */
export function clampGoals(value: string, limit: number): string {
  const digits = value.replace(/\D/g, '')
  if (digits === '') return ''
  return String(Math.min(parseInt(digits, 10), limit))
}

/**
 * Validate one game's score against its goal limit. A 7-goal game must be won
 * with exactly 7 goals; a 5-goal game may not exceed 5 on either side.
 * Returns a Hungarian error message, or null when valid.
 */
export function validateGame(g: GameScore, limit: number): string | null {
  if (g.a === g.b) return 'Csocsóban nincs döntetlen — a két eredmény nem lehet egyenlő.'
  if (Math.max(g.a, g.b) > limit) return `Legfeljebb ${limit} gól írható be.`
  if (limit === DECIDER_GOALS && Math.max(g.a, g.b) !== DECIDER_GOALS)
    return `Ez a játszma ${DECIDER_GOALS} gólig tart — a győztesnek pontosan ${DECIDER_GOALS} gólja legyen.`
  return null
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
    if (i > 0 && isSeriesDecided(games.slice(0, i)))
      return 'A párharc már eldőlt — további játszma nem kell.'
    const err = validateGame(games[i], seriesGoalLimit(i))
    if (err) return `${i + 1}. játszma: ${err}`
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

/** "5:3, 2:5, 7:4" */
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
