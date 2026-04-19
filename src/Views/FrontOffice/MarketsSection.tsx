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
        <span style={{
          fontSize: '10px', fontWeight: 800, color: team.color, minWidth: '32px',
          backgroundColor: `${team.color}20`, padding: '3px 6px', borderRadius: '4px',
          textAlign: 'center' as const,
        }}>
          {team.abbr}
        </span>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/league/markets`)
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json?.success && json.data) setData(json.data as MarketsResponse)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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
