import { useMemo } from 'react'
import type { Group, ID, Match, StandingRow, Team, Tournament } from '../types'
import { computeGroupStandings, isGroupStageComplete } from '../lib/standings'
import { getQualifiers, isPlayable, type Qualifier } from '../lib/knockout'
import { useStore } from './store'

export function teamMap(teams: Team[]): Map<ID, Team> {
  return new Map(teams.map((t) => [t.id, t]))
}

export function groupMap(groups: Group[]): Map<ID, Group> {
  return new Map(groups.map((g) => [g.id, g]))
}

/** A group match (always two known teams) or a knockout match that's ready. */
export function matchPlayable(m: Match): boolean {
  if (m.stage === 'group') return !m.played && m.teamA !== null && m.teamB !== null
  return isPlayable(m)
}

export interface DerivedState {
  standingsByGroup: Map<ID, StandingRow[]>
  qualifiers: Qualifier[]
  groupComplete: boolean
  playableOrdered: Match[]
  current: Match | null
  next: Match | null
  upcoming: Match[]
  byId: Map<ID, Match>
  teams: Map<ID, Team>
  groups: Map<ID, Group>
  groupProgress: { played: number; total: number }
}

export function derive(t: Tournament): DerivedState {
  const teams = teamMap(t.teams)
  const groups = groupMap(t.groups)
  const byId = new Map(t.matches.map((m) => [m.id, m]))

  const standingsByGroup = new Map<ID, StandingRow[]>()
  t.groups.forEach((g) => {
    standingsByGroup.set(g.id, computeGroupStandings(g.id, t.teams, t.matches, t.settings))
  })

  const groupComplete = isGroupStageComplete(t.matches)
  const qualifiers = groupComplete
    ? getQualifiers(t.teams, t.groups, t.matches, t.settings)
    : []

  const playableOrdered = t.matches
    .filter(matchPlayable)
    .sort((a, b) => a.order - b.order)

  const current = t.currentMatchId ? (byId.get(t.currentMatchId) ?? null) : null
  const queue = playableOrdered.filter((m) => m.id !== current?.id)
  const next = current ? queue[0] ?? null : playableOrdered[0] ?? null
  const upcoming = current ? queue : playableOrdered.slice(1)

  const groupMatches = t.matches.filter((m) => m.stage === 'group')
  const groupProgress = {
    played: groupMatches.filter((m) => m.played).length,
    total: groupMatches.length,
  }

  return {
    standingsByGroup,
    qualifiers,
    groupComplete,
    playableOrdered,
    current,
    next,
    upcoming,
    byId,
    teams,
    groups,
    groupProgress,
  }
}

export function useDerived(): DerivedState {
  const { tournament } = useStore()
  return useMemo(() => derive(tournament), [tournament])
}

export interface StatLeader {
  teamId: ID
  value: number
}

/** Top-of-the-tournament leaderboards across all groups. */
export function computeLeaders(t: Tournament) {
  const tally = new Map<ID, { wins: number; gd: number; gf: number; goals: number }>()
  t.teams.forEach((tm) => tally.set(tm.id, { wins: 0, gd: 0, gf: 0, goals: 0 }))

  for (const m of t.matches) {
    if (!m.played || m.isBye) continue
    if (m.teamA === null || m.teamB === null || m.scoreA === null || m.scoreB === null)
      continue
    const a = tally.get(m.teamA)
    const b = tally.get(m.teamB)
    if (a) {
      a.gf += m.scoreA
      a.gd += m.scoreA - m.scoreB
      a.goals += m.scoreA
      if (m.scoreA > m.scoreB) a.wins++
    }
    if (b) {
      b.gf += m.scoreB
      b.gd += m.scoreB - m.scoreA
      b.goals += m.scoreB
      if (m.scoreB > m.scoreA) b.wins++
    }
  }

  const entries = [...tally.entries()]
  const mostWins = [...entries].sort((x, y) => y[1].wins - x[1].wins)
  const bestGd = [...entries].sort((x, y) => y[1].gd - x[1].gd)
  const topScorers = [...entries].sort((x, y) => y[1].goals - x[1].goals)

  return {
    mostWins: mostWins.map(([teamId, v]) => ({ teamId, value: v.wins })),
    bestGd: bestGd.map(([teamId, v]) => ({ teamId, value: v.gd })),
    topScorers: topScorers.map(([teamId, v]) => ({ teamId, value: v.goals })),
  }
}
