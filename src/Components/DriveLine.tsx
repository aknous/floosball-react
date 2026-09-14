import React from 'react'

interface DriveLineProps {
  /** Yards to the end zone the offense is attacking, right now. */
  yardsToEndzone?: number | null
  /** ...and what it was when this drive began. */
  driveStartYardsToEndzone?: number | null
  /** The team with the ball, for the colour of the drive. */
  color?: string
}

/**
 * The current drive as a single line: the field left to right, where they started,
 * and where the ball is now.
 *
 * The frame is the OFFENSE'S — left is their own goal line, right is the end zone they
 * are attacking — which is what makes it readable without knowing which way the teams
 * are facing. Both inputs are already in those terms (`yardsToEndzone`), so a position
 * is `100 - yardsToEndzone` yards from their own line.
 *
 * Ground LOST renders as its own segment rather than being hidden: a drive that has gone
 * backwards is exactly the thing a glanceable drive line should show, and drawing only
 * `min..max` in one colour would make it look identical to progress.
 */
export const DriveLine: React.FC<DriveLineProps> = ({ yardsToEndzone, driveStartYardsToEndzone, color }) => {
  if (yardsToEndzone == null) return null
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const now = clamp(100 - yardsToEndzone)
  const start = driveStartYardsToEndzone == null ? null : clamp(100 - driveStartYardsToEndzone)
  const gained = start == null ? 0 : now - start
  const lo = start == null ? now : Math.min(start, now)
  const hi = start == null ? now : Math.max(start, now)
  const driveColor = gained < 0 ? '#94a3b8' : (color || '#38bdf8')

  const pct = (v: number) => `${v}%`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
      <div
        style={{ position: 'relative', flex: 1, height: '8px', borderRadius: '4px',
                 backgroundColor: '#1e293b', border: '1px solid #334155', overflow: 'hidden' }}
      >
        {/* the far end zone — the one they're driving at */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8%',
                      backgroundColor: color ? `${color}33` : '#38bdf833' }} />
        {/* midfield */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px',
                      backgroundColor: '#475569' }} />
        {/* the drive itself */}
        <div style={{ position: 'absolute', left: pct(lo), width: pct(Math.max(hi - lo, 0.8)),
                      top: 0, bottom: 0, backgroundColor: driveColor, opacity: 0.85 }} />
        {/* where the ball is now */}
        <div style={{ position: 'absolute', left: pct(now), top: '-2px', bottom: '-2px',
                      width: '2px', marginLeft: '-1px', backgroundColor: '#f8fafc',
                      boxShadow: '0 0 3px rgba(248,250,252,0.8)' }} />
      </div>
      <span style={{ fontSize: '10px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums',
                     minWidth: '34px', textAlign: 'right' }}>
        {start == null ? '' : `${gained > 0 ? '+' : ''}${Math.round(gained)} yd`}
      </span>
    </div>
  )
}

export default DriveLine
