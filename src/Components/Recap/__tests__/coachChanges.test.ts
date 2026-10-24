/**
 * The Transactions tab rebuilds each team's GM change from the backend's recap text
 * (`teamManager._recordCoachChange`). These pin the formats it writes; a wording change
 * there should fail here rather than silently fall back to the plain line.
 */
import { groupCoachChanges, careerSeasons } from '../coachChanges'
import type { RecapTransaction } from '@/types/recap'

const row = (type: string, teamId: number, detail: string): RecapTransaction => ({
  type: type as RecapTransaction['type'], teamId, teamAbbr: `T${teamId}`, teamName: `Team ${teamId}`,
  playerId: null, playerName: null, position: null, rating: null, tier: null, detail,
})

describe('coaching changes', () => {
  it('pairs a firing with the hire that replaced him', () => {
    const [c] = groupCoachChanges([
      row('coach_fire', 1, 'Pat Old after 3 seasons'),
      row('coach_hire', 1, 'Sam New (2 prior seasons)'),
    ])
    expect(c).toMatchObject({ outName: 'Pat Old', outHow: 'Fired', outSeasons: 3, inName: 'Sam New', inPriorSeasons: 2, raw: [] })
  })

  it('reads a retirement or a resignation off the hire row', () => {
    const [r, s] = groupCoachChanges([
      row('coach_hire', 1, 'Sam New, replacing Pat Old (retired)'),
      row('coach_hire', 2, 'Lee Next (1 prior season), replacing Kim Prev (stepped down)'),
    ])
    expect(r).toMatchObject({ outName: 'Pat Old', outHow: 'Retired', outSeasons: null, inName: 'Sam New', inPriorSeasons: 0 })
    expect(s).toMatchObject({ outName: 'Kim Prev', outHow: 'Stepped down', inName: 'Lee Next', inPriorSeasons: 1 })
  })

  it('keeps one entry per team', () => {
    const out = groupCoachChanges([
      row('coach_fire', 1, 'A after 1 season'), row('coach_hire', 1, 'B'),
      row('coach_hire', 2, 'C, replacing D (retired)'),
    ])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ outName: 'A', outSeasons: 1, inName: 'B' })
  })

  it('shows a detail it cannot read as written', () => {
    const [c] = groupCoachChanges([row('coach_fire', 1, 'something new')])
    expect(c.outName).toBeNull()
    expect(c.raw).toEqual(['Fired something new'])
  })

  it('reads a career length', () => {
    expect(careerSeasons('12 seasons')).toBe(12)
    expect(careerSeasons('1 season')).toBe(1)
    expect(careerSeasons(null)).toBe(0)
  })
})
