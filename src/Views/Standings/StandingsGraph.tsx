import React, { useMemo, useState } from 'react'
import { BG, BORDER, TEXT, ACCENT, font } from '@/Components/Shell/tokens'
import { CREST_MAX_ID } from '@/Views/GameBoard/boardPieces'
import type { StandingsHistory, HistoryTeam } from './standingsTypes'

/**
 * View 3 — the shape of the season.
 *
 * One line per club, plotted week by week. The y-axis is GAMES ABOVE .500, not cumulative
 * wins: wins only ever climb, so every line rises together and the field reads as one
 * bundle. Games above .500 spreads the league around a zero line, which is what makes a
 * graphical standings chart legible at all — a club at 8-4 sits above one at 6-6 rather
 * than three pixels ahead of it.
 *
 * The second axis is games behind the DIVISION leader, recomputed each week server-side,
 * for reading a single race rather than the whole field.
 *
 * ⚠️ Hand-rolled SVG, matching `RatingProgression`. The project has no charting
 * dependency and this is not the feature to add one for.
 */

type Axis = 'gamesAbove500' | 'divisionGamesBack'

const AXES: { key: Axis; label: string; hint: string }[] = [
  { key: 'gamesAbove500', label: 'GAMES OVER .500', hint: 'Wins minus losses. Zero is a .500 club.' },
  { key: 'divisionGamesBack', label: 'GAMES BEHIND', hint: 'Behind the division leader that week.' },
]

const PAD_LEFT = 34
const PAD_RIGHT = 78     // room for the crest + abbreviation at the end of each line
const PAD_TOP = 14
const PAD_BOTTOM = 26
const HEIGHT = 320
const CREST = 11          // crest beside each end label
const LINE_NUDGE = 1.1    // separation between clubs sharing a record
const LABEL_MIN_GAP = 12  // smallest gap between two end labels

const StandingsGraph: React.FC<{
  history: StandingsHistory
  favoriteTeamId: number | null
  compact?: boolean
}> = ({ history, favoriteTeamId, compact }) => {
  const [axis, setAxis] = useState<Axis>('gamesAbove500')
  const [scope, setScope] = useState<string>('all')
  const [hovered, setHovered] = useState<number | null>(null)

  const weeks = history.weeks || []

  // Scope options: the whole league, or one division inside it.
  const scopes = useMemo(() => {
    const out: { key: string; label: string; teamIds: number[] | null }[] = [
      { key: 'all', label: 'WHOLE LEAGUE', teamIds: null },
    ]
    for (const league of history.leagues || []) {
      for (const d of league.divisions || []) {
        out.push({ key: `${league.name}::${d.name}`, label: d.name.toUpperCase(), teamIds: d.teamIds })
      }
    }
    return out
  }, [history])

  if (weeks.length === 0) {
    return (
      <div style={{
        background: BG.card, border: `1px solid ${BORDER.hairline}`,
        padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
      }}>
        No games have been played yet this season.
      </div>
    )
  }

  const activeScope = scopes.find(s => s.key === scope) || scopes[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {AXES.map(a => (
          <Toggle key={a.key} active={axis === a.key} onClick={() => setAxis(a.key)} label={a.label} />
        ))}
        <span style={{ flex: 1 }} />
        <select
          value={scope}
          onChange={e => setScope(e.target.value)}
          style={{
            background: BG.card, color: TEXT.body, border: `1px solid ${BORDER.hairline}`,
            padding: '5px 8px', ...font(600, 11), letterSpacing: '0.06em',
          }}
        >
          {scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <p style={{ margin: 0, ...font(400, 12), color: TEXT.muted }}>
        {AXES.find(a => a.key === axis)?.hint}
      </p>

      {(history.leagues || []).map(league => (
        <LeaguePlot
          key={league.name}
          leagueName={league.name}
          teams={league.teams.filter(t =>
            activeScope.teamIds ? activeScope.teamIds.includes(t.id) : true)}
          weeks={weeks}
          totalWeeks={history.totalWeeks || weeks[weeks.length - 1] || 1}
          axis={axis}
          favoriteTeamId={favoriteTeamId}
          hovered={hovered}
          setHovered={setHovered}
          compact={compact}
        />
      ))}
    </div>
  )
}

const Toggle: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? BG.plateHover : 'transparent',
      border: `1px solid ${active ? ACCENT.live : BORDER.hairline}`,
      color: active ? TEXT.strong : TEXT.muted,
      padding: '5px 10px', cursor: 'pointer',
      ...font(700, 11), letterSpacing: '0.07em',
    }}
  >{label}</button>
)

