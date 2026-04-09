import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlayerAvatar from '@/Components/PlayerAvatar'
import { Stars } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'
import { GiLaurelsTrophy, GiStarMedal } from 'react-icons/gi'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface PlayerAttributes {
  att1?: string; att1Value?: number; att1stars?: number
  att2?: string; att2Value?: number; att2stars?: number
  att3?: string; att3Value?: number; att3stars?: number
  playmakingStars?: number; playmakingValue?: number
  xFactorStars?: number; xFactorValue?: number
  seasonPerformanceRatingStars?: number; seasonPerformanceRating?: number
  fatigue?: number
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
  seasonsPlayed: number
  ratingStars: number
  playerRating: number
  rank: string
  number: number
  ratingValue: number
  championships: any[]
  attributes: PlayerAttributes
  stats: any[]
  allTimeStats: any
}

const POSITION_FULL: Record<string, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', K: 'Kicker',
}

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
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Season', 'Team', 'Carr', 'Yds', 'YPC', 'TDs', 'FUM', 'Pts'].map(h => (
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

// ── Main Page ───────────────────────────────────────────────────────────────

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${API_BASE}/players/${id}`)
      .then(r => r.json())
      .then(json => { if (json.success && json.data) setPlayer(json.data) })
      .catch(err => console.error('Failed to fetch player:', err))
      .finally(() => setLoading(false))
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

  const attrRow = (label: string, _stars: number, value: number, isOverall = false) => {
    const barColor = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    const pct = ((value - 60) / 40) * 100
    return (
      <div key={label} style={{ marginBottom: isOverall ? '16px' : '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
          <span style={{ fontSize: isOverall ? '15px' : '13px', fontWeight: isOverall ? '700' : '400', color: isOverall ? '#e2e8f0' : '#94a3b8' }}>{label}</span>
          <span style={{ fontSize: isOverall ? '22px' : '16px', fontWeight: '700', color: isOverall ? teamColor : '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </div>
        <div style={{ height: isOverall ? '6px' : '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '2px' }} />
        </div>
      </div>
    )
  }

  const { attributes: att } = player

  const attrs: { label: string; stars: number; value: number }[] = []
  if (att) {
    attrs.push({ label: 'Overall', stars: player.ratingStars, value: player.playerRating })
    if (att.att1 && att.att1Value != null)  attrs.push({ label: att.att1,    stars: att.att1stars ?? 1,   value: att.att1Value })
    if (att.att2 && att.att2Value != null)  attrs.push({ label: att.att2,    stars: att.att2stars ?? 1,   value: att.att2Value })
    if (att.att3 && att.att3Value != null)  attrs.push({ label: att.att3,    stars: att.att3stars ?? 1,   value: att.att3Value })
    if (att.playmakingValue != null)        attrs.push({ label: 'Playmaking', stars: att.playmakingStars ?? 1, value: att.playmakingValue })
    if (att.xFactorValue != null)           attrs.push({ label: 'X-Factor',  stars: att.xFactorStars ?? 1,    value: att.xFactorValue })
    if (att.seasonPerformanceRating && att.seasonPerformanceRating > 0)
      attrs.push({ label: 'Performance', stars: att.seasonPerformanceRatingStars ?? 1, value: att.seasonPerformanceRating })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>

      {/* Hero + Attributes */}
      <div style={{
        background: `linear-gradient(135deg, ${teamColor}50 0%, #0f172a 55%)`,
        borderBottom: '1px solid #1e293b',
        padding: isMobile ? '20px 16px' : '28px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: isMobile ? undefined : 'auto 400px', gap: isMobile ? '20px' : '32px', alignItems: 'center', justifyContent: 'center' }}>

          {/* Left: Avatar + Jersey + Name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <PlayerAvatar name={player.name} size={isMobile ? 100 : 144} bgColor={player.teamColor} style={{ border: `3px solid ${teamColor}` }} />
              <div style={{ width: isMobile ? '100px' : '144px' }}>
                <PlayerJersey color={teamColor} secondary={teamSecondary} number={player.number} name={player.name} />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#64748b' }}>
                {POSITION_FULL[player.position] ?? player.position}
              </div>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{player.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                <Stars stars={player.ratingStars} size={16} />
                {player.rank && (
                  <>
                    <span style={{ fontSize: '13px', color: '#475569' }}>·</span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>{player.rank}</span>
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
                ) : (
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Free Agent</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Attributes */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', width: isMobile ? '100%' : undefined }}>
            {sectionHeader('Attributes')}
            <div style={{ padding: '14px 16px' }}>
              {attrs.map((a, i) => attrRow(a.label, a.stars, a.value, i === 0))}
              {att?.fatigue != null && att.fatigue > 0 && (() => {
                const f = att.fatigue
                const fColor = f < 5 ? '#4ade80' : f < 10 ? '#eab308' : f < 15 ? '#f97316' : '#ef4444'
                return (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #334155' }}>
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
          </div>

        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>

        {/* Championships + Career Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: '16px', alignItems: 'start' }}>

          {/* Awards */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', minWidth: '180px' }}>
            {sectionHeader('Awards')}
            <div style={{ padding: '16px' }}>
              {(player.mvpAwards?.length ?? 0) === 0 && (player.championships?.length ?? 0) === 0 ? (
                <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>No awards yet</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '16px' }}>
                  {(player.mvpAwards ?? []).map((a: any, i: number) => (
                    <div key={`mvp-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <GiStarMedal style={{ fontSize: '28px', color: '#fbbf24' }} />
                      <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '600', marginTop: '2px' }}>MVP</div>
                      <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>S{a.Season}</div>
                      <div style={{ fontSize: '11px', color: a.teamColor || teamColor, fontWeight: '600' }}>{a.team}</div>
                    </div>
                  ))}
                  {(player.championships ?? []).map((c: any, i: number) => (
                    <div key={`champ-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <GiLaurelsTrophy style={{ fontSize: '28px', color: '#f59e0b' }} />
                      <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', marginTop: '2px' }}>S{c.Season}</div>
                      <div style={{ fontSize: '11px', color: c.teamColor || teamColor, fontWeight: '600' }}>{c.team}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Career Stats */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader(`Career Stats · ${POSITION_FULL[player.position] ?? player.position}`)}
            <div style={{ overflowX: 'auto' }}>
              {player.position === 'QB'                        && <QBStatsTable  stats={player.stats} career={player.allTimeStats} />}
              {player.position === 'RB'                        && <RBStatsTable  stats={player.stats} career={player.allTimeStats} />}
              {(player.position === 'WR' || player.position === 'TE') && <RcvStatsTable stats={player.stats} career={player.allTimeStats} />}
              {player.position === 'K'                         && <KStatsTable   stats={player.stats} career={player.allTimeStats} />}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
