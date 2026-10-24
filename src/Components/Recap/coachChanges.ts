import type { RecapTransaction } from '@/types/recap'

/** "12 seasons" -> 12; anything else -> 0. */
export const careerSeasons = (detail: string | null): number => {
  const m = detail?.match(/^(\d+) seasons?$/)
  return m ? Number(m[1]) : 0
}

export interface CoachChange {
  teamId: number | null
  teamName: string | null
  teamAbbr: string | null
  outName: string | null
  /** 'Fired' | 'Retired' | 'Stepped down' */
  outHow: string | null
  outSeasons: number | null
  inName: string | null
  inPriorSeasons: number
  /** A detail string neither pattern matched, shown as written. */
  raw: string[]
}

/**
 * One entry per team, built from its `coach_fire` and `coach_hire` rows. The backend writes
 * them as text (`teamManager._recordCoachChange`):
 *   fire: "Name after 3 seasons"
 *   hire: "Name (2 prior seasons), replacing Old (retired)" — the prior-seasons part only
 *         for a GM hired off the market, the replacing part only when the old GM retired
 *         or stepped down (a firing has its own row).
 * Anything that does not match is kept and shown as written, so a wording change in the
 * backend degrades to the old plain line rather than to nothing.
 */
export const groupCoachChanges = (transactions: RecapTransaction[]): CoachChange[] => {
  const byTeam = new Map<string, CoachChange>()
  const entry = (t: RecapTransaction): CoachChange => {
    const key = String(t.teamId ?? t.teamName ?? t.teamAbbr ?? '—')
    if (!byTeam.has(key)) byTeam.set(key, {
      teamId: t.teamId, teamName: t.teamName, teamAbbr: t.teamAbbr,
      outName: null, outHow: null, outSeasons: null, inName: null, inPriorSeasons: 0, raw: [],
    })
    return byTeam.get(key)!
  }
  for (const t of transactions) {
    if (t.type === 'coach_fire') {
      const c = entry(t)
      const m = t.detail?.match(/^(.+) after (\d+) seasons?$/)
      if (m) { c.outName = m[1]; c.outSeasons = Number(m[2]); c.outHow = 'Fired' }
      else if (t.detail) c.raw.push(`Fired ${t.detail}`)
    } else if (t.type === 'coach_hire') {
      const c = entry(t)
      const m = t.detail?.match(/^(.+?)(?: \((\d+) prior seasons?\))?(?:, replacing (.+) \((retired|stepped down)\))?$/)
      if (m) {
        c.inName = m[1]
        c.inPriorSeasons = m[2] ? Number(m[2]) : 0
        if (m[3] && !c.outName) {
          c.outName = m[3]
          c.outHow = m[4] === 'retired' ? 'Retired' : 'Stepped down'
        }
      } else if (t.detail) c.raw.push(`Hired ${t.detail}`)
    }
  }
  return Array.from(byTeam.values())
}
