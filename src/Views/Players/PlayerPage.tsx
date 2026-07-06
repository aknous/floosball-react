import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Stars, SwordIcon, ShieldIcon, calcStars } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'
import { GiLaurelsTrophy, GiStarMedal, GiStarsStack, GiLaurelCrown } from 'react-icons/gi'
import ArchetypeBadge from '@/Components/ArchetypeBadge'
import { personalityAccent } from '@/utils/personality'
import {
  attitudeTier as attTier, resilienceTier, selfBeliefTier,
  disciplineTier, focusTier, instinctTier, creativityTier,
  pressureHandlingTier, MentalTier,
} from '@/utils/mentalProfile'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const MOOD_COLORS: Record<string, string> = {
  electric: '#22c55e',
  confident: '#4ade80',
  steady: '#94a3b8',
  frustrated: '#f97316',
  miserable: '#ef4444',
}

const ATTITUDE_COLORS: Record<string, string> = {
  leader:   '#22c55e',
  positive: '#4ade80',
  steady:   '#94a3b8',
  sour:     '#f97316',
  toxic:    '#ef4444',
}

// Rarity-tier color mapping for quirks (mirrors backend personalityData tiers)
const QUIRK_TIER_COLORS: Record<string, string> = {
  common:   '#94a3b8',  // slate
  uncommon: '#c4b5fd',  // light purple
  rare:     '#f472b6',  // pink
  unique:   '#a5f3fc',  // cyan
}

interface PersonalityBlock {
  archetype?: string
  archetypeLabel?: string
  quirk?: string
  quirkLabel?: string
  quirkTier?: string
}

interface DemeanorDrift {
  direction: 'composed' | 'volatile'
  from?: string
  season?: number
  week?: number
}

interface PlayerAttributes {
  att1?: string; att1Value?: number; att1stars?: number
  att2?: string; att2Value?: number; att2stars?: number
  att3?: string; att3Value?: number; att3stars?: number
  playmakingStars?: number; playmakingValue?: number
  xFactorStars?: number; xFactorValue?: number
  seasonPerformanceRatingStars?: number; seasonPerformanceRating?: number
  fatigue?: number
  defensiveAttributes?: Record<string, { value: number; stars: number }>
  mood?: string
  moodTier?: string
  attitudeValue?: number
  attitudeLabel?: string
  attitudeTier?: string
  attitude?: number
  resilience?: number
  selfBelief?: number
  pressureHandling?: number
  discipline?: number
  focus?: number
  instinct?: number
  creativity?: number
  demeanor?: string
  demeanorDrift?: DemeanorDrift
  personality?: PersonalityBlock
  // Flavor fields — assigned once at player creation
  hometown?: string
  favorite_category?: string
  favorite_item?: string
  motto?: string
}

interface PlayerData {
  id: number
  name: string
  position: string
  team: string | null
  teamCity: string | null
  teamColor: string | null
  teamSecondaryColor: string | null
  teamId: number | null
  teamAbbr: string | null
  isProspect?: boolean
  draftingTeamId?: number | null
  draftingTeamName?: string | null
  draftingTeamCity?: string | null
  draftingTeamAbbr?: string | null
  draftingTeamColor?: string | null
  seasonsPlayed: number
  ratingStars: number
  playerRating: number
  offensiveRating?: number
  offensiveRatingStars?: number
  defensiveRating?: number
  defensiveRatingStars?: number
  defensivePosition?: string | null
  rank: string
  number: number
  ratingValue: number
  championships: any[]
  mvpAwards?: any[]
  allProSeasons?: any[]
  isHof?: boolean
  hofSeason?: number | null
  recordsHeld?: string[]
  archetype?: string | null
  seasonImpact?: { offenseTier?: string | null; defenseTier?: string | null; offenseScore?: number | null; defenseValue?: number | null } | null
  attributes: PlayerAttributes
  stats: any[]
  allTimeStats: any
}

const POSITION_FULL: Record<string, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', K: 'Kicker',
}

// Defensive position full names (players play both ways: QB->S, RB->LB, WR->CB, TE->DE).
const DEF_POSITION_FULL: Record<string, string> = {
  S: 'Safety', LB: 'Linebacker', CB: 'Cornerback', DE: 'Defensive End',
}

// Season-impact tier colors (hybrid archetype layer).
const TIER_COLOR: Record<string, string> = { Elite: '#fbbf24', Strong: '#22c55e', Average: '#94a3b8', Quiet: '#64748b' }

// ── Jersey SVG ───────────────────────────────────────────────────────────────

const PlayerJersey: React.FC<{ color: string; secondary: string | null; number: number; name: string }> = ({ color, secondary, number, name }) => {
  const lastName = name.includes(' ') ? name.split(' ').slice(-1)[0] : name
  const displayName = lastName.toUpperCase().slice(0, 11)
  const displayNum = number > 0 ? String(number) : ''
  const numFontSize = displayNum.length > 1 ? 68 : 84
  const accentColor = secondary || 'rgba(255,255,255,0.75)'

  // viewBox 200×185 — wider proportions than 160×185
  return (
    <svg viewBox="0 0 200 185" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <filter id="jersey-drop" x="-15%" y="-10%" width="130%" height="125%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <clipPath id="lsleeve">
          <path d="M 36,15 L 0,40 L 16,68 L 52,56 Z" />
        </clipPath>
        <clipPath id="rsleeve">
          <path d="M 164,15 L 200,40 L 184,68 L 148,56 Z" />
        </clipPath>
      </defs>

      {/* Full jersey */}
      <path
        d="M 80,24 L 36,15 L 0,40 L 16,68 L 52,56 L 46,178 L 154,178 L 148,56 L 184,68 L 200,40 L 164,15 L 120,24 Q 100,52 80,24 Z"
        fill={color}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1.5"
        filter="url(#jersey-drop)"
      />

      {/* Sleeve stripes */}
      <g clipPath="url(#lsleeve)">
        <rect x="-5" y="37" width="70" height="9" fill={accentColor} />
        <rect x="-5" y="50" width="70" height="9" fill={accentColor} />
      </g>
      <g clipPath="url(#rsleeve)">
        <rect x="135" y="37" width="70" height="9" fill={accentColor} />
        <rect x="135" y="50" width="70" height="9" fill={accentColor} />
      </g>

      {/* Sleeve shade */}
      <path d="M 36,15 L 0,40 L 16,68 L 52,56 L 48,28 Z" fill="rgba(0,0,0,0.10)" />
      <path d="M 164,15 L 200,40 L 184,68 L 148,56 L 152,28 Z" fill="rgba(0,0,0,0.10)" />

      {/* Body highlight */}
      <path
        d="M 80,24 Q 100,52 120,24 L 148,56 L 154,178 L 46,178 L 52,56 Z"
        fill="rgba(255,255,255,0.05)"
      />

      {/* Collar */}
      <path d="M 80,24 Q 100,52 120,24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" />

      {/* Name */}
      <text
        x="100" y="68"
        textAnchor="middle"
        fontSize={displayName.length > 9 ? 10 : 13}
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill={accentColor}
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="2.5"
        paintOrder="stroke"
        letterSpacing="1.5"
      >
        {displayName}
      </text>

      {/* Number */}
      {displayNum && (
        <text
          x="100" y="148"
          textAnchor="middle"
          fontSize={numFontSize}
          fontWeight="900"
          fontFamily="'Arial Black', Arial, sans-serif"
          fill={accentColor}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="4"
          paintOrder="stroke"
        >
          {displayNum}
        </text>
      )}
    </svg>
  )
}

