import { chipFor, rankGames } from './ranking'
import type { CurrentGame } from '@/hooks/useCurrentGames'

/**
 * The board's chip and its ROW come from two functions, and they drifted once:
 * `interestScore` had no `isFeatured` branch at all, so a featured game was tagged
 * FEATURED and then sorted on margin alone — a featured blowout sat at the bottom of the
 * board wearing a chip saying it was worth watching. Reported by the owner.
 *
 * These pin the ladder the two functions have to share.
 */

const game = (over: Partial<CurrentGame> & { id: number }): CurrentGame => ({
  status: 'Active',
  quarter: 4,
  homeScore: 0,
  awayScore: 0,
  homeTeam: { id: String(over.id * 10) } as any,
  awayTeam: { id: String(over.id * 10 + 1) } as any,
  ...over,
} as CurrentGame)

const order = (games: CurrentGame[]) =>
  rankGames(games, null, null, () => null).map(r => r.game.id)

describe('game board ranking', () => {
  it('floats a featured game above an ordinary one, whatever the margin', () => {
    const featuredBlowout = game({ id: 1, isFeatured: true, homeScore: 40, awayScore: 3 })
    const plainBlowout = game({ id: 2, homeScore: 40, awayScore: 10 })
    // The plain game is CLOSER and still ranks below: featured is the stronger signal.
    expect(order([plainBlowout, featuredBlowout])).toEqual([1, 2])
  })

  it('keeps live signals above featured, matching the chip ladder', () => {
    const featured = game({ id: 1, isFeatured: true, homeScore: 30, awayScore: 3 })
    const tied = game({ id: 2, homeScore: 14, awayScore: 14 })
    const upset = game({ id: 3, isUpsetAlert: true, homeScore: 30, awayScore: 3 })
    const oneScore = game({ id: 4, homeScore: 20, awayScore: 17 })
    expect(order([featured, oneScore, upset, tied])).toEqual([2, 3, 4, 1])
  })

  it('tags and ranks the same game the same way', () => {
    // A featured game with nothing else going on must BOTH carry the chip and outrank
    // an ordinary game — the exact pairing that broke.
    const featured = game({ id: 1, isFeatured: true, homeScore: 35, awayScore: 0 })
    const ordinary = game({ id: 2, homeScore: 21, awayScore: 14, quarter: 1 })
    expect(chipFor(featured)).toBe('FEATURED')
    expect(chipFor(ordinary)).toBeNull()
    expect(order([ordinary, featured])).toEqual([1, 2])
  })

  it('still pins the user\'s own game above everything', () => {
    const featured = game({ id: 1, isFeatured: true })
    const yours = game({ id: 2, homeScore: 40, awayScore: 0 })
    const ranked = rankGames([featured, yours], 20, null, () => null)
    expect(ranked[0].game.id).toBe(2)
    expect(ranked[0].pinned).toBe(true)
  })

  it('does not call a just-kicked-off slate a board of ties', () => {
    // 0-0 in Q1 is not a close game; ungated, every card would rank 0.
    const early = game({ id: 1, quarter: 1 })
    expect(chipFor(early)).toBeNull()
  })
})
