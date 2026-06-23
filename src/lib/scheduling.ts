import type { Group, ID, Match, Settings, Team } from '../types'
import { shuffle, uid } from './utils'

/**
 * Circle-method round-robin. Returns an array of rounds; each round is a list of
 * [home, away] pairings in which every team appears at most once — so within a
 * round nobody plays twice. Home/away is alternated for fairness.
 */
function roundRobinRounds(teamIds: ID[]): Array<Array<[ID, ID]>> {
  const ids = [...teamIds]
  const hasBye = ids.length % 2 === 1
  if (hasBye) ids.push('__BYE__')
  const n = ids.length
  const rounds: Array<Array<[ID, ID]>> = []
  const arr = [...ids]

  for (let r = 0; r < n - 1; r++) {
    const round: Array<[ID, ID]> = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== '__BYE__' && b !== '__BYE__') {
        // alternate which side is "home" so it's not always the same team
        if ((r + i) % 2 === 0) round.push([a, b])
        else round.push([b, a])
      }
    }
    rounds.push(round)
    // rotate everything except the first element
    arr.splice(1, 0, arr.pop() as ID)
  }
  return rounds
}

/** Ordered match list for a single group (leg 1 fully, then leg 2 if enabled). */
function groupMatchList(group: Group, teamIds: ID[], settings: Settings): Match[] {
  const rounds = roundRobinRounds(teamIds)
  const out: Match[] = []

  const pushLeg = (leg: 1 | 2) => {
    for (const round of rounds) {
      for (const [home, away] of round) {
        // For the return leg, swap home/away so each team hosts once.
        const a = leg === 1 ? home : away
        const b = leg === 1 ? away : home
        out.push({
          id: uid('m'),
          stage: 'group',
          groupId: group.id,
          leg,
          order: 0,
          teamA: a,
          teamB: b,
          scoreA: null,
          scoreB: null,
          played: false,
        })
      }
    }
  }

  pushLeg(1)
  if (settings.doubleRoundRobin) pushLeg(2)
  return out
}

/**
 * Generate the full group-stage schedule.
 *
 * Matches are interleaved across groups (G1, G2, G1, G2, …) so the play order
 * alternates between groups and no group sits idle for long. Because the
 * round-robin guarantees a team appears at most once per round, interleaving
 * other groups' matches between rounds maximises each team's rest time.
 */
export function generateGroupSchedule(
  groups: Group[],
  teams: Team[],
  settings: Settings,
  seed?: number,
): Match[] {
  const perGroup: Match[][] = groups.map((g) => {
    // Random draw: shuffle team order before building the round-robin.
    const ids = shuffle(
      teams.filter((t) => t.groupId === g.id).map((t) => t.id),
      seed === undefined ? undefined : seed + g.id.length,
    )
    return groupMatchList(g, ids, settings)
  })

  const result: Match[] = []
  let i = 0
  let added = true
  while (added) {
    added = false
    for (const list of perGroup) {
      if (i < list.length) {
        result.push(list[i])
        added = true
      }
    }
    i++
  }

  result.forEach((m, idx) => {
    m.order = idx + 1
  })
  return result
}

/** How many group matches each team still has to play (used to flag overload). */
export function remainingPerTeam(matches: Match[]): Map<ID, number> {
  const map = new Map<ID, number>()
  for (const m of matches) {
    if (m.stage !== 'group' || m.played) continue
    for (const t of [m.teamA, m.teamB]) {
      if (t) map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return map
}
