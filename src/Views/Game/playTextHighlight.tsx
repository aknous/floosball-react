import React from 'react'

/**
 * Emphasis for play-by-play text.
 *
 * A play is one long sentence — "Mario Trolleyproblem quick out to Rhodes Alltime for 10
 * yards, spins but gets dragged down anyway, and reaches the ball across the marker for the
 * first down!" — and the eye has to hunt through it for who did what, how far, and what
 * came of it. Those three are what a reader is actually after, so those three are lifted.
 *
 * ⚠️ NAMES COME FROM THE ENGINE, NEVER FROM PATTERN MATCHING. `involvedPlayers` is the
 * exact set of strings the play named. A client cannot infer them: the name pool includes
 * "Firstname Lastname" (deliberately) and every other joke in config.json, so any rule for
 * "what a name looks like" would both miss real names and bold ordinary words.
 *
 * ⚠️ SEGMENTS NEVER OVERLAP. Matches are collected, sorted by position, and any that starts
 * inside one already taken is dropped — otherwise a yardage inside a name, or two outcome
 * phrases sharing a word, would produce nested or duplicated spans.
 */

/** Terminal outcomes worth lifting. Ordered longest-first so "first down" wins over "down". */
const OUTCOMES = [
  'touchdown', 'first down', 'intercepted', 'interception', 'picked off',
  'fumbles', 'fumbled', 'fumble', 'recovered', 'sacked', 'sack',
  'incomplete', 'no good', 'is good', 'safety', 'touchback', 'fair catch',
  'turnover on downs', 'muffs', 'muffed', 'downed',
].sort((a, b) => b.length - a.length)

type Kind = 'player' | 'yards' | 'outcome'
interface Match { start: number; end: number; kind: Kind }

// ⚠️ WEIGHT ALONE DOES ALMOST NOTHING HERE, and colour was doing nothing at all. The font
// ladder is REMAPPED in index.css — 400 is Inconsolata Medium, not Regular, and 900 is
// Black — so the surrounding text is already semi-heavy and a 700 highlight barely reads as
// different. Worse, the old colours were #f1f5f9 for a name and #e2e8f0 for yardage against
// a base of #e2e8f0: a hair brighter, and exactly identical, respectively. Reported as the
// emphasis not standing out.
//
// So: the heaviest face the font actually ships (900 / Black) AND real colour separation.
const STYLES: Record<Kind, React.CSSProperties> = {
  // The people. Pure white against the dimmed body — "who" is what the eye hunts for first.
  player: { color: '#ffffff', fontWeight: 900 },
  // The number. As bright as a name; it is the other thing being looked up.
  yards: { color: '#ffffff', fontWeight: 900 },
  // What came of it. The only hue, because it is the part that changes the game.
  outcome: { color: '#38bdf8', fontWeight: 900 },
}

/** Case-insensitive index scan, returning every occurrence of `needle`. */
function findAll(haystackLower: string, needle: string): number[] {
  const out: number[] = []
  if (!needle) return out
  let from = 0
  for (;;) {
    const at = haystackLower.indexOf(needle, from)
    if (at === -1) return out
    out.push(at)
    from = at + needle.length
  }
}

/** True when `at..end` would sit inside, or across, a match already claimed. */
function collides(taken: Match[], start: number, end: number): boolean {
  return taken.some(m => start < m.end && end > m.start)
}

export function highlightPlayText(
  text: string | null | undefined,
  players: string[] = [],
): React.ReactNode {
  if (!text) return text ?? null
  const lower = text.toLowerCase()
  const taken: Match[] = []

  // 1. Players first — the engine's own strings, so they outrank every pattern below.
  //    Longest first so a surname inside a full name cannot claim the span alone.
  for (const name of [...players].filter(Boolean).sort((a, b) => b.length - a.length)) {
    for (const at of findAll(lower, name.toLowerCase())) {
      if (!collides(taken, at, at + name.length)) {
        taken.push({ start: at, end: at + name.length, kind: 'player' })
      }
    }
  }

  // 2. Yardage. Deliberately the phrase, not a bare number, so a jersey number or a
  //    down-and-distance elsewhere in the sentence is left alone.
  const yardRe = /\b\d+ yards?\b/gi
  for (let m = yardRe.exec(text); m; m = yardRe.exec(text)) {
    if (!collides(taken, m.index, m.index + m[0].length)) {
      taken.push({ start: m.index, end: m.index + m[0].length, kind: 'yards' })
    }
  }

  // 3. Outcomes.
  for (const phrase of OUTCOMES) {
    for (const at of findAll(lower, phrase)) {
      // Word-boundary check by hand: `indexOf` would happily match inside another word.
      const before = at === 0 ? ' ' : text[at - 1]
      const after = at + phrase.length >= text.length ? ' ' : text[at + phrase.length]
      if (/[a-z]/i.test(before) || /[a-z]/i.test(after)) continue
      if (!collides(taken, at, at + phrase.length)) {
        taken.push({ start: at, end: at + phrase.length, kind: 'outcome' })
      }
    }
  }

  if (taken.length === 0) return text

  taken.sort((a, b) => a.start - b.start)
  const out: React.ReactNode[] = []
  let cursor = 0
  taken.forEach((m, i) => {
    if (m.start > cursor) out.push(text.slice(cursor, m.start))
    out.push(
      <span key={`${m.kind}-${m.start}-${i}`} style={STYLES[m.kind]}>
        {text.slice(m.start, m.end)}
      </span>,
    )
    cursor = m.end
  })
  if (cursor < text.length) out.push(text.slice(cursor))
  return <>{out}</>
}

export default highlightPlayText
