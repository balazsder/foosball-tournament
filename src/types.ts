export type ID = string

export interface Team {
  id: ID
  name: string
  players: [string, string]
  groupId: ID
}

export interface Group {
  id: ID
  name: string
}

export type Stage = 'group' | 'knockout'

/** Knockout round identifiers, ordered from earliest to latest. */
export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | 'BRONZE' | 'FINAL'

export interface MatchSource {
  matchId: ID
  type: 'winner' | 'loser'
}

export interface GameScore {
  a: number
  b: number
}

export interface Match {
  id: ID
  stage: Stage
  /** group matches only */
  groupId?: ID
  /** which leg of the double round-robin: 1 = oda, 2 = vissza */
  leg?: 1 | 2
  /** knockout matches only */
  round?: KnockoutRound
  /** global play order used for the schedule / "next match" caller */
  order: number
  teamA: ID | null
  teamB: ID | null
  /** placeholder labels shown while the team is undecided (knockout) */
  labelA?: string
  labelB?: string
  /** where the team in this slot comes from (knockout wiring) */
  sourceA?: MatchSource
  sourceB?: MatchSource
  /** For a best-of-three series (the final) these hold the games won, e.g. 2:1. */
  scoreA: number | null
  scoreB: number | null
  /** per-game scores of a series (the final) */
  games?: GameScore[]
  played: boolean
  /** auto-resolved walkover (e.g. a bye in the bracket) */
  isBye?: boolean
}

export interface Settings {
  numGroups: number
  qualifiersPerGroup: number
  /** oda-visszavágó */
  doubleRoundRobin: boolean
  winPoints: number
  lossPoints: number
}

export interface Tournament {
  id: ID
  name: string
  createdAt: number
  updatedAt: number
  groups: Group[]
  teams: Team[]
  matches: Match[]
  settings: Settings
  knockoutGenerated: boolean
  /** id of the match flagged as "currently playing" for the projector view */
  currentMatchId: ID | null
}

export interface StandingRow {
  teamId: ID
  played: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  rank: number
  qualified: boolean
}
