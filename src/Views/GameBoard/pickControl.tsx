import React from 'react'
import { TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'

/**
 * The win-probability gauge's side labels, doubling as prognostication picks.
 *
 * The board already puts each team's abbr + win% on either side of the split bar, which
 * is exactly where the old dashboard put its pick buttons — so the label IS the button
 * rather than a new row of controls competing with the gauge for the same space.
 *
 * ⚠️ A PICK BELONGS TO A (WEEK, GAME) PAIR AND THE BOARD CAN SHOW A PAST WEEK. `usePickEm`
 * returns the CURRENT week only, so a past-week board must be handed no pick state at
 * all — otherwise this week's picks render against last week's fixtures. `GameBoardPage`
 * gates on `isPast` for that reason; do not push the lookup down into the cards.
 *
 * ⚠️ AND THE FIXTURE IS MATCHED BY TEAM IDS, NEVER BY LIST POSITION. That is not
 * theoretical: measured on production during a live week, index-matching put 11 of 16
 * pick-em cards against the wrong game, each carrying the previous card's home team.
 * See `_liveGameFor` in the API for the same rule on the server.
 */

export interface PickState {
  /** Team id the reader has picked, or null. */
  userPick: number | null
  /** Can this game still be picked right now (per-game lock, not per-week). */
  pickable: boolean
  /** Settled: true = correct, false = wrong, null = not yet resolved. */
  correct: boolean | null
  /** Points banked, shown once settled and correct. */
  points: number | null
  /** What a correct pick on each side would be worth if made NOW — base x timing x that
   *  side's underdog multiplier. Null when the game can no longer be picked. */
  awayPoints?: number | null
  homePoints?: number | null
  onPick: (teamId: number) => void
}

/** Tick / cross, sized to sit inline with the label. */
const Mark: React.FC<{ ok: boolean; size: number }> = ({ ok, size }) => (
  <svg viewBox="0 0 24 24" fill={ok ? ACCENT.success : ACCENT.negative}
       style={{ width: size, height: size, flexShrink: 0 }} aria-hidden="true">
    {ok
      ? <path fillRule="evenodd" clipRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
      : <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" />}
  </svg>
)

interface Props {
  side: 'home' | 'away'
  /** ⚠️ The board's team ids are STRINGS (`CurrentGame.homeTeam.id`) while pick-em deals
      in numbers. Normalized here rather than at each call site, so a comparison can
      never silently fail on `'7' !== 7` — which would look exactly like a missing pick. */
  teamId?: string | number
  abbr?: string
  pct: number
  /** The gauge's own emphasis — this side is favoured. */
  favored: boolean
  /** Legible-on-dark team color, already corrected by the caller. */
  color: string
  size: number
  pick?: PickState | null
}

/**
 * One side of the gauge. With no `pick` it renders exactly what the board rendered
 * before — a plain label — so a signed-out reader and a past week are unchanged.
 */
export const GaugePick: React.FC<Props> = ({ side, teamId, abbr, pct, favored, color, size, pick }) => {
  const id = teamId == null ? null : Number(teamId)
  const picked = !!pick && id != null && pick.userPick === id
  const settled = !!pick && pick.correct != null
  // Only offer a click where a pick would actually take: the game is open, and the
  // reader has not already been graded on it.
  const canPick = !!pick && pick.pickable && !settled && id != null

  const label = side === 'away' ? `${abbr} ${pct}%` : `${pct}% ${abbr}`

  if (!pick) {
    return (
      <span style={{ ...font(favored ? 800 : 600, size), color, ...TABULAR, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    )
  }

  return (
    <span
      role={canPick ? 'button' : undefined}
      tabIndex={canPick ? 0 : undefined}
      aria-pressed={canPick ? picked : undefined}
      aria-label={canPick ? `Pick ${abbr}` : undefined}
      onClick={canPick ? (e: React.MouseEvent) => { e.stopPropagation(); pick.onPick(id!) } : undefined}
      onKeyDown={canPick ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick.onPick(id!) }
      } : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        // ⚠️ Padding and border are present in EVERY state, transparent when unset, so
        // the gauge does not shift by a pixel as a pick lands or resolves. The board is
        // sixteen cards of aligned rows and a reflow on click reads as breakage.
        padding: '2px 6px',
        borderRadius: '4px',
        border: `1px solid ${picked ? `${color}80` : canPick ? TEXT.faint : 'transparent'}`,
        borderStyle: picked || !canPick ? 'solid' : 'dashed',
        borderBottom: `2px solid ${picked ? color : 'transparent'}`,
        background: picked ? `${color}26` : 'transparent',
        ...font(picked || favored ? 800 : 600, size),
        color: picked ? TEXT.primary : color,
        ...TABULAR,
        whiteSpace: 'nowrap',
        cursor: canPick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {picked && settled && <Mark ok={!!pick.correct} size={size} />}
      {label}
      {/* ⚠️ NO POINTS FIGURE — see `PickBox`. A pick settles only when the game is final,
          so this could never show on a live card; it was a permanent tail on every graded
          pick. The tick or cross carries the verdict. */}
    </span>
  )
}

/**
 * The prognostication pick as a checkbox beside a team's crest.
 *
 * ⚠️ THE PICK USED TO BE THE WIN-PROBABILITY GAUGE'S SIDE LABELS, and that row is gone
 * (owner, 2026-09-14: the WP graph "isnt as necessary as the rest of the information, but
 * users do want to be able to pick teams for prognostications here", then: "maybe we can put
 * a checkbox to the left of the team logo and remove the row where the WP graph was"). The
 * two jobs were welded together because they happened to share a row; separating them lets
 * the graph go without taking the picking with it.
 *
 * ⚠️ IT RENDERS NOTHING WITHOUT `pick`, exactly as `GaugePick` does -- a signed-out reader
 * or a past week gets the card it had before rather than a column of dead boxes.
 */
/**
 * One team's pick, sized to sit where that team's SCORE LINE goes before kickoff.
 *
 * ⚠️ THE SCOREBOARD IS DEAD SPACE PRE-GAME (owner) -- two rows of dashes and a pair of
 * zeroes -- so the pick takes its place rather than being added underneath it. That is what
 * stops the prognostication panel costing the card a whole extra block of height, and it
 * puts each team's button on that team's own row, which needs no label to explain it.
 *
 * ⚠️ RENDERS NOTHING WITHOUT `pick`. Signed out, or a past week: the card keeps its
 * scoreboard and looks exactly as it always did.
 */
export const PickSideButton: React.FC<{
  team?: { id?: string | number; abbr?: string }
  color: string
  /** Win probability for this side, and what a correct call on it pays right now. */
  pct: number
  points?: number | null
  pick?: PickState | null
  /** Shared with the header label above it, so the two cannot drift apart. */
  width: number
}> = ({ team, color, pct, points, pick, width }) => {
  if (!pick) return null
  const id = team?.id == null ? null : Number(team.id)
  const picked = id != null && pick.userPick === id
  const settled = pick.correct != null
  const canPick = pick.pickable && !settled && id != null

  return (
    <span
      role={canPick ? 'button' : undefined}
      tabIndex={canPick ? 0 : undefined}
      aria-pressed={canPick ? picked : undefined}
      aria-label={canPick ? `Pick ${team?.abbr}` : undefined}
      // ⚠️ The whole card opens the game modal on click, so a pick must stop there or it
      // opens the game on top of itself.
      onClick={canPick ? (e: React.MouseEvent) => { e.stopPropagation(); pick.onPick(id!) } : undefined}
      onKeyDown={canPick ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick.onPick(id!) }
      } : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        boxSizing: 'border-box', flexShrink: 0,
        width: `${width}px`, minHeight: '38px', padding: '0 12px', borderRadius: '5px',
        // ⚠️ Every state has a visible outline: a solid team-coloured box when picked, a
        // DASHED muted one while it can still be changed, a solid faint one once locked.
        // The unpicked border used to be transparent when locked, which left two words
        // floating with nothing to say they had ever been a control.
        border: `1px solid ${picked ? color : canPick ? TEXT.muted : TEXT.faint}`,
        borderStyle: picked || !canPick ? 'solid' : 'dashed',
        background: picked ? `${color}2e` : 'transparent',
        color: picked ? TEXT.primary : color,
        ...font(picked ? 800 : 600, 15, 1, '0.04em'),
        whiteSpace: 'nowrap',
        cursor: canPick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {picked && settled && <Mark ok={!!pick.correct} size={14} />}
      <span style={{ ...font(700, 14, 1), ...TABULAR, opacity: 0.8 }}>{pct}%</span>
      {/* ⚠️ AND WHAT IT PAYS. The whole point of the underdog multiplier is that the
          unlikely call is worth more; without the figure a reader cannot see the trade. */}
      {points != null && (
        <span style={{ ...font(600, 12, 1, '0.04em'), ...TABULAR, opacity: 0.6 }}>{points} PTS</span>
      )}
    </span>
  )
}

/**
 * Live: a small check on the crest of the team the reader called.
 *
 * ⚠️ IT OVERLAYS THE CREST RATHER THAN SITTING BESIDE ANYTHING (owner: "just make it a
 * checkmark next to the team logo ... dont let it shift everything to the right too much,
 * just a subtle indicator"). Anything in the row's flow — the `PICK` chip this replaces
 * included — spends horizontal space and pushes the name across, which is the complaint that
 * moved the pick control out of this row in the first place. Absolutely positioned on the
 * crest it costs ZERO layout width, so the rows line up exactly as they do on a card with no
 * picks on it at all.
 *
 * ⚠️ It keeps a dark ring so it reads against any crest underneath it — the marks are
 * multi-coloured and a bare tick disappears into half of them.
 */
export const PickedMark: React.FC<{
  teamId?: string | number
  color: string
  pick?: PickState | null
}> = ({ teamId, color, pick }) => {
  const id = teamId == null ? null : Number(teamId)
  if (!pick || id == null || pick.userPick !== id) return null
  const settled = pick.correct != null
  const ring = settled ? (pick.correct ? ACCENT.success : ACCENT.negative) : color
  return (
    <span
      title="Your prognostication"
      aria-label="Your prognostication"
      style={{
        position: 'absolute', right: '-3px', bottom: '-3px',
        width: '15px', height: '15px', borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: '#0b1220', border: `1.5px solid ${ring}`,
        boxShadow: '0 0 0 1px rgba(2,6,23,0.9)',
        pointerEvents: 'none',
      }}
    >
      {settled && !pick.correct ? (
        <svg viewBox="0 0 24 24" fill="none" stroke={ring} strokeWidth={4}
             strokeLinecap="round" style={{ width: 8, height: 8 }} aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke={ring} strokeWidth={4}
             strokeLinecap="round" strokeLinejoin="round"
             style={{ width: 9, height: 9 }} aria-hidden="true">
          <path d="M4 12.5 9.5 18 20 6" />
        </svg>
      )}
    </span>
  )
}

export default GaugePick
