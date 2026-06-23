import type { Group, Settings, Team, Tournament } from '../types'
import { generateGroupSchedule } from './scheduling'
import { uid } from './utils'

export const DEFAULTS = {
  name: 'E-Group Csocsóbajnokság',
  numTeams: 10,
  numGroups: 2,
  qualifiersPerGroup: 3,
  doubleRoundRobin: true,
  winPoints: 2,
  lossPoints: 0,
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function groupName(index: number): string {
  return index < LETTERS.length ? LETTERS[index] : `G${index + 1}`
}

export function makeGroups(n: number): Group[] {
  return Array.from({ length: n }, (_, i) => ({ id: uid('g'), name: groupName(i) }))
}

/** Distribute team slots across groups as evenly as possible. */
export function makeTeams(numTeams: number, groups: Group[]): Team[] {
  const teams: Team[] = []
  for (let i = 0; i < numTeams; i++) {
    const g = groups[i % groups.length]
    teams.push({
      id: uid('t'),
      name: `Csapat ${i + 1}`,
      players: ['', ''],
      groupId: g.id,
    })
  }
  return teams
}

export interface CreateOptions {
  name?: string
  numTeams?: number
  numGroups?: number
  qualifiersPerGroup?: number
  doubleRoundRobin?: boolean
}

export function createTournament(opts: CreateOptions = {}): Tournament {
  const numGroups = opts.numGroups ?? DEFAULTS.numGroups
  const numTeams = opts.numTeams ?? DEFAULTS.numTeams
  const settings: Settings = {
    numGroups,
    qualifiersPerGroup: opts.qualifiersPerGroup ?? DEFAULTS.qualifiersPerGroup,
    doubleRoundRobin: opts.doubleRoundRobin ?? DEFAULTS.doubleRoundRobin,
    winPoints: DEFAULTS.winPoints,
    lossPoints: DEFAULTS.lossPoints,
  }
  const groups = makeGroups(numGroups)
  const teams = makeTeams(numTeams, groups)
  const matches = generateGroupSchedule(groups, teams, settings)
  const now = Date.now()

  return {
    id: uid('trn'),
    name: opts.name ?? DEFAULTS.name,
    createdAt: now,
    updatedAt: now,
    groups,
    teams,
    matches,
    settings,
    knockoutGenerated: false,
    currentMatchId: null,
  }
}
