import type { Group, ID, KnockoutRound, Match, Settings, Team } from '../types'
import { computeGroupStandings, loserOf, winnerOf } from './standings'
import { uid } from './utils'

const ROUND_ORDER: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'BRONZE', 'FINAL']

/** Human round titles (Hungarian). */
export const ROUND_TITLES: Record<KnockoutRound, string> = {
  R32: 'Legjobb 32',
  R16: 'Nyolcaddöntő',
  QF: 'Negyeddöntő',
  SF: 'Elődöntő',
  BRONZE: 'Bronzmérkőzés',
  FINAL: 'Döntő',
}

const ROUND_SHORT: Record<KnockoutRound, string> = {
  R32: 'L32',
  R16: 'N',
  QF: 'ND',
  SF: 'ED',
  BRONZE: 'Br',
  FINAL: 'D',
}

function roundNameForCount(count: number): KnockoutRound {
  switch (count) {
    case 1:
      return 'FINAL'
    case 2:
      return 'SF'
    case 4:
      return 'QF'
    case 8:
      return 'R16'
    default:
      return 'R32'
  }
}

/** Standard balanced bracket: seed numbers (1-based) in slot order. */
function seedSlots(size: number): number[] {
  let seeds = [1]
  while (seeds.length < size) {
    const n = seeds.length * 2
    const next: number[] = []
    for (const s of seeds) {
      next.push(s)
      next.push(n + 1 - s)
    }
    seeds = next
  }
  return seeds
}

export interface Qualifier {
  teamId: ID
  label: string // e.g. "A1"
  groupId: ID
  pos: number
  points: number
  goalDiff: number
  goalsFor: number
}

/** The teams that advance from the group stage, in seed order. */
export function getQualifiers(
  teams: Team[],
  groups: Group[],
  matches: Match[],
  settings: Settings,
): Qualifier[] {
  const qs: Qualifier[] = []
  groups.forEach((g) => {
    const standings = computeGroupStandings(g.id, teams, matches, settings)
    for (let pos = 0; pos < settings.qualifiersPerGroup && pos < standings.length; pos++) {
      const row = standings[pos]
      qs.push({
        teamId: row.teamId,
        label: `${g.name}${pos + 1}`,
        groupId: g.id,
        pos: pos + 1,
        points: row.points,
        goalDiff: row.goalDiff,
        goalsFor: row.goalsFor,
      })
    }
  })
  // Seed: group winners first, then runners-up, etc.; better record = better seed.
  qs.sort(
    (a, b) =>
      a.pos - b.pos ||
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor,
  )
  return qs
}

/**
 * Build the knockout bracket from the group-stage qualifiers.
 * Produces quarter-finals (when the field warrants), semi-finals, a bronze
 * match and the final, with byes for the top seeds when the count isn't a
 * power of two.
 */
