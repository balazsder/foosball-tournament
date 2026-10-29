/* Standalone correctness checks for the tournament domain logic. Run with tsx. */
import { createTournament } from '../src/lib/factory'
import { generateGroupSchedule } from '../src/lib/scheduling'
import { computeGroupStandings, isGroupStageComplete, winnerOf } from '../src/lib/standings'
import { generateKnockout, getQualifiers, syncBracket } from '../src/lib/knockout'
import {
  clampGoals,
  goalLimit,
  isSeriesDecided,
  matchGoals,
  seriesWins,
  validateGame,
  validateSeries,
} from '../src/lib/series'
import type { Match, Tournament } from '../src/types'

let failures = 0
function check(name: string, cond: boolean, extra?: unknown) {
  const status = cond ? 'PASS' : 'FAIL'
  if (!cond) failures++
  console.log(`[${status}] ${name}${extra !== undefined && !cond ? ' :: ' + JSON.stringify(extra) : ''}`)
}

/* 1. Default schedule shape */
const t = createTournament()
const groupMatches = t.matches.filter((m) => m.stage === 'group')
check('default has 10 teams', t.teams.length === 10)
check('default has 2 groups', t.groups.length === 2)
// 5 teams double round robin per group = 20 matches; 2 groups = 40
check('double round-robin match count = 40', groupMatches.length === 40, groupMatches.length)

/* 2. Each pair meets exactly twice (home & away) within a group */
for (const g of t.groups) {
  const gm = groupMatches.filter((m) => m.groupId === g.id)
  const pairSeen = new Map<string, number>()
  for (const m of gm) {
    const key = [m.teamA, m.teamB].sort().join('|')
    pairSeen.set(key, (pairSeen.get(key) ?? 0) + 1)
  }
  const allTwice = [...pairSeen.values()].every((v) => v === 2)
  const nPairs = (5 * 4) / 2
  check(`group ${g.name}: every pair plays exactly twice`, allTwice && pairSeen.size === nPairs)
}

/* 3. Interleaving: no team appears in two consecutive scheduled matches */
const ordered = [...groupMatches].sort((a, b) => a.order - b.order)
let adjacentRepeat = false
for (let i = 1; i < ordered.length; i++) {
  const prev = new Set([ordered[i - 1].teamA, ordered[i - 1].teamB])
  if (prev.has(ordered[i].teamA) || prev.has(ordered[i].teamB)) adjacentRepeat = true
}
check('no team plays in back-to-back matches', !adjacentRepeat)

/* 4. Adjacent matches alternate groups (A,B,A,B…) */
let alternates = true
for (let i = 1; i < ordered.length; i++) {
  if (ordered[i].groupId === ordered[i - 1].groupId) alternates = false
}
check('schedule alternates between groups', alternates)

/* 5. Simulate all group results, check standings + qualifiers */
function playAll(tour: Tournament): Tournament {
  const matches: Match[] = tour.matches.map((m, i) => {
    if (m.stage !== 'group') return { ...m }
    // deterministic, no draws
    const a = (i % 3) + 1
    const b = i % 3 === 0 ? 0 : (i % 2) // ensure a != b mostly; fix below
    const scoreA = a
    const scoreB = a === b ? b + 1 : b
    return { ...m, scoreA, scoreB: scoreA === scoreB ? scoreB + 1 : scoreB, played: true }
  })
  return { ...tour, matches }
}
const played = playAll(t)
check('group stage reported complete', isGroupStageComplete(played.matches))
let allRanksValid = true
for (const g of played.groups) {
  const st = computeGroupStandings(g.id, played.teams, played.matches, played.settings)
  if (st.length !== 5) allRanksValid = false
  st.forEach((r, idx) => {
    if (r.rank !== idx + 1) allRanksValid = false
    if (r.wins + r.losses !== r.played) allRanksValid = false
  })
  // points must be monotonically non-increasing by rank
  for (let i = 1; i < st.length; i++) if (st[i].points > st[i - 1].points) allRanksValid = false
  // qualifiers flagged for top 3
  const q = st.filter((r) => r.qualified).length
  if (q !== 3) allRanksValid = false
}
check('standings: ranks/points/qualifiers consistent', allRanksValid)

const quals = getQualifiers(played.teams, played.groups, played.matches, played.settings)
check('6 qualifiers (3 per group)', quals.length === 6, quals.length)

