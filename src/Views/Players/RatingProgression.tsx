import React from 'react'
import { TEXT, BORDER, BG } from '@/Components/Shell/tokens'

export interface RatingPoint { season: number; rating: number }

/**
 * One point per season, the whole 60-100 range always shown.
 *
 * The fixed y-range is the point: scaling to the data turns a two-point bump
 * into a cliff, which is exactly the lie a progression chart is prone to.
 *
 * Wide rather than square — it sits in the content column now, not a 340px rail.
 */
const RatingProgression: React.FC<{
  history: RatingPoint[]
  teamColor: string
  /** The projected range (owner, 2026-11-02): wide for a new prospect, one number once the
   *  player's talent is known. */
  low?: number | null
  high?: number | null
}> = ({ history, teamColor, low, high }) => {
  const PAD_LEFT = 36
  const PAD_RIGHT = 16
  const PAD_TOP = 20
  const PAD_BOTTOM = 30
  const WIDTH = 760
  const HEIGHT = 300
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM

  if (history.length === 0) return null

  const seasons = history.map(h => h.season)
  const ratings = history.map(h => h.rating)
  const currentRating = ratings[ratings.length - 1]
  const minSeason = seasons[0]
  const maxSeason = seasons[seasons.length - 1]
  const seasonSpan = Math.max(1, maxSeason - minSeason)

  const yMin = 60
  const yMax = 100
  const yRange = yMax - yMin

  const xFor = (season: number) => {
    if (history.length === 1) return PAD_LEFT + plotW / 2
    return PAD_LEFT + ((season - minSeason) / seasonSpan) * plotW
  }
  const yFor = (rating: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, rating))
    return PAD_TOP + (1 - (clamped - yMin) / yRange) * plotH
  }

  const gridLines: number[] = []
  for (let r = yMin; r <= yMax; r += 10) gridLines.push(r)

  // Crowded x-axes get every other label; one season per point is unreadable
  // past about a dozen seasons at this width.
  const labelEvery = seasons.length > 12 ? 2 : 1

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {gridLines.map(r => (
        <g key={r}>
          <line
            x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT}
            y1={yFor(r)} y2={yFor(r)}
            stroke={BORDER.raised} strokeWidth={0.8} opacity={0.4}
          />
          <text x={PAD_LEFT - 6} y={yFor(r) + 4} fontSize="11" fill={TEXT.muted} textAnchor="end">{r}</text>
        </g>
      ))}

      {/* Where the player is projected to settle, when that is still ahead of him: a band
          while his talent is still partly unknown, a line once it is one number. */}
      {high != null && high > currentRating && (() => {
        const lo = Math.max(low ?? high, currentRating)
        const top = yFor(high)
        const bottom = yFor(lo)
        const text = `Projected ${Math.round(lo) === Math.round(high) ? Math.round(high) : `${Math.round(lo)}-${Math.round(high)}`}`
        const labelY = top < PAD_TOP + 14 ? top + 14 : top - 5
        return (
          <g>
            {bottom - top > 1 && (
              <rect x={PAD_LEFT} y={top} width={plotW} height={bottom - top} fill="#facc15" opacity={0.1} />
            )}
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={top} y2={top} stroke="#facc15" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.85} />
            <rect x={PAD_LEFT + 2} y={labelY - 10} width={text.length * 6.6 + 8} height={13} fill={BG.panel} opacity={0.9} />
            <text x={PAD_LEFT + 6} y={labelY} fontSize="11" fill="#facc15" fontWeight={700}>{text}</text>
          </g>
        )
      })()}

      {seasons.map((s, i) => (
        i % labelEvery === 0 || i === seasons.length - 1 ? (
          <text key={s} x={xFor(s)} y={HEIGHT - 10} fontSize="11" fill={TEXT.muted} textAnchor="middle">S{s}</text>
        ) : null
      ))}

      {/* Per-segment color: a rising season reads green, a decline red. */}
      {history.map((pt, i) => {
        if (i === 0) return null
        const prev = history[i - 1]
        const delta = pt.rating - prev.rating
        const color = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : teamColor
        return (
          <line
            key={`seg-${i}`}
            x1={xFor(prev.season)} y1={yFor(prev.rating)}
            x2={xFor(pt.season)} y2={yFor(pt.rating)}
            stroke={color} strokeWidth={3} strokeLinecap="round"
          />
        )
      })}

      {history.map(pt => (
        <g key={pt.season}>
          <circle cx={xFor(pt.season)} cy={yFor(pt.rating)} r={4.5} fill={teamColor} stroke={BG.panel} strokeWidth={1.5} />
          <text x={xFor(pt.season)} y={yFor(pt.rating) - 10} fontSize="12" fill={TEXT.body} fontWeight="700" textAnchor="middle">
            {pt.rating}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default RatingProgression
