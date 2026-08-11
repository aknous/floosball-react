import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { displayScore, type ScoringModel } from '@/utils/displayScore'
import { formatScore } from '@/utils/formatScore'
import { fmtFramesWon } from '@/utils/framesWon'

/**
 * Format-aware pieces for the board cards.
 *
 * The league's rules are MUTABLE — the Cores can switch the game itself to innings, frames,
 * a chess clock, a play limit, a target score or bust — and each of those changes what a
 * "period" is, what the clock reads, and in one case what the big number even MEANS. The
 * first version of these cards hardcoded `Q{n} {mm:ss}` and four quarter columns, so under
 * any non-standard format the header would have read a quarter that does not exist and the
 * line score would have been four empty dots.
 *
 * The rules here mirror `GameCard.tsx`, which already solved this for the old grid. Kept in
 * one module so the two boards cannot drift on what a frames score means.
 */

// Frames won can be a half (a drawn frame splits the point) — see @/utils/framesWon.
const framesWon = fmtFramesWon

export type Period = {
  label: string
  homeValue: string
  awayValue: string
  played: boolean
  /** Frames only: which side TOOK this frame, so the winner can be emphasised. */
  homeWon?: boolean
  awayWon?: boolean
}

/**
 * The period columns a large card shows, or null when the format has no meaningful ones.
 *
 * Standard/target/chess-clock/play-limit/bust all still run on quarters. INNINGS replaces
 * them with its line score (which can be more than four columns, so the card lets it size
 * itself). FRAMES has neither — its big number is frames won and the per-frame detail lives
 * in the modal.
 */
export function periodColumns(game: CurrentGame): { label: string; periods: Period[] } | null {
  const innings = game.innings
  if (innings?.active) {
    const line = innings.lineScore
    // ⚠️ Fall back to the SCHEDULED slate rather than returning null. An earlier version
    // bailed out when the line score was missing, so the card silently lost its headers
    // and every value at once — which looks identical to "this format has no periods"
    // and is impossible to tell apart from a working frames card. A game that has not
    // produced a line score yet should show its innings as unplayed, not vanish.
    const numbers = line?.innings?.length
      ? line.innings
      : Array.from({ length: Math.max(1, innings.inningsPerGame || 3) }, (_, i) => i + 1)
    return {
      // No label over the total under innings (owner). Baseball's line score calls it R,
      // but the total is the only big number on the row and does not need naming.
      label: '',
      periods: numbers.map((n, i) => {
        const home = line?.home?.[i]
        const away = line?.away?.[i]
        // An inning is played once the game has moved past it, or is in it.
        const played = n < innings.inning || (n === innings.inning && game.status !== 'Scheduled')
        return {
          label: String(n),
          homeValue: played ? String(home ?? 0) : '·',
          awayValue: played ? String(away ?? 0) : '·',
          played,
        }
      }),
    }
  }

  const frames = game.frames
  if (frames?.active) {
    // A frames match's line score IS the frame-by-frame: each side's points in each frame,
    // with the side that TOOK the frame emphasised. Without it the card shows two frame
    // totals and no account of how they were won, which is the one thing this format is
    // about — a frame taken 7-0 and one taken 3-0 are worth exactly the same, and only the
    // per-frame line makes that visible.
    const played = frames.frameResults ?? []
    const total = Math.max(frames.framesPerGame || played.length, played.length)
    return {
      label: '',
      periods: Array.from({ length: total }, (_, i) => {
        const result = played[i]
        return {
          label: String(i + 1),
          // ⚠️ formatScore, NOT String(). A score can be FRACTIONAL — float scoring-value
          // rules, and the chaos rulesets during a Criticality — so `String()` prints a
          // summing artifact in full (22.800000000000004) and even a clean 8.8 overflows
          // a column sized for two digits. Cleaning to one decimal is exactly what
          // formatScore exists for; every other score site already goes through it.
          homeValue: result ? formatScore(result.home) : '·',
          awayValue: result ? formatScore(result.away) : '·',
          played: !!result,
          // A drawn frame is HALVED rather than won, so neither side is emphasised.
          homeWon: result?.winner === 'home',
          awayWon: result?.winner === 'away',
        }
      }),
    }
  }

  const quarters = game.quarterScores
  const isFinal = game.status === 'Final'
  const live = game.status === 'Active'
  return {
    label: 'TOT',
    periods: (['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
      const home = quarters?.home?.[q]
      const away = quarters?.away?.[q]
      const played = isFinal || game.quarter > i + 1 || (game.quarter === i + 1 && live)
      return {
        label: `Q${i + 1}`,
        // Same as the frames line above — a quarter score is fractional under the same
        // rules, so it cannot be stringified raw either.
        homeValue: played && home != null ? formatScore(home) : '·',
        awayValue: played && away != null ? formatScore(away) : '·',
        played,
      }
    }),
  }
}

/**
 * The clock / period readout. Every format gets its own, because none of them are a
 * quarter and a countdown.
 */