/* 6. Knockout generation + bye resolution + propagation */
const ko = generateKnockout(played.teams, played.groups, played.matches, played.settings)
const rounds = new Set(ko.map((m) => m.round))
check('knockout has SF and FINAL', rounds.has('SF') && rounds.has('FINAL'))
check('knockout has BRONZE', rounds.has('BRONZE'))
const byes = ko.filter((m) => m.isBye)
check('two byes auto-resolved (6 teams -> bracket of 8)', byes.length === 2, byes.length)
const finalBefore = ko.find((m) => m.round === 'FINAL')!
check('final initially has no fixed teams (fed by SF)', finalBefore.teamA === null && finalBefore.teamB === null)

/* Play the whole bracket and confirm a champion emerges */
function playKnockout(matches: Match[]): Match[] {
  // iterate until stable: fill any playable match with a deterministic winner
  const work = matches.map((m) => ({ ...m }))
  for (let pass = 0; pass < 10; pass++) {
    syncBracket(work, [])
    let changed = false
    for (const m of work) {
      if (m.stage !== 'knockout' || m.isBye || m.played) continue
      if (m.teamA !== null && m.teamB !== null) {
        m.scoreA = 5
        m.scoreB = 3
        m.played = true
        changed = true
      }
    }
    if (!changed) break
  }
  return work
}
const finished = playKnockout(ko)
const finalMatch = finished.find((m) => m.round === 'FINAL')!
const bronzeMatch = finished.find((m) => m.round === 'BRONZE')!
check('final is played with two real teams', finalMatch.played && finalMatch.teamA !== null && finalMatch.teamB !== null)
check('champion determined', winnerOf(finalMatch) !== null)
check('bronze played with two real teams', bronzeMatch.played && bronzeMatch.teamA !== null && bronzeMatch.teamB !== null)

/* 6b. Cross-group draw: no first-round match between teams of the same group */
{
  const groupOf = new Map(played.teams.map((tm) => [tm.id, tm.groupId]))
  const firstRound = ko.filter((m) => !m.sourceA && !m.sourceB && !m.isBye)
  check(
    '2x3 draw: no same-group first-round match',
    firstRound.every((m) => groupOf.get(m.teamA!) !== groupOf.get(m.teamB!)),
    firstRound.map((m) => `${m.labelA}-${m.labelB}`),
  )
  // A1/B1 sit in opposite halves, so group winners can only meet in the final
  const semis = finished.filter((m) => m.round === 'SF')
  const winners = quals.filter((q) => q.pos === 1).map((q) => q.teamId)
  check(
    '2x3 draw: group winners are in opposite semi-finals',
    semis.every((m) => !(winners.includes(m.teamA!) && winners.includes(m.teamB!))),
  )

  for (const [numTeams, numGroups, qualifiersPerGroup] of [
    [8, 2, 2], [8, 2, 4], [12, 3, 2], [12, 3, 3], [16, 4, 2], [16, 4, 3], [20, 4, 4],
  ]) {
    const tour = playAll(createTournament({ numTeams, numGroups, qualifiersPerGroup, doubleRoundRobin: false }))
    const gOf = new Map(tour.teams.map((tm) => [tm.id, tm.groupId]))
    const kos = generateKnockout(tour.teams, tour.groups, tour.matches, tour.settings)
    const clashes = kos.filter(
      (m) => !m.sourceA && !m.sourceB && !m.isBye && gOf.get(m.teamA!) === gOf.get(m.teamB!),
    )
    check(
      `${numGroups}x${qualifiersPerGroup} draw: no same-group first-round match`,
      clashes.length === 0,
      clashes.map((m) => `${m.labelA}-${m.labelB}`),
    )
  }
}

