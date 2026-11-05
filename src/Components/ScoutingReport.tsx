import React from 'react'
import { GiBroadsword, GiShield } from 'react-icons/gi'
import { TEXT, ACCENT, font } from '@/Components/Shell/tokens'
import HoverTooltip from '@/Components/HoverTooltip'
import { STAR_COLORS, EMPTY_STAR } from '@/Components/Stars'

/**
 * A prospect's scouting report (owner, 2026-11-04): where they project to stand against
 * the starters at their position, from the public projection. Built by the backend
 * (`scouting_report.py`); this only lays it out. Prospects only.
 */
export interface ScoutingTrait {
  trait: string
  label: string
  phrase: string
  tier: 'elite' | 'strong' | 'weak'
  side: 'offense' | 'defense' | 'mental'
}

export type ScoutingLean = 'offense' | 'defense' | 'two_way'

export interface ScoutingReportData {
  /** Projected star range `[low, high]` per side; defense is null for a kicker. */
  stars: { overall: [number, number]; offense: [number, number] | null; defense: [number, number] | null }
  /** The side of the ball they project to help most; null for a kicker. */
  lean?: ScoutingLean | null
  strengths: ScoutingTrait[]
  weaknesses: ScoutingTrait[]
  growth: string | null
}

// The app's sword and shield, in the archetype badge's colors (`ArchetypeBadge`).
const OFFENSE_COLOR = '#fb923c'
const DEFENSE_COLOR = '#38bdf8'

export const LEAN_LABEL: Record<ScoutingLean, string> = {
  offense: 'Offense-first',
  defense: 'Defense-first',
  two_way: 'Two-way',
}

const LEAN_TIP: Record<ScoutingLean, string> = {
  offense: 'Projects to help most on offense.',
  defense: 'Projects to help most on defense.',
  two_way: 'Projects to help about equally on offense and defense.',
}

/** Sword, shield or both: which side of the ball a prospect projects to help most. */
export const LeanBadge: React.FC<{ lean?: ScoutingLean | null; size?: number; label?: boolean }> = ({ lean, size = 14, label }) => {
  if (!lean) return null
  return (
    <HoverTooltip text={LEAN_TIP[lean]}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'help' }}>
        {lean !== 'defense' && <GiBroadsword size={size} color={OFFENSE_COLOR} />}
        {lean !== 'offense' && <GiShield size={size} color={DEFENSE_COLOR} />}
        {label && <span style={{ ...font(600, 12), color: TEXT.secondary, marginLeft: '4px' }}>{LEAN_LABEL[lean]}</span>}
      </span>
    </HoverTooltip>
  )
}

const SIDE_LABEL: Record<ScoutingTrait['side'], string> = {
  offense: 'Offense', defense: 'Defense', mental: 'Mental',
}

const TIER: Record<ScoutingTrait['tier'], { label: string; color: string }> = {
  elite: { label: 'Elite', color: '#fbbf24' },
  strong: { label: 'Strong', color: ACCENT.success },
  weak: { label: 'Weak', color: ACCENT.negative },
}

function TraitList({ title, traits, empty }: { title: string; traits: ScoutingTrait[]; empty: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
      <span style={{ ...font(700, 10, 1, '0.04em'), color: TEXT.muted }}>{title.toUpperCase()}</span>
      {traits.length === 0 ? (
        <span style={{ ...font(400, 13), color: TEXT.faint }}>{empty}</span>
      ) : traits.map(t => (
        <div key={t.trait} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ ...font(700, 11), color: TIER[t.tier].color, minWidth: '46px' }}>
            {TIER[t.tier].label}
          </span>
          {/* The side sits right after the phrase: right-aligned it read as part of the
              weaknesses column beside it (owner, 2026-11-04). */}
          <span style={{ ...font(600, 13), color: TEXT.body, minWidth: 0 }}>{t.phrase}</span>
          <span style={{ ...font(500, 11), color: TEXT.muted }}>{SIDE_LABEL[t.side]}</span>
        </div>
      ))}
    </div>
  )
}

/** A projected star range in the app's star colors (`Stars`): the solid stars are a
 * rating of the low end, colored for that count; the faint ones run up to the high end in
 * its count's color; the rest are the usual empty stars. */
function StarRange({ range, size = 20 }: { range: [number, number]; size?: number }) {
  const lo = Math.max(1, Math.min(5, range[0]))
  const hi = Math.max(lo, Math.min(5, range[1]))
  return (
    <HoverTooltip text={lo === hi ? `Projects as ${lo} stars.` : `Projects as ${lo} to ${hi} stars.`}>
      <span style={{ fontSize: `${size}px`, letterSpacing: '1px', lineHeight: 1, cursor: 'help' }}>
        <span style={{ color: STAR_COLORS[lo] }}>{'★'.repeat(lo)}</span>
        <span style={{ color: STAR_COLORS[hi], opacity: 0.4 }}>{'★'.repeat(hi - lo)}</span>
        <span style={{ color: EMPTY_STAR }}>{'★'.repeat(5 - hi)}</span>
      </span>
    </HoverTooltip>
  )
}

function StarCell({ label, icon, range }: {
  label: string; icon?: React.ReactNode; range: [number, number] | null
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', ...font(700, 10, 1, '0.04em'), color: TEXT.muted }}>
        {icon}{label.toUpperCase()}
      </span>
      {range ? <StarRange range={range} /> : <span style={{ ...font(400, 13), color: TEXT.faint }}>&ndash;</span>}
    </div>
  )
}

/** Projected stars per side, then strengths and weaknesses (owner, 2026-11-04: stars read
 * cleaner than a projection sentence; archetypes were tried and dropped as corny). */
const ScoutingReport: React.FC<{ report: ScoutingReportData; narrow?: boolean }> = ({ report, narrow }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{
      display: 'grid', gap: '14px 32px',
      gridTemplateColumns: narrow ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
    }}>
      <StarCell label="Overall" range={report.stars.overall} />
      <StarCell label="Offense" icon={<GiBroadsword size={12} color={OFFENSE_COLOR} />}
        range={report.stars.offense} />
      {report.stars.defense && (
        <StarCell label="Defense" icon={<GiShield size={12} color={DEFENSE_COLOR} />}
          range={report.stars.defense} />
      )}
    </div>
    <div style={{
      display: 'grid', gap: '16px 48px',
      gridTemplateColumns: narrow ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
    }}>
      <TraitList title="Strengths" traits={report.strengths} empty="Nothing stands out yet." />
      <TraitList title="Weaknesses" traits={report.weaknesses} empty="No clear weakness." />
    </div>
    {report.growth && (
      <span style={{ ...font(400, 12), color: TEXT.muted }}>
        Most room to grow: <span style={{ color: TEXT.secondary, fontWeight: 600 }}>{report.growth}</span>
      </span>
    )}
  </div>
)

export default ScoutingReport
