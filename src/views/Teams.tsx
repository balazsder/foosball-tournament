import { useState } from 'react'
import { UserPlus, Trash2, ArrowLeftRight, Plus, AlertTriangle } from 'lucide-react'
import type { Team } from '../types'
import { useStore } from '../state/store'
import { useDerived } from '../state/selectors'
import { Button, Card, CardHeader, Input, Select } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'

export function Teams() {
  const { tournament, dispatch } = useStore()
  const { groupProgress } = useDerived()
  const hasResults = groupProgress.played > 0
  const [moveTeam, setMoveTeam] = useState<Team | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null)

  return (
    <div className="space-y-5">
      {hasResults && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Már vannak rögzített eredmények. Csapat hozzáadása/törlése vagy áthelyezése
            <strong> újrasorsolja a csoportkört és törli a meddig rögzített eredményeket</strong>. A
            csapatnév és a játékosok szerkesztése nem érinti a sorsolást.
          </span>
        </div>
      )}

      <Card>
        <CardHeader
          title="Csoportok és csapatok"
          subtitle={`${tournament.teams.length} csapat · ${tournament.groups.length} csoport`}
          action={
            <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'ADD_GROUP' })}>
              <Plus className="h-4 w-4" /> Csoport
            </Button>
          }
        />
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {tournament.groups.map((g) => {
            const teams = tournament.teams.filter((t) => t.groupId === g.id)
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-egroup-600 font-display text-white">
                    {g.name}
                  </span>
                  <Input
                    value={g.name}
                    onChange={(e) => dispatch({ type: 'RENAME_GROUP', id: g.id, name: e.target.value })}
                    className="h-8 flex-1"
                    aria-label="Csoport neve"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-500"
                    onClick={() => dispatch({ type: 'DELETE_GROUP', id: g.id })}
                    disabled={tournament.groups.length <= 1}
                    aria-label="Csoport törlése"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {teams.map((t) => (
                    <TeamEditor
                      key={t.id}
                      team={t}
                      onMove={() => setMoveTeam(t)}
                      onDelete={() => setConfirmDelete(t)}
                    />
                  ))}
                  {teams.length === 0 && (
                    <p className="py-3 text-center text-xs text-slate-400">Nincs csapat ebben a csoportban.</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  className="mt-2 w-full border border-dashed border-slate-300 dark:border-slate-700"
                  onClick={() => dispatch({ type: 'ADD_TEAM', groupId: g.id })}
                >
                  <UserPlus className="h-4 w-4" /> Csapat hozzáadása
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Move team modal */}
      <Modal
        open={!!moveTeam}
        onClose={() => setMoveTeam(null)}
        title="Csapat áthelyezése"
        footer={
          <Button variant="ghost" onClick={() => setMoveTeam(null)}>
            Kész
          </Button>
        }
      >
        {moveTeam && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>{moveTeam.name}</strong> áthelyezése másik csoportba:
            </p>
            <Select
              value={moveTeam.groupId}
              onChange={(e) => {
                dispatch({ type: 'MOVE_TEAM', id: moveTeam.id, groupId: e.target.value })
                setMoveTeam((prev) => (prev ? { ...prev, groupId: e.target.value } : prev))
              }}
            >
              {tournament.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} csoport
                </option>
              ))}
            </Select>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Csapat törlése"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Mégse
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) dispatch({ type: 'DELETE_TEAM', id: confirmDelete.id })
                setConfirmDelete(null)
              }}
            >
              <Trash2 className="h-4 w-4" /> Törlés
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Biztosan törlöd a(z) <strong>{confirmDelete?.name}</strong> csapatot? A csoportkör
          újrasorsolásra kerül.
        </p>
      </Modal>
    </div>
  )
}

function TeamEditor({
  team,
  onMove,
  onDelete,
}: {
  team: Team
  onMove: () => void
  onDelete: () => void
}) {
  const { dispatch } = useStore()
  const update = (patch: { name?: string; players?: [string, string] }) =>
    dispatch({ type: 'UPDATE_TEAM', id: team.id, patch })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5">
        <Input
          value={team.name}
          onChange={(e) => update({ name: e.target.value })}
          className="h-9 font-semibold"
          placeholder="Csapatnév"
        />
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onMove} aria-label="Áthelyezés">
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500" onClick={onDelete} aria-label="Törlés">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Input
          value={team.players[0]}
          onChange={(e) => update({ players: [e.target.value, team.players[1]] })}
          className="h-8 text-xs"
          placeholder="1. játékos"
        />
        <Input
          value={team.players[1]}
          onChange={(e) => update({ players: [team.players[0], e.target.value] })}
          className="h-8 text-xs"
          placeholder="2. játékos"
        />
      </div>
    </div>
  )
}
