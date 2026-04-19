import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import FrontOfficePanel from '@/Components/FrontOffice/FrontOfficePanel'
import RookiesSection from './RookiesSection'
import MarketsSection from './MarketsSection'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type SectionId = 'funding' | 'rookies' | 'votes' | 'markets'

// The Front Office hub. Consolidates everything a fan does to influence their
// team — funding, rookie voting, GM votes, FA ballots — plus a league-wide
// Markets view. Replaces the Funding and Front Office tabs that used to live
// on TeamPage so team pages stay focused on the team's current state.
interface FundingSummary {
  tier: string
  tierRank: number
  effectiveFunding: number
  baselineFunding: number
  fanContributions: number
  carriedFunding: number
  nextTierThreshold: number | null
  nextTierName: string | null
  progressToNextTier: number | null
}

interface TeamSummary {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  record?: { wins: number; losses: number }
  funding: FundingSummary | null
}

const TIER_COLORS: Record<string, string> = {
  MEGA_MARKET: '#a78bfa',
  LARGE_MARKET: '#3b82f6',
  MID_MARKET: '#64748b',
  SMALL_MARKET: '#f97316',
}
const TIER_LABELS: Record<string, string> = {
  MEGA_MARKET: 'Mega Market',
  LARGE_MARKET: 'Large Market',
  MID_MARKET: 'Mid Market',
  SMALL_MARKET: 'Small Market',
}