export const FormatClock: React.FC<{
  game: CurrentGame
  size: 'large' | 'small'
}> = ({ game, size }) => {
  const big = size === 'large'
  const textStyle = { ...font(700, big ? 12 : 10, 1, '0.08em'), color: ACCENT.live, ...TABULAR }
  const pipSize = big ? 6 : 5

  const innings = game.innings
  if (innings?.active) {
    // Innings has no clock at all — the inning and the tries used are the state.
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span style={textStyle}>{innings.half === 'bottom' ? 'BOT' : 'TOP'} {innings.inning}</span>
        <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
          {Array.from({ length: innings.triesPerInning }).map((_, i) => (
            <span key={i} style={{
              width: `${pipSize}px`, height: `${pipSize}px`, borderRadius: '50%',
              background: i < innings.tries ? ACCENT.warning : 'transparent',
              border: `1px solid ${i < innings.tries ? ACCENT.warning : TEXT.dim}`,
            }} />
          ))}
        </span>
      </span>
    )
  }

  const frames = game.frames
  if (frames?.active) {
    // Frames level on points goes to a normal overtime clock, not a seventh frame.
    return frames.overtime
      ? <span style={textStyle}>OT {game.timeRemaining ?? ''}</span>
      : <span style={textStyle}>FRAME {frames.currentFrame} {frames.frameClock ?? game.timeRemaining ?? ''}</span>
  }

  const playLimit = game.playLimit
  if (playLimit?.active) {
    const left = playLimit.playsRemaining
    return (
      <span style={{ ...textStyle, color: left <= 3 ? ACCENT.negative : ACCENT.live }}>
        Q{game.quarter} · {left} PLAY{left === 1 ? '' : 'S'}
      </span>
    )
  }

  const chess = game.chessClock
  if (chess?.active) {
    // Each side owns a budget rather than sharing a clock, so the readout is both.
    const fmt = (seconds: number) => {
      const s = Math.max(0, Math.round(seconds))
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    }
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', ...textStyle }}>
        <span style={{ color: chess.awayLockedOut ? ACCENT.negative : ACCENT.live }}>{fmt(chess.awayBudget)}</span>
        <span style={{ color: TEXT.muted }}>/</span>
        <span style={{ color: chess.homeLockedOut ? ACCENT.negative : ACCENT.live }}>{fmt(chess.homeBudget)}</span>
      </span>
    )
  }

  return (
    <span style={textStyle}>
      {(game.quarter ?? 0) > 4 ? 'OT' : `Q${game.quarter ?? 1}`} {game.timeRemaining ?? ''}
    </span>
  )
}

/**
 * A team's big number.
 *
 * ⚠️ In FRAMES this is frames WON, not points — the points still decide a level match and
 * are the real box score, so they ride alongside at a smaller size. Every other format's
 * big number already is the points, and the scoring MODEL (additive / spread / subtractive)
 * is a lens over how that number reads, not a different number.
 */
export const FormatScore: React.FC<{
  game: CurrentGame
  side: 'home' | 'away'
  scoringModel: ScoringModel
  size: number
  color: string
}> = ({ game, side, scoringModel, size, color }) => {
  const teamPoints = side === 'home' ? game.homeScore ?? 0 : game.awayScore ?? 0
  const oppPoints = side === 'home' ? game.awayScore ?? 0 : game.homeScore ?? 0

  const frames = game.frames
  if (frames?.active) {
    const won = side === 'home' ? frames.framesWonHome : frames.framesWonAway
    // A level match decided on points: light up the leader's point total, since that is
    // the number that actually settled it.
    const decidedOnPoints = frames.tiebreak?.decidedByPoints && frames.tiebreak.winner === side
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
        <span style={{ ...font(800, size), color, ...TABULAR }}>{framesWon(won ?? 0)}</span>
        <span style={{ width: '1px', height: `${Math.round(size * 0.6)}px`, background: BORDER.hover, flexShrink: 0 }} />
        <span style={{
          ...font(decidedOnPoints ? 800 : 600, Math.max(12, Math.round(size * 0.45))),
          color: decidedOnPoints ? ACCENT.live : TEXT.muted, ...TABULAR,
          minWidth: '24px', textAlign: 'left',
        }}>{formatScore(teamPoints)}</span>
      </span>
    )
  }

  return (
    <span style={{ ...font(800, size), color, ...TABULAR }}>
      {displayScore(teamPoints, oppPoints, scoringModel)}
    </span>
  )
}

/**
 * Which side is ahead, under this format.
 *
 * ⚠️ Not always the higher score. In FRAMES the result is frames won (points only break a
 * level match), and under the SUBTRACTIVE scoring model the display is inverted — though
 * the real winner is still whoever has more points, so only the frames case changes the
 * comparison.
 */
export function leadingSide(game: CurrentGame): 'home' | 'away' | 'tied' {
  const frames = game.frames
  if (frames?.active) {
    const h = frames.framesWonHome ?? 0
    const a = frames.framesWonAway ?? 0
    if (h !== a) return h > a ? 'home' : 'away'
  }
  const home = game.homeScore ?? 0
  const away = game.awayScore ?? 0
  if (home === away) return 'tied'
  return home > away ? 'home' : 'away'
}


/**
 * Has this game gone far enough for CLOSENESS to mean anything?
 *
 * Every game starts 0-0, so without this every card on a fresh slate reads TIED — sixteen
 * identical chips saying nothing. Gating only TIED would just move the problem, because a
 * 0-0 game is also within one score, so the whole board would read CLOSE GAME instead. Both
 * chips are gated on this, and so is the interest ranking that uses them.
 *
 * "Far enough" is a FORMAT question, since none of these share a notion of halfway:
 *   standard and friends — the second half
 *   innings             — the bottom of the second inning
 *   frames              — the fourth frame
 */
export function closenessCounts(game: CurrentGame): boolean {
  if (game.status === 'Final') return true
  if (game.status !== 'Active') return false

  const innings = game.innings
  if (innings?.active) {
    const half = Math.max(2, Math.ceil((innings.inningsPerGame || 3) / 2))
    return innings.inning > half || (innings.inning === half && innings.half === 'bottom')
  }

  const frames = game.frames
  if (frames?.active) {
    // Past the midpoint of the match — frame 4 of 6.
    return frames.currentFrame >= Math.floor((frames.framesPerGame || 6) / 2) + 1
  }

  return (game.quarter ?? 1) >= 3
}
