import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import HoverTooltip from '@/Components/HoverTooltip'

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
  fanCount: number
  totalFans: number
  topPatrons: Patron[]
  tierMovement: number
  projectedTier: Tier
  projectedFunding: number
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

// Short tier labels for compact chart cells
const TIER_SHORT_LABELS: Record<Tier, string> = {
  MEGA_MARKET: 'MEGA',
  LARGE_MARKET: 'LARGE',
  MID_MARKET: 'MID',
  SMALL_MARKET: 'SMALL',
}

const TIER_RANK: Record<Tier, number> = {
  MEGA_MARKET: 1, LARGE_MARKET: 2, MID_MARKET: 3, SMALL_MARKET: 4,
}

// Snapshot chart: every team as a horizontal line in their primary color,
// sorted by current funding. Tier boundaries run as dotted verticals across
// the whole chart, so the tier a team sits in is immediately readable from
// where its line terminates. Projected tier shown as an arrow + short badge
// at the right, only when next-season would move to a different tier.
function FundingSnapshotChart({
  teams, favoriteTeamId,
}: {
  teams: MarketTeam[]
  favoriteTeamId: number | null
}) {
  const sorted = useMemo(
    () => teams.slice().sort((a, b) => b.effectiveFunding - a.effectiveFunding),
    [teams]
  )
  if (sorted.length === 0) {
    return (
      <div style={{ padding: '24px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
        No funding data yet.
      </div>
    )
  }

  // Plot each team's position in ratio space — share of league's fair-share.
  // Thresholds mirror constants.FUNDING_TIER_THRESHOLDS — keep in sync.
  const MID_RATIO = 0.85
  const LARGE_RATIO = 1.15
  const MEGA_RATIO = 2.0

  // Filled dot = this season's LOCKED position, frozen at season start.
  // season_start_funding = baseline + carried_funding = effective - fan_contribs.
  // This doesn't change mid-season, so the filled dot stays put even as fans
  // contribute (their contributions only affect projection, not current tier).
  const seasonStartFunding = (t: MarketTeam) => t.effectiveFunding - t.fanContributions
  const totalSeasonStart = sorted.reduce((acc, t) => acc + seasonStartFunding(t), 0)
  const startFairShare = sorted.length > 0 ? totalSeasonStart / sorted.length : 1

  // Arrow = next season's projected position, recomputed live as
  // contributions roll in. Uses the projected fair-share so the arrow lands
  // in the projected-tier zone matching the backend's badge.
  const totalProj = sorted.reduce((acc, t) => acc + (t.projectedFunding || t.effectiveFunding), 0)
  const projFairShare = sorted.length > 0 ? totalProj / sorted.length : 1

  const currentRatio = (t: MarketTeam) => seasonStartFunding(t) / Math.max(1, startFairShare)
  const projRatio = (t: MarketTeam) =>
    (t.projectedFunding || t.effectiveFunding) / Math.max(1, projFairShare)

  // X-axis in ratio space: fit the widest line (current or projected) across
  // all teams plus some headroom past the MEGA threshold so that band is
  // always visible even when no team qualifies.
  const maxRatio = Math.max(
    ...sorted.flatMap(t => [currentRatio(t), projRatio(t)]),
    MEGA_RATIO * 1.1,
  )
  const pctOf = (ratio: number) => Math.min(100, Math.max(0, (ratio / maxRatio) * 100))

  const midPct = pctOf(MID_RATIO)
  const largePct = pctOf(LARGE_RATIO)
  const megaPct = pctOf(MEGA_RATIO)

  const ROW_H = 26

  // Render tier-band labels across the bar column once at the top, so each
  // row below just has boundaries and the team line. Each label sits centered
  // over its tier zone.
  const tierLabelBand = (
    <div style={{ position: 'relative' as const, height: '26px' }}>
      {([
        { label: 'SMALL', tier: 'SMALL_MARKET' as Tier, from: 0, to: midPct },
        { label: 'MID', tier: 'MID_MARKET' as Tier, from: midPct, to: largePct },
        { label: 'LARGE', tier: 'LARGE_MARKET' as Tier, from: largePct, to: megaPct },
        { label: 'MEGA', tier: 'MEGA_MARKET' as Tier, from: megaPct, to: 100 },
      ] as const).map(zone => {
        const color = TIER_COLORS[zone.tier]
        return (
          <div
            key={zone.label}
            style={{
              position: 'absolute' as const,
              left: `${zone.from}%`,
              width: `${zone.to - zone.from}%`,
              top: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color,
              padding: '3px 10px',
              borderRadius: '4px',
              backgroundColor: `${color}1A`,
              border: `1px solid ${color}55`,
              whiteSpace: 'nowrap' as const,
            }}>
              {zone.label}
            </span>
          </div>
        )
      })}
    </div>
  )

  // Single rendered set of vertical tier boundary lines — absolutely
  // positioned, spanning all rows. Lives inside the rows container so it
  // lines up with each row's bar cell via the shared grid.
  const verticalBoundaries = (
    <>
      {[midPct, largePct, megaPct].map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute' as const,
            left: `${p}%`,
            top: 0,
            bottom: 0,
            borderLeft: '1px dashed #475569',
            pointerEvents: 'none' as const,
          }}
        />
      ))}
    </>
  )

  return (
    <div style={{ width: '100%' }}>
      {/* Header: tier-band labels spanning the full bar width */}
      <div style={{ padding: '0 10px', marginBottom: '8px' }}>
        {tierLabelBand}
      </div>

      {/* Team rows. Each row has its own bar cell that holds the team's line
          plus a shared set of dotted tier boundaries, so the verticals look
          continuous down the chart. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {sorted.map(team => {
          const pct = pctOf(currentRatio(team))
          const projPct = pctOf(projRatio(team))
          const projectedColor = TIER_COLORS[team.projectedTier]
          const tierDelta = TIER_RANK[team.tier] - TIER_RANK[team.projectedTier]
          const isFav = team.id === favoriteTeamId
          const seasonStart = seasonStartFunding(team)
          const projFundingVal = team.projectedFunding || team.effectiveFunding
          const fundingDelta = projFundingVal - seasonStart

          const currentTooltip = (
            <div style={{ textAlign: 'left' as const, fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: team.color, marginBottom: '4px' }}>
                {team.city} {team.name}
              </div>
              <div style={{ color: '#94a3b8' }}>This Season</div>
              <div>
                Tier:{' '}
                <strong style={{ color: TIER_COLORS[team.tier] }}>
                  {TIER_LABELS[team.tier]}
                </strong>
              </div>
              <div>Season-start funding: <strong>{seasonStart.toLocaleString()}F</strong></div>
              <div>Fan contributions: <strong style={{ color: '#fbbf24' }}>{team.fanContributions.toLocaleString()}F</strong></div>
              <div>Effective now: <strong>{team.effectiveFunding.toLocaleString()}F</strong></div>
            </div>
          )

          const projectedTooltip = (
            <div style={{ textAlign: 'left' as const, fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: team.color, marginBottom: '4px' }}>
                {team.city} {team.name}
              </div>
              <div style={{ color: '#94a3b8' }}>Projected Next Season</div>
              <div>
                Tier:{' '}
                <strong style={{ color: projectedColor }}>
                  {TIER_LABELS[team.projectedTier]}
                </strong>
                {tierDelta !== 0 && (
                  <span style={{ marginLeft: '6px', color: tierDelta > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                    {tierDelta > 0 ? '▲ climbing' : '▼ slipping'}
                  </span>
                )}
              </div>
              <div>Projected funding: <strong>{projFundingVal.toLocaleString()}F</strong></div>
              <div style={{ color: fundingDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                {fundingDelta >= 0 ? '+' : ''}{fundingDelta.toLocaleString()}F vs. season start
              </div>
            </div>
          )

          return (
            <Link
              key={team.id}
              to={`/team/${team.id}`}
              style={{
                display: 'block',
                padding: '3px 10px',
                backgroundColor: isFav ? `${team.color}15` : 'transparent',
                border: `1px solid ${isFav ? team.color : 'transparent'}`,
                borderRadius: '3px',
                textDecoration: 'none',
              }}
            >
              {/* Full-width bar cell. The team's identity (avatar + abbr)
                  acts as the current-position marker. The projection shows
                  as an arrow whose TIP lands at the projected position and
                  whose body points back toward the team — the shape itself
                  says "moving this way," so at first glance there's no
                  ambiguity about which end is current vs projected. */}
              <div style={{ position: 'relative' as const, height: `${ROW_H}px` }}>
                {verticalBoundaries}
                {/* Connector between current (avatar center) and projection */}
                {Math.abs(projPct - pct) > 0.4 && (
                  <div style={{
                    position: 'absolute' as const,
                    left: `${Math.min(pct, projPct)}%`,
                    top: 'calc(50% - 1px)',
                    height: '2px',
                    width: `${Math.abs(projPct - pct)}%`,
                    backgroundColor: team.color,
                    opacity: 0.5,
                    borderRadius: '1px',
                    transition: 'all 0.3s ease',
                    pointerEvents: 'none' as const,
                  }} />
                )}
                {/* Projection endpoint — arrow pointing in direction of travel */}
                {Math.abs(projPct - pct) > 0.4 && (() => {
                  const climbing = projPct > pct
                  return (
                    <div style={{
                      position: 'absolute' as const,
                      left: `${projPct}%`,
                      top: 'calc(50% - 6px)',
                      marginLeft: climbing ? '-12px' : '0',
                      width: '12px',
                      height: '12px',
                      zIndex: 2,
                    }}>
                      <HoverTooltip content={projectedTooltip} color={team.color}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          style={{ display: 'block' }}
                          onClick={e => e.preventDefault()}
                        >
                          {climbing ? (
                            <path d="M 0 1 L 11 6 L 0 11 Z" fill={team.color} />
                          ) : (
                            <path d="M 12 1 L 1 6 L 12 11 Z" fill={team.color} />
                          )}
                        </svg>
                      </HoverTooltip>
                    </div>
                  )
                })()}
                {/* Current-position marker: team avatar + abbr chip, replaces
                    the filled dot. Centered on the `pct` x-position. */}
                <div style={{
                  position: 'absolute' as const,
                  left: `${pct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                }}>
                  <HoverTooltip content={currentTooltip} color={team.color}>
                    <span
                      onClick={e => e.preventDefault()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 7px 2px 3px',
                        borderRadius: '12px',
                        backgroundColor: '#0f172a',
                        border: `1.5px solid ${team.color}`,
                        boxShadow: `0 0 0 2px #0f172a`,
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      <img
                        src={`/avatars/${team.id}.png`}
                        alt={team.abbr}
                        style={{ width: '18px', height: '18px', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>
                        {team.abbr}
                      </span>
                    </span>
                  </HoverTooltip>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
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
      <span style={{ color, fontSize: '14px', fontWeight: 800, minWidth: '32px' }}>
        {arrow} {Math.abs(delta)}
      </span>
      <img
        src={`/avatars/${team.id}.png`}
        alt={team.abbr}
        style={{ width: '28px', height: '28px', flexShrink: 0 }}
      />
      <span style={{ fontSize: '14px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
        {team.city} {team.name}
      </span>
      <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto', whiteSpace: 'nowrap' as const }}>
        {TIER_SHORT_LABELS[fromTier]} → {TIER_SHORT_LABELS[toTier]}
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
  MID_MARKET: '#2dd4bf',
  SMALL_MARKET: '#64748b',
}

const TIER_ORDER: Tier[] = ['MEGA_MARKET', 'LARGE_MARKET', 'MID_MARKET', 'SMALL_MARKET']

// Short, punchy explanations of what a tier buys you in the sim. Surfaces on
// the tier header so a user hitting the page for the first time learns the
// stakes without digging elsewhere.
// Fan count chart — each team's contributing fans + silent fans as a
// stacked horizontal bar. Solid fill = users who've actually contributed
// floobits this season; ghost fill extends to total fans (users with this
// team set as favorite). Sorted by total fans descending.
function FanCountChart({
  teams, favoriteTeamId,
}: {
  teams: MarketTeam[]
  favoriteTeamId: number | null
}) {
  const sorted = useMemo(
    () => teams.slice().sort((a, b) => (b.totalFans - a.totalFans) || (b.fanCount - a.fanCount)),
    [teams]
  )
  if (sorted.length === 0) {
    return (
      <div style={{ padding: '24px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
        No fan data yet.
      </div>
    )
  }
  const maxFans = Math.max(1, ...sorted.map(t => t.totalFans))
  const pctOf = (v: number) => Math.min(100, Math.max(0, (v / maxFans) * 100))

  const ROW_H = 26
  const ABBR_COL = 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {sorted.map(team => {
        const isFav = team.id === favoriteTeamId
        const totalPct = pctOf(team.totalFans)
        const contribPct = pctOf(team.fanCount)
        const silent = Math.max(0, team.totalFans - team.fanCount)

        const tooltip = (
          <div style={{ textAlign: 'left' as const, fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: team.color, marginBottom: '4px' }}>
              {team.city} {team.name}
            </div>
            <div>Total fans: <strong>{team.totalFans.toLocaleString()}</strong></div>
            <div>Contributing this season: <strong style={{ color: '#fbbf24' }}>{team.fanCount.toLocaleString()}</strong></div>
            <div>Silent: <strong style={{ color: '#94a3b8' }}>{silent.toLocaleString()}</strong></div>
          </div>
        )

        return (
          <Link
            key={team.id}
            to={`/team/${team.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `${ABBR_COL}px 1fr 80px`,
              gap: '10px',
              alignItems: 'center',
              padding: '3px 10px',
              backgroundColor: isFav ? `${team.color}15` : 'transparent',
              border: `1px solid ${isFav ? team.color : 'transparent'}`,
              borderRadius: '3px',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <img src={`/avatars/${team.id}.png`} alt={team.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{team.abbr}</span>
            </div>
            <div style={{ position: 'relative' as const, height: `${ROW_H}px` }}>
              <HoverTooltip content={tooltip} color={team.color}>
                <span
                  onClick={e => e.preventDefault()}
                  style={{ display: 'block', position: 'relative' as const, width: '100%', height: '100%' }}
                >
                  {/* Silent fans (ghost) — total fans */}
                  <span style={{
                    position: 'absolute' as const,
                    left: 0, top: 'calc(50% - 6px)', height: '12px',
                    width: `${totalPct}%`,
                    backgroundColor: team.color,
                    opacity: 0.25,
                    borderRadius: '2px',
                    display: 'block',
                  }} />
                  {/* Contributing fans — solid overlay */}
                  <span style={{
                    position: 'absolute' as const,
                    left: 0, top: 'calc(50% - 6px)', height: '12px',
                    width: `${contribPct}%`,
                    backgroundColor: team.color,
                    opacity: 0.9,
                    borderRadius: '2px',
                    display: 'block',
                  }} />
                </span>
              </HoverTooltip>
            </div>
            <span style={{
              fontSize: '12px', color: '#cbd5e1',
              fontVariantNumeric: 'tabular-nums' as const,
              textAlign: 'right' as const, fontWeight: 600,
            }}>
              <span style={{ color: '#fbbf24' }}>{team.fanCount}</span>
              <span style={{ color: '#94a3b8' }}> / {team.totalFans}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default function MarketsSection() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [data, setData] = useState<MarketsResponse | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartTab, setChartTab] = useState<'funding' | 'fans'>('funding')

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
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>
        How each team stacks up by fan-backed funding. Tiers reset every season based on each team's share of the league's total funding.
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
            <StatChip
              label="Top-funded team"
              value={`${summary.topFunded.city} ${summary.topFunded.name}`}
              avatarTeamId={summary.topFunded.id}
            />
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
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
              Risers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {movers.risers.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
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
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
              Fallers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {movers.fallers.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
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

      {/* Chart area with tabs — Funding (dumbbell) and Fans (stacked) views */}
      <div style={{
        backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px',
        padding: '12px 14px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid #1e293b' }}>
          {([
            { id: 'funding', label: 'Funding' },
            { id: 'fans', label: 'Fans' },
          ] as const).map(tab => {
            const active = chartTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setChartTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  color: active ? '#e2e8f0' : '#64748b',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${active ? '#fbbf24' : 'transparent'}`,
                  cursor: 'pointer',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        {chartTab === 'funding' ? (
          <FundingSnapshotChart teams={data.teams} favoriteTeamId={favoriteTeamId} />
        ) : (
          <FanCountChart teams={data.teams} favoriteTeamId={favoriteTeamId} />
        )}
      </div>

    </div>
  )
}

function StatChip({ label, value, avatarTeamId }: { label: string; value: string; avatarTeamId?: number }) {
  return (
    <div style={{
      padding: '12px 14px',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '6px',
    }}>
      <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {avatarTeamId != null && (
          <img
            src={`/avatars/${avatarTeamId}.png`}
            alt=""
            style={{ width: '24px', height: '24px', flexShrink: 0 }}
          />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {value}
        </span>
      </div>
    </div>
  )
}