/* 6c. Goal limits and the best-of-three final */
{
  const g = (a: number, b: number) => ({ a, b })
  const bronzeM = finished.find((m) => m.round === 'BRONZE')!
  const sfM = finished.find((m) => m.round === 'SF')!
  check('limits: bronze goes to 7, other matches to 5', goalLimit(bronzeM) === 7 && goalLimit(sfM) === 5 && goalLimit(groupMatches[0]) === 5)
  check('limits: 5:3 valid in a 5-goal match', validateGame(g(5, 3), 5) === null)
  check('limits: 6:4 rejected in a 5-goal match', validateGame(g(6, 4), 5) !== null)
  check('limits: 7:5 valid in the bronze match', validateGame(g(7, 5), 7) === null)
  check('limits: 5:3 rejected in the bronze match (must reach 7)', validateGame(g(5, 3), 7) !== null)
  check('limits: 8:6 rejected in the bronze match', validateGame(g(8, 6), 7) !== null)
  check('limits: input is clamped to the limit', clampGoals('9', 5) === '5' && clampGoals('12', 7) === '7' && clampGoals('3', 5) === '3' && clampGoals('', 5) === '')

  check('series: 2-0 is valid and decided', validateSeries([g(5, 3), g(5, 2)]) === null && isSeriesDecided([g(5, 3), g(5, 2)]))
  check('series: single game can be saved mid-way', validateSeries([g(5, 3)]) === null && !isSeriesDecided([g(5, 3)]))
  check('series: games 1-2 are capped at 5', validateSeries([g(7, 3)]) !== null && validateSeries([g(5, 3), g(3, 6)]) !== null)
  check('series: 1-1 needs a decider', !isSeriesDecided([g(5, 3), g(2, 5)]))
  check('series: decider to 7 is valid', validateSeries([g(5, 3), g(2, 5), g(7, 5)]) === null)
  check('series: decider not reaching 7 is rejected', validateSeries([g(5, 3), g(2, 5), g(5, 3)]) !== null)
  check('series: decider 8:7 is rejected', validateSeries([g(5, 3), g(2, 5), g(8, 7)]) !== null)
  check('series: no third game after 2-0', validateSeries([g(5, 3), g(5, 2), g(7, 5)]) !== null)
  check('series: drawn game is rejected', validateSeries([g(4, 4)]) !== null)
  const w = seriesWins([g(5, 3), g(2, 5), g(3, 7)])
  check('series: 1-2 win count', w.a === 1 && w.b === 2, w)

  // The final's winner is the series winner, and stale series are cleared upstream.
  const work = finished.map((m) => ({ ...m }))
  const fin = work.find((m) => m.round === 'FINAL')!
  fin.games = [g(5, 3), g(2, 5), g(3, 7)]
  fin.scoreA = 1
  fin.scoreB = 2
  check('series: final winner = series winner', winnerOf(fin) === fin.teamB)
  check('series: goals summed over games', JSON.stringify(matchGoals(fin)) === JSON.stringify({ a: 10, b: 15 }))
  const sf = work.find((m) => m.round === 'SF' && m.id === fin.sourceA!.matchId)!
  ;[sf.scoreA, sf.scoreB] = [sf.scoreB, sf.scoreA] // flip the semi-final result
  syncBracket(work, [])
  check('series: changing a semi-final clears the final series', !fin.played && fin.games === undefined)
}

/* 7. Head-to-head tiebreaker (points & GD equal, H2H decides) */
{
  const mini = createTournament({ numTeams: 3, numGroups: 1, qualifiersPerGroup: 1, doubleRoundRobin: false })
  const [x, y, z] = mini.teams
  const gid = mini.groups[0].id
  const find = (a: string, b: string) =>
    mini.matches.find(
      (m) => (m.teamA === a && m.teamB === b) || (m.teamA === b && m.teamB === a),
    )!
  const setRes = (m: Match, winner: string, ws: number, ls: number) => {
    if (m.teamA === winner) {
      m.scoreA = ws
      m.scoreB = ls
    } else {
      m.scoreA = ls
      m.scoreB = ws
    }
    m.played = true
  }
  // Make a 3-way tie on points (each wins one) and equal GD, H2H by goals
  setRes(find(x.id, y.id), x.id, 3, 1) // x beats y
  setRes(find(y.id, z.id), y.id, 3, 1) // y beats z
  setRes(find(z.id, x.id), z.id, 3, 1) // z beats x
  // each: 1W 1L, +2/-2 -> all points equal, GD all 0, GF all 4 -> deep tie, stable order
  const st = computeGroupStandings(gid, mini.teams, mini.matches, mini.settings)
  check('3-way tie produces a strict ordering', new Set(st.map((r) => r.rank)).size === 3, st.map((r) => r.rank))
  check('tie: all equal on points', st.every((r) => r.points === st[0].points))
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
