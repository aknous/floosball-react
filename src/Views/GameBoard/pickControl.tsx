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
      {/* Points ride the picked side only, and only once they are banked. */}
      {picked && settled && pick.correct && pick.points != null && (
        <span style={{ ...font(700, size - 2), color: ACCENT.success }}>+{Math.round(pick.points)}</span>
      )}
    </span>
  )
}

export default GaugePick
