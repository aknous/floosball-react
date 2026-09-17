import React from 'react'
import { GAUGE_TRACK, barWidth, gaugeColor } from '@/Components/Gauge'

export interface CeilingRange {
  low: number
  high: number
  /** Set only once scouting has collapsed the band to a single number. */
  exact: number | null
  band?: number
}

/**
 * A prospect's rating gauge, with the scouted ceiling drawn on the same track.
 *
 * ⚠️ THIS IS THE HOUSE GAUGE, NOT A NEW ONE. Two earlier attempts invented their own
 * chart — first a band on a per-row scale, then a fixed 60-100 window with star-band
 * gridlines — and both were wrong for the same reason: the app already draws ratings as a
 * gauge on every roster plate, hover card and player page, so a prospect drawn any other
 * way cannot be compared with the players he is competing against. Same track colour, same
 * 2px radius, same green/amber/red bands, same RAW 0-100 width.
 *
 * The one thing added is the part that is specific to a prospect: what he is now is a
 * FACT and where he might get to is a BELIEF, so the belief continues the same bar at
 * lower opacity rather than arriving as a second visual language. Read it as "he is here,
 * and the faint part is what the scouts think is still in there".
 *
 * ⚠️ THE FAINT SEGMENT STARTS AT HIS CURRENT RATING, not at the band's low end. The low end
 * is frequently below where he already plays, and a range that starts behind him would
 * draw backwards. The range's real information is its TOP.
 */
const Potential: React.FC<{
  rating: number
  range: CeilingRange | null
  height?: number
}> = ({ rating, range, height = 6 }) => {
  const now = barWidth(rating)
  const ceiling = range ? Math.max(range.exact ?? range.high, rating) : rating
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

/** "could reach 79-100", or the exact figure once scouting has settled on one. */
export function ceilingLabel(range: CeilingRange | null): string {
  if (!range) return ''
  return range.exact != null
    ? `ceiling ${range.exact}`
    : `could reach ${range.low}-${range.high}`
}

/**
 * The gauge's tooltip: three numbers, no prose.
 *
 * ⚠️ IT USED TO BE A SENTENCE — "Plays at 78 today. Your team scouts him to could reach
 * 84-92. Another team sees a different range." — which is three facts and a caveat wrapped
 * in grammar you have to read to extract them from. A hover on a chart is a lookup, not a
 * paragraph.
 *
 * ⚠️ EXPECTED IS THE MIDPOINT OF THE SHOWN BAND, not a separate figure the API returns.
 * The band is a belief with error either side, so its centre is the honest expectation —
 * and it is the centre of exactly the range drawn on screen, so the tooltip and the gauge
 * cannot disagree. Once scouting collapses the band (`exact`), expectation and ceiling are
 * the same number and only two rows are shown rather than printing one figure twice.
 */
export function potentialTooltip(rating: number, range: CeilingRange | null): React.ReactNode {
  const rows: [string, number][] = [['Current', Math.round(rating)]]
  if (range) {
    const top = Math.max(range.exact ?? range.high, rating)
    if (range.exact == null) {
      const low = Math.max(range.low, rating)
      rows.push(['Expected', Math.round((low + top) / 2)])
    }
    rows.push(['Ceiling', Math.round(top)])
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
