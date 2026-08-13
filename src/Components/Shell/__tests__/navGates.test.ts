/**
 * What the sidebar shows, and when.
 *
 * The nav's conditional entries each answer "is this thing live right now", and every
 * one of those questions has an authoritative answer somewhere else. Re-deriving one
 * locally is how an entry goes missing — which is exactly what happened to the Bracket.
 */

import * as fs from 'fs'
import * as path from 'path'

const NAV = fs.readFileSync(path.resolve(__dirname, '..', 'AppNav.tsx'), 'utf8')

describe('nav gates', () => {
  it('the Bracket reads the backend flag rather than week arithmetic', () => {
    /**
     * ⚠️ `/api/season` returns `bracket_available`, computed from whether the playoff
     * seeds are FROZEN, and its own comment says it exists to drive this nav item. This
     * nav re-derived the answer as `currentWeek > 28 || seasonComplete`, which is a
     * DIFFERENT and LATER question: seeds freeze when the field is set, week 29 is when
     * the first game kicks off. Between those two moments the bracket is open for entries
     * and the only link to it was missing — the challenge was unreachable during the
     * window it exists for. Reported as the Bracket tab not appearing.
     */
    expect(NAV).toContain('seasonState.bracketAvailable')
    expect(NAV).not.toMatch(/currentWeek\s*>\s*REGULAR_SEASON_WEEKS/)
    expect(NAV).not.toContain('REGULAR_SEASON_WEEKS')
  })

  it('the Bracket survives the gap after the Floos Bowl', () => {
    // Frozen seeds are cleared at season end, so `seasonComplete` keeps the entry alive
    // between the last game and the next season.
    expect(NAV).toMatch(/bracketAvailable \|\| seasonState\.seasonComplete/)
  })

  it('the Offseason entry replaces the Bracket rather than joining it', () => {
    // Two postseason entries push the standing pages down, and once the drafts run the
    // bracket is a settled result.
    expect(NAV).toMatch(/isOffseason\s*\?\s*\[\.\.\.LEAGUE_ITEMS,\s*OFFSEASON_ITEM\]/)
    expect(NAV).toMatch(/:\s*inPlayoffs\s*\?\s*\[\.\.\.LEAGUE_ITEMS,\s*BRACKET_ITEM\]/)
  })

  it('the Offseason gate matches the one the front page uses', () => {
    // ⚠️ The page and the nav must not disagree about whether it is the offseason, or
    // the link appears while the page redirects away (or the reverse).
    expect(NAV).toContain("currentWeekText === 'Offseason'")
  })

  it('the Bracket carries a dot until a ballot is in', () => {
    // The nav's own rule: a dot goes only on a tab that genuinely notifies, and an
    // unfilled bracket is a queue you can empty — it appears once, wants an action, and
    // the action ends it.
    expect(NAV).toContain('bracketDue')
    expect(NAV).toMatch(/item\.key === 'bracket' && bracketDue/)
  })

  it('the dot is cleared by the submit event, not by polling', () => {
    // ⚠️ The submit already knows it happened; the nav should not ask repeatedly.
    expect(NAV).toContain("'floosball:bracket-submitted'")
  })

  it('the bracket check is gated on availability and a signed-in reader', () => {
    // ⚠️ It is a per-user endpoint, and for ~28 weeks a season there is nothing to ask
    // about — so it must cost nothing outside the window.
    expect(NAV).toMatch(/if \(!inPlayoffs \|\| !user\) \{ setHasBracket\(true\); return \}/)
  })

  it('a failed check does not invent a notification', () => {
    // Assume the ballot is in until told otherwise, so a dot never flashes on load or
    // after a network blip.
    expect(NAV).toMatch(/useState\(true\)\s*\/\/ assume in/)
  })

  it('Awards appears only while a voting window is open', () => {
    expect(NAV).toMatch(/if \(awardsOpen\) yoursItems\.push\(AWARDS_ITEM\)/)
  })
})
