import React from 'react'
import { STAR_COLORS, calcStars } from '@/Components/Stars'

export interface CeilingRange {
  low: number
  high: number
  /** Set only once scouting has collapsed the band to a single number. */
  exact: number | null
  band?: number
}

/**
 * The scale every prospect is drawn against.
 *
 * ⚠️ FIXED, AND SHARED BY EVERY ROW. The first version of this chart set each row's floor
 * from that row's own numbers (`min(rating, low) - 4`), which meant two bars of identical
 * length described different players and the column could not be scanned at all — the one
 * thing a chart in a list is for. A 60 is the generation floor and 100 the ceiling, so the
 * axis is the rating scale itself.
 */
const FLOOR = 60
const ROOF = 100
const pct = (v: number) => ((Math.max(FLOOR, Math.min(ROOF, v)) - FLOOR) / (ROOF - FLOOR)) * 100

/**
 * ⚠️ THE GRIDLINES ARE THE STAR BANDS, which is what gives the chart a meaning rather than
 * a length. `calcStars` splits the scale at these four points, so a reader can see that a
 * ceiling crosses into four-star territory instead of judging it by pixels — and the chart
 * says the same thing as the stars used everywhere else in the app, in a form that also
 * shows how much of the gap is still unproven.
 */
const BANDS = [68, 76, 84, 92]

/**
 * What a prospect is now, and where his scouts think he could get to.
 *
 *   solid      what he plays at today. A FACT.
 *   hatched    the scouted range. NOT a fact, and drawn as a span rather than a point
 *              because the band is the honest shape of it.
 *
 * ⚠️ THE TWO ARE DIFFERENT MATERIALS, not two shades of one. Fact versus belief is the
 * distinction the whole prospect feature rests on, so the solid bar is filled and the
 * range is a translucent, outlined span sitting past the end of it.
 */
const Potential: React.FC<{
  rating: number
  range: CeilingRange | null
  height?: number
}> = ({ rating, range, height = 12 }) => {
  const now = pct(rating)
  const tier = STAR_COLORS[calcStars(rating)]
  const low = range ? pct(Math.max(range.exact ?? range.low, rating)) : null
  const high = range ? pct(Math.max(range.exact ?? range.high, rating)) : null
  const ceilingTier = range ? STAR_COLORS[calcStars(range.exact ?? range.high)] : tier

  return (
    <div style={{
      position: 'relative', height: `${height}px`, background: '#111a2b',
      border: '1px solid #1e293b', minWidth: '120px',
    }}>
      {BANDS.map(b => (
        <span key={b} style={{
          position: 'absolute', left: `${pct(b)}%`, top: 0, bottom: 0, width: '1px',
          background: '#22304a',
        }} />
      ))}
      {/* the scouted range, past where he is today */}
      {low != null && high != null && high > low && (
        <span style={{
          position: 'absolute', left: `${low}%`, width: `${high - low}%`, top: 0, bottom: 0,
          background: `repeating-linear-gradient(115deg, ${ceilingTier}55 0 3px, transparent 3px 6px)`,
          borderLeft: `1px solid ${ceilingTier}99`,
          borderRight: `1px solid ${ceilingTier}99`,
        }} />
      )}
      {/* what he plays at now */}
      <span style={{
        position: 'absolute', left: 0, width: `${now}%`, top: 0, bottom: 0,
        background: tier, opacity: 0.85,
      }} />
    </div>
  )
}

/**
 * The axis, drawn ONCE in the column header rather than under every row.
 *
 * ⚠️ A CHART IN A TABLE NEEDS ITS SCALE STATED SOMEWHERE, or every row is a length with no
 * units — but repeating it per row is the clutter that made the first attempt unreadable
 * in a 104px column. Labelling the star bands here does both jobs at once.
 */
export const PotentialAxis: React.FC = () => (
  <div style={{ position: 'relative', height: '12px', minWidth: '120px' }}>
    {BANDS.map((b, i) => (
      <span key={b} style={{
        position: 'absolute', left: `${pct(b)}%`, top: 0,
        fontSize: '10px', color: '#64748b', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
      }}>{i + 2}&#9733;</span>
    ))}
  </div>
)

/** "could reach 79-100", or the exact figure once scouting has settled on one. */
export function ceilingLabel(range: CeilingRange | null): string {
  if (!range) return ''
  return range.exact != null
    ? `ceiling ${range.exact}`
    : `could reach ${range.low}-${range.high}`
}

export default Potential
