import { useMemo, useState } from 'react'
import { Shuffle, ListChecks, Flag, RotateCcw } from 'lucide-react'
import type { ID } from '../types'
import { useStore } from '../state/store'
import { useDerived } from '../state/selectors'
import { ROUND_TITLES } from '../lib/knockout'
import { Button, Card, CardHeader } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { MatchRow, ScoreDialog } from '../components/shared'

type Filter = 'all' | 'pending' | 'done'

export function Matches() {
  const { tournament, dispatch } = useStore()
  const d = useDerived()
  const [scoreId, setScoreId] = useState<ID | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmRegen, setConfirmRegen] = useState(false)

  const groupMatches = useMemo(
    () =>
      [...tournament.matches]
        .filter((m) => m.stage === 'group')
        .sort((a, b) => a.order - b.order)
        .filter((m) => (filter === 'all' ? true : filter === 'done' ? m.played : !m.played)),
    [tournament.matches, filter],
  )

  const knockoutMatches = useMemo(
    () =>
      [...tournament.matches]
        .filter((m) => m.stage === 'knockout')
        .sort((a, b) => a.order - b.order),
    [tournament.matches],
  )

  const hasResults = d.groupProgress.played > 0

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Mérkőzések"
          subtitle="A sorsolás csoportonként váltakozva ütemezi a meccseket"
          icon={<ListChecks className="h-5 w-5" />}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => (hasResults ? setConfirmRegen(true) : dispatch({ type: 'REGENERATE_SCHEDULE' }))}
            >
              <Shuffle className="h-4 w-4" /> Újrasorsolás
            </Button>
          }
        />
        <div className="flex gap-1 px-4 pt-4">
          {(
            [
              ['all', 'Mind'],
              ['pending', 'Függőben'],
              ['done', 'Lejátszott'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={
                'rounded-lg px-3 py-1.5 text-sm font-semibold ' +
                (filter === key
                  ? 'bg-egroup-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-2 p-4">
          {groupMatches.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">Nincs megjeleníthető mérkőzés.</p>
          )}
          {groupMatches.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-center text-xs font-bold text-slate-400 tabular">
                {m.order}
              </span>
              <span className="hidden w-20 shrink-0 text-xs text-slate-400 sm:block">
                {d.groups.get(m.groupId!)?.name} csoport
                {m.leg === 2 ? ' · visszavágó' : ''}
              </span>
              <div className="flex-1">
                <MatchRow match={m} onScore={setScoreId} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {knockoutMatches.length > 0 && (
        <Card>
          <CardHeader title="Kieséses szakasz" icon={<Flag className="h-5 w-5" />} />
          <div className="space-y-2 p-4">
            {knockoutMatches.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="hidden w-28 shrink-0 text-xs font-semibold text-egroup-600 dark:text-egroup-300 sm:block">
                  {ROUND_TITLES[m.round!]}
                </span>
                <div className="flex-1">
                  <MatchRow match={m} onScore={setScoreId} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ScoreDialog matchId={scoreId} open={scoreId !== null} onClose={() => setScoreId(null)} />

      <Modal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Újrasorsolás"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRegen(false)}>
              Mégse
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'REGENERATE_SCHEDULE' })
                setConfirmRegen(false)
              }}
            >
              <RotateCcw className="h-4 w-4" /> Újrasorsolás
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Az újrasorsolás <strong>törli az összes eddig rögzített eredményt</strong> és új
          mérkőzéssorrendet generál. Biztosan folytatod?
        </p>
      </Modal>
    </div>
  )
}
