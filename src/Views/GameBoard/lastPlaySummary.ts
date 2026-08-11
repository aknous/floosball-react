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
  /** A punt's gross is a distance, not a gain, so it prints without a sign. */
  unsigned: boolean
  /** The outcome worth flagging, if there is one. */
  tag: string | null
  tagColor: string
  /**
   * A score just landed and the next drive has not started.
   *
   * ⚠️ In that gap the game's down and distance are NOT a live down — the ball
   * is spotted for the try (or waiting on a kickoff) while the down fields still
   * hold whatever they held before the score. Observed on the board as
   * "2-PT FAILED" sitting beside "2nd & 9 · COL 2", which cannot both be true.
   * `GameModalNew` already works around this by printing "Npt Try" in place of
   * down and distance; the card suppresses the situation instead, since it has
   * no room to explain itself.
   *
   * A turnover is deliberately NOT in here. A punt, pick or fumble hands the
   * ball straight over at a known spot, so the situation stays valid — only a
   * score opens a gap.
   */
  afterScore: boolean
}

/** playResult value → the short badge and its color. */
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

  const afterScore = !!play.isTouchdown
    || play.conversionPoints != null
    || rawType === 'ExtraPoint'
    || result.includes('Touchdown')
    || result.includes('2-Pt')
    || result.includes('XP')
    || result.startsWith('Conversion')
    || result === 'Field Goal is Good'
    || result === 'Safety'

  return {
    teamAbbr: typeof play.offensiveTeam === 'string' ? play.offensiveTeam : null,
    action,
    yards,
    tag,
    tagColor,
    afterScore,
    unsigned: action === 'PUNT',
  }
}

/**
 * Down and distance, DERIVED rather than read off `downText`.
 *
 * ⚠️ `game.downText` is REST-only. The websocket `game_state` payload carries
 * `down`, `distance`, `yardLine` and `yardsToEndzone` but NO `downText`, so the
 * string set by the initial `/currentGames` fetch is never updated again — it
 * simply freezes at whatever the situation was when the page loaded while the
 * yard line beside it keeps moving. Observed on the board as every card reading
 * "1st & Goal" next to a live midfield spot.
 *
 * Goal-to-go is `yardsToEndzone <= distance`: the end zone is nearer than the
 * line to gain. That needs no rules constant, which matters because
 * `firstDownDistance` is a MUTABLE rule the Cores can change.
 *
 * The ordinal is computed generically — chaos rules allow 5+ downs, and a
 * hardcoded 1st-4th map renders a 5th down as "1st".
 */
export function downAndDistance(game: CurrentGame): string | null {
  const down = Number(game.down)
  if (!Number.isFinite(down) || down < 1) return null

  const suffix = down % 100 >= 11 && down % 100 <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[down % 10] || 'th'
  const ordinal = `${down}${suffix}`

  const distance = Number((game as any).distance ?? game.yardsToFirstDown)
  const toEndzone = Number(game.yardsToEndzone)

  if (Number.isFinite(toEndzone) && Number.isFinite(distance) && toEndzone <= distance) {
    return `${ordinal} & Goal`
  }
  if (!Number.isFinite(distance)) return null
  return `${ordinal} & ${Math.max(0, Math.round(distance))}`
}