export default function FrontOfficePage() {
  const { user, getToken, refetchUser } = useAuth()
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()

  const [team, setTeam] = useState<TeamSummary | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [contributeBusy, setContributeBusy] = useState(false)
  const [contributeFlash, setContributeFlash] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('funding')

  const favTeamId = user?.favoriteTeamId ?? null
  const currentWeek = seasonState?.currentWeek ?? 0

  // Fetch my team's summary (tier, funding, record)
  const loadTeam = useCallback(async () => {
    if (!favTeamId) { setLoadingTeam(false); return }
    setLoadingTeam(true)
    try {
      const res = await fetch(`${API_BASE}/teams/${favTeamId}`)
      const json = await res.json()
      if (json?.success && json.data) {
        const t = json.data
        setTeam({
          id: t.id, name: t.name, city: t.city, abbr: t.abbr, color: t.color,
          record: { wins: Number(t.wins || 0), losses: Number(t.losses || 0) },
          funding: t.funding ?? null,
        })
      }
    } finally {
      setLoadingTeam(false)
    }
  }, [favTeamId])

  useEffect(() => { loadTeam() }, [loadTeam])

  const contribute = async (amount: number) => {
    if (!team || contributeBusy) return
    if (!window.confirm(`Contribute ${amount}F to ${team.name}?`)) return
    setContributeBusy(true)
    setContributeFlash(null)
    try {
      const tok = await getToken()
      if (!tok) return
      const resp = await fetch(`${API_BASE}/teams/${team.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ amount }),
      })
      const json = await resp.json()
      if (json?.success) {
        setContributeFlash(`+${amount}F contributed`)
        refetchUser()
        loadTeam()
      } else {
        setContributeFlash(json?.detail || 'Contribution failed')
      }
    } finally {
      setContributeBusy(false)
    }
  }

  const setAutoPct = async (pct: number) => {
    const tok = await getToken()
    if (!tok) return
    await fetch(`${API_BASE}/users/me/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ teamFundingPct: pct }),
    })
    refetchUser()
  }

  // Not signed in or no favorite team → show a friendly prompt
  if (!user) {
    return (
      <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center' }}>
        Sign in to access the Front Office.
      </div>
    )
  }
  if (!favTeamId) {
    return (
      <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        Pick a favorite team first — the Front Office is scoped to the team you root for.
      </div>
    )
  }

  if (loadingTeam || !team) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center' }}>Loading Front Office…</div>
  }

  const tierColor = team.funding ? (TIER_COLORS[team.funding.tier] || '#64748b') : '#64748b'
  const tierLabel = team.funding ? (TIER_LABELS[team.funding.tier] || team.funding.tier) : '—'

  // Tabs — only the selected tab's content renders, keeping the page focused.
  // "My Team" is promoted to a persistent summary card above the tabs so tier
  // and funding context stays visible regardless of which tab is active.
  const tabs: { id: SectionId; label: string }[] = [
    { id: 'funding', label: 'Fund' },
    { id: 'rookies', label: 'Rookies' },
    { id: 'votes', label: 'Votes' },
    { id: 'markets', label: 'Markets' },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', color: '#e2e8f0', margin: 0, marginBottom: '4px' }}>
          Front Office
        </h1>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Season {seasonState?.currentSeasonNumber ?? 1} · Week {currentWeek || '—'}
        </div>
      </div>

      {/* Persistent team summary — always visible so tier/funding stays in
          context while the tabs below surface individual control groups */}
      <div style={{
        backgroundColor: '#1e293b', borderRadius: '8px', padding: '12px 14px',
        display: 'flex', flexWrap: 'wrap' as const, gap: '14px', alignItems: 'center',
        marginBottom: '16px',
      }}>
        <span style={{
          fontSize: '10px', fontWeight: 800, color: team.color,
          backgroundColor: `${team.color}20`, padding: '5px 10px', borderRadius: '4px',
        }}>
          {team.abbr}
        </span>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>
            <Link to={`/team/${team.id}`} style={{ color: '#e2e8f0', textDecoration: 'none' }}>
              {team.city} {team.name}
            </Link>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {team.record?.wins}–{team.record?.losses}
          </div>
        </div>
        <span style={{
          fontSize: '13px', fontWeight: 700, color: tierColor,
          backgroundColor: `${tierColor}20`, padding: '4px 10px', borderRadius: '4px',
          border: `1px solid ${tierColor}40`,
        }}>
          {tierLabel}
        </span>
        {team.funding && (
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>
            {team.funding.effectiveFunding.toLocaleString()} F
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '6px', flexWrap: 'wrap' as const,
        borderBottom: '1px solid #1e293b', marginBottom: '16px',
      }}>
        {tabs.map(s => {
          const active = activeSection === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                borderRadius: '5px 5px 0 0',
                border: 'none',
                borderBottom: `2px solid ${active ? team.color : 'transparent'}`,
                backgroundColor: 'transparent',
                color: active ? '#e2e8f0' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: '-1px',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Only the active tab's content renders */}
      {activeSection === 'funding' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '14px' }}>
          {team.funding && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap' as const, fontSize: '12px', color: '#cbd5e1' }}>
              <span>Baseline <strong style={{ color: '#e2e8f0' }}>{team.funding.baselineFunding}F</strong></span>
              <span>Carried (50%) <strong style={{ color: '#e2e8f0' }}>{team.funding.carriedFunding}F</strong></span>
              <span>Fan Contributions <strong style={{ color: '#fbbf24' }}>{team.funding.fanContributions}F</strong></span>
              {team.funding.nextTierThreshold != null && team.funding.nextTierName && (
                <span>Next tier ({team.funding.nextTierName.replace('_MARKET', '').toLowerCase()}) at <strong style={{ color: TIER_COLORS[team.funding.nextTierName] }}>{team.funding.nextTierThreshold.toLocaleString()}F</strong></span>
              )}
            </div>
          )}

          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' }}>
            Contribute now
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: '12px' }}>
            {[25, 50, 100, 250].map(amt => (
              <button
                key={amt}
                onClick={() => contribute(amt)}
                disabled={contributeBusy || (user.floobits ?? 0) < amt}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: `1px solid ${(user.floobits ?? 0) < amt ? '#1e293b' : tierColor}`,
                  backgroundColor: (user.floobits ?? 0) < amt ? 'transparent' : `${tierColor}20`,
                  color: (user.floobits ?? 0) < amt ? '#475569' : tierColor,
                  cursor: (user.floobits ?? 0) < amt ? 'not-allowed' : 'pointer',
                  opacity: (user.floobits ?? 0) < amt ? 0.5 : 1,
                }}
              >
                {amt}F
              </button>
            ))}
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Balance: {user.floobits ?? 0}F</span>
            {contributeFlash && (
              <span style={{ fontSize: '12px', color: '#22c55e', marginLeft: '8px' }}>{contributeFlash}</span>
            )}
          </div>

          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' }}>
            Season-end auto-contribution
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
            {[0, 10, 25, 50, 75, 100].map(p => {
              const selected = (user.teamFundingPct ?? 25) === p
              return (
                <button
                  key={p}
                  onClick={() => setAutoPct(p)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: selected ? 700 : 500,
                    borderRadius: '4px',
                    border: `1px solid ${selected ? tierColor : '#334155'}`,
                    backgroundColor: selected ? `${tierColor}20` : 'transparent',
                    color: selected ? tierColor : '#cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  {p}%
                </button>
              )
            })}
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
              % of unspent Floobits auto-contributed at season end
            </span>
          </div>
        </div>
      )}

      {activeSection === 'rookies' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '14px' }}>
          <RookiesSection />
        </div>
      )}

      {activeSection === 'votes' && (
        <FrontOfficePanel teamId={team.id} teamColor={team.color} />
      )}

      {activeSection === 'markets' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '14px' }}>
          <MarketsSection />
        </div>
      )}
    </div>
  )
}

