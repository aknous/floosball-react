/**
 * Picks on the game board's win-probability gauge.
 *
 * Source-level guards, because the failures these catch are all "a rule stopped being
 * applied" rather than "a function returned the wrong number" — and every one of them
 * has already happened once in this codebase.
 */

import * as fs from 'fs'
import * as path from 'path'

const BOARD = path.resolve(__dirname, '..')
const read = (f: string) => fs.readFileSync(path.join(BOARD, f), 'utf8')

describe('board pick control', () => {
  it('a live or final game is not pickable', () => {
    /**
     * ⚠️ The API already closes picks at kickoff and usePickEm refetches on game_start,
     * so `pickable` is usually right on its own. But between the kickoff and the refetch
     * landing — or if the socket event is missed — the cached flag still says open and
     * the reader gets a button that submits into a rejection. The board holds the live
     * status continuously, so the gate is applied against it here.
     */
    const src = read('GameBoardPage.tsx')
    expect(src).toContain("g.status === 'Active'")
    expect(src).toContain("g.status === 'Final'")
    expect(src).toMatch(/started \? \{ \.\.\.state, pickable: false \}/)
  })

  it('picks are current-week only', () => {
    // ⚠️ usePickEm returns THIS week and the board scrolls back to past ones, so a
    // past-week view must be handed nothing rather than this week's picks against last
    // week's fixtures.
    const src = read('GameBoardPage.tsx')
    expect(src).toMatch(/if \(!user \|\| isPast\) return map/)
  })

  it('the fixture is keyed by the team pair, never by list position', () => {
    // ⚠️ Not theoretical: index-matching put 11 of 16 pick-em cards against the wrong
    // game on production, each carrying the previous card's home team. The API enforces
    // the same rule in _liveGameFor.
    const src = read('GameBoardPage.tsx')
    expect(src).toContain('${g.homeTeam?.id}-${g.awayTeam?.id}')
    expect(src).not.toMatch(/pickGames\[\s*(i|idx|index)\s*\]/)
  })

  it('clicking a pick does not also open the game modal', () => {
    const src = read('pickControl.tsx')
    const clicks = src.match(/onClick=|onKeyDown=/g) ?? []
    const stops = src.match(/stopPropagation\(\)/g) ?? []
    expect(clicks.length).toBeGreaterThan(0)
    expect(stops.length).toBeGreaterThanOrEqual(clicks.length)
  })

  it('the control reserves its own box in every state', () => {
    // ⚠️ The board is sixteen cards of aligned rows; a reflow when a pick lands reads as
    // breakage. Padding and border are always present, transparent when unset.
    const src = read('pickControl.tsx')
    expect(src).toMatch(/padding: '2px 6px'/)
    expect(src).toMatch(/borderBottom: `2px solid \$\{picked \? color : 'transparent'\}`/)
  })

  it('team ids are normalized before comparison', () => {
    // ⚠️ Board team ids are STRINGS, pick-em deals in numbers. `'7' !== 7` would look
    // exactly like a missing pick rather than a type bug.
    const src = read('pickControl.tsx')
    expect(src).toMatch(/Number\(teamId\)/)
  })

  it('both densities use the one control', () => {
    // A second implementation is how the two boards drift on what a pick looks like.
    for (const f of ['BoardCardLarge.tsx', 'BoardCardSmall.tsx']) {
      expect(read(f)).toContain('GaugePick')
    }
  })

  it('with no pick state it renders the plain label', () => {
    // Signed out, or a past week: the board must look exactly as it did before.
    const src = read('pickControl.tsx')
    expect(src).toMatch(/if \(!pick\) \{/)
  })
})
