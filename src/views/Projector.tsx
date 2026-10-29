import { useState } from 'react'
import { Maximize, Minimize, Megaphone, ArrowRight, Trophy, Award } from 'lucide-react'
import { useStore } from '../state/store'
import { computeLeaders, useDerived } from '../state/selectors'
import { ROUND_TITLES } from '../lib/knockout'
import { isSeries, seriesStatus } from '../lib/series'
import type { Match } from '../types'
import { FoosballBall } from '../components/brand'
import { StandingsTable, useTeamName } from '../components/shared'
import { Button } from '../components/ui/primitives'

export function Projector() {
  const { tournament } = useStore()
  const d = useDerived()
  const teamName = useTeamName()
  const leaders = computeLeaders(tournament)
  const [fs, setFs] = useState(false)

  const current = d.current ?? d.next
  const next = d.current ? d.next : d.upcoming[0]

  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setFs(true)
      } else {
        await document.exitFullscreen()
        setFs(false)
      }
    } catch {
      setFs((v) => !v)
    }
  }

  const stageLabel = (m?: Match) =>
    !m
      ? ''
      : m.stage === 'group'
        ? `${d.groups.get(m.groupId!)?.name} csoport`
        : isSeries(m)
          ? `${ROUND_TITLES[m.round!]} · ${seriesStatus(m)}`
          : ROUND_TITLES[m.round!]

  const topWins = leaders.mostWins[0]
  const topGd = leaders.bestGd[0]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={toggleFs}>
          {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          {fs ? 'Kilépés' : 'Teljes képernyő'}
        </Button>
      </div>

      {/* Current match */}
      <div className="overflow-hidden rounded-3xl pitch-bg shadow-card">
        <div className="bg-gradient-to-br from-black/10 to-black/40 p-8 text-white sm:p-12">
          <div className="flex items-center justify-center gap-2 text-base font-bold uppercase tracking-[0.3em] text-gold sm:text-xl">
            <Megaphone className="h-6 w-6" />
            {d.current ? 'Most játszott' : 'Következő mérkőzés'}
          </div>

          {current ? (
            <>
              <div className="mt-2 text-center text-sm font-semibold uppercase tracking-widest text-white/70">
                {stageLabel(current)}
              </div>
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-10">
                <TeamBig
                  name={current.teamA ? teamName(current.teamA) : current.labelA ?? 'TBD'}
                  players={current.teamA ? d.teams.get(current.teamA)?.players : undefined}
                  align="right"
                />
                <div className="flex flex-col items-center">
                  <FoosballBall className="h-16 w-16 sm:h-24 sm:w-24" spin={!!d.current} />
                  <span className="mt-2 font-display text-3xl text-gold sm:text-5xl">VS</span>
                </div>
                <TeamBig
                  name={current.teamB ? teamName(current.teamB) : current.labelB ?? 'TBD'}
                  players={current.teamB ? d.teams.get(current.teamB)?.players : undefined}
                  align="left"
                />
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <Trophy className="mx-auto h-16 w-16 text-gold" />
              <p className="mt-3 font-display text-3xl">A bajnokság véget ért</p>
            </div>
          )}
        </div>

        {next && (
          <div className="flex items-center justify-center gap-3 bg-black/30 px-6 py-4 text-white">
            <ArrowRight className="h-5 w-5 text-gold" />
            <span className="text-sm font-bold uppercase tracking-widest text-white/70">Következik:</span>
            <span className="font-display text-lg sm:text-2xl">
              {next.teamA ? teamName(next.teamA) : next.labelA} <span className="text-gold">vs</span>{' '}
              {next.teamB ? teamName(next.teamB) : next.labelB}
            </span>
          </div>
        )}
      </div>

      {/* Leaderboards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <LeaderBig
          icon={<Trophy className="h-6 w-6" />}
          title="Legtöbb győzelem"
          name={topWins && topWins.value > 0 ? teamName(topWins.teamId) : '—'}
          value={topWins && topWins.value > 0 ? `${topWins.value}` : ''}
        />
        <LeaderBig
          icon={<Award className="h-6 w-6" />}
          title="Legjobb gólkülönbség"
          name={topGd && topGd.value !== 0 ? teamName(topGd.teamId) : '—'}
          value={topGd && topGd.value !== 0 ? `${topGd.value > 0 ? '+' : ''}${topGd.value}` : ''}
        />
      </div>

      {/* Standings */}
      <div className="grid gap-5 xl:grid-cols-2">
        {tournament.groups.map((g) => (
          <div
            key={g.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="mb-2 font-display text-lg">{g.name} csoport</h3>
            <StandingsTable rows={d.standingsByGroup.get(g.id) ?? []} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamBig({
  name,
  players,
  align,
}: {
  name: string
  players?: [string, string]
  align: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <div className="font-display text-3xl leading-tight text-white sm:text-6xl">{name}</div>
      {players && players.some(Boolean) && (
        <div className="mt-2 text-sm text-white/70 sm:text-lg">{players.filter(Boolean).join(' · ')}</div>
      )}
    </div>
  )
}

function LeaderBig({
  icon,
  title,
  name,
  value,
}: {
  icon: React.ReactNode
  title: string
  name: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-egroup-600/10 text-egroup-600 dark:text-egroup-300">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </div>
        <div className="font-display text-2xl">{name}</div>
      </div>
      {value && <div className="font-display text-4xl text-egroup-600 dark:text-egroup-300">{value}</div>}
    </div>
  )
}
