import React from 'react'

/**
 * Emphasis for play-by-play text.
 *
 * A play is one long sentence — "Mario Trolleyproblem quick out to Rhodes Alltime for 10
 * yards, spins but gets dragged down anyway, and reaches the ball across the marker for the
 * first down!" — and the eye has to hunt through it for who did what and how far. Those two
 * are what a reader is actually after, so those two are lifted.
 *
 * ⚠️ NAMES COME FROM THE ENGINE, NEVER FROM PATTERN MATCHING. `involvedPlayers` is the
 * exact set of strings the play named. A client cannot infer them: the name pool includes
 * "Firstname Lastname" (deliberately) and every other joke in config.json, so any rule for
 * "what a name looks like" would both miss real names and bold ordinary words.
 *
 * ⚠️ OUTCOMES WERE HIGHLIGHTED IN BLUE AND ARE GONE (owner, 2026-08-17: "they seem
 * arbitrary at times"). The problem is structural, not a matter of a better word list. A
 * name and a distance are FACTS THE ENGINE HANDS OVER — one arrives as a string, the other
 * is a number in an obvious frame — whereas "what came of it" was reconstructed on the
 * client by scanning for phrases, and the engine writes the same event a dozen ways: a
 * sack is "is buried by" or "brings him down" or "is crushed by", and a touchdown does not
 * say the word at all (it reads "fires a short one to X for 12 yards", with the score
 * carried by the `isTouchdown` flag). So any list is a sample, and a sample highlights one
 * sack and not the next — which is exactly what arbitrary looks like from the outside.
 *
 * ⚠️ DO NOT REINSTATE IT BY LENGTHENING THE LIST. A longer list catches more and stays
 * just as uneven. The only non-arbitrary version is the backend saying which span is the
 * outcome, the way it already says which strings are the players.
 *
 * ⚠️ SEGMENTS NEVER OVERLAP. Matches are collected, sorted by position, and any that starts
 * inside one already taken is dropped — otherwise a distance sitting inside a name would
 * produce nested or duplicated spans.
 */

type Kind = 'player' | 'yards'
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

  // 1. Players first — the engine's own strings, so they outrank the pattern below.
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
  //
  // ⚠️ THE MINUS SIGN IS PART OF THE NUMBER. `\b\d+ yards?\b` matched "4 yards" inside
  // "for -4 yards" and left the "-" in body text, so a four-yard LOSS on a sack rendered as
  // a bolded "4 yards" — which reads at a glance as a gain. Emphasising it wrongly is worse
  // than not emphasising it.
  //
  // A leading delimiter is matched instead of a lookbehind (`(?<![\w-])`), which Safari
  // only gained in 16.4 — the group's own offset is used so the delimiter is not swallowed.
  //
  // ⚠️ A KICK WRITES ITS DISTANCE DIFFERENTLY: "27yd Field Goal by X is good", no space and
  // abbreviated. Measured over 2,470 real lines, that is 75 of them (3%) — every one a
  // field goal, and the only distance on the line. Requiring the full word left the kick
  // that decided the game as the one play whose distance was not lifted.
  const yardRe = /(^|[\s(])(-?\d+ ?(?:yards?|yds?))\b/gi
  for (let m = yardRe.exec(text); m; m = yardRe.exec(text)) {
    const start = m.index + m[1].length
    const end = start + m[2].length
    if (!collides(taken, start, end)) {
      taken.push({ start, end, kind: 'yards' })
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
