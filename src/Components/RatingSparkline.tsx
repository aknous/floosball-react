import React from 'react'

// Tiny inline SVG sparkline for a player's rating history. Accepts a series of
// {season, rating} points and renders a fixed-size line + endpoint dot. Colors
// the trend green on a rise vs. prior point and red on a drop, neutral flat.
//
// Used on prospect pipeline rows and team roster rows to give each player an
// at-a-glance progression signal without opening a detail view.

export interface RatingPoint {
  season: number
  rating: number
}

interface Props {
  history: RatingPoint[]
  width?: number
  height?: number
  // Optional fixed Y range so sparklines align visually across rows. Defaults
  // autoscale based on the series.
  minRating?: number
  maxRating?: number
  // Tooltip title — falls back to an inline "S{season}: {rating}, ..." list.
  title?: string
}

const DEFAULT_W = 60
const DEFAULT_H = 20

export const RatingSparkline: React.FC<Props> = ({
  history, width = DEFAULT_W, height = DEFAULT_H,
  minRating, maxRating, title,
}) => {
  if (!history || history.length === 0) {
    return <span style={{ display: 'inline-block', width, height, fontSize: '10px', color: '#475569' }}>—</span>
  }

  // Single point: render a solid dot at its value
  const ratings = history.map(h => h.rating)
  const lo = minRating ?? Math.min(...ratings, 60)
  const hi = maxRating ?? Math.max(...ratings, lo + 10)
  const range = Math.max(1, hi - lo)

  const yFor = (rating: number) => {
    // Invert Y so higher rating is higher on screen
    const pct = (rating - lo) / range
    return height - 1 - pct * (height - 2)
  }
  const xFor = (idx: number) => {
    if (history.length === 1) return width / 2
    return (idx / (history.length - 1)) * (width - 2) + 1
  }

  // Delta between last two points determines line color. Flat or single point
  // gets neutral slate, rise gets green, fall gets red.
  let trendColor = '#94a3b8'
  if (history.length >= 2) {
    const delta = history[history.length - 1].rating - history[history.length - 2].rating
    if (delta > 0) trendColor = '#22c55e'
    else if (delta < 0) trendColor = '#ef4444'
  }

  const points = history.map((h, i) => `${xFor(i).toFixed(1)},${yFor(h.rating).toFixed(1)}`).join(' ')
  const last = history[history.length - 1]
  const lastX = xFor(history.length - 1)
  const lastY = yFor(last.rating)

  const tooltipText = title || history.map(h => `S${h.season}: ${h.rating}`).join(' · ')

  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <title>{tooltipText}</title>
      {history.length >= 2 && (
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={lastX} cy={lastY} r={2} fill={trendColor} />
    </svg>
  )
}

export default RatingSparkline
