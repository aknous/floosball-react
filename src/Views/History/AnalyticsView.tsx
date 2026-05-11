import React, { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface TeamMeta {
  teamId: number
  name: string
  abbr: string
  color: string | null
}

interface TeamSeasonRow {
  teamId: number
  name: string
  abbr: string
  color: string | null
  elo: number | null
  winPct: number | null
  wins: number
  losses: number
}

interface TeamTrendsResponse {
  seasons: { season: number; teams: TeamSeasonRow[] }[]
  teams: TeamMeta[]
}

interface LeagueScoringRow {
  season: number
  games: number
  totalPoints: number
  avgCombined: number
  avgPerTeam: number
}

interface SeasonLeaderEntry {
  playerId: number
  playerName: string
  teamAbbr: string | null
  teamColor: string | null
  value: number
}

interface SeasonLeadersResponse {
  season: number
  leaders: Record<string, SeasonLeaderEntry[]>
  labels: Record<string, string>
}

type TrendMetric = 'elo' | 'winPct'

const AnalyticsView: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <TeamTrendChart isMobile={isMobile} />
      <LeagueScoringChart isMobile={isMobile} />
      <SeasonLeadersChart isMobile={isMobile} />
    </div>
  )
}

// ─── Team trend chart ──────────────────────────────────────────────────────