const LeaguePlot: React.FC<{
  leagueName: string
  teams: HistoryTeam[]
  weeks: number[]
  totalWeeks: number
  axis: Axis
  favoriteTeamId: number | null
  hovered: number | null
  setHovered: (id: number | null) => void
  compact?: boolean
}> = ({ leagueName, teams, weeks, totalWeeks, axis, favoriteTeamId, hovered, setHovered, compact }) => {
  const WIDTH = compact ? 360 : 760
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM

  // ⚠️ No early return above the useMemo below — hooks must run in the same order every
  // render. The empty cases are handled after it.
  const values = teams.flatMap(t => t.series.map(p => p[axis]))

  // ⚠️ Pad the range and never let it collapse. Early in a season every club sits at 0
  // and an unpadded range is zero-high, which divides by zero and stacks every line on
  // top of the axis.
  let yMin = Math.min(...values, 0)
  let yMax = Math.max(...values, 0)
  if (axis === 'divisionGamesBack') { yMin = 0; yMax = Math.max(yMax, 1) }
  const span = Math.max(1, yMax - yMin)
  const pad = Math.max(1, Math.round(span * 0.12))
  yMin -= pad; yMax += pad

  // ⚠️ The axis spans the whole SCHEDULED season, not just the weeks played. Scaling to
  // the played weeks stretches six games across the full width and redraws every line at
  // a different scale each week, so a fan can never see how far through the season they
  // are. Week 1 sits at the left edge and the final week at the right, all season.
  const lastPlayed = weeks[weeks.length - 1]
  const weekSpan = Math.max(1, totalWeeks - 1)

  const xFor = (w: number) => PAD_LEFT + ((w - 1) / weekSpan) * plotW
  // Games BEHIND counts downward — 0 is the best, so the axis is inverted for it or the
  // leader would sit at the bottom of the chart.
  const yFor = (v: number) => {
    const t = (v - yMin) / (yMax - yMin)
    return axis === 'divisionGamesBack'
      ? PAD_TOP + t * plotH
      : PAD_TOP + (1 - t) * plotH
  }

  const ticks: number[] = []
  const step = Math.max(1, Math.ceil((yMax - yMin) / 6))
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push(v)

  const dimmed = hovered != null

  // ⚠️ TWO KINDS OF OVERLAP, and they need different answers.
  //
  // Coincident LINES: two clubs on the same record trace the same path exactly, and the
  // one drawn second hides the first completely. Each club gets a small deterministic
  // vertical offset, so a shared record reads as a tight bundle of parallel hairlines
  // rather than a single line. Deterministic by team id, so the picture is stable
  // between renders; sub-pixel-ish, so it never misreports a standing.
  //
  // Colliding LABELS: the crest and abbreviation sit at the line's final point, and
  // several clubs finishing level stack them into an unreadable pile. They are pushed
  // apart vertically in a single pass, with a leader line back to the real point.
  const laidOut = useMemo(() => {
    const rows = teams
      .map(team => ({ team, pts: team.series.filter(p => p[axis] != null) }))
      .filter(r => r.pts.length > 0)

    // Offset within a group of clubs sharing this exact final value.
    const byValue = new Map<number, number[]>()
    for (const r of rows) {
      const v = r.pts[r.pts.length - 1][axis]
      byValue.set(v, [...(byValue.get(v) || []), r.team.id])
    }

    const withOffset = rows.map(r => {
      const v = r.pts[r.pts.length - 1][axis]
      const group = (byValue.get(v) || []).slice().sort((a, b) => a - b)
      const idx = group.indexOf(r.team.id)
      const spread = group.length - 1
      const offset = spread === 0 ? 0 : (idx - spread / 2) * LINE_NUDGE
      return { ...r, offset, rawY: yFor(v) + offset }
    })

    // Single downward pass, nearest-first, pushing labels apart by LABEL_MIN_GAP.
    const sorted = withOffset.slice().sort((a, b) => a.rawY - b.rawY)
    let previous = -Infinity
    for (const row of sorted) {
      const y = Math.max(row.rawY, previous + LABEL_MIN_GAP)
      ;(row as { labelY?: number }).labelY = y
      previous = y
    }
    return withOffset.map(r => ({ ...r, labelY: (r as { labelY?: number }).labelY ?? r.rawY }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, axis, yMin, yMax, plotH])

  if (teams.length === 0 || values.length === 0) return null

  return (
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '12px 14px 6px' }}>
      <p style={{ margin: '0 0 6px', ...font(700, 12), letterSpacing: '0.08em', color: TEXT.secondary }}>
        {leagueName.toUpperCase()}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', display: 'block' }}
           role="img" aria-label={`${leagueName} standings over time`}>
        <defs>
          <clipPath id={`crestClip${CREST}`} clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD_LEFT} x2={PAD_LEFT + plotW} y1={yFor(v)} y2={yFor(v)}
                  stroke={v === 0 ? BORDER.raised : BORDER.hairline}
                  strokeWidth={v === 0 ? 1.4 : 1} />
            <text x={PAD_LEFT - 6} y={yFor(v) + 3} textAnchor="end"
                  style={{ ...font(500, 10) }} fill={TEXT.muted}>
              {axis === 'gamesAbove500' && v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}

        {Array.from({ length: totalWeeks }, (_v, i) => i + 1)
          .filter(w => w === 1 || w === totalWeeks || w % Math.max(1, Math.round(totalWeeks / 7)) === 0)
          .map(w => (
            // ⚠️ Every week number stays at TEXT.muted, played or not. TEXT.faint is
            // #475569, which the token file reserves for rules and separators — a week
            // number is readable text. The dashed line below is what marks how far the
            // season has actually got.
            <text key={w} x={xFor(w)} y={HEIGHT - 8} textAnchor="middle"
                  style={{ ...font(500, 10) }} fill={TEXT.muted}>{w}</text>
          ))}
        {/* Where the season has got to, when it is still in progress. */}
        {lastPlayed < totalWeeks && (
          <line x1={xFor(lastPlayed)} x2={xFor(lastPlayed)} y1={PAD_TOP} y2={PAD_TOP + plotH}
                stroke={BORDER.hairline} strokeDasharray="3 3" />
        )}

        {laidOut.map(({ team, pts, offset, labelY }) => {
          const d = pts.map((p, i) =>
            `${i === 0 ? 'M' : 'L'}${xFor(p.week).toFixed(1)},${(yFor(p[axis]) + offset).toFixed(1)}`).join(' ')
          const isYours = favoriteTeamId != null && team.id === favoriteTeamId
          const isHovered = hovered === team.id
          const emphasized = isHovered || (!dimmed && isYours)
          const last = pts[pts.length - 1]
          const endX = xFor(last.week)
          const endY = yFor(last[axis]) + offset
          return (
            <g key={team.id}
               onMouseEnter={() => setHovered(team.id)}
               onMouseLeave={() => setHovered(null)}
               style={{ cursor: 'pointer' }}>
              {/* A wide transparent stroke under the line: a 2px path is nearly
                  impossible to hover with a mouse. */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
              <path d={d} fill="none"
                    stroke={team.color || TEXT.muted}
                    strokeWidth={emphasized ? 3 : 1.8}
                    strokeLinejoin="round" strokeLinecap="round"
                    opacity={dimmed && !isHovered ? 0.18 : isYours || !dimmed ? 1 : 0.75} />
              <circle cx={endX} cy={endY} r={emphasized ? 3.6 : 2.4}
                      fill={team.color || TEXT.muted}
                      opacity={dimmed && !isHovered ? 0.18 : 1} />
              {/* A leader line where the label has been pushed off its own point, so it
                  is still obvious which line it belongs to. */}
              {Math.abs(labelY - endY) > 1.5 && (
                <line x1={endX + 2} y1={endY} x2={endX + 7} y2={labelY}
                      stroke={team.color || TEXT.muted} strokeWidth={1}
                      opacity={dimmed && !isHovered ? 0.15 : 0.5} />
              )}
              <g opacity={dimmed && !isHovered ? 0.2 : 1}>
                {/* ⚠️ Same id guard the Crest component uses. Art exists for 1..32, and
                    an <image> pointing at a missing file renders a broken-image box
                    rather than nothing. */}
                {team.id >= 1 && team.id <= CREST_MAX_ID && (
                  <image href={`/avatars/${team.id}.png`}
                         x={endX + 7} y={labelY - CREST / 2}
                         width={CREST} height={CREST}
                         clipPath={`url(#crestClip${CREST})`} />
                )}
                <text x={endX + 7 + CREST + 3} y={labelY + 3.5}
                      style={{ ...font(emphasized ? 700 : 600, 10) }}
                      fill={emphasized ? TEXT.strong : TEXT.muted}>
                  {team.abbr}
                </text>
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default StandingsGraph
