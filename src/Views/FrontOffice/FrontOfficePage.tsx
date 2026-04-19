import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import FrontOfficePanel from '@/Components/FrontOffice/FrontOfficePanel'
import RookiesSection from './RookiesSection'
import MarketsSection from './MarketsSection'
import RatingSparkline from '@/Components/RatingSparkline'
import { Stars } from '@/Components/Stars'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type SectionId = 'overview' | 'schedule' | 'funding' | 'rookies' | 'votes' | 'markets'

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
  const [projectedFunding, setProjectedFunding] = useState<{
    projectedAutoContributions: number
    contributingFans: number
    totalFans: number
    nextSeasonProjectedFunding?: number
    nextSeasonProjectedTier?: string
    decayRate?: number
  } | null>(null)
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
    isUndrafted: boolean; ratingHistory: RatingPoint[]
  }
  const [retirementWatch, setRetirementWatch] = useState<Record<number, RetirementRisk>>({})
  const [prospects, setProspects] = useState<ProspectEntry[]>([])

  const favTeamId = user?.favoriteTeamId ?? null
  const currentWeek = seasonState?.currentWeek ?? 0

  // Fetch my team's summary (tier, funding, record) + projected next-season
  // funding for the projection chart on the Fund tab
  const loadTeam = useCallback(async () => {
    if (!favTeamId) { setLoadingTeam(false); return }
    setLoadingTeam(true)
    try {
      const [teamRes, projRes, watchRes, prospectsRes] = await Promise.all([
        fetch(`${API_BASE}/teams/${favTeamId}`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/projected-funding`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/retirement-watch`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/prospects`).then(r => r.json()).catch(() => null),
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
        setProjectedFunding(projRes.data)
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
        loadTeam()  // refreshes team.funding + projected-funding
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
    { id: 'schedule', label: 'Schedule' },
    { id: 'funding', label: 'Fund' },
    { id: 'rookies', label: 'Prospects' },
    { id: 'votes', label: 'Front Office' },
    { id: 'markets', label: 'Markets' },
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

      {activeSection === 'schedule' && (
        <ScheduleTab team={team} />
      )}

      {activeSection === 'funding' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '14px' }}>
          {team.funding && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap' as const, fontSize: '14px', color: '#cbd5e1' }}>
              <span>Baseline <strong style={{ color: '#e2e8f0' }}>{team.funding.baselineFunding}F</strong></span>
              <span>Carried (50%) <strong style={{ color: '#e2e8f0' }}>{team.funding.carriedFunding}F</strong></span>
              <span>Fan Contributions <strong style={{ color: '#fbbf24' }}>{team.funding.fanContributions}F</strong></span>
              {team.funding.nextTierThreshold != null && team.funding.nextTierName && (
                <span>Next tier ({team.funding.nextTierName.replace('_MARKET', '').toLowerCase()}) at <strong style={{ color: TIER_COLORS[team.funding.nextTierName] }}>{team.funding.nextTierThreshold.toLocaleString()}F</strong></span>
              )}
            </div>
          )}

          {/* Projection chart — current funding vs projected next-season vs
              next-tier threshold. Shows at a glance whether the team is on
              track to climb, hold, or drop tiers. */}
          {team.funding && projectedFunding && (
            <ProjectionChart
              funding={team.funding}
              projected={projectedFunding}
              tierColor={tierColor}
            />
          )}

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' }}>
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
      )}

      {/* No outer panel wrapper — child cards carry their own #1e293b background,
          so sitting on the page bg gives them contrast. Fund tab is the one
          exception: it's a single composite control panel and reads better
          grouped into one card. */}
      {activeSection === 'rookies' && <RookiesSection readOnly />}

      {activeSection === 'votes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FrontOfficePanel teamId={team.id} teamColor={team.color} />
          {/* Rookie ballot lives alongside board votes — single destination
              for every personnel-vote fans cast. Renders the full voting-
              enabled RookiesSection (gated internally by votingOpen). */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '10px' }}>
              Rookie Draft Ballot
            </div>
            <RookiesSection />
          </div>
        </div>
      )}

      {activeSection === 'markets' && <MarketsSection />}
    </div>
  )
}

// Projection chart — horizontal bar showing current effective funding, the
// projected next-season effective funding (after 50% decay + projected auto
// contributions), and the next-tier threshold (if there's one to climb to).
// Fans can eyeball whether they're on track to climb, hold, or slip tiers.
function ProjectionChart({
  funding, projected, tierColor,
}: {
  funding: FundingSummary
  projected: {
    projectedAutoContributions: number
    nextSeasonProjectedFunding?: number
    nextSeasonProjectedTier?: string
    decayRate?: number
  }
  tierColor: string
}) {
  const current = funding.effectiveFunding
  const nextProjected = projected.nextSeasonProjectedFunding ?? current
  const nextTierThreshold = funding.nextTierThreshold
  const nextTierName = funding.nextTierName
  const decayPct = Math.round((projected.decayRate ?? 0.5) * 100)
  const projectedTierColor = projected.nextSeasonProjectedTier
    ? (TIER_COLORS[projected.nextSeasonProjectedTier] || tierColor)
    : tierColor

  // Bar extent: enough headroom to see where the threshold sits beyond the
  // higher of current vs projected funding
  const peak = Math.max(current, nextProjected, nextTierThreshold ?? 0, 1)
  const barMax = Math.ceil(peak * 1.15)
  const pctOf = (v: number) => Math.min(100, Math.max(0, (v / barMax) * 100))

  const currentPct = pctOf(current)
  const projectedPct = pctOf(nextProjected)
  const thresholdPct = nextTierThreshold != null ? pctOf(nextTierThreshold) : null

  const delta = nextProjected - current
  const deltaText = delta >= 0 ? `+${delta.toLocaleString()}F` : `${delta.toLocaleString()}F`
  const deltaColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#94a3b8'

  return (
    <div style={{
      backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px',
      padding: '12px 14px', marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: '10px', fontSize: '13px',
      }}>
        <span style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Next Season Projection
        </span>
        <span style={{ color: '#94a3b8' }}>
          {decayPct}% carry-forward + {projected.projectedAutoContributions.toLocaleString()}F projected
        </span>
      </div>

      {/* Bar stack: track, projected fill (ghost), current fill, threshold marker */}
      <div style={{ position: 'relative' as const, height: '18px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'visible' as const, marginBottom: '8px' }}>
        {/* Projected next-season fill (ghost, drawn behind current) */}
        <div style={{
          position: 'absolute' as const, left: 0, top: 0, height: '100%',
          width: `${projectedPct}%`,
          backgroundColor: projectedTierColor, opacity: 0.25,
          borderRadius: '4px',
        }} />
        {/* Current funding fill */}
        <div style={{
          position: 'absolute' as const, left: 0, top: 0, height: '100%',
          width: `${currentPct}%`,
          backgroundColor: tierColor, opacity: 0.8,
          borderRadius: '4px',
        }} />
        {/* Next-tier threshold marker line */}
        {thresholdPct != null && (
          <div
            title={`Next tier (${nextTierName}) starts at ${nextTierThreshold!.toLocaleString()}F`}
            style={{
              position: 'absolute' as const,
              left: `${thresholdPct}%`,
              top: '-3px', bottom: '-3px',
              width: '2px',
              backgroundColor: projectedTierColor,
            }}
          />
        )}
      </div>

      {/* Legend row — three values with colored dots */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '14px', fontSize: '13px', color: '#cbd5e1' }}>
        <LegendDot color={tierColor} label="Current" value={`${current.toLocaleString()}F`} />
        <LegendDot color={projectedTierColor} label="Projected next season" value={`${nextProjected.toLocaleString()}F`} ghost />
        {thresholdPct != null && nextTierName && (
          <LegendDot
            color={projectedTierColor}
            label={`${nextTierName.replace('_MARKET', '').toLowerCase()} tier at`}
            value={`${nextTierThreshold!.toLocaleString()}F`}
          />
        )}
        <span style={{ marginLeft: 'auto', color: deltaColor, fontWeight: 700 }}>
          {deltaText} next season
        </span>
      </div>
    </div>
  )
}

function LegendDot({ color, label, value, ghost }: { color: string; label: string; value: string; ghost?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px',
        backgroundColor: color, opacity: ghost ? 0.35 : 1,
      }} />
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' as const, fontWeight: 600 }}>{value}</span>
    </span>
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
                    <Link to={`/players/${player.id}`} style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {player.name}
                    </Link>
                    <Stars stars={player.ratingStars} size={13} />
                    {player.ratingHistory && player.ratingHistory.length > 0 && (
                      <RatingSparkline history={player.ratingHistory} width={48} height={16} />
                    )}
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
              {prospects.map(p => (
                <div key={p.playerId} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '4px 8px', borderRadius: '4px', backgroundColor: '#0f172a',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', minWidth: '30px' }}>{p.position}</span>
                  <Link to={`/players/${p.playerId}`} style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500, textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </Link>
                  {p.ratingHistory?.length > 0 && (
                    <RatingSparkline history={p.ratingHistory} width={44} height={14} />
                  )}
                  <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '24px', textAlign: 'right' as const }}>
                    {Math.round(p.rating)}
                  </span>
                </div>
              ))}
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
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{team.coach.name}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Overall {team.coach.overallRating} · {team.coach.seasonsCoached} season{team.coach.seasonsCoached !== 1 ? 's' : ''}
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

function ScheduleTab({ team }: { team: TeamSummary }) {
  return (
    <div style={PANEL_STYLE}>
      <div style={PANEL_HEADER_STYLE}>
        <span style={PANEL_HEADER_LABEL_STYLE}>Schedule · {team.schedule.length} games</span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {team.schedule.length === 0 ? (
          <div style={{ padding: '16px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' as const }}>
            Schedule not available.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {team.schedule.map(g => {
              const played = g.status?.toLowerCase() === 'final'
              const won = g.result === 'W'
              const lost = g.result === 'L'
              const resultColor = won ? '#22c55e' : lost ? '#ef4444' : '#94a3b8'
              return (
                <div key={`${g.gameId}-${g.week}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 24px 32px minmax(0, 1fr) auto 40px',
                  alignItems: 'center', gap: '10px',
                  padding: '8px 14px', borderBottom: '1px solid #0f172a',
                  fontSize: '14px',
                }}>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>W{g.week}</span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{g.isHome ? 'vs' : '@'}</span>
                  <img
                    src={`/avatars/${g.opponent.id}.png`}
                    alt={g.opponent.abbr}
                    style={{ width: '24px', height: '24px' }}
                  />
                  <Link to={`/team/${g.opponent.id}`} style={{
                    color: '#e2e8f0', textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {g.opponent.city} {g.opponent.name}
                  </Link>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums' as const,
                    color: played ? '#cbd5e1' : '#64748b',
                    fontWeight: 600,
                  }}>
                    {played ? `${g.teamScore}–${g.oppScore}` : '—'}
                  </span>
                  <span style={{
                    color: resultColor, fontWeight: 700, textAlign: 'right' as const,
                  }}>
                    {g.result || ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

