import { useState } from 'react'
import { Megaphone, Play, Trophy, Target, Award, ChevronRight, Flag } from 'lucide-react'
import type { ID } from '../types'
import { useStore } from '../state/store'
import { useDerived, computeLeaders } from '../state/selectors'
import { FoosballBall } from '../components/brand'
import { Button, Card, CardHeader } from '../components/ui/primitives'
import { MatchRow, ScoreDialog, TeamLine, useTeamName } from '../components/shared'

export function Dashboard({ onNavigate }: { onNavigate: (k: string) => void }) {
  const { tournament, dispatch } = useStore()
  const d = useDerived()
  const teamName = useTeamName()
  const [scoreId, setScoreId] = useState<ID | null>(null)

  const headline = d.current ?? d.next
  const teamA = headline?.teamA ? d.teams.get(headline.teamA) : undefined
  const teamB = headline?.teamB ? d.teams.get(headline.teamB) : undefined

  const leaders = computeLeaders(tournament)
  const topWins = leaders.mostWins[0]
  const topGd = leaders.bestGd[0]
  const pct = d.groupProgress.total
    ? Math.round((d.groupProgress.played / d.groupProgress.total) * 100)
    : 0

  return (
    <div className="space-y-5">
      {/* Match caller */}
      <div className="overflow-hidden rounded-3xl pitch-bg p-1 shadow-card">
        <div className="rounded-[1.35rem] bg-gradient-to-br from-black/10 to-black/30 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white/80">
            <Megaphone className="h-4 w-4" />
            {d.current ? 'Most játszott mérkőzés' : 'Következő mérkőzés'}
          </div>

          {headline ? (
            <>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-white sm:gap-6">
                <div className="text-right">
                  <div className="font-display text-2xl leading-tight sm:text-4xl">
                    {teamA?.name ?? headline.labelA ?? 'TBD'}
                  </div>
                  {teamA && (
                    <div className="mt-1 text-xs text-white/70 sm:text-sm">
                      {teamA.players.filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <FoosballBall className="h-10 w-10 sm:h-14 sm:w-14" spin={!!d.current} />
                  <span className="mt-1 font-display text-lg text-gold sm:text-2xl">VS</span>
                </div>
                <div className="text-left">
                  <div className="font-display text-2xl leading-tight sm:text-4xl">
                    {teamB?.name ?? headline.labelB ?? 'TBD'}
                  </div>
                  {teamB && (
                    <div className="mt-1 text-xs text-white/70 sm:text-sm">
                      {teamB.players.filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button variant="pitch" size="lg" className="bg-gold text-slate-900 hover:bg-gold-dark" onClick={() => setScoreId(headline.id)}>
                  <Play className="h-5 w-5" /> Eredmény rögzítése
                </Button>
                {!d.current && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/40 text-white hover:bg-white/10"
                    onClick={() => dispatch({ type: 'SET_CURRENT', matchId: headline.id })}
                  >
                    Kijelölés „most játszik”-ként
                  </Button>
                )}
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" onClick={() => onNavigate('projector')}>
                  Kivetítő nézet <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-white">
              <Trophy className="mx-auto h-12 w-12 text-gold" />
              <p className="mt-3 font-display text-2xl">Nincs több hátralévő mérkőzés</p>
              <p className="mt-1 text-white/70">
                {d.groupComplete && !tournament.knockoutGenerated
                  ? 'A csoportkör lezárult — indítsd a kieséses szakaszt!'
                  : 'Minden mérkőzés lejátszva.'}
              </p>
              {d.groupComplete && !tournament.knockoutGenerated && (
                <Button
                  className="mt-4 bg-gold text-slate-900 hover:bg-gold-dark"
                  size="lg"
                  onClick={() => {
                    dispatch({ type: 'GENERATE_KNOCKOUT' })
                    onNavigate('bracket')
                  }}
                >
                  <Flag className="h-5 w-5" /> Kieséses szakasz generálása
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Csoportkör"
          value={`${d.groupProgress.played} / ${d.groupProgress.total}`}
          sub={`${pct}% kész`}
          bar={pct}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Legtöbb győzelem"
          value={topWins && topWins.value > 0 ? teamName(topWins.teamId) : '—'}
          sub={topWins && topWins.value > 0 ? `${topWins.value} győzelem` : 'még nincs adat'}
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Legjobb gólkülönbség"
          value={topGd && topGd.value !== 0 ? teamName(topGd.teamId) : '—'}
          sub={topGd && topGd.value !== 0 ? `${topGd.value > 0 ? '+' : ''}${topGd.value} gól` : 'még nincs adat'}
        />
      </div>

      {/* Upcoming + qualifiers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Hátralévő mérkőzések" subtitle="A sorsolás szerinti sorrendben" />
          <div className="space-y-2 p-4">
            {d.upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Nincs több függőben lévő mérkőzés.</p>
            )}
            {d.upcoming.slice(0, 6).map((m) => (
              <MatchRow key={m.id} match={m} onScore={setScoreId} />
            ))}
            {d.upcoming.length > 6 && (
              <Button variant="ghost" className="w-full" onClick={() => onNavigate('matches')}>
                Összes mérkőzés ({d.upcoming.length}) <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Továbbjutók"
            subtitle={d.groupComplete ? 'A csoportkör végeredménye alapján' : 'A csoportkör lezárása után véglegesedik'}
            icon={<Trophy className="h-5 w-5" />}
          />
          <div className="p-4">
            {d.qualifiers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Még folyik a csoportkör — itt jelennek meg a továbbjutók.
              </p>
            ) : (
              <ol className="space-y-2">
                {d.qualifiers.map((q, i) => (
                  <li
                    key={q.teamId}
                    className="flex items-center gap-3 rounded-xl bg-pitch/10 px-3 py-2"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pitch text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="rounded-md bg-egroup-600/10 px-2 py-0.5 text-xs font-bold text-egroup-700 dark:text-egroup-300">
                      {q.label}
                    </span>
                    <TeamLine team={d.teams.get(q.teamId)} highlight />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>

      <ScoreDialog matchId={scoreId} open={scoreId !== null} onClose={() => setScoreId(null)} />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  bar,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  bar?: number
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <span className="text-egroup-600 dark:text-egroup-300">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate font-display text-xl">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
      {bar !== undefined && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-pitch transition-all" style={{ width: `${bar}%` }} />
        </div>
      )}
    </Card>
  )
}
