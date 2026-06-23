import { Table2, Trophy } from 'lucide-react'
import { useStore } from '../state/store'
import { useDerived } from '../state/selectors'
import { Card, CardHeader } from '../components/ui/primitives'
import { StandingsTable } from '../components/shared'

export function Standings() {
  const { tournament } = useStore()
  const d = useDerived()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Trophy className="h-4 w-4 text-pitch" />
        A zölddel kiemelt helyek jutnak tovább (csoportonként az első{' '}
        {tournament.settings.qualifiersPerGroup}).
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {tournament.groups.map((g) => (
          <Card key={g.id}>
            <CardHeader
              title={`${g.name} csoport`}
              subtitle={`${tournament.teams.filter((t) => t.groupId === g.id).length} csapat`}
              icon={<Table2 className="h-5 w-5" />}
            />
            <div className="p-3">
              <StandingsTable rows={d.standingsByGroup.get(g.id) ?? []} />
            </div>
          </Card>
        ))}
      </div>

      <Legend />
    </div>
  )
}

function Legend() {
  const items = [
    ['M', 'Lejátszott meccsek'],
    ['Gy', 'Győzelem'],
    ['V', 'Vereség'],
    ['LG', 'Lőtt gól'],
    ['KG', 'Kapott gól'],
    ['GK', 'Gólkülönbség'],
    ['P', 'Pontszám (győzelem = 2, vereség = 0)'],
  ]
  return (
    <Card className="p-4">
      <h4 className="mb-2 font-display text-sm uppercase tracking-wide text-slate-500">Jelmagyarázat</h4>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-8 font-bold text-egroup-600 dark:text-egroup-300">{k}</dt>
            <dd className="text-slate-600 dark:text-slate-300">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Holtverseny esetén a sorrend: pontszám → gólkülönbség → egymás elleni eredmény.
      </p>
    </Card>
  )
}
