import React, { useEffect, useMemo, useState } from 'react'
import { Stars } from '@/Components/Stars'
import PlayerLink from '@/Components/PlayerLink'
import HoverTooltip from '@/Components/HoverTooltip'
import { GiStarMedal, GiLaurelsTrophy, GiStarsStack, GiLaurelCrown } from 'react-icons/gi'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface HofAwards {
  mvps: number
  championships: number
  allPros: number
  mvpSeasons: number[]
  championshipSeasons: number[]
  allProSeasons: number[]
}

interface InducteeTeam {
  abbr: string | null
  id: number | null
  name: string | null
  color: string
}

export interface Inductee {
  id: number
  name: string
  position: string
  teams: InducteeTeam[]   // every club where they earned an accolade, most-decorated first
  teamId: number | null
  teamAbbr: string | null
  teamColor: string
  teamName: string | null
  playerRating: number
  ratingStars: number
  seasonsPlayed: number
  hofSeason: number | null
  hofPoints: number
  awards: HofAwards
  recordsHeld: string[]   // league records currently held (e.g. "Career Pass Yards")
}

// Award badge metadata — reuses the player-profile trophy-case icons/colors.
const AWARDS: { key: keyof Pick<HofAwards, 'mvps' | 'championships' | 'allPros'>; label: string; Icon: React.ComponentType<any>; color: string }[] = [
  { key: 'mvps', label: 'MVP', Icon: GiStarMedal, color: '#fbbf24' },
  { key: 'championships', label: 'Champ', Icon: GiLaurelsTrophy, color: '#f59e0b' },
  { key: 'allPros', label: 'All-Pro', Icon: GiStarsStack, color: '#cbd5e1' },
]

const AwardBadge: React.FC<{ count: number; label: string; Icon: React.ComponentType<any>; color: string }> = ({ count, label, Icon, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '11px', fontWeight: 700, color,
    backgroundColor: `${color}1a`, border: `1px solid ${color}33`,
    borderRadius: '5px', padding: '2px 6px', whiteSpace: 'nowrap',
  }}>
    <Icon style={{ fontSize: '13px' }} />
    {count}&times; {label}
  </span>
)

export const Plaque: React.FC<{ p: Inductee }> = ({ p }) => {
  const teams: InducteeTeam[] = (p.teams && p.teams.length)
    ? p.teams
    : [{ abbr: p.teamAbbr, id: p.teamId, name: p.teamName, color: p.teamColor || '#475569' }]
  const colors = teams.map(t => t.color || '#475569')
  const primary = colors[0]
  // Accent bar spans every team's color (hard-stop segments); single team fades.
  const accentBar = colors.length > 1
    ? `linear-gradient(90deg, ${colors.map((c, i) =>
        `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`).join(', ')})`
    : `linear-gradient(90deg, ${primary}, ${primary}55)`
  const hasAwards = p.awards.mvps > 0 || p.awards.championships > 0 || p.awards.allPros > 0
  const records = p.recordsHeld || []
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #233149 0%, #18222f 78%)',
      border: '1px solid rgba(251,191,36,0.28)', borderRadius: '10px',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 6px 18px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      {/* team-color accent bar (one segment per team) */}
      <div style={{ height: '4px', background: accentBar }} />
      {/* faint laurel seal — prestige watermark behind the content */}
      <GiLaurelCrown style={{ position: 'absolute', right: '-12px', bottom: '-16px', fontSize: '104px', color: 'rgba(251,191,36,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {/* team logos */}
        {teams.some(t => t.abbr || t.id != null) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flexWrap: 'wrap' }}>
            {teams.map((t, i) => (t.abbr || t.id != null) && (
              <span key={`${t.abbr}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <span style={{ color: '#475569', fontSize: '11px' }}>&middot;</span>}
                {t.id != null && <img src={`/avatars/${t.id}.png`} alt={t.abbr || ''} style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
                {t.abbr && <span style={{ fontSize: '12px', fontWeight: 700, color: t.color || '#94a3b8', whiteSpace: 'nowrap' }}>{t.abbr}</span>}
              </span>
            ))}
          </div>
        )}

        {/* position + name, rating under */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.14)',
              borderRadius: '4px', padding: '1px 6px', flexShrink: 0,
            }}>{p.position}</span>
            <PlayerLink playerId={p.id} playerName={p.name}
              style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }} />
          </div>
          <div style={{ marginTop: '4px' }}><Stars stars={p.ratingStars} size={12} /></div>
        </div>

        {/* award badges */}
        {hasAwards && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {AWARDS.map(a => p.awards[a.key] > 0 && (
              <AwardBadge key={a.key} count={p.awards[a.key]} label={a.label} Icon={a.Icon} color={a.color} />
            ))}
          </div>
        )}

        {/* league records held — collapsed to one pill (hover for the full list)
            so a record-heavy player doesn't make the whole row of plaques taller */}
        {records.length > 0 && (
          <div style={{ alignSelf: 'flex-start' }}>
            <HoverTooltip content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' }}>
                {records.map((r, i) => <span key={i}>{r}</span>)}
              </div>
            } color="#38bdf8">
              <span style={{
                fontSize: '11px', fontWeight: 600, color: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)',
                borderRadius: '5px', padding: '2px 8px', whiteSpace: 'nowrap', cursor: 'help',
              }}>{records.length} league record{records.length !== 1 ? 's' : ''}</span>
            </HoverTooltip>
          </div>
        )}

        {/* seasons */}
        <div style={{ marginTop: 'auto', fontSize: '12px', color: '#94a3b8' }}>
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{p.seasonsPlayed}</span> seasons
        </div>
      </div>
    </div>
  )
}

export const HallOfFame: React.FC = () => {
  const [inductees, setInductees] = useState<Inductee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/hall-of-fame`)
      .then(r => r.json())
      .then(json => { if (alive && json.success) setInductees(json.data.inductees || []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Group by induction class (Season N), newest first; null class ("Inducted") last.
  const groups = useMemo(() => {
    const m = new Map<number | null, Inductee[]>()
    for (const ind of inductees) {
      const k = ind.hofSeason ?? null
      const arr = m.get(k) || []
      arr.push(ind)
      m.set(k, arr)
    }
    const keys = [...m.keys()].sort((a, b) => {
      if (a === null) return 1
      if (b === null) return -1
      return b - a
    })
    return keys.map(k => ({
      key: k === null ? 'inducted' : `s${k}`,
      label: k === null ? 'Inducted' : `Class of Season ${k}`,
      players: m.get(k) as Inductee[],
    }))
  }, [inductees])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Loading the hall&hellip;</div>
  }

  if (inductees.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <GiLaurelCrown style={{ fontSize: '40px', color: '#334155' }} />
        <div style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 600, marginTop: '10px' }}>The hall is empty</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>The game's first legends will be enshrined here when they retire.</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <GiLaurelCrown style={{ fontSize: '26px', color: '#fbbf24' }} />
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>Hall of Fame</div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.12)', padding: '2px 9px', borderRadius: '10px' }}>
          {inductees.length} enshrined
        </span>
      </div>

      {/* Classes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {groups.map(g => (
          <div key={g.key}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {g.label}
              </span>
              <span style={{ flex: 1, height: '1px', backgroundColor: '#2a3a4e' }} />
              <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                {g.players.length} inductee{g.players.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))', gap: '12px' }}>
              {g.players.map(p => <Plaque key={p.id} p={p} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HallOfFame
