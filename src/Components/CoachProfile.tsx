import React from 'react'

/**
 * Coach scouting-report tags — the replacement for the overall star.
 *
 * Coaches are generated as SPECIALISTS (great offensive mind / weak defense /
 * sharp scout / poor developer), so the aggregate gets pulled to the middle for
 * everyone and a star rating tells you nothing. A coach reads instead as their
 * standout, their weakness, and where they sit on the fan-trust axis.
 * Backend: floosball_coach.buildCoachProfile / plan Part B.
 */

export interface CoachTrait {
  attr: string
  label: string
  /** Qualitative band — Elite / Sharp / Capable / Limited. Never a number. */
  band: string
}

export interface CoachProfileData {
  traits?: CoachTrait[]
  specialty?: string | null
  specialtyAttr?: string | null
  flaw?: string | null
  flawAttr?: string | null
  fanTrustLabel?: string | null
  tags?: string[]
}

type TagKind = 'specialty' | 'flaw' | 'trust' | 'neutral'

const TAG_STYLE: Record<TagKind, { color: string; bg: string; border: string }> = {
  specialty: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' },
  flaw: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
  trust: { color: '#93c5fd', bg: 'rgba(147,197,253,0.12)', border: 'rgba(147,197,253,0.32)' },
  neutral: { color: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
}

const Tag: React.FC<{ label: string; kind: TagKind; size?: number }> = ({ label, kind, size = 11 }) => {
  const s = TAG_STYLE[kind]
  return (
    <span style={{
      display: 'inline-block',
      fontSize: `${size}px`,
      lineHeight: 1.4,
      padding: '2px 7px',
      borderRadius: '999px',
      color: s.color,
      backgroundColor: s.bg,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

interface Props {
  profile?: CoachProfileData | null
  size?: number
  /** Cap the number of tags shown (hover cards are tight on space). */
  max?: number
}

export const CoachProfileTags: React.FC<Props> = ({ profile, size = 11, max }) => {
  if (!profile) return null

  const items: { label: string; kind: TagKind }[] = []
  if (profile.specialty) items.push({ label: profile.specialty, kind: 'specialty' })
  if (profile.flaw) items.push({ label: profile.flaw, kind: 'flaw' })
  if (profile.fanTrustLabel) items.push({ label: profile.fanTrustLabel, kind: 'trust' })

  // An unremarkable coach is honestly a generalist rather than being handed a
  // dramatic label; the backend sends exactly that.
  if (items.length === 0) {
    const fallback = profile.tags?.[0] || 'Generalist'
    items.push({ label: fallback, kind: 'neutral' })
  }

  const shown = max ? items.slice(0, max) : items

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {shown.map(t => <Tag key={t.label} label={t.label} kind={t.kind} size={size} />)}
    </div>
  )
}

export default CoachProfileTags


/**
 * Per-attribute qualitative read. Coach/GM rating NUMBERS are deliberately
 * never shown — a GM is a character, not a stat line — so the backend sends
 * bands only (floosball_coach.attributeBand).
 */
const BAND_COLOR: Record<string, string> = {
  Elite: '#4ade80',
  Sharp: '#a3e635',
  Capable: '#cbd5e1',
  Limited: '#f87171',
}

export const CoachTraitList: React.FC<{ traits?: CoachTrait[] }> = ({ traits }) => {
  if (!traits || traits.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {traits.map(t => (
        <div key={t.attr} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.label}</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: BAND_COLOR[t.band] || '#cbd5e1',
          }}>{t.band}</span>
        </div>
      ))}
    </div>
  )
}
