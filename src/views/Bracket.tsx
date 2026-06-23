import { useState } from 'react'
import { Flag, Trophy, Medal, RotateCcw, Lock } from 'lucide-react'
import type { ID, KnockoutRound, Match } from '../types'
import { useStore } from '../state/store'
import { useDerived } from '../state/selectors'
import { ROUND_TITLES } from '../lib/knockout'
import { winnerOf } from '../lib/standings'
import { cn } from '../lib/utils'
import { Button, Card } from '../components/ui/primitives'
import { Modal } from '../components/ui/Modal'
import { ScoreDialog } from '../components/shared'

const COLUMN_ORDER: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'FINAL']

export function Bracket() {
  const { tournament, dispatch } = useStore()
  const d = useDerived()
  const [scoreId, setScoreId] = useState<ID | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const ko = tournament.matches.filter((m) => m.stage === 'knockout')

  if (!tournament.knockoutGenerated || ko.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Flag className="mx-auto h-12 w-12 text-egroup-600 dark:text-egroup-300" />
        <h3 className="mt-3 font-display text-xl">Még nincs kieséses szakasz</h3>
        {d.groupComplete ? (
          <>
            <p className="mt-1 text-slate-500">A csoportkör lezárult — generálhatod az ágrajzot.</p>
            <Button
              className="mt-4"
              size="lg"
              onClick={() => dispatch({ type: 'GENERATE_KNOCKOUT' })}
            >
              <Flag className="h-5 w-5" /> Kieséses szakasz generálása
            </Button>
          </>
        ) : (
          <p className="mt-1 inline-flex items-center gap-1.5 text-slate-500">
            <Lock className="h-4 w-4" /> Előbb fejezd be a csoportkört (
            {d.groupProgress.played}/{d.groupProgress.total} meccs).
          </p>
        )}
      </Card>
    )
  }

  const columns = COLUMN_ORDER.map((round) => ({
    round,
    matches: ko.filter((m) => m.round === round).sort((a, b) => a.order - b.order),
  })).filter((c) => c.matches.length > 0)

  const bronze = ko.find((m) => m.round === 'BRONZE')
  const final = ko.find((m) => m.round === 'FINAL')
  const champion = final && final.played ? winnerOf(final) : null

  return (
    <div className="space-y-5">
      {champion && (
        <div className="flex items-center justify-center gap-4 rounded-3xl bg-gradient-to-r from-gold/90 to-gold p-6 text-slate-900 shadow-card">
          <Trophy className="h-12 w-12" />
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em]">Bajnok</div>
            <div className="font-display text-3xl">{d.teams.get(champion)?.name}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Ágrajz</h2>
        <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="h-4 w-4" /> Visszaállítás
        </Button>
      </div>

      <div className="overflow-x-auto pb-3 scrollbar-thin">
        <div className="flex min-w-max gap-6">
          {columns.map((col) => (
            <div key={col.round} className="flex w-60 flex-col">
              <div className="mb-3 text-center font-display text-sm uppercase tracking-wide text-egroup-600 dark:text-egroup-300">
                {ROUND_TITLES[col.round]}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {col.matches.map((m) => (
                  <BracketCard key={m.id} match={m} onScore={setScoreId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {bronze && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 font-display text-sm uppercase tracking-wide text-amber-600">
            <Medal className="h-4 w-4" /> {ROUND_TITLES.BRONZE}
          </div>
          <div className="max-w-sm">
            <BracketCard match={bronze} onScore={setScoreId} />
          </div>
        </Card>
      )}

      <ScoreDialog matchId={scoreId} open={scoreId !== null} onClose={() => setScoreId(null)} />

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Kieséses szakasz visszaállítása"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Mégse
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'RESET_KNOCKOUT' })
                setConfirmReset(false)
              }}
            >
              Visszaállítás
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Ez törli a kieséses szakaszt és annak eredményeit. A csoportkör eredményei megmaradnak,
          az ágrajzot bármikor újragenerálhatod.
        </p>
      </Modal>
    </div>
  )
}

function BracketCard({ match, onScore }: { match: Match; onScore: (id: ID) => void }) {
  const { teams } = useDerived()
  const win = winnerOf(match)
  const teamA = match.teamA ? teams.get(match.teamA) : undefined
  const teamB = match.teamB ? teams.get(match.teamB) : undefined
  const ready = match.teamA !== null && match.teamB !== null && !match.isBye

  const Side = ({ teamId, name, score }: { teamId: ID | null; name: string; score: number | null }) => (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2',
        win && teamId === win && 'bg-pitch/15 font-bold text-pitch-dark dark:text-pitch-light',
      )}
    >
      <span className="truncate text-sm">{name}</span>
      <span className="tabular text-sm font-bold">{score ?? ''}</span>
    </div>
  )

  return (
    <button
      onClick={() => ready && onScore(match.id)}
      disabled={!ready}
      className={cn(
        'w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition dark:bg-slate-900',
        ready
          ? 'border-slate-200 hover:border-egroup-400 hover:shadow-card dark:border-slate-800'
          : 'border-dashed border-slate-200 opacity-80 dark:border-slate-800',
      )}
    >
      <Side
        teamId={match.teamA}
        name={teamA?.name ?? match.labelA ?? 'TBD'}
        score={match.scoreA}
      />
      <div className="h-px bg-slate-100 dark:bg-slate-800" />
      <Side
        teamId={match.teamB}
        name={teamB?.name ?? match.labelB ?? 'TBD'}
        score={match.scoreB}
      />
      {match.isBye && (
        <div className="bg-slate-50 px-3 py-1 text-center text-[11px] text-slate-400 dark:bg-slate-950">
          walkover — automatikus továbbjutás
        </div>
      )}
    </button>
  )
}
