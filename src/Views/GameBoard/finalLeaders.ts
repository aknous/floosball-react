import type { GameStats } from '@/types/websocket'

/**
 * Who did what, for a game that is over.
 *
 * A finished game's win-probability gauge reads 100% / 0%, and the margin is already
 * legible from the two scores sitting directly above it — so neither is worth a row. What
 * a reader actually wants off a final is who turned up.
 *
 * One entry per phase of the game, best performer in each, and only when the number is
 * worth printing: a 40-yard passer and a 12-yard rusher are not a story, and padding the
 * row out with them makes every final look identical.
 *
 * Reads the LIVE slot-keyed `gameStats` (qb / rb / wr1 / wr2 / te / k per side), which is
 * what the websocket feed already carries — no extra fetch for a card that is done.
 */

export interface FinalLeader {
  name: string
  line: string
}

const MINIMUMS = { passYards: 120, rushYards: 40, recYards: 40, sacks: 1 }

/** Surname only — a card row has no space for "Storyboard Peterson" three times over. */
const shortName = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : name
}

const tds = (n: number | undefined): string => (n ? `, ${n} TD` : '')

type AnyPlayer = { name: string; [key: string]: any } | null | undefined

const bestOf = (players: AnyPlayer[], key: string): { name: string; value: number } | null => {
  let best: { name: string; value: number } | null = null
  for (const p of players) {
    if (!p) continue
    const value = Number(p[key] ?? 0)
    if (!Number.isFinite(value)) continue
    if (!best || value > best.value) best = { name: p.name, value }
  }
  return best
}

const bestSacks = (players: AnyPlayer[]): { name: string; value: number } | null => {
  let best: { name: string; value: number } | null = null
  for (const p of players) {
    if (!p) continue
    const value = Number(p.defense?.sacks ?? 0)
    if (!best || value > best.value) best = { name: p.name, value }
  }
  return best
}

export function finalLeaders(stats: GameStats | undefined): FinalLeader[] {
  if (!stats) return []

  const sides = [stats.home, stats.away].filter(Boolean) as any[]
  const all: AnyPlayer[] = []
  const receivers: AnyPlayer[] = []
  const passers: AnyPlayer[] = []
  const rushers: AnyPlayer[] = []

  for (const side of sides) {
    const p = side?.players
    if (!p) continue
    for (const slot of ['qb', 'rb', 'wr1', 'wr2', 'te', 'k'] as const) {
      if (p[slot]) all.push(p[slot])
    }
    // ⚠️ Each slot's `yards` is its OWN primary stat — qb.yards is PASSING yards,
    // rb.yards is rushing, wr/te.yards is receiving. Pooling a quarterback into the
    // rushing candidates would hand a 400-yard passer the rushing lead.
    if (p.qb) passers.push(p.qb)
    if (p.rb) rushers.push(p.rb)
    for (const slot of ['wr1', 'wr2', 'te'] as const) {
      if (p[slot]) receivers.push(p[slot])
    }
  }

  const leaders: FinalLeader[] = []

  const passer = bestOf(passers, 'yards')
  if (passer && passer.value >= MINIMUMS.passYards) {
    const source = passers.find(p => p?.name === passer.name)
    leaders.push({ name: shortName(passer.name), line: `${Math.round(passer.value)} pass yd${tds(source?.tds)}` })
  }

  const rusher = bestOf(rushers, 'yards')
  if (rusher && rusher.value >= MINIMUMS.rushYards) {
    const source = rushers.find(p => p?.name === rusher.name)
    leaders.push({ name: shortName(rusher.name), line: `${Math.round(rusher.value)} rush yd${tds(source?.tds)}` })
  }

  const receiver = bestOf(receivers, 'yards')
  if (receiver && receiver.value >= MINIMUMS.recYards) {
    const source = receivers.find(p => p?.name === receiver.name)
    leaders.push({
      name: shortName(receiver.name),
      line: `${source?.receptions ?? 0} rec, ${Math.round(receiver.value)} yd${tds(source?.tds)}`,
    })
  }

  const sacker = bestSacks(all)
  if (sacker && sacker.value >= MINIMUMS.sacks) {
    leaders.push({
      name: shortName(sacker.name),
      line: `${sacker.value} sack${sacker.value === 1 ? '' : 's'}`,
    })
  }

  return leaders
}
