import React from 'react'
import { TEXT, ACCENT, font } from '@/Components/Shell/tokens'

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

export interface ScoutingReportData {
  summary: string
  strengths: ScoutingTrait[]
  weaknesses: ScoutingTrait[]
  growth: string | null
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
          <span style={{ ...font(600, 13), color: TEXT.body, flex: 1, minWidth: 0 }}>{t.phrase}</span>
          <span style={{ ...font(500, 11), color: TEXT.muted }}>{SIDE_LABEL[t.side]}</span>
        </div>
      ))}
    </div>
  )
}

const ScoutingReport: React.FC<{ report: ScoutingReportData; narrow?: boolean }> = ({ report, narrow }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <p style={{ ...font(500, 14, 1.5), color: TEXT.primary, margin: 0 }}>{report.summary}</p>
    <div style={{
      display: 'grid', gap: '16px 28px',
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
