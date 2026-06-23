/* Build a fully-played tournament and emit dist/seed-*.html files that preload
 * it into localStorage, then redirect to a view — for visual verification. */
import { writeFileSync } from 'node:fs'
import { createTournament } from '../src/lib/factory'
import { generateKnockout, syncBracket } from '../src/lib/knockout'
import type { Match, Tournament } from '../src/types'

const t = createTournament()

// deterministic "strength": lower team index = stronger
const strength = new Map(t.teams.map((tm, i) => [tm.id, t.teams.length - i]))
function score(a: string | null, b: string | null): [number, number] {
  const sa = a ? strength.get(a)! : 0
  const sb = b ? strength.get(b)! : 0
  if (sa === sb) return [3, 2]
  return sa > sb ? [3 + (sa % 2), 1] : [1, 3 + (sb % 2)]
}

let matches: Match[] = t.matches.map((m) => {
  if (m.stage !== 'group') return { ...m }
  const [x, y] = score(m.teamA, m.teamB)
  return { ...m, scoreA: x, scoreB: y, played: true }
})

let state: Tournament = { ...t, matches, knockoutGenerated: false }

// generate + fully play knockout
const ko = generateKnockout(state.teams, state.groups, state.matches, state.settings)
matches = [...state.matches.filter((m) => m.stage === 'group'), ...ko]
state = { ...state, matches, knockoutGenerated: true }

for (let pass = 0; pass < 12; pass++) {
  const ko2 = state.matches.filter((m) => m.stage === 'knockout')
  syncBracket(ko2, [])
  let changed = false
  for (const m of ko2) {
    if (m.isBye || m.played) continue
    if (m.teamA !== null && m.teamB !== null) {
      const [x, y] = score(m.teamA, m.teamB)
      m.scoreA = x
      m.scoreB = y
      m.played = true
      changed = true
    }
  }
  state = { ...state, matches: [...state.matches.filter((m) => m.stage === 'group'), ...ko2] }
  if (!changed) break
}

const json = JSON.stringify(state)
const page = (hash: string) => `<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('egroup-foosball-tournament:v1', ${JSON.stringify(json)});
localStorage.setItem('egroup-foosball-tournament:theme','light');
location.replace('./index.html#/${hash}');
</script>`

writeFileSync('dist/seed-standings.html', page('standings'))
writeFileSync('dist/seed-bracket.html', page('bracket'))
writeFileSync('dist/seed-projector.html', page('projector'))
writeFileSync('dist/seed-stats.html', page('stats'))
console.log('seed pages written; knockout matches:', ko.length)
