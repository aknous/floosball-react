import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type Tier = 'MEGA_MARKET' | 'LARGE_MARKET' | 'MID_MARKET' | 'SMALL_MARKET'

interface Patron {
  userId: number
  username: string
  totalContributed: number
}

interface MarketTeam {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  tier: Tier
  tierRank: number
  effectiveFunding: number
  baselineFunding: number
  fanContributions: number
  carriedFunding: number
  fanCount: number
  topPatrons: Patron[]
  tierMovement: number
  record: { wins: number; losses: number }
}

interface MarketsResponse {
  season: number
  teams: MarketTeam[]
}

interface HistoryPoint {
  season: number
  tier: Tier
  tierRank: number
  effectiveFunding: number
}

interface HistoryTeam {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  history: HistoryPoint[]
}

interface HistoryResponse {
  seasons: number[]
  teams: HistoryTeam[]
}

// Time-series chart: every team's tier rank plotted over seasons. Lower rank
// number = higher tier, so we invert the Y-axis so "up = better" feels natural.
const TIER_RANK_LABELS: Record<number, string> = {
  1: 'MEGA',
  2: 'LARGE',
  3: 'MID',
  4: 'SMALL',
}

function TierHistoryChart({
  history, highlightedId, onHighlight,
}: {
  history: HistoryResponse
  highlightedId: number | null
  onHighlight: (teamId: number | null) => void
}) {
  // Chart bounds
  const PAD_LEFT = 44
  const PAD_RIGHT = 12
  const PAD_TOP = 12
  const PAD_BOTTOM = 28
  const WIDTH = 720
  const HEIGHT = 260
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM

  const seasons = history.seasons
  if (seasons.length === 0) {
    return (
      <div style={{ padding: '24px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
        No history yet — trajectories appear once the season rolls over.
      </div>
    )
  }
  const minSeason = seasons[0]
  const maxSeason = seasons[seasons.length - 1]
  const seasonSpan = Math.max(1, maxSeason - minSeason)

  // Y-axis: tier rank 1..4, inverted so rank 1 is at the top
  const rankToY = (rank: number) => PAD_TOP + ((rank - 1) / 3) * plotH
  const seasonToX = (season: number) => PAD_LEFT + ((season - minSeason) / seasonSpan) * plotW

  return (
    <div style={{ overflowX: 'auto' as const }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', minWidth: '560px', height: 'auto', display: 'block' }}
      >
        {/* Horizontal tier bands (subtle bg zones) */}
        {[1, 2, 3, 4].map(r => {
          const tier = TIER_ORDER[r - 1]
          return (
            <rect
              key={r}
              x={PAD_LEFT}
              y={PAD_TOP + ((r - 1) / 4) * plotH}
              width={plotW}
              height={plotH / 4}
              fill={TIER_COLORS[tier]}
              opacity={0.05}
            />
          )
        })}

        {/* Y-axis tier labels */}
        {[1, 2, 3, 4].map(r => (
          <g key={r}>
            <text x={PAD_LEFT - 8} y={rankToY(r) + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
              {TIER_RANK_LABELS[r]}
            </text>
            <line
              x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT}
              y1={rankToY(r)} y2={rankToY(r)}
              stroke="#334155" strokeWidth={0.5} opacity={0.5}
            />
          </g>
        ))}

        {/* X-axis season labels */}
        {seasons.map(s => (
          <text
            key={s}
            x={seasonToX(s)}
            y={HEIGHT - 10}
            fontSize="10"
            fill="#94a3b8"
            textAnchor="middle"
          >
            S{s}
          </text>
        ))}

        {/* Lines */}
        {history.teams.map(team => {
          if (team.history.length === 0) return null
          const points = team.history.map(p => `${seasonToX(p.season)},${rankToY(p.tierRank)}`).join(' ')
          const isHighlighted = highlightedId === team.id
          const dimmed = highlightedId != null && !isHighlighted
          return (
            <g
              key={team.id}
              onMouseEnter={() => onHighlight(team.id)}
              onMouseLeave={() => onHighlight(null)}
              style={{ cursor: 'pointer' }}
            >
              <polyline
                points={points}
                fill="none"
                stroke={team.color || '#64748b'}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={dimmed ? 0.15 : isHighlighted ? 1 : 0.7}
              />
              {team.history.map(p => (
                <circle
                  key={p.season}
                  cx={seasonToX(p.season)}
                  cy={rankToY(p.tierRank)}
                  r={isHighlighted ? 4 : 2.5}
                  fill={team.color || '#64748b'}
                  opacity={dimmed ? 0.15 : 1}
                />
              ))}
              {/* End label on the right edge for highlighted line */}
              {isHighlighted && team.history.length > 0 && (() => {
                const last = team.history[team.history.length - 1]
                return (
                  <text
                    x={seasonToX(last.season) + 6}
                    y={rankToY(last.tierRank) + 4}
                    fontSize="10"
                    fill={team.color || '#64748b'}
                    fontWeight={700}
                  >
                    {team.abbr}
                  </text>
                )
              })()}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Risers & fallers: biggest tier-rank changes over the last 3 seasons
// (or all history if fewer than 3). Negative delta = rank improved (up a tier).
function computeMovers(history: HistoryResponse) {
  const sortedSeasons = history.seasons.slice().sort((a, b) => a - b)
  if (sortedSeasons.length < 2) return { risers: [], fallers: [] }
  const latest = sortedSeasons[sortedSeasons.length - 1]
  const lookback = sortedSeasons.length >= 3 ? sortedSeasons[sortedSeasons.length - 3] : sortedSeasons[0]

  type Mover = { team: HistoryTeam; delta: number; fromTier: Tier; toTier: Tier }
  const movers: Mover[] = []
  for (const team of history.teams) {
    const latestPoint = team.history.find(h => h.season === latest)
    const priorPoint = team.history.find(h => h.season === lookback)
    if (!latestPoint || !priorPoint) continue
    // delta = prior_rank - latest_rank; positive = climbed, negative = dropped
    const delta = priorPoint.tierRank - latestPoint.tierRank
    if (delta === 0) continue
    movers.push({
      team,
      delta,
      fromTier: priorPoint.tier,
      toTier: latestPoint.tier,
    })
  }
  const risers = movers.filter(m => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3)
  const fallers = movers.filter(m => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)
  return { risers, fallers }
}

function MoverCard({
  team, delta, fromTier, toTier, kind,
}: {
  team: HistoryTeam
  delta: number
  fromTier: Tier
  toTier: Tier
  kind: 'riser' | 'faller'
}) {
  const color = kind === 'riser' ? '#22c55e' : '#ef4444'
  const arrow = kind === 'riser' ? '▲' : '▼'
  return (
    <Link to={`/team/${team.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', backgroundColor: '#1e293b',
        border: `1px solid ${color}40`, borderRadius: '6px',
        textDecoration: 'none', color: '#e2e8f0',
      }}>
      <span style={{ color, fontSize: '12px', fontWeight: 800, minWidth: '28px' }}>
        {arrow} {Math.abs(delta)}
      </span>
      <img
        src={`/avatars/${team.id}.png`}
        alt={team.abbr}
        style={{ width: '24px', height: '24px', flexShrink: 0 }}
      />
      <span style={{ fontSize: '12px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
        {team.city} {team.name}
      </span>
      <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' as const }}>
        {TIER_RANK_LABELS[TIER_ORDER.indexOf(fromTier) + 1]} → {TIER_RANK_LABELS[TIER_ORDER.indexOf(toTier) + 1]}
      </span>
    </Link>
  )
}

const TIER_LABELS: Record<Tier, string> = {
  MEGA_MARKET: 'Mega Market',
  LARGE_MARKET: 'Large Market',
  MID_MARKET: 'Mid Market',
  SMALL_MARKET: 'Small Market',
}

const TIER_COLORS: Record<Tier, string> = {
  MEGA_MARKET: '#a78bfa',
  LARGE_MARKET: '#3b82f6',
  MID_MARKET: '#94a3b8',
  SMALL_MARKET: '#64748b',
}

const TIER_ORDER: Tier[] = ['MEGA_MARKET', 'LARGE_MARKET', 'MID_MARKET', 'SMALL_MARKET']

// Short, punchy explanations of what a tier buys you in the sim. Surfaces on
// the tier header so a user hitting the page for the first time learns the
// stakes without digging elsewhere.
const TIER_EFFECTS: Record<Tier, string> = {
  MEGA_MARKET: 'Top player development, 75% fatigue reduction, +confidence/determination',
  LARGE_MARKET: 'Solid player development, 35% fatigue reduction, small morale boost',
  MID_MARKET: 'No bonuses, no penalties — the league baseline',
  SMALL_MARKET: 'Reduced player development, +20% fatigue, morale penalty',
}

function MovementArrow({ movement }: { movement: number }) {
  if (movement === 0) return null
  const color = movement > 0 ? '#22c55e' : '#ef4444'
  return (
    <span title={movement > 0 ? `Climbed ${movement} tier${movement > 1 ? 's' : ''}` : `Dropped ${Math.abs(movement)} tier${Math.abs(movement) > 1 ? 's' : ''}`}
      style={{ color, fontSize: '11px', fontWeight: 700 }}>
      {movement > 0 ? '▲' : '▼'} {Math.abs(movement)}
    </span>
  )
}

function TeamRow({ team, isFavorite }: { team: MarketTeam; isFavorite: boolean }) {
  const isMobile = useIsMobile()
  const tierColor = TIER_COLORS[team.tier]
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1.5fr) 130px 1fr',
      gap: '12px',
      alignItems: 'center',
      padding: '12px 14px',
      backgroundColor: isFavorite ? `${team.color}15` : '#1e293b',
      border: `1px solid ${isFavorite ? team.color : '#334155'}`,
      borderRadius: '6px',
    }}>
      {/* Team block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <img
          src={`/avatars/${team.id}.png`}
          alt={team.abbr}
          style={{ width: '32px', height: '32px', flexShrink: 0 }}
        />
        <Link to={`/team/${team.id}`}
          style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.city} {team.name}
        </Link>
        <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>
          {team.record.wins}–{team.record.losses}
        </span>
        <MovementArrow movement={team.tierMovement} />
      </div>

      {/* Funding block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' as const }}>
          {team.effectiveFunding.toLocaleString()} F
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          {team.baselineFunding} base · {team.fanContributions} fans · {team.carriedFunding} carry
        </div>
      </div>

      {/* Patrons block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
          {team.fanCount} contributor{team.fanCount !== 1 ? 's' : ''}
        </div>
        {team.topPatrons.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>No patrons yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {team.topPatrons.slice(0, 3).map((p, i) => (
              <div key={p.userId} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i === 0 && (
                    <span style={{ color: tierColor, marginRight: '4px' }}>★</span>
                  )}
                  {p.username}
                </span>
                <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' as const, flexShrink: 0 }}>
                  {p.totalContributed.toLocaleString()} F
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TierGroup({ tier, teams, favoriteTeamId }: { tier: Tier; teams: MarketTeam[]; favoriteTeamId: number | null }) {
  if (teams.length === 0) return null
  const color = TIER_COLORS[tier]
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '10px 14px', marginBottom: '8px',
        backgroundColor: `${color}10`, borderLeft: `3px solid ${color}`, borderRadius: '4px',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
            {TIER_LABELS[tier]}
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginLeft: '10px' }}>
              {teams.length} team{teams.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {TIER_EFFECTS[tier]}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {teams.map(team => (
          <TeamRow key={team.id} team={team} isFavorite={team.id === favoriteTeamId} />
        ))}
      </div>
    </div>
  )
}

export default function MarketsSection() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [data, setData] = useState<MarketsResponse | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [highlightedTeamId, setHighlightedTeamId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/league/markets`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/league/markets/history`).then(r => r.json()).catch(() => null),
    ]).then(([markets, hist]) => {
      if (cancelled) return
      if (markets?.success && markets.data) setData(markets.data as MarketsResponse)
      if (hist?.success && hist.data) setHistory(hist.data as HistoryResponse)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Biggest risers / fallers across last 3 seasons (or all available)
  const movers = useMemo(() => {
    if (!history) return { risers: [], fallers: [] }
    return computeMovers(history)
  }, [history])

  // Group by tier while preserving the server's rank ordering
  const byTier = useMemo(() => {
    const groups: Record<Tier, MarketTeam[]> = {
      MEGA_MARKET: [], LARGE_MARKET: [], MID_MARKET: [], SMALL_MARKET: [],
    }
    if (data) {
      for (const t of data.teams) groups[t.tier].push(t)
    }
    return groups
  }, [data])

  // League-wide summary chips
  const summary = useMemo(() => {
    if (!data) return null
    const totalFunding = data.teams.reduce((acc, t) => acc + t.effectiveFunding, 0)
    const totalFans = data.teams.reduce((acc, t) => acc + t.fanCount, 0)
    const topFunded = data.teams.slice().sort((a, b) => b.effectiveFunding - a.effectiveFunding)[0]
    return {
      totalFunding,
      totalFans,
      avgPerTeam: Math.round(totalFunding / Math.max(1, data.teams.length)),
      topFunded,
    }
  }, [data])

  if (loading) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center' }}>Loading markets…</div>
  }
  if (!data) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center' }}>Markets data unavailable.</div>
  }

  const favoriteTeamId = user?.favoriteTeamId ?? null

  return (
    <div>
      <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
        Tier rankings, fan contributions, and top patrons across the league.
        Market tiers are relative — teams ranked by effective funding and split into quartiles each season.
      </div>

      {/* Summary row */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '10px', marginBottom: '20px',
        }}>
          <StatChip label="Total league funding" value={`${summary.totalFunding.toLocaleString()} F`} />
          <StatChip label="Contributing fans" value={`${summary.totalFans.toLocaleString()}`} />
          <StatChip label="Avg per team" value={`${summary.avgPerTeam.toLocaleString()} F`} />
          {summary.topFunded && (
            <StatChip label="Top-funded team" value={`${summary.topFunded.city} ${summary.topFunded.name}`} />
          )}
        </div>
      )}

      {/* Risers & Fallers — tier movers over last 3 seasons */}
      {(movers.risers.length > 0 || movers.fallers.length > 0) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '10px', marginBottom: '20px',
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>
              Risers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {movers.risers.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                  No tier climbs in the last 3 seasons
                </div>
              ) : (
                movers.risers.map(m => (
                  <MoverCard key={m.team.id} team={m.team} delta={m.delta} fromTier={m.fromTier} toTier={m.toTier} kind="riser" />
                ))
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>
              Fallers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {movers.fallers.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                  No tier drops in the last 3 seasons
                </div>
              ) : (
                movers.fallers.map(m => (
                  <MoverCard key={m.team.id} team={m.team} delta={m.delta} fromTier={m.fromTier} toTier={m.toTier} kind="faller" />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tier trajectory chart */}
      {history && history.seasons.length > 0 && (
        <div style={{
          backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px',
          padding: '12px 14px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              Tier Trajectory
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              Hover a line to highlight · higher = better tier
            </div>
          </div>
          <TierHistoryChart
            history={history}
            highlightedId={highlightedTeamId}
            onHighlight={setHighlightedTeamId}
          />
        </div>
      )}

      {/* Tier groups */}
      {TIER_ORDER.map(tier => (
        <TierGroup key={tier} tier={tier} teams={byTier[tier]} favoriteTeamId={favoriteTeamId} />
      ))}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '10px 14px',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '6px',
    }}>
      <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
        {value}
      </div>
    </div>
  )
}
