import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import FrontOfficePanel from '@/Components/FrontOffice/FrontOfficePanel'
import RookiesSection from './RookiesSection'
import MarketsSection from './MarketsSection'
import { Stars, calcStars } from '@/Components/Stars'
import PlayerAvatar from '@/Components/PlayerAvatar'
import CoachAvatar from '@/Components/CoachAvatar'
import PlayerHoverCard from '@/Components/PlayerHoverCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type SectionId = 'overview' | 'markets' | 'votes'

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
  nextTierThreshold: number | null
  nextTierName: string | null
  progressToNextTier: number | null
  fairShare?: number
  tierThresholds?: Record<string, number>
}

interface RatingPoint { season: number; rating: number }

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  ratingStars: number
  termRemaining?: number
  defensivePosition?: string | null
  ratingHistory?: RatingPoint[]
}

interface CoachInfo {
  name: string
  overallRating: number
  offensiveMind: number
  defensiveMind: number
  adaptability: number
  aggressiveness: number
  clockManagement: number
  playerDevelopment: number
  scouting?: number
  seasonsCoached: number
}

interface ScheduleEntry {
  gameId: number | string
  isHome: boolean
  week: number | null
  opponent: { id: number; name: string; city: string; abbr: string }
  teamScore: number
  oppScore: number
  status: string
  result: string
}

interface TeamSummary {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  record?: { wins: number; losses: number }
  funding: FundingSummary | null
  roster: Record<string, RosterPlayer | null>
  coach: CoachInfo | null
  schedule: ScheduleEntry[]
}

