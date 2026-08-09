import React from 'react'
import { BG, BORDER, TEXT, ACCENT, MOMENTUM, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import type { CurrentGame } from '@/hooks/useCurrentGames'

/** Crests exist for team ids 1-32 (`public/avatars/{id}.png`, regenerated from
 *  config.json). Anything above renders a placeholder. This stayed at 24 when
 *  the league grew to 32, so eight clubs drew a dashed circle everywhere a
 *  crest appears while their artwork sat on disk unused. */
export const CREST_MAX_ID = 32

/**
 * A crest, or a same-size dashed circle when the team has no artwork yet.
 *
 * `box-sizing: border-box` is not optional here. A content-box placeholder lays out 2px
 * larger than a real crest and shifts the team name beside it — a real defect caught in
 * review. The placeholder is also circular, because every real crest is.
 */
export const Crest: React.FC<{
  teamId?: string | number | null
  size: number
  possession?: boolean
  style?: React.CSSProperties
}> = ({ teamId, size, possession = false, style }) => {
  const id = Number(teamId)
  const hasArt = Number.isFinite(id) && id >= 1 && id <= CREST_MAX_ID

  const inner = hasArt ? (
    <img
      src={`/avatars/${id}.png`}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
    />
  ) : (
    <span style={{
      display: 'block',
      boxSizing: 'border-box',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: BG.panel,
      border: `1px dashed ${BORDER.raised}`,
      flexShrink: 0,
    }} />
  )

  if (!possession) return <span style={{ flexShrink: 0, ...style }}>{inner}</span>

  // The team with the ball gets a ring on the crest. Outline rather than border so it
  // does not change the layout box as it appears and disappears mid-drive.
  return (
    <span style={{
      flexShrink: 0,
      display: 'block',
      borderRadius: '50%',
      outline: '2px solid #fff',
      outlineOffset: '2px',
      ...style,
    }}>{inner}</span>
  )
}

/**
 * Momentum flame, coloured by magnitude.
 *
 * ⚠️ THE path — the two-part flame with an inner cutout that the game card, the
 * game modal and the game page all draw. This component used to carry its own
 * simpler teardrop, so the same idea had two shapes depending on which surface
 * you were looking at. If a third place needs a flame, import this one.
 */
export const MomentumFlame: React.FC<{ magnitude: number; size: number }> = ({ magnitude, size }) => {
  const color = magnitude >= 25 ? MOMENTUM.high : magnitude >= 15 ? MOMENTUM.mid : MOMENTUM.low
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
    </svg>
  )
}

/** Red is the one colour football already agrees on for this. */
export const RED_ZONE = '#f87171'

/**
 * Is somebody inside the twenty?
 *
 * ⚠️ `yardsToEndzone` is measured to the OFFENSE's target end zone, so it is the
 * right number regardless of which club has the ball — no possession-side maths.
 * Halftime is excluded along with everything else non-live: the spot then belongs
 * to a drive that is already over, so the card would flag a threat that no longer
 * exists.
 */
export function inRedZone(game: CurrentGame): boolean {
  if (game.status !== 'Active' || game.isHalftime) return false
  const toGo = game.yardsToEndzone
  return typeof toGo === 'number' && toGo > 0 && toGo <= 20
}

/** The team inside the twenty is about to score, and that is worth a glance. */
export const RedZoneChip: React.FC<{ abbr?: string | null; size: 'large' | 'small' }> = ({ abbr, size }) => (
  <span style={{
    display: 'flex', alignItems: 'center', gap: '5px',
    ...font(700, size === 'large' ? 10 : 9, 1, '0.08em'),
    color: RED_ZONE,
    background: 'rgba(248,113,113,0.12)',
    border: `1px solid ${RED_ZONE}59`,
    padding: size === 'large' ? '3px 6px' : '3px 5px',
    whiteSpace: 'nowrap', flexShrink: 0,
  }}>
    {abbr ? `${abbr} RED ZONE` : 'RED ZONE'}
  </span>
)

export type ChipKind = 'TIED' | 'CLOSE GAME' | 'UPSET' | 'FEATURED'

export const CHIP_COLOR: Record<ChipKind, string> = {
  TIED: ACCENT.live,
  'CLOSE GAME': ACCENT.live,
  UPSET: ACCENT.upset,
  FEATURED: ACCENT.featured,
}

