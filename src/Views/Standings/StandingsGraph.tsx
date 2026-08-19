import React, { useMemo, useState } from 'react'
import { BG, BORDER, TEXT, ACCENT, font } from '@/Components/Shell/tokens'
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
const PAD_RIGHT = 58     // room for the club label that sits at the end of its own line
const PAD_TOP = 14
const PAD_BOTTOM = 26
const HEIGHT = 320

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
  axis: Axis
  favoriteTeamId: number | null
  hovered: number | null
  setHovered: (id: number | null) => void
  compact?: boolean
}> = ({ leagueName, teams, weeks, axis, favoriteTeamId, hovered, setHovered, compact }) => {
  const WIDTH = compact ? 360 : 760
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM

  if (teams.length === 0) return null

  const values = teams.flatMap(t => t.series.map(p => p[axis]))
  if (values.length === 0) return null

  // ⚠️ Pad the range and never let it collapse. Early in a season every club sits at 0
  // and an unpadded range is zero-high, which divides by zero and stacks every line on
  // top of the axis.
  let yMin = Math.min(...values, 0)
  let yMax = Math.max(...values, 0)
  if (axis === 'divisionGamesBack') { yMin = 0; yMax = Math.max(yMax, 1) }
  const span = Math.max(1, yMax - yMin)
  const pad = Math.max(1, Math.round(span * 0.12))
  yMin -= pad; yMax += pad

  const firstWeek = weeks[0]
  const lastWeek = weeks[weeks.length - 1]
  const weekSpan = Math.max(1, lastWeek - firstWeek)

  const xFor = (w: number) => PAD_LEFT + ((w - firstWeek) / weekSpan) * plotW
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

  return (
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '12px 14px 6px' }}>
      <p style={{ margin: '0 0 6px', ...font(700, 12), letterSpacing: '0.08em', color: TEXT.secondary }}>
        {leagueName.toUpperCase()}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', display: 'block' }}
           role="img" aria-label={`${leagueName} standings over time`}>
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

        {weeks.filter((_w, i) => i % Math.ceil(weeks.length / 8) === 0).map(w => (
          <text key={w} x={xFor(w)} y={HEIGHT - 8} textAnchor="middle"
                style={{ ...font(500, 10) }} fill={TEXT.muted}>{w}</text>
        ))}

        {teams.map(team => {
          const pts = team.series.filter(p => p[axis] != null)
          if (pts.length === 0) return null
          const d = pts.map((p, i) =>
            `${i === 0 ? 'M' : 'L'}${xFor(p.week).toFixed(1)},${yFor(p[axis]).toFixed(1)}`).join(' ')
          const isYours = favoriteTeamId != null && team.id === favoriteTeamId
          const isHovered = hovered === team.id
          const emphasized = isHovered || (!dimmed && isYours)
          const last = pts[pts.length - 1]
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
              <circle cx={xFor(last.week)} cy={yFor(last[axis])} r={emphasized ? 3.6 : 2.4}
                      fill={team.color || TEXT.muted}
                      opacity={dimmed && !isHovered ? 0.18 : 1} />
              <text x={xFor(last.week) + 7} y={yFor(last[axis]) + 3.5}
                    style={{ ...font(emphasized ? 700 : 600, 10) }}
                    fill={emphasized ? TEXT.strong : TEXT.muted}
                    opacity={dimmed && !isHovered ? 0.2 : 1}>
                {team.abbr}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default StandingsGraph
