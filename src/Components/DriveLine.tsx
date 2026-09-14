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
 * The current drive on a fixed field: one team's end zone at the left, the other's at the
 * right, the ball wherever it actually is.
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

  const color = (leftHasBall ? (leftTeam === 'home' ? homeColor : awayColor)
                             : (leftTeam === 'home' ? awayColor : homeColor)) || '#38bdf8'
  // Yards gained is along the direction of ATTACK, not along the axis, so a drive going
  // backwards reads negative whichever way the team happens to be facing.
  const gained = start == null ? null : Math.round(driveStartYardsToEndzone! - yardsToEndzone!)
  const lo = start == null ? now : Math.min(start, now)
  const hi = start == null ? now : Math.max(start, now)
  const driveColor = gained != null && gained < 0 ? '#94a3b8' : color

  const leftColor = leftTeam === 'home' ? homeColor : awayColor
  const rightColor = leftTeam === 'home' ? awayColor : homeColor
  const pct = (v: number) => `${v}%`
  const H = 12

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      {/* ⚠️ TWO LAYERS: the field is CLIPPED (its tints and fill must stop at the rounded
          ends) and the ball is NOT (near a goal line the marker and its arrow would be
          sliced in half by that same clip, which is exactly where a drive matters most). */}
      <div style={{ position: 'relative', flex: 1, height: `${H}px`, minWidth: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '3px',
                      backgroundColor: '#1e293b', border: '1px solid #334155',
                      overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8%',
                        backgroundColor: leftColor ? `${leftColor}40` : '#33415580' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8%',
                        backgroundColor: rightColor ? `${rightColor}40` : '#33415580' }} />
          {/* every ten yards, midfield brighter — the marks are what turn a bar into a field */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(y => (
            <div key={y} style={{ position: 'absolute', left: `${y}%`, top: 0, bottom: 0,
                                  width: '1px', backgroundColor: y === 50 ? '#64748b' : '#334155' }} />
          ))}
          {/* the drive so far */}
          <div style={{ position: 'absolute', left: pct(lo), width: pct(Math.max(hi - lo, 0.6)),
                        top: 0, bottom: 0, backgroundColor: driveColor, opacity: 0.8 }} />
        </div>

        {/* ⚠️ THE SAME FOOTBALL THE GAME PAGE DRAWS (owner) -- team-colour halo, brown
            ellipse with a white stroke, a lace, and a white arrow toward the end zone they
            are attacking. A plain white tick was hard to pick out against a pale team
            colour or inside a tinted end zone, and it said nothing about direction; the
            ball says both, and says them the way this app already says them elsewhere. */}
        <svg
          width="34" height="20" viewBox="0 0 34 20"
          style={{ position: 'absolute', top: '50%', left: pct(now),
                   transform: 'translate(-17px, -50%)', overflow: 'visible',
                   pointerEvents: 'none' }}
        >
          <circle cx={17} cy={10} r={8} fill={color} opacity={0.35} />
          <ellipse cx={17} cy={10} rx={6} ry={4}
                   fill="#7B4F2E" stroke="rgba(255,255,255,0.9)" strokeWidth={1.25} />
          <line x1={14.5} y1={10} x2={19.5} y2={10}
                stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
          <polygon
            points={leftHasBall ? '30,10 23,5.5 23,14.5' : '4,10 11,5.5 11,14.5'}
            fill="#f8fafc" stroke="rgba(0,0,0,0.55)" strokeWidth={0.5} opacity={0.95} />
        </svg>
      </div>

      <span style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1',
                     fontVariantNumeric: 'tabular-nums',
                     minWidth: '42px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {gained == null ? '—' : `${gained > 0 ? '+' : ''}${gained} yd`}
      </span>
    </div>
  )
}

export default DriveLine
