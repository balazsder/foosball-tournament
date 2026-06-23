import { useEffect, useState } from 'react'
import { Trophy, Pencil, Check, RotateCcw } from 'lucide-react'
import type { ID, Match, StandingRow, Team } from '../types'
import { cn } from '../lib/utils'
import { winnerOf } from '../lib/standings'
import { useStore } from '../state/store'
import { useDerived } from '../state/selectors'
import { Badge, Button, Input } from './ui/primitives'
import { Modal } from './ui/Modal'

export function useTeamName() {
  const { teams } = useDerived()
  return (id: ID | null, fallback = '—') => (id ? teams.get(id)?.name ?? fallback : fallback)
}

/** Compact team display: name + players. */
export function TeamLine({
  team,
  align = 'left',
  highlight,
}: {
  team?: Team
  align?: 'left' | 'right'
  highlight?: boolean
}) {
  if (!team) return <span className="text-slate-400">—</span>
  const players = team.players.filter(Boolean).join(' · ')
  return (
    <div className={cn(align === 'right' && 'text-right')}>
      <div className={cn('font-semibold leading-tight', highlight && 'text-pitch-dark dark:text-pitch-light')}>
        {team.name}
      </div>
      {players && (
        <div className="text-xs text-slate-500 dark:text-slate-400">{players}</div>
      )}
    </div>
  )
}

/* ------------------------------ Score dialog ------------------------------- */
export function ScoreDialog({
  matchId,
  open,
  onClose,
}: {
  matchId: ID | null
  open: boolean
  onClose: () => void
}) {
  const { tournament, dispatch } = useStore()
  const { teams } = useDerived()
  const match = tournament.matches.find((m) => m.id === matchId)
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  useEffect(() => {
    if (open && match) {
      setA(match.scoreA?.toString() ?? '')
      setB(match.scoreB?.toString() ?? '')
    }
  }, [open, match])

  if (!match) return null
  const teamA = match.teamA ? teams.get(match.teamA) : undefined
  const teamB = match.teamB ? teams.get(match.teamB) : undefined
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  const valid = Number.isInteger(na) && Number.isInteger(nb) && na >= 0 && nb >= 0 && na !== nb

  const save = () => {
    if (!valid) return
    dispatch({ type: 'SET_RESULT', matchId: match.id, scoreA: na, scoreB: nb })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eredmény rögzítése"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Mégse
          </Button>
          {match.played && (
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: 'CLEAR_RESULT', matchId: match.id })
                onClose()
              }}
            >
              <RotateCcw className="h-4 w-4" /> Törlés
            </Button>
          )}
          <Button variant="pitch" onClick={save} disabled={!valid}>
            <Check className="h-4 w-4" /> Mentés
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-center">
          <TeamLine team={teamA} />
        </div>
        <span className="text-slate-400">vs</span>
        <div className="text-center">
          <TeamLine team={teamB} />
        </div>

        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-16 text-center text-3xl font-bold"
          autoFocus
        />
        <span className="text-2xl font-bold text-slate-300">:</span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="h-16 text-center text-3xl font-bold"
        />
      </div>
      {!valid && (a !== '' || b !== '') && (
        <p className="mt-3 text-center text-sm text-rose-500">
          Csocsóban nincs döntetlen — a két eredmény nem lehet egyenlő.
        </p>
      )}
    </Modal>
  )
}

/* ------------------------------ Result badge ------------------------------- */
export function ResultBadge({ match }: { match: Match }) {
  if (match.isBye) return <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800">walkover</Badge>
  if (!match.played || match.scoreA === null)
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">függőben</Badge>
  return (
    <Badge className="bg-pitch/15 text-pitch-dark dark:text-pitch-light">
      {match.scoreA} : {match.scoreB}
    </Badge>
  )
}

/* ----------------------------- Standings table ----------------------------- */
export function StandingsTable({
  rows,
  compact = false,
}: {
  rows: StandingRow[]
  compact?: boolean
}) {
  const teamName = useTeamName()
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[440px] text-sm tabular">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-2 py-2 text-center font-semibold">#</th>
            <th className="px-2 py-2 text-left font-semibold">Csapat</th>
            <th className="px-2 py-2 text-center font-semibold" title="Lejátszott">M</th>
            <th className="px-2 py-2 text-center font-semibold" title="Győzelem">Gy</th>
            <th className="px-2 py-2 text-center font-semibold" title="Vereség">V</th>
            {!compact && <th className="px-2 py-2 text-center font-semibold" title="Lőtt gól">LG</th>}
            {!compact && <th className="px-2 py-2 text-center font-semibold" title="Kapott gól">KG</th>}
            <th className="px-2 py-2 text-center font-semibold" title="Gólkülönbség">GK</th>
            <th className="px-2 py-2 text-center font-semibold" title="Pont">P</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.teamId}
              className={cn(
                'border-b border-slate-100 dark:border-slate-800',
                r.qualified && 'bg-pitch/10',
              )}
            >
              <td className="px-2 py-2 text-center">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    r.qualified
                      ? 'bg-pitch text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {r.rank}
                </span>
              </td>
              <td className="px-2 py-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  {r.qualified && <Trophy className="h-3.5 w-3.5 text-pitch" />}
                  {teamName(r.teamId)}
                </span>
              </td>
              <td className="px-2 py-2 text-center text-slate-600 dark:text-slate-300">{r.played}</td>
              <td className="px-2 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">{r.wins}</td>
              <td className="px-2 py-2 text-center text-rose-500">{r.losses}</td>
              {!compact && <td className="px-2 py-2 text-center text-slate-600 dark:text-slate-300">{r.goalsFor}</td>}
              {!compact && <td className="px-2 py-2 text-center text-slate-600 dark:text-slate-300">{r.goalsAgainst}</td>}
              <td className="px-2 py-2 text-center font-medium">
                {r.goalDiff > 0 ? '+' : ''}
                {r.goalDiff}
              </td>
              <td className="px-2 py-2 text-center text-base font-extrabold text-egroup-600 dark:text-egroup-300">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------- Match row --------------------------------- */
export function MatchRow({
  match,
  onScore,
}: {
  match: Match
  onScore: (id: ID) => void
}) {
  const { teams } = useDerived()
  const teamA = match.teamA ? teams.get(match.teamA) : undefined
  const teamB = match.teamB ? teams.get(match.teamB) : undefined
  const win = winnerOf(match)
  const labelA = teamA?.name ?? match.labelA ?? 'TBD'
  const labelB = teamB?.name ?? match.labelB ?? 'TBD'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className={cn('truncate text-right font-semibold', win === match.teamA && 'text-pitch-dark dark:text-pitch-light')}>
          {labelA}
        </span>
        <span className="min-w-[56px] text-center">
          {match.played && match.scoreA !== null ? (
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold tabular dark:bg-slate-800">
              {match.scoreA}:{match.scoreB}
            </span>
          ) : match.isBye ? (
            <span className="text-xs text-slate-400">walkover</span>
          ) : (
            <span className="text-slate-300">vs</span>
          )}
        </span>
        <span className={cn('truncate font-semibold', win === match.teamB && 'text-pitch-dark dark:text-pitch-light')}>
          {labelB}
        </span>
      </div>
      <Button
        size="sm"
        variant={match.played ? 'outline' : 'pitch'}
        onClick={() => onScore(match.id)}
        disabled={!match.isBye && (match.teamA === null || match.teamB === null)}
      >
        <Pencil className="h-3.5 w-3.5" />
        {match.played ? 'Mód.' : 'Eredmény'}
      </Button>
    </div>
  )
}
