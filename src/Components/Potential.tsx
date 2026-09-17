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
 * WHAT HE IS NOW, AND HOW MUCH MORE IS IN THERE, in one row of stars.
 *
 * This replaced a bar chart of the scouted band with a numeric caption under it. The bar
 * was accurate and hard to read: it asked the eye to compare two pixel offsets against an
 * implied 40-100 scale, in a 104px column, to answer "is this prospect worth a pick".
 * Stars answer it directly, and the rest of the app already grades players in stars, so a
 * prospect can be compared against a roster player without converting anything.
 *
 * Three states across five slots:
 *   solid, colored   what he plays at today. A FACT.
 *   hollow, tinted   what the scouts think he could still add. NOT a fact.
 *   dark             out of reach.
 *
 * ⚠️ THE UPSIDE IS DELIBERATELY HOLLOW, not a second solid color. The distinction the
 * whole prospect feature rests on is fact versus belief, and two solid runs of stars
 * reads as "he is already this good". Hollow says the ceiling has not been reached.
 *
 * ⚠️ IT IS STILL A BAND UNDERNEATH. The stars are drawn to the OPTIMISTIC end, because
 * that is what "potential" means to a reader, and the exact range stays in the tooltip
 * the caller supplies. A prospect whose band spans two star bands is not misrepresented
 * by this: the hollow stars say "could", not "will".
 */
const Potential: React.FC<{
  rating: number
  range: CeilingRange | null
  size?: number
  tracking?: number
}> = ({ rating, range, size = 14, tracking = 2 }) => {
  const now = calcStars(rating)
  const ceilingValue = range ? (range.exact ?? range.high) : rating
  const top = Math.max(now, calcStars(ceilingValue))
  const color = STAR_COLORS[now]
  const upsideColor = STAR_COLORS[top]
  return (
    <span style={{ letterSpacing: `${tracking}px`, lineHeight: 1, fontSize: `${size}px`, whiteSpace: 'nowrap' }}>
      <span style={{ color }}>{'★'.repeat(now)}</span>
      {top > now && <span style={{ color: upsideColor, opacity: 0.45 }}>{'☆'.repeat(top - now)}</span>}
      {top < 5 && <span style={{ color: '#1e3a52' }}>{'★'.repeat(5 - top)}</span>}
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

export default Potential
