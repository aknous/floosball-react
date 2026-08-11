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
  ceiling?: number | null
  expected?: number | null
}> = ({ history, teamColor, ceiling, expected }) => {
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

      {/* Where the player naturally develops to, when that is still ahead of him. */}
      {expected != null && expected > 0 && expected > currentRating && (() => {
        const ey = yFor(expected)
        const collides = ceiling != null && ceiling > 0 && Math.abs(yFor(ceiling) - ey) < 12
        const labelY = ey < PAD_TOP + 14 ? ey + 14 : ey + (collides ? 13 : -5)
        return (
          <g>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={ey} y2={ey} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
            <rect x={PAD_LEFT + 2} y={labelY - 10} width={74} height={13} fill={BG.panel} opacity={0.9} />
            <text x={PAD_LEFT + 6} y={labelY} fontSize="11" fill="#38bdf8" fontWeight={700}>Expected {Math.round(expected)}</text>
          </g>
        )
      })()}

      {/* The top he can reach at full potential. */}
      {ceiling != null && ceiling > 0 && (() => {
        const cy = yFor(ceiling)
        const labelY = cy < PAD_TOP + 14 ? cy + 14 : cy - 5
        return (
          <g>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={cy} y2={cy} stroke="#facc15" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.85} />
            <rect x={PAD_LEFT + 2} y={labelY - 10} width={68} height={13} fill={BG.panel} opacity={0.9} />
            <text x={PAD_LEFT + 6} y={labelY} fontSize="11" fill="#facc15" fontWeight={700}>Ceiling {Math.round(ceiling)}</text>
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
