import React, { useEffect, useMemo, useState } from 'react'
import PlayerLink from '@/Components/PlayerLink'
import HoverTooltip from '@/Components/HoverTooltip'
import { BG, BORDER, TEXT, ACCENT, font, TABULAR } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'
import { GiLaurelCrown } from 'react-icons/gi'

/**
 * ⚠️ THE LAUREL IS THE REAL ICON, NOT A HAND-DRAWN ONE (owner, 2026-08-23). The restyle's
 * conformance note says react-icons comes off these pages, and it was first applied here
 * by redrawing `GiLaurelCrown` as inline SVG — which produced a visibly worse wreath than
 * the one it replaced, to satisfy a rule aimed at ICON FONTS rather than at per-icon ESM
 * imports. The mark is part of what the Hall looks like; drawing a lesser copy of an icon
 * the app already ships is not a saving.
 */
const LAUREL = (size: number) => <GiLaurelCrown style={{ fontSize: `${size}px` }} />

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
  teams: InducteeTeam[]   // every team where they earned an accolade, most-decorated first
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

// Award badges. Three honours, three tiers of the same amber-to-silver ladder the rest
// of the app uses for them — the count carries the weight, so the icons came off.
const AWARDS: { key: keyof Pick<HofAwards, 'mvps' | 'championships' | 'allPros'>; label: string; color: string }[] = [
  { key: 'mvps', label: 'MVP', color: '#fbbf24' },
  { key: 'championships', label: 'Champ', color: '#f59e0b' },
  { key: 'allPros', label: 'All-Pro', color: '#cbd5e1' },
]

const AwardBadge: React.FC<{ count: number; label: string; color: string }> = ({ count, label, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    ...font(700, 11), ...TABULAR, color,
    backgroundColor: `${color}1a`, border: `1px solid ${color}44`,
    padding: '2px 6px', whiteSpace: 'nowrap',
  }}>
    {count}&times; {label}
  </span>
)

export const Plaque: React.FC<{ p: Inductee }> = ({ p }) => {
  const teams: InducteeTeam[] = (p.teams && p.teams.length)
    ? p.teams
    : [{ abbr: p.teamAbbr, id: p.teamId, name: p.teamName, color: p.teamColor || '#475569' }]
  const colors = teams.map(t => t.color || '#475569')
  const primary = colors[0]
  // ⚠️ The top rule is the ONE gradient left on the page, and it is not decoration —
  // it encodes multiple teams as hard-stop segments, so a journeyman's plaque shows
  // every team they were decorated with. A single-team plaque is a flat bar.
  const accentBar = colors.length > 1
    ? `linear-gradient(90deg, ${colors.map((c, i) =>
        `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`).join(', ')})`
    : primary
  const hasAwards = p.awards.mvps > 0 || p.awards.championships > 0 || p.awards.allPros > 0
  const records = p.recordsHeld || []
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      backgroundColor: BG.card, border: `1px solid ${BORDER.hairline}`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* team-color rule (one segment per team) */}
      <div style={{ height: '3px', background: accentBar }} />
      {/* ⚠️ THE LAUREL STAYS (owner, 2026-08-23). The restyle took it out with the rest
          of the plaque's decoration — gradient field, radius, drop shadow, inset
          highlight — and it was the one piece carrying what the Hall IS rather than just
          how it was drawn. Reinstated as a watermark: inline SVG on the shell's icon
          grid, not the old icon font, and low enough not to compete with the text. */}
      <span style={{
        position: 'absolute', right: '-10px', bottom: '-14px',
        color: 'rgba(251,191,36,0.07)', pointerEvents: 'none', lineHeight: 0,
      }}>{LAUREL(96)}</span>
      <div style={{
        position: 'relative',
        padding: '13px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1,
      }}>
        {/* team logos */}
        {teams.some(t => t.abbr || t.id != null) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flexWrap: 'wrap' }}>
            {teams.map((t, i) => (t.abbr || t.id != null) && (
              <span key={`${t.abbr}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <span style={{ color: TEXT.faint, fontSize: '11px' }}>&middot;</span>}
                {t.id != null && <img src={`/avatars/${t.id}.png`} alt={t.abbr || ''} style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0 }} />}
                {t.abbr && <span style={{ ...font(700, 12, 1, '0.02em'), color: readableTeamColor(t.color || TEXT.muted, BG.card), whiteSpace: 'nowrap' }}>{t.abbr}</span>}
              </span>
            ))}
          </div>
        )}

        {/* position + name. No star rating: late-career rating drops mean players can enter
            the Hall at 1 star, which misrepresents their career. */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            <span style={{
              ...font(700, 11, 1, '0.1em'), color: TEXT.muted, backgroundColor: BG.panel,
              border: `1px solid ${BORDER.hairline}`, padding: '2px 6px', flexShrink: 0,
            }}>{p.position}</span>
            <PlayerLink playerId={p.id} playerName={p.name}
              style={{ ...font(700, 16, 1.2), color: TEXT.strong }} />
          </div>
        </div>

        {/* award badges */}
        {hasAwards && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {AWARDS.map(a => p.awards[a.key] > 0 && (
              <AwardBadge key={a.key} count={p.awards[a.key]} label={a.label} color={a.color} />
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
            } color={ACCENT.info}>
              <span style={{
                ...font(700, 11, 1, '0.06em'), color: ACCENT.info,
                backgroundColor: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.34)',
                padding: '2px 7px', whiteSpace: 'nowrap', cursor: 'help',
              }}>{records.length} league record{records.length !== 1 ? 's' : ''}</span>
            </HoverTooltip>
          </div>
        )}

        {/* seasons */}
        <div style={{ marginTop: 'auto', ...font(400, 12), color: TEXT.muted }}>
          <span style={{ ...font(700, 13), ...TABULAR, color: TEXT.secondary }}>{p.seasonsPlayed}</span> seasons
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
    return <div style={{ padding: '40px', textAlign: 'center', color: TEXT.muted, ...font(400, 13) }}>Loading the hall&hellip;</div>
  }

  if (inductees.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <span style={{ color: BORDER.raised, display: 'inline-block' }}>{LAUREL(34)}</span>
        <div style={{ ...font(700, 15), color: TEXT.secondary, marginTop: '10px' }}>The hall is empty</div>
        <div style={{ ...font(400, 13, 1.5), color: TEXT.muted, marginTop: '6px' }}>The game's first legends will be enshrined here when they retire.</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
        <span style={{ color: '#fbbf24', display: 'inline-flex' }}>{LAUREL(18)}</span>
        <span style={{
          ...font(700, 11, 1, '0.1em'), ...TABULAR, color: TEXT.muted,
          backgroundColor: BG.panel, border: `1px solid ${BORDER.hairline}`, padding: '3px 7px',
        }}>{inductees.length} ENSHRINED</span>
      </div>

      {/* Classes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {groups.map(g => (
          <div key={g.key}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
            }}>
              <span style={{ ...font(800, 12, 1, '0.14em'), color: '#fbbf24', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {g.label}
              </span>
              <span style={{ flex: 1, height: '1px', backgroundColor: BORDER.hairline }} />
              <span style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {g.players.length} inductee{g.players.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {g.players.map(p => <Plaque key={p.id} p={p} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HallOfFame
