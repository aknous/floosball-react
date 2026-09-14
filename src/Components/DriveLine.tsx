import React from 'react'

interface DriveLineProps {
  /** Yards to the end zone the team in possession is attacking, right now. */
  yardsToEndzone?: number | null
  /** ...and what it was when this drive began. */
  driveStartYardsToEndzone?: number | null
  homeTeamPoss?: boolean
  awayTeamPoss?: boolean
  homeColor?: string
  awayColor?: string
  /** Which team's own end zone sits at the LEFT of the line. */
  leftTeam: 'home' | 'away'
}

/**
 * The current drive on a fixed field: home's end zone at the left, away's at the right,
 * the ball wherever it actually is.
 *
 * ⚠️ THE FIELD DOES NOT FLIP WITH POSSESSION (owner, 2026-09-14: *"like a tug of war flag
 * going back and forth. it doesnt make sense for the ball to only go one way"*). A first
 * version drew this in the OFFENSE'S frame -- left always their own goal, right always the
 * end zone they were attacking -- which reads fine for one drive and is wrong the moment
 * the ball changes hands: the very same spot on the grass jumps to the opposite side of
 * the card, so a turnover looked like a 60-yard gain and every drive marched the same way.
 *
 * So a position is converted to one absolute axis, x yards from the LEFT team's own goal:
 *   the left team has it  -> they attack rightward, so x = 100 - yardsToEndzone
 *   the right team has it -> they attack leftward, so x = yardsToEndzone
 * The flag then moves back and forth across a field that stays put, and which way a drive
 * is pushing falls out of who has the ball rather than being drawn in.
 *
 * ⚠️ WHICH TEAM IS ON THE LEFT IS THE CALLER'S TO SAY, and it is not the same everywhere:
 * the dashboard card lists HOME first, the game board's large card lists AWAY first. A
 * field that disagreed with the names stacked directly above it would be worse than no
 * field at all, so `leftTeam` is required rather than defaulted.
 */
export const DriveLine: React.FC<DriveLineProps> = ({
  yardsToEndzone, driveStartYardsToEndzone, homeTeamPoss, awayTeamPoss, homeColor, awayColor,
  leftTeam,
}) => {
  if (yardsToEndzone == null || (!homeTeamPoss && !awayTeamPoss)) return null
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const leftHasBall = leftTeam === 'home' ? !!homeTeamPoss : !!awayTeamPoss
  // Absolute spot on the field, measured from the LEFT team's own goal line.
  const spot = (ytg: number) => clamp(leftHasBall ? 100 - ytg : ytg)
  const now = spot(yardsToEndzone)
  const start = driveStartYardsToEndzone == null ? null : spot(driveStartYardsToEndzone)

  const color = (homeTeamPoss ? homeColor : awayColor) || '#38bdf8'
  // Yards gained is along the direction of attack, not along the axis.
  const gained = start == null ? null
    : Math.round(driveStartYardsToEndzone! - yardsToEndzone!)
  const lo = start == null ? now : Math.min(start, now)
  const hi = start == null ? now : Math.max(start, now)
  const driveColor = gained != null && gained < 0 ? '#94a3b8' : color

  const leftColor = leftTeam === 'home' ? homeColor : awayColor
  const rightColor = leftTeam === 'home' ? awayColor : homeColor
  const pct = (v: number) => `${v}%`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
      <div style={{ position: 'relative', flex: 1, height: '8px', borderRadius: '4px',
                    backgroundColor: '#1e293b', border: '1px solid #334155', overflow: 'hidden' }}>
        {/* the two end zones, each in its own team's colour and each staying put */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8%',
                      backgroundColor: leftColor ? `${leftColor}40` : '#33415580' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8%',
                      backgroundColor: rightColor ? `${rightColor}40` : '#33415580' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px',
                      backgroundColor: '#475569' }} />
        <div style={{ position: 'absolute', left: pct(lo), width: pct(Math.max(hi - lo, 0.8)),
                      top: 0, bottom: 0, backgroundColor: driveColor, opacity: 0.85 }} />
        <div style={{ position: 'absolute', left: pct(now), top: '-2px', bottom: '-2px',
                      width: '2px', marginLeft: '-1px', backgroundColor: '#f8fafc',
                      boxShadow: '0 0 3px rgba(248,250,252,0.8)' }} />
      </div>
      {/* which way they are pushing, and how far they have come */}
      <span style={{ fontSize: '10px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums',
                     minWidth: '46px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {leftHasBall ? '▸' : '◂'}{gained == null ? '' : ` ${gained > 0 ? '+' : ''}${gained} yd`}
      </span>
    </div>
  )
}

export default DriveLine
