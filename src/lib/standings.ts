import type { ID, Match, Settings, StandingRow, Team } from '../types'

interface Acc {
  played: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

function empty(): Acc {
  return { played: 0, wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }
}

/** Winner of a finished match, or null if not played / no winner. */
export function winnerOf(m: Match): ID | null {
  if (!m.played) return null
  if (m.isBye) return m.teamA ?? m.teamB // walkover: the only present team
  if (m.scoreA === null || m.scoreB === null) return null
  if (m.scoreA === m.scoreB) return null // foosball has no draws, guarded anyway
  return m.scoreA > m.scoreB ? m.teamA : m.teamB
}

export function loserOf(m: Match): ID | null {
  const w = winnerOf(m)
  if (!w) return null
  return w === m.teamA ? m.teamB : m.teamA
}

/**
 * Compute the standings table for one group.
 * Ranking: points, then goal difference, then head-to-head (mini-league among
 * the teams tied on both points and goal difference), then total goals for,
 * then team name as a final stable tiebreaker.
 */
export function computeGroupStandings(
  groupId: ID,
  teams: Team[],
  matches: Match[],
  settings: Settings,
): StandingRow[] {
  const groupTeams = teams.filter((t) => t.groupId === groupId)
  const teamById = new Map(groupTeams.map((t) => [t.id, t]))
  const acc = new Map<ID, Acc>()
  groupTeams.forEach((t) => acc.set(t.id, empty()))

  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.groupId === groupId && m.played,
  )

  for (const m of groupMatches) {
    if (m.teamA === null || m.teamB === null || m.scoreA === null || m.scoreB === null)
      continue
    const a = acc.get(m.teamA)
    const b = acc.get(m.teamB)
    if (!a || !b) continue
    a.played++
    b.played++
    a.goalsFor += m.scoreA
    a.goalsAgainst += m.scoreB
    b.goalsFor += m.scoreB
    b.goalsAgainst += m.scoreA
    if (m.scoreA > m.scoreB) {
      a.wins++
      b.losses++
      a.points += settings.winPoints
      b.points += settings.lossPoints
    } else if (m.scoreB > m.scoreA) {
      b.wins++
      a.losses++
      b.points += settings.winPoints
      a.points += settings.lossPoints
    }
  }

  const rows: StandingRow[] = groupTeams.map((t) => {
    const s = acc.get(t.id)!
    return {
      teamId: t.id,
      played: s.played,
      wins: s.wins,
      losses: s.losses,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalsFor - s.goalsAgainst,
      points: s.points,
      rank: 0,
      qualified: false,
    }
  })

  // Head-to-head points among a given subset of teams.
  const headToHead = (ids: ID[]) => {
    const set = new Set(ids)
    const h = new Map<ID, { pts: number; gd: number; gf: number }>()
    ids.forEach((id) => h.set(id, { pts: 0, gd: 0, gf: 0 }))
    for (const m of groupMatches) {
      if (m.teamA === null || m.teamB === null) continue
      if (!set.has(m.teamA) || !set.has(m.teamB)) continue
      if (m.scoreA === null || m.scoreB === null) continue
      const ha = h.get(m.teamA)!
      const hb = h.get(m.teamB)!
      ha.gf += m.scoreA
      hb.gf += m.scoreB
      ha.gd += m.scoreA - m.scoreB
      hb.gd += m.scoreB - m.scoreA
      if (m.scoreA > m.scoreB) ha.pts += settings.winPoints
      else if (m.scoreB > m.scoreA) hb.pts += settings.winPoints
    }
    return h
  }

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points
    if (y.goalDiff !== x.goalDiff) return y.goalDiff - x.goalDiff
    // tied on points AND goal difference -> head-to-head mini league
    const tiedIds = rows
      .filter((r) => r.points === x.points && r.goalDiff === x.goalDiff)
      .map((r) => r.teamId)
    if (tiedIds.length > 1) {
      const h = headToHead(tiedIds)
      const hx = h.get(x.teamId)!
      const hy = h.get(y.teamId)!
      if (hy.pts !== hx.pts) return hy.pts - hx.pts
      if (hy.gd !== hx.gd) return hy.gd - hx.gd
      if (hy.gf !== hx.gf) return hy.gf - hx.gf
    }
    if (y.goalsFor !== x.goalsFor) return y.goalsFor - x.goalsFor
    const nameX = teamById.get(x.teamId)?.name ?? ''
    const nameY = teamById.get(y.teamId)?.name ?? ''
    return nameX.localeCompare(nameY, 'hu')
  })

  rows.forEach((r, i) => {
    r.rank = i + 1
    r.qualified = i < settings.qualifiersPerGroup
  })

  return rows
}

/** True once every group match has a recorded result. */
export function isGroupStageComplete(matches: Match[]): boolean {
  const group = matches.filter((m) => m.stage === 'group')
  return group.length > 0 && group.every((m) => m.played)
}
