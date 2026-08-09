import type { CurrentGame } from '@/hooks/useCurrentGames'
import { ACCENT, TEXT } from '@/Components/Shell/tokens'

/**
 * The last play as STRUCTURE rather than prose.
 *
 * The card used to scroll the engine's own play text — "Acid Del Mar takes the
 * pitch and dashes outside for 3 yards, tackled by Archer Littlebreath" — which
 * is written for a play-by-play feed where you are reading one line at a time.
 * On a board of sixteen cards it is a wall of moving text, and the two things a
 * glance actually wants (who has it, what happened) are buried mid-sentence.
 *
 * The websocket play payload already carries all of it structurally, so nothing
 * here is parsed out of the description — `playType`, `yardsGained`,
 * `playResult` and the isTouchdown/isTurnover/isSack flags are read directly.
 * ⚠️ `playType` arrives as the enum NAME ('FieldGoal'), while `playResult`
 * arrives as its VALUE ('Field Goal is Good'). They are not the same convention.
 */

export interface PlaySummary {
  /** Who had the ball. */
  teamAbbr: string | null
  /** RUN / PASS / SACK / PUNT / FIELD GOAL … */
  action: string
  /** Signed yards, or null where yardage says nothing (a kneel, an extra point). */
  yards: number | null
  /** The outcome worth flagging, if there is one. */
  tag: string | null
  tagColor: string
}

/** playResult value → the short badge and its colour. */
const RESULT_TAGS: Record<string, [string, string]> = {
  'Touchdown': ['TOUCHDOWN', ACCENT.live],
  'Touchdown, XP is Good': ['TOUCHDOWN', ACCENT.live],
  'Touchdown, XP No Good': ['TOUCHDOWN', ACCENT.live],
  '2-Pt Good': ['2-PT GOOD', ACCENT.live],
  '2-Pt No Good': ['2-PT FAILED', ACCENT.negative],
  'Conversion Good': ['CONVERSION', ACCENT.live],
  'Conversion No Good': ['NO GOOD', ACCENT.negative],
  'Field Goal is Good': ['GOOD', ACCENT.live],
  'Field Goal is No Good': ['NO GOOD', ACCENT.negative],
  'XP Good': ['GOOD', ACCENT.live],
  'XP No Good': ['NO GOOD', ACCENT.negative],
  'Interception': ['INTERCEPTED', ACCENT.negative],
  'Fumble': ['FUMBLE', ACCENT.negative],
  'Safety': ['SAFETY', ACCENT.negative],
  'Turnover On Downs': ['TURNOVER', ACCENT.negative],
  'Drive Clock Expired': ['CLOCK EXPIRED', ACCENT.negative],
  'Bust': ['BUST', ACCENT.negative],
  'Sideline Goal Good': ['HOOP', ACCENT.live],
  'Sideline Goal Miss': ['HOOP MISS', ACCENT.negative],
  'Provisional Score': ['CONTESTED', ACCENT.warning],
  'Contest Lost': ['STUFFED', ACCENT.negative],
  '1st Down': ['1ST DOWN', TEXT.secondary],
}

/** playType enum NAME → the word on the card. */
const ACTIONS: Record<string, string> = {
  Run: 'RUN',
  Pass: 'PASS',
  Punt: 'PUNT',
  FieldGoal: 'FIELD GOAL',
  ExtraPoint: 'EXTRA POINT',
  Spike: 'SPIKE',
  Kneel: 'KNEEL',
}

/** Play types whose yardage is not the interesting number. */
const NO_YARDAGE = new Set(['FIELD GOAL', 'EXTRA POINT', 'SPIKE', 'KNEEL'])

export function lastPlaySummary(game: CurrentGame): PlaySummary | null {
  const plays = (game.plays || []) as any[]
  if (plays.length === 0) return null

  // ⚠️ Highest playNumber, NOT the head or tail of the list. The board's plays
  // come from two sources — a REST snapshot laid down oldest-first and websocket
  // plays PREPENDED as they arrive — so neither end is reliably the newest.
  let play: any = null
  let best = -Infinity
  for (const candidate of plays) {
    if (!candidate || candidate.isSidelineCutaway) continue
    const n = Number(candidate.playNumber)
    if (!Number.isFinite(n)) continue
    if (n > best) { best = n; play = candidate }
  }
  if (!play) return null

  const isSack = !!play.isSack
  const rawType = typeof play.playType === 'string' ? play.playType : ''
  const action = isSack ? 'SACK' : (ACTIONS[rawType] || rawType.toUpperCase() || 'PLAY')

  let yards: number | null = null
  if (!NO_YARDAGE.has(action)) {
    // A punt's number is how far it was struck, which is not `yardsGained`.
    const raw = action === 'PUNT' ? play.puntGross : play.yardsGained
    const n = Number(raw)
    if (Number.isFinite(n)) yards = Math.round(n)
  }

  const result = typeof play.playResult === 'string' ? play.playResult : ''
  let tag: string | null = null
  let tagColor: string = TEXT.secondary

  const mapped = RESULT_TAGS[result]
  if (mapped) {
    tag = mapped[0]
    tagColor = mapped[1]
  } else if (play.isTouchdown) {
    tag = 'TOUCHDOWN'
    tagColor = ACCENT.live
  } else if (play.isTurnover) {
    tag = 'TURNOVER'
    tagColor = ACCENT.negative
  }

  // The action already says PUNT; a "Punt" badge beside it is the same word twice.
  if (tag === null && result === 'Punt') tag = null

  return {
    teamAbbr: typeof play.offensiveTeam === 'string' ? play.offensiveTeam : null,
    action,
    yards,
    tag,
    tagColor,
  }
}
