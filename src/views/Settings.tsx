import { useState } from 'react'
import {
  Settings2,
  FileDown,
  FileSpreadsheet,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react'
import { useStore } from '../state/store'
import { useDerived } from '../state/selectors'
import { createTournament } from '../lib/factory'
import { Button, Card, CardHeader, Input, Switch } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'

export function Settings() {
  const { tournament, dispatch } = useStore()
  const { groupProgress } = useDerived()
  const [showNew, setShowNew] = useState(false)

  const s = tournament.settings

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Bajnokság beállításai" icon={<Settings2 className="h-5 w-5" />} />
        <div className="space-y-5 p-5">
          <Field label="Bajnokság neve">
            <Input
              value={tournament.name}
              onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
            />
          </Field>

          <Field label="Csoportok száma" hint="A csapatok újraosztásra kerülnek a csoportok között.">
            <Stepper
              value={s.numGroups}
              min={1}
              max={8}
              onChange={(n) => dispatch({ type: 'SET_NUM_GROUPS', n })}
            />
          </Field>

          <Field
            label="Továbbjutók csoportonként"
            hint="Hány csapat jut tovább a kieséses szakaszba minden csoportból."
          >
            <Stepper
              value={s.qualifiersPerGroup}
              min={1}
              max={8}
              onChange={(n) => dispatch({ type: 'SET_QUALIFIERS', n })}
            />
          </Field>

          <Field label="Oda-visszavágó rendszer" hint="Minden csapat kétszer játszik egymással.">
            <Switch
              checked={s.doubleRoundRobin}
              onChange={(v) => dispatch({ type: 'SET_DOUBLE_RR', value: v })}
              label={s.doubleRoundRobin ? 'Bekapcsolva' : 'Kikapcsolva (csak egy kör)'}
            />
          </Field>

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
            Pontozás: győzelem = {s.winPoints} pont, vereség = {s.lossPoints} pont · döntetlen nincs.
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Exportálás"
          subtitle="Versenytábla és végeredmény letöltése"
          icon={<FileDown className="h-5 w-5" />}
        />
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <Button
            variant="outline"
            onClick={async () => (await import('../lib/exports')).exportStandingsPDF(tournament)}
          >
            <FileDown className="h-4 w-4" /> PDF versenytábla
          </Button>
          <Button
            variant="outline"
            onClick={async () => (await import('../lib/exports')).exportResultsPDF(tournament)}
          >
            <FileDown className="h-4 w-4" /> PDF végeredmény
          </Button>
          <Button
            variant="outline"
            onClick={async () => (await import('../lib/exports')).exportExcel(tournament)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel export
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Új torna" subtitle="Egy kattintással újraindítható — jövőre is" icon={<Sparkles className="h-5 w-5" />} />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Button onClick={() => setShowNew(true)}>
            <Sparkles className="h-4 w-4" /> Új torna létrehozása
          </Button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Az állapot automatikusan mentődik a böngészőben (LocalStorage).
            {groupProgress.played > 0 && ' A jelenlegi torna felülíródik.'}
          </span>
        </div>
      </Card>

      <NewTournamentModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="font-semibold">{label}</div>
        {hint && <div className="text-sm text-slate-500 dark:text-slate-400">{hint}</div>}
      </div>
      <div className="sm:justify-self-end">{children}</div>
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300 p-1 dark:border-slate-700">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-10 text-center font-display text-lg tabular">{value}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}

function NewTournamentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('E-Group Csocsóbajnokság')
  const [numTeams, setNumTeams] = useState(10)
  const [numGroups, setNumGroups] = useState(2)
  const [qpg, setQpg] = useState(3)
  const [double, setDouble] = useState(true)

  const create = () => {
    const t = createTournament({
      name: name.trim() || 'Csocsóbajnokság',
      numTeams,
      numGroups,
      qualifiersPerGroup: qpg,
      doubleRoundRobin: double,
    })
    dispatch({ type: 'REPLACE', tournament: t })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Új torna létrehozása"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Mégse
          </Button>
          <Button onClick={create}>
            <Sparkles className="h-4 w-4" /> Létrehozás
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Bajnokság neve</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <NumberBox label="Csapatok" value={numTeams} min={2} max={64} onChange={setNumTeams} />
          <NumberBox label="Csoportok" value={numGroups} min={1} max={8} onChange={setNumGroups} />
          <NumberBox label="Továbbjutó / csoport" value={qpg} min={1} max={8} onChange={setQpg} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/40">
          <span className="text-sm font-semibold">Oda-visszavágó</span>
          <Switch checked={double} onChange={setDouble} />
        </div>
        <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />A csapatok automatikusan elosztásra
          kerülnek a csoportok között, a mérkőzéseket a rendszer kisorsolja. A neveket utána
          szerkesztheted.
        </p>
      </div>
    </Modal>
  )
}

function NumberBox({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (Number.isInteger(n)) onChange(Math.max(min, Math.min(max, n)))
        }}
      />
    </label>
  )
}
