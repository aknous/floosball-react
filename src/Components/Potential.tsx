import React from 'react'
import { GAUGE_TRACK, barWidth, gaugeColor } from '@/Components/Gauge'

/**
 * Where a player is projected to settle: a RANGE, not a forecast (owner, 2026-11-02).
 *
 * It is the public consensus (`expected`) widened by the hidden talent nobody outside can see
 * yet, so it is widest on draft day and closes to one number as the player develops; for a
 * veteran `low`, `expected` and `high` are the same. It replaced a ceiling that was below the
 * true ceiling for about half of all prospects.
 */
export interface Projection {
  expected: number
  low: number
  high: number
}

/** "74-86", or one number once the range has closed. Never below today's rating. */
export function projectionText(rating: number, projection: Projection): string {
  const low = Math.round(Math.max(projection.low ?? projection.expected ?? rating, rating))
  const high = Math.round(Math.max(projection.high ?? projection.expected ?? rating, rating))
  return low === high ? String(high) : `${low}-${high}`
}

/**
 * A prospect's rating gauge, with the top of their projected range drawn on the same track.
 *
 * ⚠️ THIS IS THE HOUSE GAUGE, NOT A NEW ONE. Two earlier attempts invented their own
 * chart — first a band on a per-row scale, then a fixed 60-100 window with star-band
 * gridlines — and both were wrong for the same reason: the app already draws ratings as a
 * gauge on every roster plate, hover card and player page, so a prospect drawn any other
 * way cannot be compared with the players they are competing against. Same track colour, same
 * 2px radius, same green/amber/red bands, same RAW 0-100 width.
 *
 * The one thing added is the part that is specific to a prospect: what they are now is
 * solid and how far they could still go continues the same bar at lower opacity, rather
 * than arriving as a second visual language. The range is on hover.
 */
const Potential: React.FC<{
  rating: number
  projection: Projection | null
  height?: number
}> = ({ rating, projection, height = 6 }) => {
  const now = barWidth(rating)
  // `?? expected`: a payload from before the range (2026-11-02) has no `high`.
  const top = projection ? Math.max(projection.high ?? projection.expected ?? rating, rating) : rating
  const upside = barWidth(top) - now

  return (
    <span style={{
      display: 'block', height: `${height}px`, backgroundColor: GAUGE_TRACK,
      borderRadius: '2px', overflow: 'hidden', minWidth: 0,
    }}>
      <span style={{ display: 'flex', height: '100%' }}>
        <span style={{ width: `${now}%`, backgroundColor: gaugeColor(rating) }} />
        {upside > 0 && (
          <span style={{
            width: `${upside}%`, backgroundColor: gaugeColor(top), opacity: 0.35,
          }} />
        )}
      </span>
    </span>
  )
}

/**
 * The gauge's tooltip: two lines, no prose. A hover on a chart is a lookup, not a
 * paragraph.
 */
export function potentialTooltip(rating: number, projection: Projection | null): React.ReactNode {
  const rows: [string, string][] = [['Current', String(Math.round(rating))]]
  if (projection) rows.push(['Projected', projectionText(rating, projection)])
  return (
    <span style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 12px' }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <span>{label}</span>
          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </React.Fragment>
      ))}
    </span>
  )
}

export default Potential