const TIER_COLORS: Record<string, string> = {
  MEGA_MARKET: '#a78bfa',
  LARGE_MARKET: '#3b82f6',
  MID_MARKET: '#2dd4bf',
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
  const [projectedTier, setProjectedTier] = useState<string | null>(null)
  const [projectedFunding, setProjectedFunding] = useState<number | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [contributeBusy, setContributeBusy] = useState(false)
  const [contributeFlash, setContributeFlash] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('overview')

  // Retirement watch + prospects — fetched alongside team data so Overview
  // tab can display the same surfaces as the /team/{id} page
  type RetirementRisk = 'safe' | 'possible' | 'likely' | 'very_likely' | 'forced'
  interface RetirementEntry { playerId: number; risk: RetirementRisk }
  interface ProspectEntry {
    playerId: number; name: string; position: string; rating: number
    tier: string | null; prospectSeasons: number; seasonsRemaining: number
    draftSeason?: number | null
    isUndrafted: boolean; ratingHistory: RatingPoint[]
  }
  const [retirementWatch, setRetirementWatch] = useState<Record<number, RetirementRisk>>({})
  const [prospects, setProspects] = useState<ProspectEntry[]>([])

  const favTeamId = user?.favoriteTeamId ?? null
  const currentWeek = seasonState?.currentWeek ?? 0

  // Fetch my team's summary (tier, funding, record) + projected next-season
  const loadTeam = useCallback(async () => {
    if (!favTeamId) { setLoadingTeam(false); return }
    setLoadingTeam(true)
    try {
      // `cache: 'reload'` on the team fetch bypasses the browser's 2-minute
      // Cache-Control on /api/teams/{id}. Without this, right after a
      // contribution the browser would serve stale funding/tier data until
      // the cache expired. The other endpoints aren't cached as aggressively
      // but we apply it uniformly for consistency on this page.
      const [teamRes, projRes, watchRes, prospectsRes] = await Promise.all([
        fetch(`${API_BASE}/teams/${favTeamId}`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/projected-funding`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/retirement-watch`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/prospects`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
      ])
      if (watchRes?.success && watchRes.data?.watch) {
        const byId: Record<number, RetirementRisk> = {}
        for (const w of watchRes.data.watch) byId[w.playerId] = w.risk
        setRetirementWatch(byId)
      }
      if (prospectsRes?.success && prospectsRes.data) {
        setProspects(prospectsRes.data.prospects || [])
      }
      if (teamRes?.success && teamRes.data) {
        const t = teamRes.data
        setTeam({
          id: t.id, name: t.name, city: t.city, abbr: t.abbr, color: t.color,
          record: { wins: Number(t.wins || 0), losses: Number(t.losses || 0) },
          funding: t.funding ?? null,
          roster: t.roster ?? {},
          coach: t.coach ?? null,
          schedule: t.schedule ?? [],
        })
      }
      if (projRes?.success && projRes.data) {
        if (projRes.data.nextSeasonProjectedTier) setProjectedTier(projRes.data.nextSeasonProjectedTier)
        if (typeof projRes.data.nextSeasonProjectedFunding === 'number') {
          setProjectedFunding(projRes.data.nextSeasonProjectedFunding)
        }
      }
    } finally {
      setLoadingTeam(false)
    }
  }, [favTeamId])

  useEffect(() => { loadTeam() }, [loadTeam])

  // Cross-component events: achievement hints on the Achievements page fire
  // these to jump fans to the right tab after navigating here. The Patron
  // hint (contribute to favorite team) dispatches `floosball:show-markets`.
  useEffect(() => {
    const showMarkets = () => setActiveSection('markets')
    const showOverview = () => setActiveSection('overview')
    const showVotes = () => setActiveSection('votes')
    window.addEventListener('floosball:show-markets', showMarkets)
    window.addEventListener('floosball:show-team-funding', showMarkets)  // legacy alias
    window.addEventListener('floosball:show-overview', showOverview)
    window.addEventListener('floosball:show-votes', showVotes)
    return () => {
      window.removeEventListener('floosball:show-markets', showMarkets)
      window.removeEventListener('floosball:show-team-funding', showMarkets)
      window.removeEventListener('floosball:show-overview', showOverview)
      window.removeEventListener('floosball:show-votes', showVotes)
    }
  }, [])

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
        // Optimistically apply the server's updated funding from the POST
        // response. /api/teams/{id} is cached (2 min), so a GET-refetch via
        // loadTeam() would serve stale data until the cache expires. The
        // POST response already has the authoritative new totals.
        const updatedFunding = json.data?.funding
        if (updatedFunding) {
          setTeam(prev => prev ? {
            ...prev,
            funding: prev.funding ? {
              ...prev.funding,
              fanContributions: updatedFunding.fanContributions ?? prev.funding.fanContributions,
              effectiveFunding: updatedFunding.effectiveFunding ?? prev.funding.effectiveFunding,
            } : prev.funding,
          } : prev)
        }
        // Force a fresh refetch (bypassing browser cache) so projected-
        // tier / prospects / retirement-watch also reflect the change.
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
    { id: 'overview', label: 'Overview' },
    { id: 'markets', label: 'Markets' },
    { id: 'votes', label: 'Front Office' },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', color: '#e2e8f0', margin: 0, marginBottom: '4px' }}>
          Team Management
        </h1>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>
          Season {seasonState?.seasonNumber ?? 1} · Week {currentWeek || '—'}
        </div>
      </div>

      {/* Persistent team summary — always visible so tier/funding stays in
          context while the tabs below surface individual control groups */}
      <div style={{
        backgroundColor: '#1e293b', borderRadius: '8px', padding: '12px 14px',
        display: 'flex', flexWrap: 'wrap' as const, gap: '14px', alignItems: 'center',
        marginBottom: '16px',
      }}>
        <img
          src={`/avatars/${team.id}.png`}
          alt={team.abbr}
          style={{ width: '48px', height: '48px', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0' }}>
            <Link to={`/team/${team.id}`} style={{ color: '#e2e8f0', textDecoration: 'none' }}>
              {team.city} {team.name}
            </Link>
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '2px' }}>
            {team.record?.wins}–{team.record?.losses}
          </div>
        </div>
        <span style={{
          fontSize: '14px', fontWeight: 700, color: tierColor,
          backgroundColor: `${tierColor}20`, padding: '5px 12px', borderRadius: '4px',
          border: `1px solid ${tierColor}40`,
        }}>
          {tierLabel}
        </span>
        {team.funding && (
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>
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
                padding: '10px 18px',
                fontSize: '15px',
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
      {activeSection === 'overview' && (
        <OverviewTab
          team={team}
          retirementWatch={retirementWatch}
          prospects={prospects}
        />
      )}

      {activeSection === 'markets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Team funding: a compact summary (fan contributions total +
              projected tier movement) at the top, then contribute + auto-%
              controls, then the league-wide Markets view below. */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '14px' }}>
            {team.funding && (
              <FundingSummaryStrip
                funding={team.funding}
                projectedTier={projectedTier}
                projectedFunding={projectedFunding}
              />
            )}

            <div data-tour="team-funding-contribute" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' }}>
              Contribute now
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: '12px' }}>
              {[25, 50, 100, 250].map(amt => (
                <button
                  key={amt}
                  onClick={() => contribute(amt)}
                  disabled={contributeBusy || (user.floobits ?? 0) < amt}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
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
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>Balance: {user.floobits ?? 0}F</span>
              {contributeFlash && (
                <span style={{ fontSize: '14px', color: '#22c55e', marginLeft: '8px' }}>{contributeFlash}</span>
              )}
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' }}>
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
                      padding: '7px 14px',
                      fontSize: '14px',
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
              <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '8px' }}>
                % of unspent Floobits auto-contributed at season end
              </span>
            </div>
          </div>

          {/* League-wide tier standings */}
          <MarketsSection />
        </div>
      )}

      {activeSection === 'votes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FrontOfficePanel teamId={team.id} teamColor={team.color} />
          {/* Rookie ballot renders only once voting opens (Week 22+). Keeps
              the tab uncluttered while the front office is still dormant —
              no rookie cards flooding the view before the window is active. */}
          {currentWeek >= 22 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '10px' }}>
                Rookie Draft Ballot
              </div>
              <RookiesSection />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact summary strip — fan contributions, total effective funding,
// projected next-season funding + tier, and the current next-tier threshold.
// Replaces the old FundingSummaryPanel (gauge was redundant with the League
// Funding chart below, but these specific numbers are still worth surfacing
// at a glance above the contribute controls).
const TIER_RANK_ORDER: Record<string, number> = {
  MEGA_MARKET: 1, LARGE_MARKET: 2, MID_MARKET: 3, SMALL_MARKET: 4,
}
function FundingSummaryStrip({
  funding, projectedTier, projectedFunding,
}: {
  funding: FundingSummary
  projectedTier: string | null
  projectedFunding: number | null
}) {
  const currentTierColor = TIER_COLORS[funding.tier] ?? '#cbd5e1'
  const projKey = projectedTier ?? funding.tier
  const projColor = TIER_COLORS[projKey] ?? currentTierColor
  const projLabel = TIER_LABELS[projKey] ?? projKey.replace('_MARKET', '')
  const delta = projectedTier
    ? (TIER_RANK_ORDER[funding.tier] ?? 3) - (TIER_RANK_ORDER[projectedTier] ?? 3)
    : 0
  const direction = delta > 0
    ? { symbol: '▲', color: '#22c55e', label: `climbing from ${TIER_LABELS[funding.tier] ?? funding.tier}` }
    : delta < 0
      ? { symbol: '▼', color: '#ef4444', label: `slipping from ${TIER_LABELS[funding.tier] ?? funding.tier}` }
      : { symbol: '—', color: '#94a3b8', label: `holding ${TIER_LABELS[funding.tier] ?? funding.tier}` }
  // "Next tier target" = the smallest tier threshold that exceeds current
  // effective funding. Always higher than what the team has today, so the
  // number reads as a goal to climb toward. If no threshold is higher, the
  // team is already in the top tier and we hide the box entirely.
  let nextTierName: Tier | null = null
  let nextTierThresholdValue: number | null = null
  if (funding.tierThresholds) {
    const climbingOrder: Tier[] = ['SMALL_MARKET', 'MID_MARKET', 'LARGE_MARKET', 'MEGA_MARKET']
    for (const name of climbingOrder) {
      const threshold = funding.tierThresholds[name]
      if (threshold != null && threshold > funding.effectiveFunding) {
        nextTierName = name
        nextTierThresholdValue = threshold
        break
      }
    }
  }
  const nextTierThresholdColor = nextTierName
    ? (TIER_COLORS[nextTierName] ?? '#cbd5e1')
    : '#94a3b8'
  const nextTierThresholdLabel = nextTierName
    ? (TIER_LABELS[nextTierName] ?? nextTierName.replace('_MARKET', ''))
    : null

  return (
    <div style={{
      display: 'flex', gap: '20px 28px', flexWrap: 'wrap' as const,
      paddingBottom: '14px', marginBottom: '14px',
      borderBottom: '1px solid #334155',
    }}>
      {/* Current effective funding — this season, already locked into the
          season's tier. Frames as "This Season" so users understand why a
          later "Next Season (Projected)" reads lower (carry-forward decay). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          This Season
        </span>
        <span style={{ fontSize: '20px', fontWeight: 700, color: currentTierColor, fontVariantNumeric: 'tabular-nums' as const }}>
          {funding.effectiveFunding.toLocaleString()}F
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' as const }}>
          tier locked · baseline + fans
        </span>
      </div>

      {/* Fan contributions this season */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Fan Contributions
        </span>
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' as const }}>
          {funding.fanContributions.toLocaleString()}F
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' as const }}>
          included in this season total
        </span>
      </div>

      {/* Next-tier target — the lowest threshold above current effective
          funding. Always a number larger than "This Season" so it reads as
          a goal. Hidden when the team already sits in the top tier. */}
      {nextTierThresholdValue != null && nextTierThresholdLabel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            Next Tier Target
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: nextTierThresholdColor, fontVariantNumeric: 'tabular-nums' as const }}>
            {nextTierThresholdValue.toLocaleString()}F
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' as const }}>
            to reach {nextTierThresholdLabel}
          </span>
        </div>
      )}

      {/* Projected tier (name + ▲/▼) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '180px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Projected Next Season
        </span>
        <span style={{
          fontSize: '20px', fontWeight: 700, color: projColor,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {projLabel}
          <span style={{ fontSize: '14px', fontWeight: 800, color: direction.color }}>
            {direction.symbol}
          </span>
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' as const }}>
          {direction.label}
        </span>
      </div>
    </div>
  )
}

// Tab content components — shared panel styling, compact versions of the
// team page's roster/coach/schedule. Live inside Team Management so fans
// have the full team profile + management actions in one destination.
const PANEL_STYLE: React.CSSProperties = {
  backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' as const,
}
const PANEL_HEADER_STYLE: React.CSSProperties = {
  padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155',
}
const PANEL_HEADER_LABEL_STYLE: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase' as const, letterSpacing: '0.05em',
}

const ROSTER_SLOT_ORDER: [string, string][] = [
  ['qb', 'QB'], ['rb', 'RB'], ['wr1', 'WR1'], ['wr2', 'WR2'], ['te', 'TE'], ['k', 'K'],
]

const RISK_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  possible:    { label: 'AGING',          color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  likely:      { label: 'RETIRING?',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  very_likely: { label: 'FAREWELL TOUR',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  forced:      { label: 'FORCED EXIT',    color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
}

function OverviewTab({
  team, retirementWatch, prospects,
}: {
  team: TeamSummary
  retirementWatch: Record<number, 'safe' | 'possible' | 'likely' | 'very_likely' | 'forced'>
  prospects: any[]
}) {
  const isMobile = useIsMobile()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', alignItems: 'start' }}>
      {/* Roster */}
      <div style={PANEL_STYLE}>
        <div style={PANEL_HEADER_STYLE}>
          <span style={PANEL_HEADER_LABEL_STYLE}>Roster</span>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ROSTER_SLOT_ORDER.map(([slot, posLabel]) => {
            const player = team.roster?.[slot]
            return (
              <div key={slot} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 8px', borderRadius: '4px', backgroundColor: '#0f172a',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', minWidth: '30px' }}>{posLabel}</span>
                {player ? (
                  <>
                    <PlayerAvatar name={player.name} size={32} bgColor={team.color} />
                    <PlayerHoverCard playerId={player.id} playerName={player.name}>
                      <Link to={`/players/${player.id}`} style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.name}
                      </Link>
                    </PlayerHoverCard>
                    <Stars stars={player.ratingStars} size={13} />
                    {player.termRemaining != null && (
                      <span style={{
                        fontSize: '12px',
                        color: player.termRemaining === 1 ? '#f59e0b' : '#94a3b8',
                        whiteSpace: 'nowrap' as const, marginLeft: 'auto',
                      }}>
                        {player.termRemaining}yr
                      </span>
                    )}
                    {retirementWatch[player.id] && RISK_STYLES[retirementWatch[player.id]] && (
                      <span style={{
                        fontSize: '10px', fontWeight: 800,
                        color: RISK_STYLES[retirementWatch[player.id]].color,
                        backgroundColor: RISK_STYLES[retirementWatch[player.id]].bg,
                        padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.04em',
                      }}>
                        {RISK_STYLES[retirementWatch[player.id]].label}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: '14px', color: '#475569' }}>—</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Prospect Pipeline */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '8px' }}>
            Prospect Pipeline · {prospects.length}
          </div>
          {prospects.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b', padding: '4px 0' }}>
              No prospects yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {prospects.map(p => {
                // Dev window countdown — 3-season cap, then auto-released to
                // the FA pool. "final season" means they're in their last
                // pipeline year and will hit FA at season end unless promoted.
                const windowLabel = p.seasonsRemaining <= 1
                  ? 'final season'
                  : `${p.seasonsRemaining} seasons`
                return (
                  <div key={p.playerId} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 8px', borderRadius: '4px', backgroundColor: '#0f172a',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', minWidth: '30px' }}>{p.position}</span>
                    <PlayerAvatar name={p.name} size={28} bgColor={team.color} />
                    <PlayerHoverCard playerId={p.playerId} playerName={p.name}>
                      <Link to={`/players/${p.playerId}`} style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </Link>
                    </PlayerHoverCard>
                    <Stars stars={calcStars(p.rating)} size={13} />
                    {p.isUndrafted && (
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', backgroundColor: '#1e293b', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em' }}>
                        UNDRAFTED
                      </span>
                    )}
                    {p.draftSeason != null && (
                      <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' as const }}>
                        drafted S{p.draftSeason}
                      </span>
                    )}
                    <span style={{
                      fontSize: '12px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' as const, marginLeft: 'auto',
                    }}>
                      {windowLabel} until FA
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Head Coach */}
      {team.coach && (
        <div style={PANEL_STYLE}>
          <div style={PANEL_HEADER_STYLE}>
            <span style={PANEL_HEADER_LABEL_STYLE}>Head Coach</span>
          </div>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CoachAvatar name={team.coach.name} size={64} bgColor={team.color} style={{ border: `3px solid ${team.color}` }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{team.coach.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Stars stars={calcStars(team.coach.overallRating)} size={13} />
                  <span>{team.coach.seasonsCoached} season{team.coach.seasonsCoached !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              {([
                ['Offensive Mind', team.coach.offensiveMind],
                ['Defensive Mind', team.coach.defensiveMind],
                ['Adaptability', team.coach.adaptability],
                ['Aggressiveness', team.coach.aggressiveness],
                ['Clock Mgmt', team.coach.clockManagement],
                ['Player Dev', team.coach.playerDevelopment],
                ...(team.coach.scouting != null ? [['Scouting', team.coach.scouting] as [string, number]] : []),
              ] as [string, number][]).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${val}%`, height: '100%',
                        backgroundColor: val >= 85 ? '#22c55e' : val >= 72 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '24px', textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const }}>{val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


