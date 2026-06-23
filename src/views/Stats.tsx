import { Trophy, Award, Goal } from 'lucide-react'
import { useStore } from '../state/store'
import { computeLeaders, useDerived, type StatLeader } from '../state/selectors'
import { Card, CardHeader } from '../components/ui/primitives'
import { TeamLine } from '../components/shared'

export function Stats() {
  const { tournament } = useStore()
  const { teams } = useDerived()
  const leaders = computeLeaders(tournament)

  const board = (items: StatLeader[], fmt: (v: number) => string) =>
    items
      .filter((x) => x.value !== 0)
      .slice(0, 8)
      .map((x, i) => (
        <li
          key={x.teamId}
          className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"
        >
          <span
            className={
              'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ' +
              (i === 0
                ? 'bg-gold text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')
            }
          >
            {i + 1}
          </span>
          <div className="flex-1">
            <TeamLine team={teams.get(x.teamId)} />
          </div>
          <span className="font-display text-lg text-egroup-600 dark:text-egroup-300">
            {fmt(x.value)}
          </span>
        </li>
      ))

  const empty = (items: StatLeader[]) => items.every((x) => x.value === 0)

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card>
        <CardHeader title="Legtöbb győzelem" icon={<Trophy className="h-5 w-5" />} />
        <ul className="px-4 py-2">
          {empty(leaders.mostWins) ? (
            <Placeholder />
          ) : (
            board(leaders.mostWins, (v) => `${v}`)
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Legjobb gólkülönbség" icon={<Award className="h-5 w-5" />} />
        <ul className="px-4 py-2">
          {empty(leaders.bestGd) ? (
            <Placeholder />
          ) : (
            board(leaders.bestGd, (v) => `${v > 0 ? '+' : ''}${v}`)
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Legtöbb lőtt gól" icon={<Goal className="h-5 w-5" />} />
        <ul className="px-4 py-2">
          {empty(leaders.topScorers) ? (
            <Placeholder />
          ) : (
            board(leaders.topScorers, (v) => `${v}`)
          )}
        </ul>
      </Card>
    </div>
  )
}

function Placeholder() {
  return <li className="py-6 text-center text-sm text-slate-500">Még nincs lejátszott mérkőzés.</li>
}