export function generateKnockout(
  teams: Team[],
  groups: Group[],
  matches: Match[],
  settings: Settings,
): Match[] {
  const qualifiers = getQualifiers(teams, groups, matches, settings)
  const Q = qualifiers.length
  if (Q < 2) return []

  let S = 1
  while (S < Q) S *= 2
  const slots = seedSlots(S)
  const numRounds = Math.log2(S)

  const seedToQ = (seed: number): Qualifier | undefined =>
    seed <= Q ? qualifiers[seed - 1] : undefined

  const rounds: Match[][] = []

  // First round
  const first: Match[] = []
  for (let k = 0; k < S / 2; k++) {
    const qa = seedToQ(slots[2 * k])
    const qb = seedToQ(slots[2 * k + 1])
    first.push({
      id: uid('k'),
      stage: 'knockout',
      round: roundNameForCount(S / 2),
      order: 0,
      teamA: qa ? qa.teamId : null,
      teamB: qb ? qb.teamId : null,
      labelA: qa?.label,
      labelB: qb?.label,
      scoreA: null,
      scoreB: null,
      played: false,
    })
  }
  rounds.push(first)

  // Subsequent rounds wired from previous-round winners
  for (let r = 1; r < numRounds; r++) {
    const prev = rounds[r - 1]
    const count = prev.length / 2
    const cur: Match[] = []
    for (let k = 0; k < count; k++) {
      const srcA = prev[2 * k]
      const srcB = prev[2 * k + 1]
      cur.push({
        id: uid('k'),
        stage: 'knockout',
        round: roundNameForCount(count),
        order: 0,
        teamA: null,
        teamB: null,
        sourceA: { matchId: srcA.id, type: 'winner' },
        sourceB: { matchId: srcB.id, type: 'winner' },
        labelA: `${ROUND_SHORT[srcA.round!]}${2 * k + 1} gy.`,
        labelB: `${ROUND_SHORT[srcB.round!]}${2 * k + 2} gy.`,
        scoreA: null,
        scoreB: null,
        played: false,
      })
    }
    rounds.push(cur)
  }

  // Bronze match between the two semi-final losers
  const sf = rounds.find((rm) => rm.length === 2)
  let bronze: Match | undefined
  if (sf && sf.length === 2) {
    bronze = {
      id: uid('k'),
      stage: 'knockout',
      round: 'BRONZE',
      order: 0,
      teamA: null,
      teamB: null,
      sourceA: { matchId: sf[0].id, type: 'loser' },
      sourceB: { matchId: sf[1].id, type: 'loser' },
      labelA: 'ED1 vesztese',
      labelB: 'ED2 vesztese',
      scoreA: null,
      scoreB: null,
      played: false,
    }
  }

  // Flatten: earliest rounds first, bronze immediately before the final.
  const ordered: Match[] = []
  for (let r = 0; r < rounds.length; r++) {
    if (r === rounds.length - 1 && bronze) ordered.push(bronze)
    ordered.push(...rounds[r])
  }

  const baseOrder = matches.reduce((max, m) => Math.max(max, m.order), 0)
  ordered.forEach((m, i) => {
    m.order = baseOrder + i + 1
  })

  return syncBracket(ordered, teams)
}

/**
 * Resolve a knockout bracket in place: fill each slot from its source match's
 * winner/loser, auto-complete byes, and clear stale downstream results if an
 * upstream result changed. Mutates and returns the same array.
 */
export function syncBracket(knockoutMatches: Match[], _teams: Team[]): Match[] {
  const byId = new Map(knockoutMatches.map((m) => [m.id, m]))
  const ordered = [...knockoutMatches].sort(
    (a, b) => ROUND_ORDER.indexOf(a.round!) - ROUND_ORDER.indexOf(b.round!),
  )

  for (const m of ordered) {
    const newA = m.sourceA
      ? resolveSource(byId.get(m.sourceA.matchId), m.sourceA.type)
      : m.teamA
    const newB = m.sourceB
      ? resolveSource(byId.get(m.sourceB.matchId), m.sourceB.type)
      : m.teamB

    const seeded = !m.sourceA && !m.sourceB

    // If a fed slot's team changed and a result had already been entered for a
    // real (non-bye) match, that result is now stale -> clear it.
    if (!seeded && m.played && !m.isBye && (newA !== m.teamA || newB !== m.teamB)) {
      m.played = false
      m.scoreA = null
      m.scoreB = null
    }

    m.teamA = newA
    m.teamB = newB

    if (seeded) {
      const aKnown = m.teamA !== null
      const bKnown = m.teamB !== null
      if (aKnown !== bKnown) {
        // exactly one side present -> walkover (bye)
        m.isBye = true
        m.played = true
        m.scoreA = null
        m.scoreB = null
      }
    }
  }
  return knockoutMatches
}

function resolveSource(src: Match | undefined, type: 'winner' | 'loser'): ID | null {
  if (!src) return null
  return type === 'winner' ? winnerOf(src) : loserOf(src)
}

/** A knockout match is playable only once both teams are known and it's not a bye. */
export function isPlayable(m: Match): boolean {
  return !m.isBye && m.teamA !== null && m.teamB !== null && !m.played
}
