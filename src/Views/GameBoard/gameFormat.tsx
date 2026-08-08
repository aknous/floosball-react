import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { displayScore, type ScoringModel } from '@/utils/displayScore'
import { formatScore } from '@/utils/formatScore'

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

/** Frames won can be a half (a drawn frame splits the point). */
const framesWon = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')

export type Period = { label: string; homeValue: string; awayValue: string; played: boolean }

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
    if (!line || !line.innings?.length) return null
    return {
      label: 'R',
      periods: line.innings.map((n, i) => ({
        label: String(n),
        homeValue: String(line.home?.[i] ?? 0),
        awayValue: String(line.away?.[i] ?? 0),
        played: true,
      })),
    }
  }

  if (game.frames?.active) return null

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
        homeValue: played && home != null ? String(home) : '·',
        awayValue: played && away != null ? String(away) : '·',
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

/** A short label for the format, for the card header. Null for the standard game. */
export function formatLabel(game: CurrentGame): string | null {
  if (game.innings?.active) return 'INNINGS'
  if (game.frames?.active) return 'FRAMES'
  if (game.chessClock?.active) return 'CHESS CLOCK'
  if (game.playLimit?.active) return 'PLAY LIMIT'
  return null
}
