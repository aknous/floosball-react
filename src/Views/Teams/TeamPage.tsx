import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import PlayerAvatar from '@/Components/PlayerAvatar'
import { Stars } from '@/Components/Stars'
import CoachAvatar from '@/Components/CoachAvatar'
import FrontOfficePanel from '@/Components/FrontOffice/FrontOfficePanel'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import TutorialOverlay from '@/Components/Tutorial/TutorialOverlay'
import TourPrompt from '@/Components/Tutorial/TourPrompt'
import { useTutorial, TutorialStep } from '@/Components/Tutorial/useTutorial'
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  ratingStars: number
  offensiveRatingStars?: number
  defensiveRatingStars?: number
  defensivePosition?: string | null
  termRemaining?: number
  fatigue?: number
  resilience?: number
}

interface ScheduleEntry {
  gameId: number
  isHome: boolean
  week: number | null
  opponent: { id: number; name: string; city: string; abbr: string }
  teamScore: number
  oppScore: number
  status: string
  result: string | null
}

interface Coach {
  name: string
  overallRating: number
  offensiveMind: number
  defensiveMind: number
  adaptability: number
  aggressiveness: number
  clockManagement: number
  playerDevelopment: number
  scouting: number
  seasonsCoached: number
}

interface FundingData {
  season: number
  baselineFunding: number
  fanContributions: number
  currentFunding: number
  carriedFunding: number
  effectiveFunding: number
  tier: string
  tierRank: number
  // Market tiers are now assigned by relative rank (quartiles) across the league,
  // so "thresholds" are live values derived from standings — only the single
  // next-tier threshold is surfaced. No fixed per-tier floors to plot.
  nextTierThreshold: number | null
  nextTierName: string | null
  progressToNextTier: number | null
}

interface TeamData {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string
  league: string
  elo: number
  wins: number
  losses: number
  winPerc: string
  overallRating: number
  offenseRating: number
  defenseRunCoverageRating: number
  defensePassCoverageRating: number
  fundingTier?: string
  fundingTierRank?: number
  funding?: FundingData
  clinchedPlayoffs: boolean
  clinchedTopSeed: boolean
  floosbowlChampion: boolean
  eliminated: boolean
  leagueChampionships: any[]
  floosbowlChampionships: any[]
  roster: Record<string, RosterPlayer | null>
  schedule: ScheduleEntry[]
  history: any[]
  coach: Coach | null
}

function TierBadge({ tier, label, color, effects, size = 'normal' }: {
  tier: string, label: string, color: string, effects: string[], size?: 'normal' | 'small'
}) {
  const [hover, setHover] = useState(false)
  const fontSize = size === 'small' ? '11px' : '13px'
  const padding = size === 'small' ? '2px 8px' : '3px 10px'
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', cursor: 'default' }}
    >
      <span style={{
        backgroundColor: `${color}20`,
        color: color,
        fontSize,
        fontWeight: '700',
        padding,
        borderRadius: '4px',
        border: `1px solid ${color}40`,
      }}>
        {label}
      </span>
      {hover && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '6px',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '8px 12px',
          zIndex: 50,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color, marginBottom: '4px' }}>{label} Effects</div>
          {effects.map((item, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>{item}</div>
          ))}
        </div>
      )}
    </span>
  )
}

const ROSTER_SLOTS: [string, string][] = [
  ['qb', 'QB'], ['rb', 'RB'], ['wr1', 'WR1'], ['wr2', 'WR2'], ['te', 'TE'], ['k', 'K']
]

type RetirementRisk = 'safe' | 'possible' | 'likely' | 'very_likely' | 'forced'
interface RetirementRiskEntry {
  playerId: number
  risk: RetirementRisk
  seasonsPlayed: number
  longevity: number
  termRemaining: number
}
interface ProspectEntry {
  playerId: number
  name: string
  position: string
  rating: number
  tier: string | null
  prospectSeasons: number
  seasonsRemaining: number
  isUndrafted: boolean
  promotionReady: boolean
}

