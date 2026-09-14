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
 * Before kickoff the lower block of the card is where you make the call.
 *
 * ⚠️ THE PICK MOVED OUT FROM BESIDE THE TEAMS (owner, 2026-09-14): a control there "take[s]
 * up too much space next to the teams and pushes everything too far to the right", however
 * small it gets. A scheduled game has no field to draw and no last play to report, so the
 * block that carries those while the game is live is empty before it — that is the room, and
 * it costs the team rows nothing.
 *
 * ⚠️ RENDERS NOTHING WITHOUT `pick`. Signed out, or a past week: the card simply ends at the
 * score rather than showing two dead buttons.
 */
export const PickButtons: React.FC<{
  away?: { id?: string | number; abbr?: string; name?: string }
  home?: { id?: string | number; abbr?: string; name?: string }
  awayColor: string
  homeColor: string
  /** Pre-game win probability, which before kickoff is the ELO prior — the one number
   *  that makes a pick a judgement rather than a coin flip. */
  awayPct: number
  homePct: number
  pick?: PickState | null
}> = ({ away, home, awayColor, homeColor, awayPct, homePct, pick }) => {
  if (!pick) return null
  const settled = pick.correct != null

  const button = (team: typeof away, color: string, pct: number) => {
    const id = team?.id == null ? null : Number(team.id)
    const picked = id != null && pick.userPick === id
    const canPick = pick.pickable && !settled && id != null
    return (
      <span
        key={String(team?.id)}
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
          flex: 1, minWidth: 0, boxSizing: 'border-box',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px', minHeight: '30px', padding: '0 11px', borderRadius: '4px',
          border: `1px solid ${picked ? color : canPick ? TEXT.faint : 'transparent'}`,
          borderStyle: picked || !canPick ? 'solid' : 'dashed',
          background: picked ? `${color}2e` : 'transparent',
          color: picked ? TEXT.primary : color,
          ...font(picked ? 800 : 600, 12, 1, '0.04em'),
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          cursor: canPick ? 'pointer' : 'default',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {picked && settled && <Mark ok={!!pick.correct} size={13} />}
        <span>{team?.abbr}</span>
        {/* ⚠️ THE ODDS RIDE THE BUTTON (owner). Removing the win-probability row took the
            number off the card entirely, and a pick with nothing to weigh is a coin flip —
            this is the one fact that makes it a judgement. Muted against the abbr so the
            button still reads as the team first. */}
        <span style={{ ...font(600, 11, 1), ...TABULAR, opacity: 0.75 }}>{pct}%</span>
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
      {/* ⚠️ NO SECTION LABEL (owner: remove "YOUR CALL"). Two team buttons sitting alone in
          the block a live card fills with its field are self-evidently the thing to press,
          and the label was taking width from the buttons to say so. */}
      {button(away, awayColor, awayPct)}
      {button(home, homeColor, homePct)}
    </div>
  )
}

/** Live: a small mark on the team the reader called. */
export const PickedChip: React.FC<{
  teamId?: string | number
  color: string
  pick?: PickState | null
}> = ({ teamId, color, pick }) => {
  const id = teamId == null ? null : Number(teamId)
  if (!pick || id == null || pick.userPick !== id) return null
  return (
    <span
      title="Your prognostication"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '1px 5px', borderRadius: '3px', flexShrink: 0,
        border: `1px solid ${color}80`, background: `${color}26`,
        ...font(700, 9, 1, '0.08em'), color,
      }}
    >
      {pick.correct != null ? <Mark ok={!!pick.correct} size={10} /> : null}
      PICK
    </span>
  )
}

export default GaugePick
