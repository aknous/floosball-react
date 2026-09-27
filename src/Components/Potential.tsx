import React from 'react'
import { GAUGE_TRACK, barWidth, gaugeColor } from '@/Components/Gauge'

/**
 * A player's TRUE projection: overall at trueSkill (expected) and at potential (ceiling).
 *
 * ⚠️ FANS SEE THE TRUTH (owner, 2026-09-27). Each team's scouted read is what its own GM
 * acts on and is never presented; blurred bands made sense only while fans voted on
 * prospects as the GM.
 */
export interface Projection {
  expected: number
  ceiling: number
}

/**
 * A prospect's rating gauge, with his ceiling drawn on the same track.
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
 * than arriving as a second visual language. Expected and ceiling are on hover.
 */
const Potential: React.FC<{
  rating: number
  projection: Projection | null
  height?: number
}> = ({ rating, projection, height = 6 }) => {
  const now = barWidth(rating)
  const ceiling = projection ? Math.max(projection.ceiling, rating) : rating
  const upside = barWidth(ceiling) - now

  return (
    <span style={{
      display: 'block', height: `${height}px`, backgroundColor: GAUGE_TRACK,
      borderRadius: '2px', overflow: 'hidden', minWidth: 0,
    }}>
      <span style={{ display: 'flex', height: '100%' }}>
        <span style={{ width: `${now}%`, backgroundColor: gaugeColor(rating) }} />
        {upside > 0 && (
          <span style={{
            width: `${upside}%`, backgroundColor: gaugeColor(ceiling), opacity: 0.35,
          }} />
        )}
      </span>
    </span>
  )
}

/**
 * The gauge's tooltip: three numbers, no prose. A hover on a chart is a lookup, not a
 * paragraph.
 */
export function potentialTooltip(rating: number, projection: Projection | null): React.ReactNode {
  const rows: [string, number][] = [['Current', Math.round(rating)]]
  if (projection) {
    rows.push(['Expected', Math.round(Math.max(projection.expected, rating))])
    rows.push(['Ceiling', Math.round(Math.max(projection.ceiling, rating))])
  }
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
