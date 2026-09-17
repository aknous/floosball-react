import React from 'react'

export interface CeilingRange {
  low: number
  high: number
  /** Set only once the band has collapsed to a single number. */
  exact: number | null
  band?: number
}

/**
 * A prospect's SCOUTED ceiling, drawn as the band it actually is.
 *
 * ⚠️ CURRENT RATING IS A FACT AND POTENTIAL IS A BAND — that distinction is the
 * whole feature, so the two are drawn differently on purpose: the rating is a
 * hard tick, the ceiling a soft span. Printing a single ceiling number would be
 * a wrong answer wearing the clothes of a right one.
 *
 * ⚠️ THE BAND IS PER-TEAM. `/api/draft/class` resolves it through the VIEWING
 * team's scouting and `/api/teams/{id}/prospects` through the team whose page
 * you are on, so the same player legitimately shows different ranges in two
 * places. Nothing here should try to reconcile them.
 *
 * ⚠️ ONE COMPONENT, TWO PAGES. The transactions desk and the team page both draw
 * this; two copies would drift the first time the scale changed, and the scale
 * is the part a reader is comparing across players.
 */
const CeilingBand: React.FC<{
  rating: number
  range: CeilingRange | null
  accent?: string
  height?: number
}> = ({ rating, range, accent = '#38bdf8', height = 8 }) => {
  if (!range) return null
  // The floor is pulled a little below whichever is lower so the current-rating
  // tick is never flush against the left edge, where it reads as zero.
  const floor = Math.max(40, Math.min(rating, range.low) - 4)
  const span = Math.max(1, 100 - floor)
  const pct = (v: number) => ((v - floor) / span) * 100
  const left = pct(range.low)
  // A collapsed band still has to be visible, hence the floor on the width.
  const width = Math.max(2, pct(range.high) - left)
  return (
    <div style={{ position: 'relative', height: `${height}px`, background: '#1e293b', borderRadius: '2px' }}>
      <div style={{
        position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0,
        background: `linear-gradient(90deg, ${accent}44, ${accent}aa)`, borderRadius: '2px',
      }} />
      <div style={{
        position: 'absolute', left: `${pct(rating)}%`, top: '-2px', bottom: '-2px', width: '2px',
        background: '#e2e8f0', borderRadius: '1px', transform: 'translateX(-1px)',
      }} />
    </div>
  )
}

/** "could reach 78–91", or the exact figure once scouting has settled on one. */
export function ceilingLabel(range: CeilingRange | null): string {
  if (!range) return ''
  return range.exact != null
    ? `ceiling ${range.exact}`
    : `could reach ${range.low}–${range.high}`
}

export default CeilingBand
