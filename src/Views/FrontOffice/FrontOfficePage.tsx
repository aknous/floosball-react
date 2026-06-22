import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import FrontOfficePanel from '@/Components/FrontOffice/FrontOfficePanel'
import SupporterCard from '@/Components/FrontOffice/SupporterCard'
import FeatureAnnounceModal from '@/Components/FeatureAnnounceModal'
import { isFeatureSeen, markFeatureSeen, FEATURE_SUPPORTER } from '@/utils/featureAnnounce'
import RookiesSection from './RookiesSection'
import FacilitiesSection from './FacilitiesSection'
import { Stars, calcStars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import CareerStageBadge, { hasRenderableStage } from '@/Components/CareerStageBadge'

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
  serviceTime?: string
  fatigue?: number
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
  const { user } = useAuth()
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()

  // One-time "what's new" announcement for the Supporter income feature.
  const [showSupporterNew, setShowSupporterNew] = useState(false)
  useEffect(() => {
    if (user && !isFeatureSeen(FEATURE_SUPPORTER)) setShowSupporterNew(true)
  }, [user])
  const dismissSupporterNew = () => { markFeatureSeen(FEATURE_SUPPORTER); setShowSupporterNew(false) }

  const [team, setTeam] = useState<TeamSummary | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  // Sub-tabs within the Front Office tab so roster voting, the FA ballot, and
  // the prospect ballot each get their own view instead of one long scroll.
  const [voteSubTab, setVoteSubTab] = useState<'roster' | 'fa' | 'prospect'>('roster')

  // Retirement watch + prospects — fetched alongside team data so Overview
  // tab can display the same surfaces as the /team/{id} page
  type RetirementRisk = 'safe' | 'possible' | 'likely' | 'very_likely' | 'retiring'
  interface RetirementEntry { playerId: number; risk: RetirementRisk }
  interface ProspectEntry {
    playerId: number; name: string; position: string; rating: number
    tier: string | null; prospectSeasons: number; seasonsRemaining: number
    draftSeason?: number | null
    isUndrafted: boolean; ratingHistory: RatingPoint[]
  }
  const [retirementWatch, setRetirementWatch] = useState<Record<number, RetirementRisk>>({})
  const [careerStages, setCareerStages] = useState<Record<number, string>>({})
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
      const [teamRes, watchRes, prospectsRes] = await Promise.all([
        fetch(`${API_BASE}/teams/${favTeamId}`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/retirement-watch`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/teams/${favTeamId}/prospects`, { cache: 'reload' }).then(r => r.json()).catch(() => null),
      ])
      if (watchRes?.success && watchRes.data?.watch) {
        const byId: Record<number, RetirementRisk> = {}
        for (const w of watchRes.data.watch) byId[w.playerId] = w.risk
        setRetirementWatch(byId)
        setCareerStages(watchRes.data.stages || {})
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
    { id: 'markets', label: 'Facilities' },
    { id: 'votes', label: 'Front Office' },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
      <FeatureAnnounceModal
        open={showSupporterNew}
        onClose={dismissSupporterNew}
        title="Become a Supporter"
        intro="A new way to earn Floobits just by backing your favorite team."
        items={[
          { title: 'Loyalty dividends', color: '#fbbf24', body: 'Stay with your favorite team to build tenure. The longer you support them, the bigger your weekly dividend.' },
          { title: 'Patron rank', color: '#a5f3fc', body: 'Contribute to your team\'s funding to climb patron ranks and boost your dividend multiplier.' },
          { title: 'Accrue and claim', color: '#4ade80', body: 'Dividends pile up over the season. Claim them here whenever you like. A gold marker shows when there\'s something to collect.' },
        ]}
      />

      {/* Header — compact team summary strip (team / record / tier / funding).
          No page title or season line; the nav already provides the context. */}
      <div style={{
        backgroundColor: '#1e293b', borderRadius: '8px', padding: '10px 12px',
        display: 'flex', flexWrap: 'wrap' as const, gap: '14px', alignItems: 'center',
        marginBottom: '16px',
      }}>
        <img
          src={`/avatars/${team.id}.png`}
          alt={team.abbr}
          style={{ width: '40px', height: '40px', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
            <Link to={`/team/${team.id}`} style={{ color: '#e2e8f0', textDecoration: 'none' }}>
              {team.city} {team.name}
            </Link>
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SupporterCard />
          <OverviewTab
            team={team}
            retirementWatch={retirementWatch}
            careerStages={careerStages}
            prospects={prospects}
          />
        </div>
      )}

      {activeSection === 'markets' && (
        <FacilitiesSection />
      )}

      {activeSection === 'votes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-tabs: each front-office ballot gets its own view */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {([
              { id: 'roster', label: 'Roster Voting' },
              { id: 'fa', label: 'Free Agent Ballot' },
              { id: 'prospect', label: 'Prospect Ballot' },
            ] as const).map(t => {
              const active = voteSubTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setVoteSubTab(t.id)}
                  style={{
                    padding: '7px 14px', fontSize: '13px', fontWeight: active ? 700 : 500,
                    borderRadius: '6px',
                    border: `1px solid ${active ? team.color : '#334155'}`,
                    backgroundColor: active ? `${team.color}22` : 'transparent',
                    color: active ? '#e2e8f0' : '#94a3b8', cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {voteSubTab === 'roster' && (
            <FrontOfficePanel teamId={team.id} teamAbbr={team.abbr} teamColor={team.color} view="roster" />
          )}
          {voteSubTab === 'fa' && (
            <FrontOfficePanel teamId={team.id} teamAbbr={team.abbr} teamColor={team.color} view="fa" />
          )}
          {voteSubTab === 'prospect' && (
            currentWeek >= 22 ? (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                  Prospect Ballot
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', marginBottom: '12px' }}>
                  Rank the prospects you want your team to target in the upcoming draft.
                </div>
                <RookiesSection />
              </div>
            ) : (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '28px 16px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '13px' }}>
                The rookie draft ballot opens at week 22, once the front office is active.
              </div>
            )
          )}
        </div>
      )}
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
  possible:    { label: 'TWILIGHT',       color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  likely:      { label: 'RETIRING?',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  very_likely: { label: 'FAREWELL TOUR',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  retiring:    { label: 'RETIRING',       color: '#f97316', bg: 'rgba(249,115,22,0.18)' },
}

function OverviewTab({
  team, retirementWatch, careerStages, prospects,
}: {
  team: TeamSummary
  retirementWatch: Record<number, 'safe' | 'possible' | 'likely' | 'very_likely' | 'retiring'>
  careerStages: Record<number, string>
  prospects: any[]
}) {
  const isMobile = useIsMobile()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
      {/* Roster */}
      <div style={PANEL_STYLE}>
        <div style={PANEL_HEADER_STYLE}>
          <span style={PANEL_HEADER_LABEL_STYLE}>Roster</span>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ROSTER_SLOT_ORDER.map(([slot, posLabel]) => {
            const player = team.roster?.[slot]

            const positionCell = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '70px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>{posLabel}</span>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: player?.defensivePosition ? '#94a3b8' : 'transparent',
                  backgroundColor: player?.defensivePosition ? '#1e293b' : 'transparent',
                  padding: '1px 6px', borderRadius: '3px', minWidth: '32px',
                  textAlign: 'center', letterSpacing: '0.04em',
                }}>
                  {player?.defensivePosition || ''}
                </span>
              </div>
            )

            if (!player) {
              return (
                <div key={slot} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '7px 10px', borderRadius: '4px', backgroundColor: '#0f172a',
                }}>
                  {positionCell}
                  <span style={{ fontSize: '14px', color: '#475569' }}>—</span>
                </div>
              )
            }

            // Fatigue (0-100 scale) → status pill
            const fatigue = player.fatigue ?? 0
            let statusLabel = 'Fresh'
            let statusColor = '#22c55e'
            if (fatigue > 7) { statusLabel = 'Worn'; statusColor = '#ef4444' }
            else if (fatigue > 4) { statusLabel = 'Worked'; statusColor = '#f59e0b' }
            else if (fatigue > 2) { statusLabel = 'Active'; statusColor = '#94a3b8' }
            const svc = player.serviceTime || ''
            let svcLabel = ''
            let svcColor = '#64748b'
            if (svc === 'Rookie') { svcLabel = 'Rookie'; svcColor = '#22c55e' }
            else if (svc === 'Established') { svcLabel = 'Estab.'; svcColor = '#94a3b8' }
            else if (svc === 'Veteran') { svcLabel = 'Veteran'; svcColor = '#94a3b8' }
            else if (svc === 'Grizzled Veteran') { svcLabel = 'Grizzled'; svcColor = '#f59e0b' }
            else if (svc === 'Ancient Veteran') { svcLabel = 'Ancient'; svcColor = '#ef4444' }

            const nameLink = (
              <PlayerHoverCard playerId={player.id} playerName={player.name}>
                <Link to={`/players/${player.id}`} style={{
                  fontSize: '14px', color: '#e2e8f0', fontWeight: 600,
                  textDecoration: 'none', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                }}>
                  {player.name}
                </Link>
              </PlayerHoverCard>
            )
            const statusPill = (
              <span style={{
                fontSize: '10px', fontWeight: 600,
                color: statusColor,
                backgroundColor: `${statusColor}1a`,
                border: `1px solid ${statusColor}55`,
                padding: '1px 7px', borderRadius: '3px',
                letterSpacing: '0.03em', whiteSpace: 'nowrap',
                textAlign: 'center',
              }}>
                {statusLabel}
              </span>
            )
            const contractText = player.termRemaining != null ? (
              <span style={{
                fontSize: '12px',
                color: player.termRemaining === 1 ? '#f59e0b' : '#94a3b8',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>
                {player.termRemaining}yr left
              </span>
            ) : null
            const svcChip = svcLabel ? (
              <span style={{
                fontSize: '10px', fontWeight: 600,
                color: svcColor, letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}>
                {svcLabel}
              </span>
            ) : null
            const retirementBadge = (retirementWatch[player.id] && RISK_STYLES[retirementWatch[player.id]]) ? (
              <span style={{
                fontSize: '10px', fontWeight: 800,
                color: RISK_STYLES[retirementWatch[player.id]].color,
                backgroundColor: RISK_STYLES[retirementWatch[player.id]].bg,
                padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.04em',
              }}>
                {RISK_STYLES[retirementWatch[player.id]].label}
              </span>
            ) : <CareerStageBadge stage={careerStages[player.id]} />

            if (isMobile) {
              return (
                <div key={slot} style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  padding: '8px 10px', borderRadius: '4px', backgroundColor: '#0f172a',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {positionCell}
                    <div style={{ flex: 1, minWidth: 0 }}>{nameLink}</div>
                    {retirementBadge}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingLeft: '2px' }}>
                    <Stars stars={player.ratingStars} size={11} />
                    {statusPill}
                    {contractText}
                    {svcChip}
                  </div>
                </div>
              )
            }

            return (
              <div key={slot} style={{
                display: 'grid',
                // Fixed widths so rows stay aligned regardless of content.
                // The retirement column reserves a fixed slot only while
                // retirement data is live (weeks 22+); otherwise it collapses.
                gridTemplateColumns: `auto minmax(0, 1fr) 60px 80px ${(Object.keys(retirementWatch).length > 0 || hasRenderableStage(careerStages)) ? '96px' : 'auto'}`,
                columnGap: '10px',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: '4px',
                backgroundColor: '#0f172a',
              }}>
                {positionCell}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  {nameLink}
                  <Stars stars={player.ratingStars} size={11} />
                </div>
                <span>{statusPill}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  {contractText}
                  {svcChip}
                </div>
                <span style={{ minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  {retirementBadge}
                </span>
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
                const posCell = (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', minWidth: '32px' }}>{p.position}</span>
                )
                const nameLink = (
                  <PlayerHoverCard playerId={p.playerId} playerName={p.name}>
                    <Link to={`/players/${p.playerId}`} style={{
                      fontSize: isMobile ? '14px' : '13px', color: '#e2e8f0', fontWeight: 600,
                      textDecoration: 'none', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                    }}>
                      {p.name}
                    </Link>
                  </PlayerHoverCard>
                )
                const draftChip = (
                  <span style={{
                    fontSize: p.isUndrafted ? '9px' : '11px',
                    fontWeight: p.isUndrafted ? 700 : 500,
                    color: '#64748b',
                    backgroundColor: p.isUndrafted ? '#1e293b' : 'transparent',
                    padding: p.isUndrafted ? '1px 5px' : 0,
                    borderRadius: '3px',
                    letterSpacing: p.isUndrafted ? '0.04em' : 'normal',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.isUndrafted
                      ? 'UNDRAFTED'
                      : p.draftSeason != null
                        ? `drafted S${p.draftSeason}`
                        : ''}
                  </span>
                )
                const faText = (
                  <span style={{
                    fontSize: '12px',
                    color: p.seasonsRemaining <= 1 ? '#f59e0b' : '#94a3b8',
                    whiteSpace: 'nowrap', fontWeight: 600,
                  }}>
                    {windowLabel} until FA
                  </span>
                )

                if (isMobile) {
                  return (
                    <div key={p.playerId} style={{
                      display: 'flex', flexDirection: 'column', gap: '4px',
                      padding: '8px 10px', borderRadius: '4px', backgroundColor: '#0f172a',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {posCell}
                        <div style={{ flex: 1, minWidth: 0 }}>{nameLink}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingLeft: '2px' }}>
                        <Stars stars={calcStars(p.rating)} size={11} />
                        {draftChip}
                        {faText}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={p.playerId} style={{
                    display: 'grid',
                    gridTemplateColumns: '32px minmax(0, 1fr) auto auto',
                    columnGap: '10px',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    backgroundColor: '#0f172a',
                  }}>
                    {posCell}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      {nameLink}
                      <Stars stars={calcStars(p.rating)} size={11} />
                    </div>
                    <span style={{ minWidth: '70px', textAlign: 'right' }}>{draftChip}</span>
                    <span style={{ minWidth: '110px', textAlign: 'right' }}>{faText}</span>
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


