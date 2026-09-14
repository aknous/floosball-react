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
 * ⚠️ HOME DEFENDS THE LEFT AND ATTACKS RIGHTWARD, WHICH IS THE GAME PAGE'S CONVENTION AND
 * NOT A FREE CHOICE (owner, 2026-09-14: the card faced the teams the opposite way to the
 * field graphic). `GameModalNew` draws its field with `fdDir = isHomePoss ? 1 : -1` and
 * `losAbsYfl = isHomePoss ? 110 - ytg : 10 + ytg`, so home's own goal line is at the left
 * and it attacks toward the right. Two views of the same drive that disagree about which
 * way it is going are worse than one of them not existing.
 *
 * ⚠️ IT WAS A PROP AND THAT WAS THE MISTAKE. `leftTeam` was made required on the reasoning
 * that each card should face the way it stacks its own teams -- the dashboard card lists
 * home first, the board's large card lists away first -- which sounds careful and is exactly
 * how the board card ended up mirrored against the game page. Team order in a list is not a
 * direction of play. There is ONE convention, it lives here, and no caller can pick another.
 *
 * So a position is converted to one absolute axis, x yards from HOME's own goal line:
 *   home has it -> attacking rightward, so x = 100 - yardsToEndzone
 *   away has it -> attacking leftward,  so x = yardsToEndzone
 */
export const DriveLine: React.FC<DriveLineProps> = ({
  yardsToEndzone, driveStartYardsToEndzone, homeTeamPoss, awayTeamPoss, homeColor, awayColor,
}) => {
  // ⚠️ NEVER RETURNS NULL WHILE A GAME IS LIVE. It used to, and a possession change or a
  // score briefly leaves nobody with the ball -- so the row vanished and the whole card
  // changed height mid-game (owner). The FIELD is always drawable; only the football and
  // the trail depend on knowing where the ball is.
  const known = yardsToEndzone != null && (!!homeTeamPoss || !!awayTeamPoss)
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const leftHasBall = !!homeTeamPoss          // home defends the left, so it attacks right
  // Absolute spot on the field, measured from the LEFT team's own goal line.
  const spot = (ytg: number) => clamp(leftHasBall ? 100 - ytg : ytg)
  const now = spot(yardsToEndzone ?? 50)
  const start = driveStartYardsToEndzone == null ? null : spot(driveStartYardsToEndzone)

  const color = (leftHasBall ? homeColor : awayColor) || '#38bdf8'
  // Yards gained is along the direction of ATTACK, not along the axis, so a drive going
  // backwards reads negative whichever way the team happens to be facing.
  const gained = (start == null || !known) ? null
    : Math.round(driveStartYardsToEndzone! - yardsToEndzone!)
  const lo = start == null ? now : Math.min(start, now)
  const hi = start == null ? now : Math.max(start, now)
  // ⚠️ ALWAYS THE TEAM'S COLOUR. A drive that has LOST ground was drawn slate grey, which
  // reads as a white bar -- and because losing ground puts the start AHEAD of the ball, it
  // appeared in FRONT of the football rather than trailing it (owner: "a white line in front
  // of the direction where the ball is going, instead of a trailing line of the teams color").
  // The bar is this team's ground either way; the ball sitting at its back edge is what says
  // they went backwards, and the figure beside it already carries the minus.
  const driveColor = color

  const leftColor = homeColor            // the end zone home defends
  const rightColor = awayColor           // ...and the one away defends
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
          {known && start != null && (
            <div style={{ position: 'absolute', left: pct(lo), width: pct(Math.max(hi - lo, 0.6)),
                          top: 0, bottom: 0, backgroundColor: driveColor, opacity: 0.8 }} />
          )}
        </div>

        {/* ⚠️ THE SAME FOOTBALL THE GAME PAGE DRAWS (owner) -- team-colour halo, brown
            ellipse with a white stroke, a lace, and a white arrow toward the end zone they
            are attacking. A plain white tick was hard to pick out against a pale team
            colour or inside a tinted end zone, and it said nothing about direction; the
            ball says both, and says them the way this app already says them elsewhere. */}
        {known && <svg
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
        </svg>}
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
