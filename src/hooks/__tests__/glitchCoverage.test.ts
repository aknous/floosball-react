/**
 * Every JS-driven glitch animation consults the intensity setting.
 *
 * ⚠️ THIS KEPT BEING FOUND ONE REPORT AT A TIME. The setting started as a stylesheet gate,
 * which can only reach CSS animations — and the glitch effects that actually bother a
 * reader are timers rewriting text:
 *
 *   1. reported: the play feed still glitched with the effects off. Fixed in the CSS, which
 *      covered the anomaly rows' animations and NOT `GlitchedText`, a timer substituting
 *      characters in the real line. No stylesheet can undo a DOM write.
 *   2. reported: the Criticality still glitched. `CriticalityGlitch` corrupts text and sets
 *      inline transforms on random elements.
 *   3. reported: character swapping still happening. `GlitchLine` (card breakdown) and
 *      `RulebookPopover` (unreadable rulebook) each churn their own scramble.
 *
 * Same fault three times, because a stylesheet cannot police a `setInterval`. This test is
 * the thing that can: it reads the source of every component that animates a glitch and
 * asserts it consults `useGlitchIntensity`. A new one fails here rather than in a report.
 *
 * ⚠️ It deliberately does NOT assert HOW each one responds — some hold a static scramble
 * (there is no clean text to show), some show the real words, one only settles at `off`.
 * That is a per-effect judgement; consulting the setting at all is the rule.
 */

import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..', '..')

/**
 * Components that animate a glitch and must therefore read the setting.
 *
 * Add to this list when you add a glitch effect. If you are wondering whether yours
 * belongs: does it move, flicker, corrupt, or shift on a timer because something is
 * anomalous? Then yes.
 */
const MUST_CONSULT = [
  'Components/CriticalityGlitch.tsx',   // site-wide corruption + element shifts
  'Components/GlitchedText.tsx',        // character substitution in anomaly lines
  'Components/Fantasy/GlitchLine.tsx',  // the card breakdown's churning readout
  'Components/RulebookPopover.tsx',     // the unreadable rulebook during a Criticality
  'Components/Cards/GlitchMark.tsx',    // the glyph flip on a glitched card
]

/** Where the glyph pools live — any NEW file holding one is a candidate for the list. */
const GLYPH_SIGNATURES = ['█▓▒░', '░▒▓█']

const read = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8')

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('glitch intensity coverage', () => {
  it.each(MUST_CONSULT)('%s consults the intensity setting', rel => {
    expect(read(rel)).toContain('useGlitchIntensity')
  })

  it('every file holding a glitch-glyph pool is on the list', () => {
    // The list is hand-maintained, so this is what stops a new glitch component being
    // written and quietly never gated — the thing that happened three times.
    const holders = walk(SRC)
      .filter(f => {
        const body = fs.readFileSync(f, 'utf8')
        return GLYPH_SIGNATURES.some(sig => body.includes(sig))
      })
      .map(f => path.relative(SRC, f).split(path.sep).join('/'))

    const unlisted = holders.filter(f => !MUST_CONSULT.includes(f))
    expect(unlisted).toEqual([])
  })

  it('the setting itself still offers the three tiers', () => {
    // The components branch on these exact strings, so a rename has to break here rather
    // than silently leave every guard permanently true.
    const hook = read('hooks/useGlitchIntensity.ts')
    for (const tier of ['full', 'reduced', 'off']) {
      expect(hook).toContain(`'${tier}'`)
    }
  })
})