// ── Shared table styles ─────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: '600', color: '#64748b', padding: '7px 10px',
  textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #334155',
  backgroundColor: '#0f172a',
}
const tdStyle: React.CSSProperties = {
  fontSize: '13px', color: '#cbd5e1', padding: '7px 10px',
  whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
}
const tdFirst: React.CSSProperties = { ...tdStyle, color: '#94a3b8' }
const careerTdStyle: React.CSSProperties = {
  ...tdStyle, fontWeight: '700', color: '#e2e8f0', backgroundColor: '#0f172a',
}
const careerTdFirst: React.CSSProperties = {
  ...careerTdStyle, fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
}

function teamCell(data: any) {
  return (
    <td style={{ ...tdStyle, fontWeight: '600', color: data?.color || '#94a3b8' }}>
      {data?.team ?? '—'}
    </td>
  )
}

function QBStatsTable({ stats, career }: { stats: any[]; career: any }) {
  const p = career?.passing ?? {}
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Season', 'Team', 'Comp', 'Att', 'Comp%', 'TDs', 'INTs', 'Yds', 'YPC', 'Pts'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* Career totals */}
        <tr style={{ borderBottom: '1px solid #334155' }}>
          <td style={careerTdFirst}>CAREER</td>
          <td style={careerTdStyle}></td>
          <td style={careerTdStyle}>{p.comp ?? '—'}</td>
          <td style={careerTdStyle}>{p.att ?? '—'}</td>
          <td style={careerTdStyle}>{p.compPerc != null ? `${p.compPerc}%` : '—'}</td>
          <td style={careerTdStyle}>{p.tds ?? '—'}</td>
          <td style={careerTdStyle}>{p.ints ?? '—'}</td>
          <td style={careerTdStyle}>{p.yards ?? '—'}</td>
          <td style={careerTdStyle}>{p.ypc ?? '—'}</td>
          <td style={careerTdStyle}>{career?.fantasyPoints?.toFixed(1) ?? '—'}</td>
        </tr>
        {stats?.map((s, idx) => (
          <tr key={idx} style={{
            borderBottom: '1px solid #1a2640',
            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}>
            <td style={tdFirst}>S{s.season}</td>
            {teamCell(s)}
            <td style={tdStyle}>{s.passing?.comp ?? '—'}</td>
            <td style={tdStyle}>{s.passing?.att ?? '—'}</td>
            <td style={tdStyle}>{s.passing?.compPerc != null ? `${s.passing.compPerc}%` : '—'}</td>
            <td style={tdStyle}>{s.passing?.tds ?? '—'}</td>
            <td style={tdStyle}>{s.passing?.ints ?? '—'}</td>
            <td style={tdStyle}>{s.passing?.yards ?? '—'}</td>
            <td style={tdStyle}>{s.passing?.ypc ?? '—'}</td>
            <td style={tdStyle}>{s.fantasyPoints?.toFixed(1) ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RBStatsTable({ stats, career }: { stats: any[]; career: any }) {
  const r = career?.rushing ?? {}
  const cRcv = career?.receiving ?? {}
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Season', 'Team', 'Carr', 'Yds', 'YPC', 'TDs', 'FUM', 'Rec', 'Rec Yds', 'Pts'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #334155' }}>
          <td style={careerTdFirst}>CAREER</td>
          <td style={careerTdStyle}></td>
          <td style={careerTdStyle}>{r.carries ?? '—'}</td>
          <td style={careerTdStyle}>{r.yards ?? '—'}</td>
          <td style={careerTdStyle}>{r.ypc ?? '—'}</td>
          <td style={careerTdStyle}>{r.tds ?? '—'}</td>
          <td style={careerTdStyle}>{r.fumblesLost ?? '—'}</td>
          <td style={careerTdStyle}>{cRcv.receptions ?? '—'}</td>
          <td style={careerTdStyle}>{cRcv.yards ?? '—'}</td>
          <td style={careerTdStyle}>{career?.fantasyPoints?.toFixed(1) ?? '—'}</td>
        </tr>
        {stats?.map((s, idx) => (
          <tr key={idx} style={{
            borderBottom: '1px solid #1a2640',
            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}>
            <td style={tdFirst}>S{s.season}</td>
            {teamCell(s)}
            <td style={tdStyle}>{s.rushing?.carries ?? '—'}</td>
            <td style={tdStyle}>{s.rushing?.yards ?? '—'}</td>
            <td style={tdStyle}>{s.rushing?.ypc ?? '—'}</td>
            <td style={tdStyle}>{s.rushing?.tds ?? '—'}</td>
            <td style={tdStyle}>{s.rushing?.fumblesLost ?? '—'}</td>
            <td style={tdStyle}>{s.receiving?.receptions ?? '—'}</td>
            <td style={tdStyle}>{s.receiving?.yards ?? '—'}</td>
            <td style={tdStyle}>{s.fantasyPoints?.toFixed(1) ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RcvStatsTable({ stats, career }: { stats: any[]; career: any }) {
  const rcv = career?.receiving ?? {}
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Season', 'Team', 'Rec', 'Targ', 'Rcv%', 'YPR', 'TDs', 'Yds', 'Pts'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #334155' }}>
          <td style={careerTdFirst}>CAREER</td>
          <td style={careerTdStyle}></td>
          <td style={careerTdStyle}>{rcv.receptions ?? '—'}</td>
          <td style={careerTdStyle}>{rcv.targets ?? '—'}</td>
          <td style={careerTdStyle}>{rcv.rcvPerc != null ? `${rcv.rcvPerc}%` : '—'}</td>
          <td style={careerTdStyle}>{rcv.ypr ?? '—'}</td>
          <td style={careerTdStyle}>{rcv.tds ?? '—'}</td>
          <td style={careerTdStyle}>{rcv.yards ?? '—'}</td>
          <td style={careerTdStyle}>{career?.fantasyPoints?.toFixed(1) ?? '—'}</td>
        </tr>
        {stats?.map((s, idx) => (
          <tr key={idx} style={{
            borderBottom: '1px solid #1a2640',
            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}>
            <td style={tdFirst}>S{s.season}</td>
            {teamCell(s)}
            <td style={tdStyle}>{s.receiving?.receptions ?? '—'}</td>
            <td style={tdStyle}>{s.receiving?.targets ?? '—'}</td>
            <td style={tdStyle}>{s.receiving?.rcvPerc != null ? `${s.receiving.rcvPerc}%` : '—'}</td>
            <td style={tdStyle}>{s.receiving?.ypr ?? '—'}</td>
            <td style={tdStyle}>{s.receiving?.tds ?? '—'}</td>
            <td style={tdStyle}>{s.receiving?.yards ?? '—'}</td>
            <td style={tdStyle}>{s.fantasyPoints?.toFixed(1) ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function KStatsTable({ stats, career }: { stats: any[]; career: any }) {
  const k = career?.kicking ?? {}
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Season', 'Team', 'FGs', 'Att', 'FG%', '<20%', '20-40%', '40-50%', '50+%', 'Pts'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #334155' }}>
          <td style={careerTdFirst}>CAREER</td>
          <td style={careerTdStyle}></td>
          <td style={careerTdStyle}>{k.fgs ?? '—'}</td>
          <td style={careerTdStyle}>{k.fgAtt ?? '—'}</td>
          <td style={careerTdStyle}>{k.fgPerc != null ? `${k.fgPerc}%` : '—'}</td>
          <td style={careerTdStyle}>{k.fgUnder20perc != null ? `${k.fgUnder20perc}%` : '—'}</td>
          <td style={careerTdStyle}>{k.fg20to40perc != null ? `${k.fg20to40perc}%` : '—'}</td>
          <td style={careerTdStyle}>{k.fg40to50perc != null ? `${k.fg40to50perc}%` : '—'}</td>
          <td style={careerTdStyle}>{k.fgOver50perc != null ? `${k.fgOver50perc}%` : '—'}</td>
          <td style={careerTdStyle}>{career?.fantasyPoints?.toFixed(1) ?? '—'}</td>
        </tr>
        {stats?.map((s, idx) => (
          <tr key={idx} style={{
            borderBottom: '1px solid #1a2640',
            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}>
            <td style={tdFirst}>S{s.season}</td>
            {teamCell(s)}
            <td style={tdStyle}>{s.kicking?.fgs ?? '—'}</td>
            <td style={tdStyle}>{s.kicking?.fgAtt ?? '—'}</td>
            <td style={tdStyle}>{s.kicking?.fgPerc != null ? `${s.kicking.fgPerc}%` : '—'}</td>
            <td style={tdStyle}>{s.kicking?.fgUnder20perc != null ? `${s.kicking.fgUnder20perc}%` : '—'}</td>
            <td style={tdStyle}>{s.kicking?.fg20to40perc != null ? `${s.kicking.fg20to40perc}%` : '—'}</td>
            <td style={tdStyle}>{s.kicking?.fg40to50perc != null ? `${s.kicking.fg40to50perc}%` : '—'}</td>
            <td style={tdStyle}>{s.kicking?.fgOver50perc != null ? `${s.kicking.fgOver50perc}%` : '—'}</td>
            <td style={tdStyle}>{s.fantasyPoints?.toFixed(1) ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DefenseStatsTable({ stats, career }: { stats: any[]; career: any }) {
  const d = career?.defense ?? {}
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Season', 'Team', 'TKL', 'SCK', 'INT', 'TFL', 'FF', 'PBU'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #334155' }}>
          <td style={careerTdFirst}>CAREER</td>
          <td style={careerTdStyle}></td>
          <td style={careerTdStyle}>{d.tackles ?? '—'}</td>
          <td style={careerTdStyle}>{d.sacks ?? '—'}</td>
          <td style={careerTdStyle}>{d.ints ?? '—'}</td>
          <td style={careerTdStyle}>{d.tfl ?? '—'}</td>
          <td style={careerTdStyle}>{d.forcedFumbles ?? '—'}</td>
          <td style={careerTdStyle}>{d.passBreakups ?? '—'}</td>
        </tr>
        {stats?.map((s, idx) => (
          <tr key={idx} style={{
            borderBottom: '1px solid #1a2640',
            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          }}>
            <td style={tdFirst}>S{s.season}</td>
            {teamCell(s)}
            <td style={tdStyle}>{s.defense?.tackles ?? '—'}</td>
            <td style={tdStyle}>{s.defense?.sacks ?? '—'}</td>
            <td style={tdStyle}>{s.defense?.ints ?? '—'}</td>
            <td style={tdStyle}>{s.defense?.tfl ?? '—'}</td>
            <td style={tdStyle}>{s.defense?.forcedFumbles ?? '—'}</td>
            <td style={tdStyle}>{s.defense?.passBreakups ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

interface RatingPoint { season: number; rating: number }

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([])
  const [ratingCeiling, setRatingCeiling] = useState<number | null>(null)
  const [quotes, setQuotes] = useState<Array<{ text: string; event?: string; personality?: string; timestamp?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [statsView, setStatsView] = useState<'offense' | 'defense'>('offense')
  const [detailTab, setDetailTab] = useState<'attributes' | 'progression' | 'profile' | 'moments' | 'awards'>('attributes')
  const isMobile = useIsMobile()
  const { user, followedPlayerIds, followPlayer, unfollowPlayer } = useAuth()
  const playerId = id ? parseInt(id, 10) : null
  const isFollowing = playerId != null && followedPlayerIds.has(playerId)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/players/${id}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/players/${id}/rating-history`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/players/${id}/quotes`).then(r => r.json()).catch(() => null),
    ]).then(([playerRes, historyRes, quotesRes]) => {
      if (playerRes?.success && playerRes.data) setPlayer(playerRes.data)
      if (historyRes?.success && historyRes.data?.history) setRatingHistory(historyRes.data.history)
      if (historyRes?.success) setRatingCeiling(historyRes.data?.ceiling ?? null)
      if (quotesRes?.success && Array.isArray(quotesRes.data)) setQuotes(quotesRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#0f172a', minHeight: '100vh' }}>Loading…</div>
  )
  if (!player) return (
    <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#0f172a', minHeight: '100vh' }}>Player not found</div>
  )

  const teamColor = player.teamColor || '#64748b'
  const teamSecondary = player.teamSecondaryColor || null

  const sectionHeader = (label: string) => (
    <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )

  const DEF_ATTR_NAMES: Record<string, string> = {
    coverage: 'Coverage', tackling: 'Tackling', playReading: 'Play Reading',
    passRush: 'Pass Rush', runDefense: 'Run Defense', blitzing: 'Blitzing',
  }

  const attrRow = (label: string, _stars: number, value: number, isOverall = false, icon?: React.ReactNode) => {
    const barColor = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    // 0-100 mapping so the bar reads naturally against the displayed
    // number: an 80 fills ~80%, a 50 fills 50%, etc. The old formula
    // normalized to a 60-100 range, which left any defensive attr
    // below 60 (common for non-primary defenders) as an empty bar.
    const pct = Math.max(0, Math.min(100, value))
    return (
      <div key={label} style={{ marginBottom: isOverall ? '16px' : '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
          <span style={{ fontSize: isOverall ? '15px' : '13px', fontWeight: isOverall ? '700' : '400', color: isOverall ? '#e2e8f0' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {icon}{label}
          </span>
          <span style={{ fontSize: isOverall ? '22px' : '16px', fontWeight: '700', color: isOverall ? teamColor : '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </div>
        <div style={{ height: isOverall ? '6px' : '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '2px' }} />
        </div>
      </div>
    )
  }

  const { attributes: att } = player

  // Build separate attribute groups for two-column layout
  const offAttrs: { label: string; stars: number; value: number }[] = []
  const defAttrs: { label: string; stars: number; value: number }[] = []
  if (att) {
    // Offensive attributes
    if (att.att1 && att.att1Value != null)  offAttrs.push({ label: att.att1,    stars: att.att1stars ?? 1,   value: att.att1Value })
    if (att.att2 && att.att2Value != null)  offAttrs.push({ label: att.att2,    stars: att.att2stars ?? 1,   value: att.att2Value })
    if (att.att3 && att.att3Value != null)  offAttrs.push({ label: att.att3,    stars: att.att3stars ?? 1,   value: att.att3Value })
    if (att.playmakingValue != null)        offAttrs.push({ label: 'Playmaking', stars: att.playmakingStars ?? 1, value: att.playmakingValue })
    if (att.xFactorValue != null)           offAttrs.push({ label: 'X-Factor',  stars: att.xFactorStars ?? 1,    value: att.xFactorValue })
    // Defensive attributes (position-specific)
    if (att.defensiveAttributes && player.defensivePosition) {
      Object.entries(att.defensiveAttributes).forEach(([key, { value, stars }]) => {
        defAttrs.push({ label: DEF_ATTR_NAMES[key] ?? key, stars, value })
      })
    }
  }
  const hasDefense = player.defensivePosition && player.defensiveRating != null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>

      {/* Hero + Attributes — hero stack on the left (jersey, name, team,
          Mood, hometown, favorite, motto), attributes/progression panel
          on the right.  Recent Moments lives below the 2-col row. */}
      <div style={{
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: isMobile ? '20px 16px' : '28px 24px',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', flexDirection: 'column' as const,
          gap: isMobile ? '20px' : '24px',
        }}>

        {/* Hero + Attributes + Moments 3-col row (collapses to single column on mobile) */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: 'column' as const,
          gridTemplateColumns: isMobile ? undefined : '320px 1fr 300px',
          gap: isMobile ? '20px' : '20px',
          alignItems: 'start',
        }}>

          {/* ── Left column: hero stack ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: isMobile ? '12px' : '16px' }}>
            <div style={{ width: isMobile ? '100px' : '144px' }}>
              <PlayerJersey color={teamColor} secondary={teamSecondary} number={player.number} name={player.name} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#64748b' }}>
                {POSITION_FULL[player.position] ?? player.position}
                {player.defensivePosition && ` · ${DEF_POSITION_FULL[player.defensivePosition] ?? player.defensivePosition}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{player.name}</span>
                <ArchetypeBadge archetype={player.archetype} size={isMobile ? 16 : 18} />
              </div>
              {player.isHof && (
                <div style={{ marginTop: '7px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 11px', borderRadius: '999px',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.20), rgba(251,191,36,0.10))',
                    border: '1px solid rgba(251,191,36,0.45)',
                  }}>
                    <GiLaurelCrown style={{ fontSize: '15px', color: '#fbbf24', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Hall of Famer{player.hofSeason ? ` · Class of S${player.hofSeason}` : ''}
                    </span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                <Stars stars={player.ratingStars} size={16} />
                {(player.isProspect || player.rank) && (
                  <>
                    <span style={{ fontSize: '13px', color: '#475569' }}>·</span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                      {player.isProspect ? 'Prospect' : player.rank}
                    </span>
                  </>
                )}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                {player.teamId ? (
                  <Link to={`/team/${player.teamId}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={`/avatars/${player.teamId}.png`} alt="" style={{ width: '32px', height: '32px' }} />
                    <span style={{ fontSize: '20px', color: teamColor, fontWeight: '600' }}>
                      {player.teamCity} {player.team}
                    </span>
                  </Link>
                ) : player.isProspect && player.draftingTeamId ? (
                  <Link to={`/team/${player.draftingTeamId}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                      color: '#0f172a', backgroundColor: '#a78bfa',
                      padding: '2px 6px', borderRadius: '3px',
                    }}>
                      PROSPECT
                    </span>
                    <img src={`/avatars/${player.draftingTeamId}.png`} alt="" style={{ width: '28px', height: '28px' }} />
                    <span style={{ fontSize: '18px', color: player.draftingTeamColor ?? '#cbd5e1', fontWeight: '600' }}>
                      {player.draftingTeamCity} {player.draftingTeamName}
                    </span>
                  </Link>
                ) : (
                  <span style={{ fontSize: '14px', color: '#64748b' }}>{player.rank === 'Retired' ? 'Retired' : 'Free Agent'}</span>
                )}
              </div>
              {player.seasonImpact && (player.seasonImpact.offenseTier || player.seasonImpact.defenseTier) && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>This season</span>
                  {player.seasonImpact.offenseTier && <span>Offense <b style={{ color: TIER_COLOR[player.seasonImpact.offenseTier] ?? '#94a3b8' }}>{player.seasonImpact.offenseTier}</b></span>}
                  {player.seasonImpact.defenseTier && <span>Defense <b style={{ color: TIER_COLOR[player.seasonImpact.defenseTier] ?? '#94a3b8' }}>{player.seasonImpact.defenseTier}</b></span>}
                </div>
              )}
              {user && playerId != null && (
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => isFollowing ? unfollowPlayer(playerId) : followPlayer(playerId)}
                    style={{
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
                      padding: '5px 12px', borderRadius: '5px',
                      backgroundColor: isFollowing ? 'rgba(59,130,246,0.18)' : 'transparent',
                      color: isFollowing ? '#60a5fa' : '#94a3b8',
                      border: '1px solid ' + (isFollowing ? 'rgba(59,130,246,0.4)' : '#334155'),
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                    title={isFollowing
                      ? "Unfollow — stop seeing this player's off-day lines in the highlight feed"
                      : "Follow — show this player's off-day lines in the highlight feed"}
                  >
                    {isFollowing ? '★ Following' : '☆ Follow'}
                  </button>
                </div>
              )}
              {att?.personality?.archetypeLabel && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#e2e8f0', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {att.personality.archetypeLabel}
                </div>
              )}
              {/* Mood badge — current mental state. The rest of the
                  mental profile (Attitude, Pressure, etc.) lives in the
                  Attributes panel; mood headlines here so it's visible
                  alongside the player's identity. */}
              {att?.mood && (() => {
                const accent = MOOD_COLORS[att.moodTier || 'steady'] || '#94a3b8'
                return (
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <span
                      title="Mental state — blends week-to-week confidence/determination with locker-room presence (attitude)."
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: accent,
                        backgroundColor: `${accent}1a`,
                        border: `1px solid ${accent}66`,
                        padding: '3px 10px',
                        borderRadius: '4px',
                      }}>
                      Mood: <span style={{ fontWeight: '700' }}>{att.mood}</span>
                    </span>
                  </div>
                )
              })()}

              {/* Profile flavor inline in the hero, label-on-each-line format. */}
              {(att?.hometown || att?.favorite_item || att?.motto) && (() => {
                const labelStyle: React.CSSProperties = { color: '#94a3b8', fontWeight: 600 }
                const valueStyle: React.CSSProperties = { color: '#cbd5e1' }
                const favLabel = att?.favorite_category
                  ? att.favorite_category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  : null
                return (
                  <div style={{ marginTop: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column' as const, gap: '5px', fontSize: '14px', maxWidth: '300px' }}>
                    {att?.hometown && (
                      <div>
                        <span style={labelStyle}>From:</span> <span style={valueStyle}>{att.hometown}</span>
                      </div>
                    )}
                    {att?.favorite_item && favLabel && (
                      <div>
                        <span style={labelStyle}>Favorite {favLabel}:</span> <span style={valueStyle}>{att.favorite_item}</span>
                      </div>
                    )}
                    {att?.motto && (
                      <div>
                        <span style={labelStyle}>Motto:</span> <span style={{ ...valueStyle, fontStyle: 'italic' as const }}>"{att.motto}"</span>
                      </div>
                    )}
                  </div>
                )
              })()}

            </div>
          </div>

          {/* ── Right column: Attributes / Progression / Awards tabbed panel.
              Tabs whose source data is empty are hidden. ── */}
          {(() => {
            const hasProgression = ratingHistory.length > 0
            // Awards moved to a dedicated Trophy Case panel below
            // Recent Moments in the right column.
            const tabs: Array<{ key: typeof detailTab; label: string; show: boolean }> = [
              { key: 'attributes',  label: 'Attributes',  show: true },
              { key: 'progression', label: 'Progression', show: hasProgression },
            ]
            const visibleTabs = tabs.filter(t => t.show)
            // If somehow the active tab got hidden, fall back to attributes
            const activeTab = visibleTabs.some(t => t.key === detailTab) ? detailTab : 'attributes'

            return (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', width: isMobile ? '100%' : undefined, display: 'flex', flexDirection: 'column' as const }}>
                {/* Tab strip */}
                <div style={{ display: 'flex', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                  {visibleTabs.map(t => {
                    const active = activeTab === t.key
                    return (
                      <button
                        key={t.key}
                        onClick={() => setDetailTab(t.key)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: active ? '#e2e8f0' : '#94a3b8',
                          backgroundColor: active ? '#1e293b' : 'transparent',
                          border: 'none',
                          borderBottom: active ? `2px solid ${teamColor}` : '2px solid transparent',
                          cursor: 'pointer',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.05em',
                          fontFamily: 'inherit',
                          transition: 'background-color 0.15s, color 0.15s',
                        }}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>

                {/* Panels — all tabs live in the same CSS grid cell so the
                    container's height locks to max(tab heights). Non-active
                    tabs are hidden via visibility but still occupy layout,
                    so switching tabs never resizes the container. */}
                {/* Conditional rendering instead of stacked grid cells —
                    panel sizes to the active tab's content. Tab switch will
                    resize, accepted tradeoff to avoid persistent empty space. */}
                <div style={{ padding: '14px 16px' }}>
                  {/* Attributes panel — Skills on the left, Mental Profile
                      on the right. Two halves of the same "what is this
                      player" picture; sitting them side-by-side instead of
                      stacked keeps the page from getting pushed taller. */}
                  {activeTab === 'attributes' && (() => {
                    const mentalRows: { label: string; tier: MentalTier }[] = []
                    if (att?.attitude != null) mentalRows.push({ label: 'Presence', tier: attTier(att.attitude) })
                    if (att?.pressureHandling != null) mentalRows.push({ label: 'Pressure', tier: pressureHandlingTier(att.pressureHandling) })
                    if (att?.resilience != null) mentalRows.push({ label: 'Resilience', tier: resilienceTier(att.resilience) })
                    if (att?.selfBelief != null) mentalRows.push({ label: 'Self-belief', tier: selfBeliefTier(att.selfBelief) })
                    if (att?.discipline != null) mentalRows.push({ label: 'Discipline', tier: disciplineTier(att.discipline) })
                    if (att?.focus != null) mentalRows.push({ label: 'Focus', tier: focusTier(att.focus) })
                    if (att?.instinct != null) mentalRows.push({ label: 'Instinct', tier: instinctTier(att.instinct) })
                    if (att?.creativity != null) mentalRows.push({ label: 'Creativity', tier: creativityTier(att.creativity) })
                    const hasMental = mentalRows.length > 0
                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile || !hasMental ? '1fr' : '1fr 1fr',
                        gap: isMobile ? '16px' : '20px',
                      }}>
                        {/* Left: Skills (overall + perf + off/def side-by-side + fatigue) */}
                        <div>
                          <div style={{
                            fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                            letterSpacing: '0.08em', marginBottom: '10px',
                            textAlign: 'center',
                          }}>SKILLS</div>
                          {attrRow('Overall', player.ratingStars, player.playerRating, true)}
                          {att?.seasonPerformanceRating != null && att.seasonPerformanceRating > 0 &&
                            attrRow('Performance', att.seasonPerformanceRatingStars ?? 1, att.seasonPerformanceRating)}

                          {/* Offense / Defense — side-by-side keeps the Skills
                              column from stretching the panel taller than Mental.
                              Each header has a labelled gauge so the column's
                              overall rating reads visually, not just as a number. */}
                          {(() => {
                            const headerColor = (v: number | undefined) => !v ? '#475569'
                              : v >= 85 ? '#22c55e' : v >= 72 ? '#f59e0b' : '#ef4444'
                            const headerGauge = (v: number | undefined) => {
                              if (v == null) return null
                              const c = headerColor(v)
                              return (
                                <div style={{ height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                                  <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: '100%', backgroundColor: c, borderRadius: '2px' }} />
                                </div>
                              )
                            }
                            if (hasDefense) {
                              return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #334155' }}>
                                      <SwordIcon size={12} color="#94a3b8" />
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Off</span>
                                      {player.offensiveRating != null && (
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginLeft: 'auto' }}>{player.offensiveRating}</span>
                                      )}
                                    </div>
                                    {headerGauge(player.offensiveRating)}
                                    {offAttrs.map(a => attrRow(a.label, a.stars, a.value))}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #334155' }}>
                                      <ShieldIcon size={12} color="#94a3b8" />
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Def</span>
                                      {player.defensiveRating != null && (
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginLeft: 'auto' }}>{player.defensiveRating}</span>
                                      )}
                                    </div>
                                    {headerGauge(player.defensiveRating)}
                                    {defAttrs.map(a => attrRow(a.label, a.stars, a.value))}
                                  </div>
                                </div>
                              )
                            }
                            return (
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #334155' }}>
                                  <SwordIcon size={13} color="#94a3b8" />
                                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Offense</span>
                                  {player.offensiveRating != null && (
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginLeft: 'auto' }}>{player.offensiveRating}</span>
                                  )}
                                </div>
                                {headerGauge(player.offensiveRating)}
                                {offAttrs.map(a => attrRow(a.label, a.stars, a.value))}
                              </div>
                            )
                          })()}

                          {/* Fatigue */}
                          {att?.fatigue != null && att.fatigue > 0 && (() => {
                            const f = att.fatigue
                            const fColor = f < 5 ? '#4ade80' : f < 10 ? '#eab308' : f < 15 ? '#f97316' : '#ef4444'
                            return (
                              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #334155' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Fatigue</span>
                                  <span style={{ fontSize: '13px', color: fColor, fontWeight: '600' }}>{f.toFixed(1)}%</span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: '#0f172a', borderRadius: '3px' }}>
                                  <div style={{ width: `${Math.min(f / 20 * 100, 100)}%`, height: '100%', backgroundColor: fColor, borderRadius: '3px' }} />
                                </div>
                              </div>
                            )
                          })()}
                        </div>

                        {/* Right: Mental Profile (tier-badge list). Mood
                            moved to the hero column; this column is the
                            full mental profile breakdown. Rows are sized
                            to fill the column proportional to Skills on
                            the left so neither side feels empty. */}
                        {hasMental && (
                          <div style={{
                            paddingLeft: isMobile ? 0 : '16px',
                            borderLeft: isMobile ? undefined : '1px solid #334155',
                          }}>
                            <div style={{
                              fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                              letterSpacing: '0.08em', marginBottom: '12px',
                              textAlign: 'center',
                            }}>MENTAL</div>
                            {mentalRows.length > 0 && (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column' as const,
                                gap: '10px',
                              }}>
                                {mentalRows.map(r => (
                                  <div key={r.label} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '4px 0',
                                  }}>
                                    <span style={{
                                      fontSize: '13px',
                                      color: '#cbd5e1',
                                      letterSpacing: '0.02em',
                                    }}>{r.label}</span>
                                    <span style={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: r.tier.color,
                                      backgroundColor: `${r.tier.color}1a`,
                                      border: `1px solid ${r.tier.color}55`,
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      letterSpacing: '0.03em',
                                      whiteSpace: 'nowrap',
                                    }}>{r.tier.label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Progression panel — capped height so the chart scales
                      down to fit instead of pushing the attributes panel
                      taller on tab switch. */}
                  {activeTab === 'progression' && hasProgression && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '280px',
                    }}>
                      <RatingHistoryChart history={ratingHistory} teamColor={teamColor} ceiling={ratingCeiling} />
                    </div>
                  )}

                  {/* Awards moved out — see the Trophy Case panel
                      below Recent Moments in the right column. */}
                </div>
              </div>
            )
          })()}

          {/* ── Right column: Recent Moments + Trophy Case stacked.
              Moments stay capped at 320px so trophies always have room. ── */}
          {!isMobile && (() => {
            const hasMoments = quotes.length > 0
            const hasAwards = (player.mvpAwards?.length ?? 0) > 0 || (player.championships?.length ?? 0) > 0
              || (player.allProSeasons?.length ?? 0) > 0
            const hasRecords = (player.recordsHeld?.length ?? 0) > 0
            if (!hasMoments && !hasAwards && !hasRecords) return <div />  // spacer keeps 3-col grid aligned
            return (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px', minWidth: 0 }}>
                {hasMoments && (
                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, maxHeight: '320px' }}>
                    {sectionHeader('Recent Moments')}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column' as const, gap: '6px', overflowY: 'auto' }}>
                      {quotes.slice(0, 4).map((q, i) => {
                        const accent = q.personality ? personalityAccent(q.personality) : '#64748b'
                        return (
                          <div
                            key={`${q.timestamp || i}`}
                            style={{
                              backgroundColor: `${accent}10`,
                              borderLeft: `2px solid ${accent}`,
                              borderRadius: '4px',
                              padding: '6px 8px',
                            }}
                          >
                            <p style={{
                              fontSize: '12px',
                              color: '#cbd5e1',
                              fontStyle: 'italic' as const,
                              margin: 0,
                              lineHeight: 1.4,
                              overflowWrap: 'break-word' as const,
                            }}>
                              {q.text}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {(hasAwards || hasRecords) && (
                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const }}>
                    {sectionHeader('Trophy Case')}
                    {hasAwards && (
                      <div style={{
                        padding: '14px 12px',
                        display: 'flex',
                        flexWrap: 'wrap' as const,
                        gap: '14px',
                        alignContent: 'flex-start',
                      }}>
                        {(player.mvpAwards ?? []).map((a: any, i: number) => (
                          <div key={`mvp-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                            <GiStarMedal style={{ fontSize: '32px', color: '#fbbf24' }} />
                            <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '600', marginTop: '3px', letterSpacing: '0.04em' }}>MVP</div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>S{a.Season}</div>
                          </div>
                        ))}
                        {(player.championships ?? []).map((c: any, i: number) => (
                          <div key={`champ-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                            <GiLaurelsTrophy style={{ fontSize: '32px', color: '#f59e0b' }} />
                            <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '600', marginTop: '3px', letterSpacing: '0.04em' }}>CHAMPION</div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>S{c.Season}</div>
                          </div>
                        ))}
                        {(player.allProSeasons ?? []).map((s: any, i: number) => (
                          <div key={`allpro-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                            <GiStarsStack style={{ fontSize: '32px', color: '#cbd5e1' }} />
                            <div style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '600', marginTop: '3px', letterSpacing: '0.04em' }}>ALL-PRO</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>S{s && typeof s === 'object' ? s.Season : s}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {hasRecords && (
                      <div style={{ padding: hasAwards ? '0 12px 14px' : '12px', ...(hasAwards ? { borderTop: '1px solid #0f172a', paddingTop: '12px' } : {}) }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Records</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(player.recordsHeld ?? []).map((r: string, i: number) => (
                            <span key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)', borderRadius: '5px', padding: '3px 7px', whiteSpace: 'nowrap' }}>{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

        </div>
        {/* /Hero + Attributes + Moments 3-col row */}

        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>

        {/* Mobile-only: Profile and Recent Moments below the jersey area
            since the header collapses to a single column on mobile. */}
        {isMobile && (att?.hometown || att?.favorite_item || att?.motto) && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            {sectionHeader('Profile')}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              {att?.hometown && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '3px' }}>Hometown</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{att.hometown}</div>
                </div>
              )}
              {att?.favorite_item && att?.favorite_category && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '3px' }}>
                    Favorite {att.favorite_category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{att.favorite_item}</div>
                </div>
              )}
              {att?.motto && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '3px' }}>Motto</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', fontStyle: 'italic' as const }}>"{att.motto}"</div>
                </div>
              )}
            </div>
          </div>
        )}
        {isMobile && quotes.length > 0 && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            {sectionHeader('Recent Moments')}
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {quotes.slice(0, 4).map((q, i) => {
                const accent = q.personality ? personalityAccent(q.personality) : '#64748b'
                return (
                  <div
                    key={`${q.timestamp || i}`}
                    style={{
                      backgroundColor: `${accent}10`,
                      borderLeft: `2px solid ${accent}`,
                      borderRadius: '4px',
                      padding: '6px 8px',
                    }}
                  >
                    <p style={{
                      fontSize: '12px',
                      color: '#cbd5e1',
                      fontStyle: 'italic' as const,
                      margin: 0,
                      lineHeight: 1.4,
                      overflowWrap: 'break-word' as const,
                    }}>
                      {q.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {/* Mobile-only Trophy Case — desktop has its own slot below
            Recent Moments in the right column. */}
        {isMobile && (() => {
          const hasAwards = (player.mvpAwards?.length ?? 0) > 0 || (player.championships?.length ?? 0) > 0 || (player.allProSeasons?.length ?? 0) > 0
          const hasRecords = (player.recordsHeld?.length ?? 0) > 0
          if (!hasAwards && !hasRecords) return null
          return (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            {sectionHeader('Trophy Case')}
            {hasAwards && (
              <div style={{
                padding: '14px 12px',
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: '14px',
                alignContent: 'flex-start',
              }}>
                {(player.mvpAwards ?? []).map((a: any, i: number) => (
                  <div key={`mvp-m-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                    <GiStarMedal style={{ fontSize: '32px', color: '#fbbf24' }} />
                    <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '600', marginTop: '3px', letterSpacing: '0.04em' }}>MVP</div>
                    <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>S{a.Season}</div>
                  </div>
                ))}
                {(player.championships ?? []).map((c: any, i: number) => (
                  <div key={`champ-m-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                    <GiLaurelsTrophy style={{ fontSize: '32px', color: '#f59e0b' }} />
                    <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '600', marginTop: '3px', letterSpacing: '0.04em' }}>CHAMPION</div>
                    <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>S{c.Season}</div>
                  </div>
                ))}
                {(player.allProSeasons ?? []).map((s: any, i: number) => (
                  <div key={`allpro-m-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
                    <GiStarsStack style={{ fontSize: '32px', color: '#cbd5e1' }} />
                    <div style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '600', marginTop: '3px', letterSpacing: '0.04em' }}>ALL-PRO</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>S{s && typeof s === 'object' ? s.Season : s}</div>
                  </div>
                ))}
              </div>
            )}
            {hasRecords && (
              <div style={{ padding: '0 12px 14px', ...(hasAwards ? { borderTop: '1px solid #0f172a', paddingTop: '12px' } : { paddingTop: '12px' }) }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Records</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(player.recordsHeld ?? []).map((r: string, i: number) => (
                    <span key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)', borderRadius: '5px', padding: '3px 7px', whiteSpace: 'nowrap' }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          )
        })()}

        {/* Career Stats — toggle between offense and defense for two-way players.
            Full-width since the rest of the personality content lives up in the
            header row. */}
        <div>

          {/* Career Stats */}
          {(() => {
            const hasDefense = player.position !== 'K' && !!player.defensivePosition
            const view = hasDefense ? statsView : 'offense'
            const offenseLabel = POSITION_FULL[player.position] ?? player.position
            return (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#0f172a',
                  borderBottom: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    Career Stats · {view === 'offense' ? offenseLabel : player.defensivePosition}
                  </span>
                  {hasDefense && (
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1e293b', borderRadius: '6px', padding: '2px' }}>
                      {(['offense', 'defense'] as const).map(side => {
                        const active = view === side
                        return (
                          <button
                            key={side}
                            onClick={() => setStatsView(side)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.05em',
                              color: active ? '#e2e8f0' : '#64748b',
                              backgroundColor: active ? '#334155' : 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {side}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {view === 'offense' && (
                    <>
                      {player.position === 'QB'                        && <QBStatsTable  stats={player.stats} career={player.allTimeStats} />}
                      {player.position === 'RB'                        && <RBStatsTable  stats={player.stats} career={player.allTimeStats} />}
                      {(player.position === 'WR' || player.position === 'TE') && <RcvStatsTable stats={player.stats} career={player.allTimeStats} />}
                      {player.position === 'K'                         && <KStatsTable   stats={player.stats} career={player.allTimeStats} />}
                    </>
                  )}
                  {view === 'defense' && hasDefense && (
                    <DefenseStatsTable stats={player.stats} career={player.allTimeStats} />
                  )}
                </div>
              </div>
            )
          })()}

        </div>

      </div>
    </div>
  )
}

// Full-size rating progression chart for the player page. Line chart with
// endpoint dots and season labels on the x-axis, rating (60-100) on the y.
// Colors by per-segment trend so climbs look green, declines red, flat gray.
function RatingHistoryChart({ history, teamColor, ceiling }: { history: RatingPoint[]; teamColor: string; ceiling?: number | null }) {
  const PAD_LEFT = 36
  const PAD_RIGHT = 12
  const PAD_TOP = 16
  const PAD_BOTTOM = 28
  // viewBox aspect ratio matched to the Progression tab's available space
  // (~340×340 after tab strip + padding) so the chart scales to fill the
  // panel without leaving large empty margins above/below.
  const WIDTH = 340
  const HEIGHT = 340
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM

  if (history.length === 0) return null

  const seasons = history.map(h => h.season)
  const ratings = history.map(h => h.rating)
  const minSeason = seasons[0]
  const maxSeason = seasons[seasons.length - 1]
  const seasonSpan = Math.max(1, maxSeason - minSeason)

  // Y scale: always show the full 60-100 range so sparkline-style illusions
  // (a +2 rating bump looking like a huge spike) don't mislead. Rating ceiling
  // is 100, floor is ~60 by design.
  const yMin = 60
  const yMax = 100
  const yRange = yMax - yMin

  const xFor = (season: number) => {
    if (history.length === 1) return PAD_LEFT + plotW / 2
    return PAD_LEFT + ((season - minSeason) / seasonSpan) * plotW
  }
  const yFor = (rating: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, rating))
    const pct = (clamped - yMin) / yRange
    return PAD_TOP + (1 - pct) * plotH
  }

  // Gridlines every 10 points
  const gridLines: number[] = []
  for (let r = yMin; r <= yMax; r += 10) gridLines.push(r)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', maxHeight: '100%', display: 'block' }}
    >
      {/* Gridlines + y-axis labels */}
      {gridLines.map(r => (
        <g key={r}>
          <line
            x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT}
            y1={yFor(r)} y2={yFor(r)}
            stroke="#334155" strokeWidth={0.8} opacity={0.4}
          />
          <text x={PAD_LEFT - 6} y={yFor(r) + 4} fontSize="12" fill="#94a3b8" textAnchor="end">
            {r}
          </text>
        </g>
      ))}

      {/* Projected ceiling — dotted reference line at the player's top
          attainable rating (full potential). Label flips below the line when
          it sits near the top edge so it doesn't clip. */}
      {ceiling != null && ceiling > 0 && (() => {
        const cy = yFor(ceiling)
        // Label sits at the LEFT, where the progression (which rises toward the
        // peak/ceiling on the right) is lowest, so it clears the data points. A
        // dark pill keeps it legible over the gridlines and dotted line.
        const labelY = cy < PAD_TOP + 14 ? cy + 14 : cy - 5
        return (
          <g>
            <line
              x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT}
              y1={cy} y2={cy}
              stroke="#facc15" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.85}
            />
            <rect x={PAD_LEFT + 2} y={labelY - 10} width={66} height={13} rx={2} fill="#0f172a" opacity={0.9} />
            <text x={PAD_LEFT + 6} y={labelY} fontSize="11" fill="#facc15" fontWeight={700} textAnchor="start">
              Ceiling {Math.round(ceiling)}
            </text>
          </g>
        )
      })()}

      {/* X-axis season labels */}
      {seasons.map(s => (
        <text key={s} x={xFor(s)} y={HEIGHT - 10} fontSize="12" fill="#94a3b8" textAnchor="middle">
          S{s}
        </text>
      ))}

      {/* Per-segment colored line so rising seasons visually pop green,
          declines red. Flat segments use the team color. */}
      {history.map((pt, i) => {
        if (i === 0) return null
        const prev = history[i - 1]
        const delta = pt.rating - prev.rating
        const color = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : teamColor
        return (
          <line
            key={`seg-${i}`}
            x1={xFor(prev.season)} y1={yFor(prev.rating)}
            x2={xFor(pt.season)} y2={yFor(pt.rating)}
            stroke={color} strokeWidth={3.5}
            strokeLinecap="round"
          />
        )
      })}

      {/* Points with rating labels */}
      {history.map(pt => (
        <g key={pt.season}>
          <circle cx={xFor(pt.season)} cy={yFor(pt.rating)} r={5} fill={teamColor} stroke="#0f172a" strokeWidth={1.5} />
          <text
            x={xFor(pt.season)} y={yFor(pt.rating) - 10}
            fontSize="13" fill="#e2e8f0" fontWeight="700" textAnchor="middle"
          >
            {pt.rating}
          </text>
        </g>
      ))}
    </svg>
  )
}