const TeamTrendChart: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const [data, setData] = useState<TeamTrendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<TrendMetric>('elo')
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/history/team-trends`)
      .then(r => r.json())
      .then(j => {
        const payload: TeamTrendsResponse = j?.data || j
        setData(payload)
        // Default to the four teams with the most recent activity
        if (payload?.seasons?.length) {
          const latest = payload.seasons[payload.seasons.length - 1].teams
          const sorted = [...latest].sort((a, b) =>
            metric === 'elo'
              ? (b.elo ?? 0) - (a.elo ?? 0)
              : (b.winPct ?? 0) - (a.winPct ?? 0)
          )
          setSelectedTeamIds(new Set(sorted.slice(0, 4).map(t => t.teamId)))
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reshape into chart-friendly rows: one per season, with team_<id> keys.
  const chartData = useMemo(() => {
    if (!data) return [] as Record<string, number | null>[]
    return data.seasons.map(s => {
      const row: Record<string, number | null> = { season: s.season }
      for (const t of s.teams) {
        if (!selectedTeamIds.has(t.teamId)) continue
        const val = metric === 'elo' ? t.elo : (t.winPct ?? null)
        row[`team_${t.teamId}`] = val
      }
      return row
    })
  }, [data, selectedTeamIds, metric])

  if (loading) return <ChartCard title="Team Trend"><div style={{ color: '#94a3b8', padding: '16px' }}>Loading…</div></ChartCard>
  if (!data || data.seasons.length === 0) {
    return <ChartCard title="Team Trend"><div style={{ color: '#94a3b8', padding: '16px', fontStyle: 'italic' }}>No completed seasons yet.</div></ChartCard>
  }

  const toggleTeam = (teamId: number) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  return (
    <ChartCard
      title="Team Trend"
      headerRight={
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['elo', 'winPct'] as TrendMetric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                borderRadius: '4px', border: 'none', cursor: 'pointer',
                backgroundColor: metric === m ? '#0f172a' : 'transparent',
                color: metric === m ? '#e2e8f0' : '#64748b',
                fontFamily: 'inherit',
              }}
            >
              {m === 'elo' ? 'ELO' : 'Win %'}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 180px', gap: '12px', padding: '12px' }}>
        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
              <XAxis
                dataKey="season"
                stroke="#64748b"
                tickFormatter={v => `S${v}`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={metric === 'elo' ? ['auto', 'auto'] : [0, 1]}
                tickFormatter={v => metric === 'winPct' ? `${Math.round(v * 100)}%` : `${v}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px' }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#cbd5e1' }}
                labelFormatter={v => `Season ${v}`}
                formatter={(value: any, name: any) => {
                  const teamId = parseInt(String(name).replace('team_', ''), 10)
                  const team = data.teams.find(t => t.teamId === teamId)
                  const label = team ? team.abbr : name
                  const formatted = metric === 'winPct' && typeof value === 'number'
                    ? `${(value * 100).toFixed(1)}%`
                    : value
                  return [formatted, label]
                }}
              />
              {[...selectedTeamIds].map(teamId => {
                const team = data.teams.find(t => t.teamId === teamId)
                if (!team) return null
                return (
                  <Line
                    key={teamId}
                    type="monotone"
                    dataKey={`team_${teamId}`}
                    stroke={team.color ?? '#94a3b8'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{
          maxHeight: '320px', overflowY: 'auto',
          backgroundColor: '#0f172a', borderRadius: '6px', padding: '6px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 6px' }}>
            Teams
          </div>
          {data.teams.map(t => {
            const active = selectedTeamIds.has(t.teamId)
            return (
              <button
                key={t.teamId}
                onClick={() => toggleTeam(t.teamId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  width: '100%', padding: '4px 6px',
                  backgroundColor: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left' as const,
                }}
              >
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: active ? (t.color ?? '#94a3b8') : 'transparent',
                  border: `1px solid ${t.color ?? '#94a3b8'}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '11px',
                  color: active ? '#e2e8f0' : '#64748b',
                  fontWeight: active ? 600 : 400,
                }}>
                  {t.abbr} · {t.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}

// ─── League scoring chart ──────────────────────────────────────────────────

const LeagueScoringChart: React.FC<{ isMobile: boolean }> = ({ isMobile: _isMobile }) => {
  const [data, setData] = useState<LeagueScoringRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/history/league-scoring`)
      .then(r => r.json())
      .then(j => setData(j?.data?.seasons || j?.seasons || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <ChartCard title="League Scoring Trend"><div style={{ color: '#94a3b8', padding: '16px' }}>Loading…</div></ChartCard>
  if (data.length === 0) {
    return <ChartCard title="League Scoring Trend"><div style={{ color: '#94a3b8', padding: '16px', fontStyle: 'italic' }}>No completed seasons yet.</div></ChartCard>
  }

  return (
    <ChartCard title="League Scoring Trend" subtitle="Average team points per game across regular-season games">
      <div style={{ height: '280px', padding: '12px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
            <XAxis
              dataKey="season"
              stroke="#64748b"
              tickFormatter={v => `S${v}`}
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px' }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#cbd5e1' }}
              labelFormatter={v => `Season ${v}`}
              formatter={(value: any, name: any) => {
                const label = name === 'avgPerTeam' ? 'Avg per team' : name === 'avgCombined' ? 'Avg combined' : name
                return [value, label]
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
            <Line type="monotone" dataKey="avgPerTeam" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} name="Avg per team" />
            <Line type="monotone" dataKey="avgCombined" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} name="Avg combined" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

// ─── In-season player leaders chart ────────────────────────────────────────

const SeasonLeadersChart: React.FC<{ isMobile: boolean }> = ({ isMobile: _isMobile }) => {
  const [data, setData] = useState<SeasonLeadersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statKey, setStatKey] = useState<string>('fantasyPoints')

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/history/season-leaders?limit=15`)
      .then(r => r.json())
      .then(j => setData(j?.data || j))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    return (data.leaders[statKey] ?? []).map(e => ({
      name: e.playerName,
      value: e.value,
      color: e.teamColor ?? '#60a5fa',
      teamAbbr: e.teamAbbr,
    }))
  }, [data, statKey])

  if (loading) return <ChartCard title="Season Leaders"><div style={{ color: '#94a3b8', padding: '16px' }}>Loading…</div></ChartCard>
  if (!data) return <ChartCard title="Season Leaders"><div style={{ color: '#94a3b8', padding: '16px' }}>No data.</div></ChartCard>

  const statKeys = Object.keys(data.labels)

  return (
    <ChartCard
      title={`Season ${data.season} Leaders`}
      subtitle="Top 15 players in the current season"
      headerRight={
        <select
          value={statKey}
          onChange={e => setStatKey(e.target.value)}
          style={{
            padding: '4px 10px', fontSize: '11px', fontWeight: 600,
            borderRadius: '4px',
            backgroundColor: '#0f172a', color: '#e2e8f0',
            border: '1px solid #334155',
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {statKeys.map(k => (
            <option key={k} value={k}>{data.labels[k]}</option>
          ))}
        </select>
      }
    >
      <div style={{ height: `${Math.max(280, chartData.length * 22 + 40)}px`, padding: '12px' }}>
        {chartData.length === 0 ? (
          <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No data for this stat yet this season.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#cbd5e1' }}
                width={140}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px' }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#cbd5e1' }}
                formatter={(value: any) => [value.toLocaleString(), data.labels[statKey] || statKey]}
              />
              <Bar dataKey="value" isAnimationActive={false}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  )
}

// ─── Shared card shell ─────────────────────────────────────────────────────

const ChartCard: React.FC<{
  title: string
  subtitle?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}> = ({ title, subtitle, headerRight, children }) => (
  <div style={{
    backgroundColor: '#1e293b', borderRadius: '8px',
    border: '1px solid #334155', overflow: 'hidden',
  }}>
    <div style={{
      padding: '10px 14px', borderBottom: '1px solid #334155',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '8px',
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>
        )}
      </div>
      {headerRight}
    </div>
    {children}
  </div>
)

export default AnalyticsView
