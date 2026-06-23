import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { ID, Match, Tournament } from '../types'
import { createTournament, groupName } from '../lib/factory'
import { generateGroupSchedule } from '../lib/scheduling'
import { generateKnockout, syncBracket } from '../lib/knockout'
import { loadTournament, saveTournament } from '../lib/storage'
import { uid } from '../lib/utils'

export type Action =
  | { type: 'REPLACE'; tournament: Tournament }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_NUM_GROUPS'; n: number }
  | { type: 'SET_QUALIFIERS'; n: number }
  | { type: 'SET_DOUBLE_RR'; value: boolean }
  | { type: 'ADD_TEAM'; groupId?: ID }
  | { type: 'UPDATE_TEAM'; id: ID; patch: { name?: string; players?: [string, string] } }
  | { type: 'DELETE_TEAM'; id: ID }
  | { type: 'MOVE_TEAM'; id: ID; groupId: ID }
  | { type: 'ADD_GROUP' }
  | { type: 'DELETE_GROUP'; id: ID }
  | { type: 'RENAME_GROUP'; id: ID; name: string }
  | { type: 'REGENERATE_SCHEDULE'; seed?: number }
  | { type: 'SET_RESULT'; matchId: ID; scoreA: number; scoreB: number }
  | { type: 'CLEAR_RESULT'; matchId: ID }
  | { type: 'SET_CURRENT'; matchId: ID | null }
  | { type: 'GENERATE_KNOCKOUT' }
  | { type: 'RESET_KNOCKOUT' }

function touch(t: Tournament): Tournament {
  return { ...t, updatedAt: Date.now() }
}

/** Rebuild the group schedule (and discard any knockout) after a structural change. */
function rebuildGroupStage(t: Tournament, seed?: number): Tournament {
  const matches = generateGroupSchedule(t.groups, t.teams, t.settings, seed)
  return { ...t, matches, knockoutGenerated: false, currentMatchId: null }
}

function applyResult(
  t: Tournament,
  matchId: ID,
  scoreA: number | null,
  scoreB: number | null,
  played: boolean,
): Tournament {
  const matches: Match[] = t.matches.map((m) =>
    m.id === matchId ? { ...m, scoreA, scoreB, played } : { ...m },
  )
  const target = matches.find((m) => m.id === matchId)
  if (target?.stage === 'knockout') {
    const ko = matches.filter((m) => m.stage === 'knockout')
    syncBracket(ko, t.teams)
  }
  // if the resolved match was the "current" one and is now finished, clear it
  let currentMatchId = t.currentMatchId
  if (played && currentMatchId === matchId) currentMatchId = null
  return { ...t, matches, currentMatchId }
}

function redistributeOrphans(t: Tournament): Tournament {
  // ensure every team belongs to an existing group
  const groupIds = new Set(t.groups.map((g) => g.id))
  if (t.groups.length === 0) return t
  const teams = t.teams.map((team, i) =>
    groupIds.has(team.groupId)
      ? team
      : { ...team, groupId: t.groups[i % t.groups.length].id },
  )
  return { ...t, teams }
}

function reducer(state: Tournament, action: Action): Tournament {
  switch (action.type) {
    case 'REPLACE':
      return action.tournament

    case 'SET_NAME':
      return touch({ ...state, name: action.name })

    case 'SET_DOUBLE_RR':
      return touch(
        rebuildGroupStage({
          ...state,
          settings: { ...state.settings, doubleRoundRobin: action.value },
        }),
      )

    case 'SET_QUALIFIERS': {
      const n = Math.max(1, action.n)
      // changing qualifiers invalidates an existing knockout
      const cleared = state.knockoutGenerated
        ? {
            ...state,
            matches: state.matches.filter((m) => m.stage === 'group'),
            knockoutGenerated: false,
            currentMatchId: null,
          }
        : state
      return touch({
        ...cleared,
        settings: { ...cleared.settings, qualifiersPerGroup: n },
      })
    }

    case 'SET_NUM_GROUPS': {
      const target = Math.max(1, action.n)
      let groups = [...state.groups]
      if (target > groups.length) {
        for (let i = groups.length; i < target; i++)
          groups.push({ id: uid('g'), name: groupName(i) })
      } else if (target < groups.length) {
        groups = groups.slice(0, target)
      }
      const next = redistributeOrphans({
        ...state,
        groups,
        settings: { ...state.settings, numGroups: target },
      })
      return touch(rebuildGroupStage(next))
    }

    case 'ADD_GROUP': {
      const groups = [...state.groups, { id: uid('g'), name: groupName(state.groups.length) }]
      return touch(
        rebuildGroupStage({
          ...state,
          groups,
          settings: { ...state.settings, numGroups: groups.length },
        }),
      )
    }

    case 'DELETE_GROUP': {
      if (state.groups.length <= 1) return state
      const groups = state.groups.filter((g) => g.id !== action.id)
      const teams = state.teams.filter((t) => t.groupId !== action.id)
      const next = redistributeOrphans({
        ...state,
        groups,
        teams,
        settings: { ...state.settings, numGroups: groups.length },
      })
      return touch(rebuildGroupStage(next))
    }

    case 'RENAME_GROUP':
      return touch({
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, name: action.name } : g,
        ),
      })

    case 'ADD_TEAM': {
      const groupId = action.groupId ?? state.groups[0]?.id
      if (!groupId) return state
      const team = {
        id: uid('t'),
        name: `Csapat ${state.teams.length + 1}`,
        players: ['', ''] as [string, string],
        groupId,
      }
      return touch(rebuildGroupStage({ ...state, teams: [...state.teams, team] }))
    }

    case 'UPDATE_TEAM':
      // name/players edits don't affect the schedule -> keep results intact
      return touch({
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      })

    case 'DELETE_TEAM':
      return touch(
        rebuildGroupStage({
          ...state,
          teams: state.teams.filter((t) => t.id !== action.id),
        }),
      )

    case 'MOVE_TEAM':
      return touch(
        rebuildGroupStage({
          ...state,
          teams: state.teams.map((t) =>
            t.id === action.id ? { ...t, groupId: action.groupId } : t,
          ),
        }),
      )

    case 'REGENERATE_SCHEDULE':
      return touch(rebuildGroupStage(state, action.seed))

    case 'SET_RESULT':
      return touch(applyResult(state, action.matchId, action.scoreA, action.scoreB, true))

    case 'CLEAR_RESULT':
      return touch(applyResult(state, action.matchId, null, null, false))

    case 'SET_CURRENT':
      return touch({ ...state, currentMatchId: action.matchId })

    case 'GENERATE_KNOCKOUT': {
      const ko = generateKnockout(state.teams, state.groups, state.matches, state.settings)
      const groupMatches = state.matches.filter((m) => m.stage === 'group')
      return touch({
        ...state,
        matches: [...groupMatches, ...ko],
        knockoutGenerated: true,
        currentMatchId: null,
      })
    }

    case 'RESET_KNOCKOUT':
      return touch({
        ...state,
        matches: state.matches.filter((m) => m.stage === 'group'),
        knockoutGenerated: false,
        currentMatchId: null,
      })

    default:
      return state
  }
}

function init(): Tournament {
  return loadTournament() ?? createTournament()
}

interface StoreValue {
  tournament: Tournament
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(reducer, undefined, init)

  // Automatic state persistence (debounced via microtask batching by React).
  useEffect(() => {
    saveTournament(tournament)
  }, [tournament])

  const value = useMemo(() => ({ tournament, dispatch }), [tournament])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