const RISK_STYLES: Record<RetirementRisk, { label: string; color: string; bg: string }> = {
  safe:         { label: '',                color: '',        bg: '' },
  possible:     { label: 'AGING',           color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  likely:       { label: 'RETIRING?',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  very_likely:  { label: 'FAREWELL TOUR',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  forced:       { label: 'FORCED EXIT',     color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
}

function RetirementBadge({ risk }: { risk: RetirementRisk }) {
  if (risk === 'safe') return null
  const style = RISK_STYLES[risk]
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 800,
      letterSpacing: '0.06em',
      color: style.color,
      backgroundColor: style.bg,
      padding: '2px 6px',
      borderRadius: '3px',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  )
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const { user, getToken, refetchUser } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [projectedFunding, setProjectedFunding] = useState<{ projectedAutoContributions: number, contributingFans: number, totalFans: number, nextSeasonProjectedFunding?: number, nextSeasonProjectedTier?: string, decayRate?: number } | null>(null)
  const [fundingRefresh, setFundingRefresh] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [retirementWatch, setRetirementWatch] = useState<Record<number, RetirementRiskEntry>>({})
  const [prospects, setProspects] = useState<ProspectEntry[]>([])
  const [prospectsMeta, setProspectsMeta] = useState<{ slotCapPerPosition: number, developmentWindow: number, promotionThreshold: number } | null>(null)
  const isMobile = useIsMobile()
  const isFavTeam = !!team && user?.favoriteTeamId === team.id

  const tourSteps = useMemo<TutorialStep[]>(() => [
    {
      target: 'team-hero',
      title: 'Your Team',
      content: "Your team's profile — record, ELO rating, championship history, and current market tier at a glance.",
      placement: 'bottom',
      onEnter: () => setActiveTab('overview'),
    },
    {
      target: 'team-roster',
      title: 'Roster',
      content: 'Your active roster. Each player shows their position, overall rating, and contract length remaining.',
      placement: 'bottom',
    },
    {
      target: 'team-coach',
      title: 'Head Coach',
      content: "Your head coach's attributes — offensive/defensive mind, aggressiveness, adaptability, clock management, and player development.",
      placement: 'bottom',
    },
    {
      target: 'team-tab-funding',
      title: 'Funding',
      content: 'Fund your team to improve their market tier and unlock offseason bonuses.',
      placement: 'bottom',
      onEnter: () => setActiveTab('funding'),
    },
    {
      target: 'team-funding-tier',
      title: 'Market Tier',
      content: 'Your current market tier. Higher tiers grant better player development, morale boosts, and fatigue reduction during the offseason.',
      placement: 'bottom',
    },
    {
      target: 'team-funding-bar',
      title: 'Tier Progress',
      content: 'Track funding progress toward the next tier. The bar shows current funding and next-season projections after 50% carry-forward decay.',
      placement: 'bottom',
    },
    {
      target: 'team-funding-contribute',
      title: 'Contributions',
      content: 'Contribute Floobits directly or set an auto-contribution percentage that donates from your unspent balance at season end.',
      placement: 'top',
    },
    {
      target: 'team-tab-schedule',
      title: 'Schedule',
      content: "Your team's full season schedule — past results and upcoming matchups.",
      placement: 'bottom',
      onEnter: () => setActiveTab('schedule'),
    },
    {
      target: 'team-tab-frontoffice',
      title: 'Front Office',
      content: 'The Board of Directors convenes in Week 22. Once open, vote on coaching changes, player signings, and roster cuts.',
      placement: 'bottom',
    },
  ], [])

  const tour = useTutorial({ tourId: 'team-page', steps: tourSteps })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${API_BASE}/teams/${id}`)
      .then(r => r.json())
      .then(json => { if (json.success && json.data) setTeam(json.data) })
      .catch(err => console.error('Failed to fetch team:', err))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || activeTab !== 'funding') return
    fetch(`${API_BASE}/teams/${id}/projected-funding`)
      .then(r => r.json())
      .then(json => { if (json.success && json.data) setProjectedFunding(json.data) })
      .catch(() => {})
  }, [id, activeTab, fundingRefresh])

  // Retirement risk watch + prospect pipeline — visible year-round on the
  // Overview tab so fans can see farewell-tour candidates and the team's
  // developing prospects without waiting for offseason.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      fetch(`${API_BASE}/teams/${id}/retirement-watch`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/teams/${id}/prospects`).then(r => r.json()).catch(() => null),
    ]).then(([watchJson, prospectsJson]) => {
      if (cancelled) return
      if (watchJson?.success && watchJson.data?.watch) {
        const byId: Record<number, RetirementRiskEntry> = {}
        for (const w of watchJson.data.watch) byId[w.playerId] = w
        setRetirementWatch(byId)
      }
      if (prospectsJson?.success && prospectsJson.data) {
        setProspects(prospectsJson.data.prospects || [])
        setProspectsMeta({
          slotCapPerPosition: prospectsJson.data.slotCapPerPosition,
          developmentWindow: prospectsJson.data.developmentWindow,
          promotionThreshold: prospectsJson.data.promotionThreshold,
        })
      }
    })
    return () => { cancelled = true }
  }, [id])

  // External callers (e.g. the achievements page) can request a tab switch via
  // a window event so deep-links land on the correct section.
  useEffect(() => {
    const showFunding = () => setActiveTab('funding')
    const showSchedule = () => setActiveTab('schedule')
    const showOverview = () => setActiveTab('overview')
    window.addEventListener('floosball:show-team-funding', showFunding)
    window.addEventListener('floosball:show-team-schedule', showSchedule)
    window.addEventListener('floosball:show-team-overview', showOverview)
    return () => {
      window.removeEventListener('floosball:show-team-funding', showFunding)
      window.removeEventListener('floosball:show-team-schedule', showSchedule)
      window.removeEventListener('floosball:show-team-overview', showOverview)
    }
  }, [])

  if (loading) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#0f172a', minHeight: '100vh' }}>Loading…</div>
  }
  if (!team) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#0f172a', minHeight: '100vh' }}>Team not found</div>
  }

  const sectionHeader = (label: string) => (
    <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )

  const calcStars = (rating: number) => Math.min(5, Math.max(1, Math.floor((rating - 60) / 8) + 1))

  const ratingBar = (value: number) => {
    const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '5px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${value}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    )
  }

  const coachAttrBar = (value: number) => {
    const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${value}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>

      {/* Hero */}
      <div data-tour="team-hero" style={{
        background: `linear-gradient(135deg, ${team.color}50 0%, #0f172a 55%)`,
        borderBottom: '1px solid #1e293b',
        padding: isMobile ? '20px 16px' : '28px 24px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '14px' : '20px' }}>
          <img
            src={`/avatars/${team.id}.png`}
            alt={team.name}
            style={{ width: isMobile ? '56px' : '80px', height: isMobile ? '56px' : '80px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#94a3b8' }}>{team.league} · {team.city}</div>
            <div style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{team.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: '15px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{team.wins}–{team.losses}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>·</span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>ELO {Math.round(team.elo)}</span>
              {team.fundingTier && (() => {
                const tc: Record<string, string> = { 'MEGA_MARKET': '#a78bfa', 'LARGE_MARKET': '#3b82f6', 'MID_MARKET': '#64748b', 'SMALL_MARKET': '#f97316' }
                const tl: Record<string, string> = { 'MEGA_MARKET': 'Mega Market', 'LARGE_MARKET': 'Large Market', 'MID_MARKET': 'Mid Market', 'SMALL_MARKET': 'Small Market' }
                const te: Record<string, string[]> = {
                  'MEGA_MARKET': ['Large boost to player development', 'Large boost to player morale', 'Massive reduction in fatigue buildup'],
                  'LARGE_MARKET': ['Modest boost to player development', 'Small boost to player morale', 'Moderate reduction in fatigue buildup'],
                  'MID_MARKET': ['No bonuses or penalties'],
                  'SMALL_MARKET': ['Reduced player development', 'Lower player morale', 'Increased fatigue buildup'],
                }
                return (
                  <TierBadge tier={team.fundingTier} label={tl[team.fundingTier] || team.fundingTier} color={tc[team.fundingTier] || '#64748b'} effects={te[team.fundingTier] || []} size="small" />
                )
              })()}
              {(team.floosbowlChampionships?.length ?? 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  {team.floosbowlChampionships.length}
                </span>
              )}
              {(team.leagueChampionships?.length ?? 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#ca8a04' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                  {team.leagueChampionships.length}
                </span>
              )}
              {team.floosbowlChampion && (
                <span style={{ backgroundColor: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>CHAMPION</span>
              )}
              {team.clinchedTopSeed && !team.floosbowlChampion && (
                <span style={{ backgroundColor: '#ca8a04', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>TOP SEED</span>
              )}
              {team.clinchedPlayoffs && !team.clinchedTopSeed && !team.floosbowlChampion && (
                <span style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>PLAYOFFS</span>
              )}
              {team.eliminated && (
                <span style={{ backgroundColor: '#374151', color: '#6b7280', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>ELIMINATED</span>
              )}
            </div>
          </div>
        </div>

        {/* Ratings in hero */}
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '10px 16px 0' : '14px 24px 0' }}>
          <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', flexWrap: 'wrap' as const }}>
            {[
              { label: 'OVR', value: team.overallRating },
              { label: 'OFF', value: team.offenseRating },
              { label: 'RUN D', value: team.defenseRunCoverageRating },
              { label: 'PASS D', value: team.defensePassCoverageRating },
            ].map(({ label, value }) => {
              const barColor = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', minWidth: '42px' }}>{label}</span>
                  <div style={{ width: isMobile ? '80px' : '100px', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600', fontVariantNumeric: 'tabular-nums', minWidth: '24px' }}>{Math.round(value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '12px 16px 0' : '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'schedule', label: 'Schedule' },
            // Funding and Front Office are now on the dedicated /front-office hub.
            // Favorite-team fans see a quick link inline (below); team page stays
            // focused on roster, coach, schedule, and read-only stats.
          ] as { key: string; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-tour={`team-tab-${tab.key.toLowerCase()}`}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? '700' : '500',
                borderRadius: '6px',
                border: `1px solid ${activeTab === tab.key ? team.color : '#334155'}`,
                backgroundColor: activeTab === tab.key ? `${team.color}20` : 'transparent',
                color: activeTab === tab.key ? '#e2e8f0' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
          {isFavTeam && (
            <div style={{ marginLeft: 'auto' }}>
              <HelpButton onClick={() => { tour.hasCompleted ? setShowHelp(true) : tour.startTour() }} size={24} />
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>

        {/* === OVERVIEW TAB === */}
        {activeTab === 'overview' && (<>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', alignItems: 'start', marginBottom: '20px' }}>

          {/* Roster */}
          <div data-tour="team-roster" style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Roster')}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ROSTER_SLOTS.map(([slot, posLabel]) => {
                const player = team.roster?.[slot]
                return (
                  <div key={slot} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#0f172a',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', minWidth: '28px' }}>{posLabel}</span>
                    {player ? (
                      <>
                        <PlayerAvatar name={player.name} size={32} bgColor={team.color} />
                        <PlayerHoverCard playerId={player.id} playerName={player.name}>
                          <Link
                            to={`/players/${player.id}`}
                            style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {player.name}
                          </Link>
                        </PlayerHoverCard>
                        <Stars stars={player.ratingStars} size={12} />
                        {player.defensivePosition && (
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', backgroundColor: '#1e293b', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>
                            {player.defensivePosition}
                          </span>
                        )}
                        {player.termRemaining != null && (
                          <span style={{
                            fontSize: '11px',
                            color: player.termRemaining === 1 ? '#f59e0b' : '#94a3b8',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                            marginLeft: '4px',
                          }}>
                            {player.termRemaining} season{player.termRemaining !== 1 ? 's' : ''} remaining
                          </span>
                        )}
                        {retirementWatch[player.id] && (
                          <RetirementBadge risk={retirementWatch[player.id].risk} />
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#475569' }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Prospect Pipeline — drafted rookies developing toward roster promotion.
                Always rendered so empty pipelines are visible (no prospects = "drafted
                empty rosters" hint for fans to understand the system). */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  Prospect Pipeline
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {prospects.length} / {(prospectsMeta?.slotCapPerPosition ?? 2) * 5} slots
                </span>
              </div>
              {prospects.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 0' }}>
                  No prospects in the pipeline yet. Rookies are drafted each offseason
                  — 24 rookies per class, worst-first order, 1 pick per team.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {prospects.map(p => {
                    const windowLabel = p.seasonsRemaining === 0
                      ? 'final year'
                      : `${p.seasonsRemaining} season${p.seasonsRemaining !== 1 ? 's' : ''} left`
                    return (
                      <div key={p.playerId} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '4px 8px', borderRadius: '4px', backgroundColor: '#0f172a',
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', minWidth: '28px' }}>{p.position}</span>
                        <Link
                          to={`/players/${p.playerId}`}
                          style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {p.name}
                        </Link>
                        <Stars stars={calcStars(p.rating)} size={11} />
                        {p.isUndrafted && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', backgroundColor: '#1e293b', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em' }}>
                            UNDRAFTED
                          </span>
                        )}
                        {p.promotionReady && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em' }}>
                            READY
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {windowLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        {/* Head Coach */}
        {team.coach ? (
          <div data-tour="team-coach" style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Head Coach')}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CoachAvatar name={team.coach.name} size={80} bgColor={team.color} style={{ border: `3px solid ${team.color}` }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>{team.coach.name}</div>
                  <Stars stars={calcStars(team.coach.overallRating)} size={13} />
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                    {team.coach.seasonsCoached} season{team.coach.seasonsCoached !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                {([
                  ['Offensive Mind', team.coach.offensiveMind],
                  ['Defensive Mind', team.coach.defensiveMind],
                  ['Adaptability', team.coach.adaptability],
                  ['Aggressiveness', team.coach.aggressiveness],
                  ['Clock Mgmt', team.coach.clockManagement],
                  ['Player Dev', team.coach.playerDevelopment],
                  ['Scouting', team.coach.scouting],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>{label}</div>
                    {coachAttrBar(val)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <div />}

          </div>

        </>)}

        {/* === FUNDING TAB === */}
        {activeTab === 'funding' && (<>

        {/* Market Tier */}
        {team.funding?.tier && (() => {
          const f = team.funding!
          const tierColors: Record<string, string> = {
            'MEGA_MARKET': '#a78bfa',
            'LARGE_MARKET': '#3b82f6',
            'MID_MARKET': '#64748b',
            'SMALL_MARKET': '#f97316',
          }
          const tierLabels: Record<string, string> = {
            'MEGA_MARKET': 'Mega Market',
            'LARGE_MARKET': 'Large Market',
            'MID_MARKET': 'Mid Market',
            'SMALL_MARKET': 'Small Market',
          }
          const tierEffects: Record<string, string[]> = {
            'MEGA_MARKET': ['Large boost to player development', 'Large boost to player morale', 'Massive reduction in fatigue buildup'],
            'LARGE_MARKET': ['Modest boost to player development', 'Small boost to player morale', 'Moderate reduction in fatigue buildup'],
            'MID_MARKET': ['No bonuses or penalties'],
            'SMALL_MARKET': ['Reduced player development', 'Lower player morale', 'Increased fatigue buildup'],
          }
          const orderedTiers = ['SMALL_MARKET', 'MID_MARKET', 'LARGE_MARKET', 'MEGA_MARKET']
          const currentIdx = orderedTiers.indexOf(f.tier)
          const tierColor = tierColors[f.tier] || '#64748b'

          // Tiers are now relative quartiles; the only meaningful "line" on the bar
          // is the live next-tier threshold (what this team needs to beat to climb).
          const nextSeasonTier = projectedFunding?.nextSeasonProjectedTier
          const projectedIdx = nextSeasonTier
            ? orderedTiers.indexOf(nextSeasonTier)
            : currentIdx
          const projectedTier = orderedTiers[Math.max(0, projectedIdx)]

          const nextSeasonFunding = projectedFunding?.nextSeasonProjectedFunding ?? null
          const projectedTotal = projectedFunding ? f.currentFunding + projectedFunding.projectedAutoContributions : null
          const maxFunding = Math.max(f.currentFunding, projectedTotal ?? 0, nextSeasonFunding ?? 0, f.nextTierThreshold ?? 0)
          const barMin = 0
          const barMax = Math.max(maxFunding * 1.15, (f.nextTierThreshold ?? 0) * 1.1, 1)
          const barRange = barMax - barMin || 1
          const fundingPct = Math.min(Math.max(((f.currentFunding - barMin) / barRange) * 100, 0), 100)
          // Single marker: where the tier above you starts (if there is one)
          const tierMarkers = (f.nextTierThreshold && f.nextTierName)
            ? [{
                tier: f.nextTierName,
                threshold: f.nextTierThreshold,
                pct: Math.min(Math.max(((f.nextTierThreshold - barMin) / barRange) * 100, 0), 100),
                color: tierColors[f.nextTierName] || '#64748b',
                label: tierLabels[f.nextTierName] || f.nextTierName,
                isCurrent: false,
              }]
            : []

          const currentEffects = tierEffects[f.tier]
          const projectedEffects = projectedTier !== f.tier ? tierEffects[projectedTier] : null
          const projectedColor = tierColors[projectedTier] || '#64748b'

          return (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
              {sectionHeader('Market Status')}
              <div style={{ padding: '16px' }}>
                {/* === CURRENT TIER === */}
                <div data-tour="team-funding-tier" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <TierBadge tier={f.tier} label={tierLabels[f.tier] || f.tier} color={tierColor} effects={currentEffects || []} />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Season {f.season}</span>
                </div>

                {/* === NEXT SEASON PROGRESS === */}
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', marginTop: '12px', marginBottom: '6px' }}>
                  Next Season Funding
                </div>

                {/* Funding progress bar */}
                <div data-tour="team-funding-bar" style={{ marginBottom: '8px' }}>
                  <div style={{ position: 'relative', height: '10px', backgroundColor: '#0f172a', borderRadius: '5px', overflow: 'visible' }}>
                    {/* Tier threshold markers */}
                    {tierMarkers.map(m => (
                      <div key={m.tier} style={{
                        position: 'absolute',
                        left: `${m.pct}%`,
                        top: -2,
                        bottom: -2,
                        width: '2px',
                        backgroundColor: m.color,
                        opacity: m.isCurrent ? 0.8 : 0.4,
                      }} />
                    ))}
                    {/* Next-season projected ghost fill (accounts for decay) */}
                    {nextSeasonFunding != null && nextSeasonFunding > f.currentFunding && (() => {
                      const projPct = Math.min(Math.max(((nextSeasonFunding - barMin) / barRange) * 100, 0), 100)
                      return (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: `${projPct}%`,
                          height: '100%',
                          backgroundColor: tierColors[projectedTier] || tierColor,
                          opacity: 0.25,
                          borderRadius: '5px',
                        }} />
                      )
                    })()}
                    {/* Funding fill */}
                    <div style={{
                      position: 'relative',
                      width: `${fundingPct}%`,
                      height: '100%',
                      backgroundColor: projectedIdx > currentIdx ? tierColors[projectedTier] || tierColor : tierColor,
                      borderRadius: '5px',
                      transition: 'width 0.3s',
                    }} />
                    {/* Next-season projected marker line */}
                    {nextSeasonFunding != null && nextSeasonFunding > f.currentFunding && (() => {
                      const projPct = Math.min(Math.max(((nextSeasonFunding - barMin) / barRange) * 100, 0), 100)
                      return (
                        <div style={{
                          position: 'absolute',
                          left: `${projPct}%`,
                          top: -2,
                          bottom: -2,
                          width: '2px',
                          borderLeft: `2px dashed ${tierColors[projectedTier] || tierColor}`,
                          opacity: 0.7,
                        }} />
                      )
                    })()}
                  </div>
                </div>

                {/* Threshold labels */}
                <div style={{ position: 'relative', height: '30px', marginBottom: '12px' }}>
                  {nextSeasonFunding != null && nextSeasonFunding > f.currentFunding && (() => {
                    const projPct = Math.min(Math.max(((nextSeasonFunding - barMin) / barRange) * 100, 0), 100)
                    return (
                      <div style={{
                        position: 'absolute',
                        left: `${projPct}%`,
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}>
                        <div style={{ fontSize: '11px', color: tierColors[projectedTier] || tierColor }}>{nextSeasonFunding}F</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Next S.</div>
                      </div>
                    )
                  })()}
                  {tierMarkers.map(m => (
                    <div key={m.tier} style={{
                      position: 'absolute',
                      left: `${m.pct}%`,
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                      <div style={{ fontSize: '11px', color: m.isCurrent ? '#cbd5e1' : m.color }}>{m.threshold}F</div>
                      <div style={{ fontSize: '10px', color: m.isCurrent ? '#cbd5e1' : '#94a3b8' }}>{m.label.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>

                {/* Compact stats + progress */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#cbd5e1' }}>
                  <span>Funded: <strong style={{ color: '#e2e8f0' }}>{f.currentFunding}F</strong> ({f.baselineFunding ?? 0}F base + {f.fanContributions ?? 0}F contributions)</span>
                  {nextSeasonFunding != null && (
                    <span>Next season: <strong style={{ color: tierColors[projectedTier] || tierColor }}>{nextSeasonFunding}F</strong>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}> ({Math.round((projectedFunding?.decayRate ?? 0.5) * 100)}% carry)</span>
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Projected tier:</span>
                  <TierBadge tier={projectedTier} label={tierLabels[projectedTier]} color={tierColors[projectedTier] || '#64748b'} effects={tierEffects[projectedTier] || []} size="small" />
                </div>

                {/* Fatigue + Contributions side by side */}
                {(() => {
                  const posOrder = ['qb', 'rb', 'wr1', 'wr2', 'te', 'k']
                  const posLabels: Record<string, string> = { qb: 'QB', rb: 'RB', wr1: 'WR1', wr2: 'WR2', te: 'TE', k: 'K' }
                  const rosterPlayers = team.roster ? posOrder.map(p => team.roster[p]).filter(Boolean) as RosterPlayer[] : []
                  const hasFatigue = rosterPlayers.some(p => (p.fatigue ?? 0) > 0)
                  const isFavTeam = user?.favoriteTeamId === team.id
                  const fatigueColorFn = (v: number) => v < 5 ? '#4ade80' : v < 10 ? '#eab308' : v < 15 ? '#f97316' : '#ef4444'

                  if (!hasFatigue && !isFavTeam) return null

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : hasFatigue && isFavTeam ? '1fr 1fr' : '1fr', gap: '32px', marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '14px' }}>

                      {/* Player fatigue */}
                      {hasFatigue && team.roster && (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Player Fatigue</div>
                          {posOrder.map(pos => {
                            const p = team.roster[pos] as RosterPlayer | null
                            if (!p) return null
                            const fat = p.fatigue ?? 0
                            return (
                              <div key={pos} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 50px 80px', gap: '8px', alignItems: 'center', padding: '5px 0' }}>
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{posLabels[pos]}</span>
                                <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{p.name}</span>
                                <span style={{ fontSize: '12px', color: fatigueColorFn(fat), fontWeight: '600', textAlign: 'right' }}>
                                  {fat > 0 ? `${fat.toFixed(1)}%` : 'Fresh'}
                                </span>
                                <div style={{ height: '6px', backgroundColor: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(fat / 20 * 100, 100)}%`, height: '100%', backgroundColor: fatigueColorFn(fat), borderRadius: '3px' }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Contributions */}
                      {isFavTeam && (() => {
                        const contributePresets = [25, 50, 100, 250]
                        const pct = user.teamFundingPct ?? 25
                        const presets = [0, 10, 25, 50, 75, 100]
                        return (
                          <div data-tour="team-funding-contribute">
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Contribute to {team.name}</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
                              {contributePresets.map(amt => (
                                <button
                                  key={amt}
                                  disabled={(user.floobits ?? 0) < amt}
                                  onClick={async () => {
                                    if (!window.confirm(`Contribute ${amt}F to ${team.name}?`)) return
                                    try {
                                      const tok = await getToken()
                                      if (!tok) return
                                      const resp = await fetch(`${API_BASE}/teams/${team.id}/contribute`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                                        body: JSON.stringify({ amount: amt }),
                                      })
                                      const json = await resp.json()
                                      if (json.success) {
                                        refetchUser()
                                        setFundingRefresh(n => n + 1)
                                        const teamResp = await fetch(`${API_BASE}/teams/${team.id}`)
                                        const teamJson = await teamResp.json()
                                        if (teamJson.success && teamJson.data) setTeam(teamJson.data)
                                      } else {
                                        alert(json.detail || 'Contribution failed')
                                      }
                                    } catch (e) { console.error('Failed to contribute', e) }
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    borderRadius: '4px',
                                    border: `1px solid ${(user.floobits ?? 0) < amt ? '#1e293b' : tierColor}`,
                                    backgroundColor: (user.floobits ?? 0) < amt ? 'transparent' : `${tierColor}20`,
                                    color: (user.floobits ?? 0) < amt ? '#334155' : tierColor,
                                    cursor: (user.floobits ?? 0) < amt ? 'not-allowed' : 'pointer',
                                    opacity: (user.floobits ?? 0) < amt ? 0.5 : 1,
                                  }}
                                >
                                  {amt}F
                                </button>
                              ))}
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                              Your balance: {user.floobits ?? 0}F
                            </div>

                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginTop: '16px', marginBottom: '8px' }}>Season-End Auto-Contribution</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                              {presets.map(p => (
                                <button
                                  key={p}
                                  onClick={async () => {
                                    try {
                                      const tok = await getToken()
                                      if (!tok) return
                                      await fetch(`${API_BASE}/users/me/preferences`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                                        body: JSON.stringify({ teamFundingPct: p }),
                                      })
                                      refetchUser()
                                      setFundingRefresh(n => n + 1)
                                    } catch (e) { console.error('Failed to update funding pct', e) }
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '13px',
                                    fontWeight: pct === p ? '700' : '500',
                                    borderRadius: '4px',
                                    border: `1px solid ${pct === p ? tierColor : '#334155'}`,
                                    backgroundColor: pct === p ? `${tierColor}20` : 'transparent',
                                    color: pct === p ? tierColor : '#cbd5e1',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {p}%
                                </button>
                              ))}
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                              {pct}% of your unspent Floobits will fund {team.name} at season end
                            </div>
                          </div>
                        )
                      })()}

                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })()}
        {!team.funding?.tier && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Funding data will be available once the season begins.
          </div>
        )}

        </>)}

        {/* === FRONT OFFICE TAB === */}
        {activeTab === 'frontOffice' && user?.favoriteTeamId === team.id && (
          <FrontOfficePanel teamId={team.id} teamColor={team.color} />
        )}

        {/* === SCHEDULE TAB === */}
        {activeTab === 'schedule' && (<>

        {/* Schedule + Season History side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (team.history?.length ?? 0) > 0 ? '3fr 2fr' : '1fr', gap: '16px', alignItems: 'start' }}>

          {/* Schedule */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Schedule')}
            <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 28px 1fr 44px 80px', gap: '8px', padding: '6px 14px', borderBottom: '1px solid #334155', minWidth: isMobile ? '400px' : undefined }}>
              {['WK', '', 'OPPONENT', 'RESULT', 'SCORE'].map((h, i) => (
                <span key={i} style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textAlign: i >= 3 ? 'right' as const : 'left' as const }}>{h}</span>
              ))}
            </div>
            {team.schedule.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No schedule available</div>
            )}
            {team.schedule.map((game, idx) => {
              const resultColor = game.result === 'W' ? '#22c55e' : game.result === 'L' ? '#ef4444' : '#94a3b8'
              const weekNum = game.week != null ? game.week + 1 : idx + 1
              return (
                <div key={game.gameId} style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 28px 1fr 44px 80px',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '7px 14px',
                  borderBottom: idx < team.schedule.length - 1 ? '1px solid #1a2640' : 'none',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  minWidth: isMobile ? '400px' : undefined,
                }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{weekNum}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{game.isHome ? 'vs' : '@'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <img
                      src={`/avatars/${game.opponent.id}.png`}
                      alt={game.opponent.abbr}
                      style={{ width: '20px', height: '20px', flexShrink: 0 }}
                    />
                    <Link
                      to={`/team/${game.opponent.id}`}
                      style={{ fontSize: '13px', color: '#cbd5e1', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {game.opponent.city} {game.opponent.name}
                    </Link>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {game.result ? (
                      <span style={{ fontSize: '13px', fontWeight: '700', color: resultColor }}>{game.result}</span>
                    ) : game.status === 'Active' ? (
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>LIVE</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>—</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {game.status !== 'Scheduled' ? `${game.teamScore}–${game.oppScore}` : '—'}
                  </div>
                </div>
              )
            })}
            </div>
          </div>

          {/* Season History */}
          {(team.history?.length ?? 0) > 0 && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
              {sectionHeader('Season History')}
              <div style={{ display: 'grid', gridTemplateColumns: '56px 56px 60px 1fr', gap: '8px', padding: '6px 14px', borderBottom: '1px solid #334155' }}>
                {['Season', 'W–L', 'Pts/G', 'Result'].map((h, i) => (
                  <span key={i} style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{h}</span>
                ))}
              </div>
              {team.history.map((s: any, idx: number) => {
                const result = s.floosbowlChamp ? 'Floos Bowl 🏆'
                  : s.leagueChamp ? 'League Champ 🥇'
                  : s.madePlayoffs ? 'Playoffs'
                  : '—'
                const resultColor = s.floosbowlChamp ? '#f59e0b' : s.leagueChamp ? '#ca8a04' : s.madePlayoffs ? '#94a3b8' : '#64748b'
                return (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 56px 60px 1fr',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '7px 14px',
                    borderBottom: idx < team.history.length - 1 ? '1px solid #1a2640' : 'none',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>S{s.season}</span>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{s.wins}–{s.losses}</span>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{s.Offense?.avgPts?.toFixed(1) ?? '—'}</span>
                    <span style={{ fontSize: '13px', color: resultColor }}>{result}</span>
                  </div>
                )
              })}
            </div>
          )}

        </div>

        </>)}

      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Your Team">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
          <button
            onClick={() => { setShowHelp(false); tour.startTour() }}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '11px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: 'pressStart',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8' }}
          >
            Take the Tour
          </button>
        </div>
        <GuideSection title="Overview">
          The overview tab shows your team's active roster and head coach. Each player lists their
          position, star rating, and contract length. The coach card displays six key attributes
          that influence play-calling and player growth.
        </GuideSection>
        <GuideSection title="Funding">
          Fund your team to raise its market tier. Higher tiers grant offseason bonuses to player
          development, morale, and fatigue recovery. Contribute Floobits directly or set an
          auto-contribution percentage that donates from your unspent balance at season end.
          Tiers lock at season start — mid-season contributions build toward next season.
          50% of funding carries forward each season, so sustained contributions are needed to
          maintain high tiers.
        </GuideSection>
        <GuideSection title="Market Tiers">
          Small Market: reduced development and morale, increased fatigue. Mid Market: baseline,
          no bonuses or penalties. Large Market: modest development/morale boost, moderate fatigue
          reduction. Mega Market: large development/morale boost, major fatigue reduction.
          Thresholds: 500F (Mid), 1,000F (Large), 2,000F (Mega).
        </GuideSection>
        <GuideSection title="Schedule">
          Your full season schedule with past results and upcoming matchups. Each row shows the
          week, opponent, result, and score. Active games display a LIVE indicator.
        </GuideSection>
        <GuideSection title="Front Office">
          The Board of Directors convenes in Week 22. Once open, issue directives to influence
          team decisions: fire or hire coaches, re-sign or cut players, and request free agents.
          Each directive costs Floobits. Motions need a quorum before ratification, and all
          resolutions take effect during the offseason.
        </GuideSection>
      </HelpModal>

      {/* Tutorial */}
      {isFavTeam && tour.shouldPrompt && <TourPrompt onStart={tour.startTour} onDismiss={tour.dismissPrompt} />}
      {isFavTeam && tour.isActive && (
        <TutorialOverlay
          steps={tourSteps}
          currentStep={tour.currentStep}
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
          onHelp={() => { tour.skip(); setShowHelp(true) }}
        />
      )}
    </div>
  )
}