/** The one interest chip a card may carry. Its colour also sets the card's top border. */
export const InterestChip: React.FC<{ kind: ChipKind; size: 'large' | 'small' }> = ({ kind, size }) => {
  const color = CHIP_COLOR[kind]
  return (
    <span style={{
      ...font(700, size === 'large' ? 10 : 9, 1, '0.08em'),
      color,
      border: `1px solid ${color}59`,
      padding: size === 'large' ? '3px 6px' : '3px 5px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>{kind}</span>
  )
}

export const PulsingDot: React.FC<{ size: number; color?: string }> = ({ size, color = ACCENT.live }) => (
  <span
    className="board-live-dot"
    style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: color, flexShrink: 0,
    }}
  />
)

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...font(600, 11, 1, '0.1em'), color: TEXT.muted, flexShrink: 0 }}>{children}</span>
)

/**
 * The swing trend: win probability for the favoured side over the recent plays.
 *
 * Drawn from `game.plays`, which already carries a per-play win probability, rather than
 * from a client-side accumulator — so the line is right immediately on load instead of
 * only after the tab has been open long enough to have watched the swings happen.
 */
export const SwingTrend: React.FC<{
  points: number[]
  color: string
  width?: number
  height?: number
}> = ({ points, color, width = 130, height = 24 }) => {
  if (points.length < 2) {
    return <svg width={width} height={height} style={{ flexShrink: 0 }} aria-hidden />
  }
  const lo = Math.min(...points)
  const hi = Math.max(...points)
  const span = Math.max(hi - lo, 4)
  const step = width / (points.length - 1)
  const path = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - ((p - lo) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={width} height={height} style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden>
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={BORDER.hairline} strokeWidth="1" />
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/**
 * A two-team split bar. Both halves use RAW team colours — bars are fills, and the
 * lightening rule applies only to team colour used as text.
 */
export const SplitBar: React.FC<{
  awayPct: number
  awayColor: string
  homeColor: string
  height: number
}> = ({ awayPct, awayColor, homeColor, height }) => (
  <span style={{
    flex: 1, minWidth: 0, display: 'flex', height: `${height}px`,
    background: BORDER.hairline, overflow: 'hidden',
  }}>
    <span style={{ width: `${awayPct}%`, background: awayColor, transition: 'width 0.5s ease' }} />
    <span style={{ flex: 1, background: homeColor }} />
  </span>
)

/**
 * One line of text that SCROLLS when it is too long to fit, rather than truncating.
 *
 * Play descriptions run long and the interesting part is usually at the end ("...tackled
 * by Airbrush Delacroix at the 3"), so an ellipsis cuts off exactly what a reader wanted.
 * Wrapping is not an option either: the cards are in a grid and a second line makes one
 * card taller than its row.
 *
 * It travels out and back on a loop rather than snapping, and the duration scales with the
 * overflow distance so the speed is the same on a slightly-long line as on a very long
 * one. Nothing animates when the text fits, and nothing animates under reduced motion —
 * both fall back to a plain clipped line.
 */
export const ScrollingLine: React.FC<{
  text: string
  style?: React.CSSProperties
}> = ({ text, style }) => {
  const outerRef = React.useRef<HTMLSpanElement>(null)
  const innerRef = React.useRef<HTMLSpanElement>(null)
  const [shift, setShift] = React.useState(0)

  React.useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      const overflow = inner.scrollWidth - outer.clientWidth
      // A couple of pixels of overflow is measurement noise, not a long line.
      setShift(overflow > 4 ? overflow : 0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [text])

  // ~28px per second of travel, with a floor so a barely-overflowing line does not
  // whip across.
  const duration = shift > 0 ? Math.max(6, shift / 28 + 4) : 0

  return (
    <span
      ref={outerRef}
      style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0, ...style }}
    >
      <span
        ref={innerRef}
        className={shift > 0 ? 'board-marquee' : undefined}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          ...(shift > 0
            ? ({ '--marquee-shift': `-${shift}px`, animationDuration: `${duration}s` } as React.CSSProperties)
            : {}),
        }}
      >{text}</span>
    </span>
  )
}

export const boardStyles = {
  font: FONT,
  tabular: TABULAR,
  text: TEXT,
  bg: BG,
  border: BORDER,
}
