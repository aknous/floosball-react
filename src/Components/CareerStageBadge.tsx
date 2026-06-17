import React from 'react'

// Young-end career stage badge, shown in the roster's retirement-status slot
// (both the Team page and the Front Office "team management" roster). Only the
// young/peak stages render here — the aging/retiring end is the retirement
// badge's job. Driven by the `stages` map on /teams/{id}/retirement-watch.
const CAREER_STAGE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  developing: { label: 'DEVELOPING', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  prime:      { label: 'PRIME',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
}

const CareerStageBadge: React.FC<{ stage?: string }> = ({ stage }) => {
  const style = stage ? CAREER_STAGE_STYLES[stage] : undefined
  if (!style) return null
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

// True when at least one player's stage will actually render a badge — used to
// decide whether to reserve the roster's badge column.
export function hasRenderableStage(stages: Record<number, string>): boolean {
  return Object.values(stages).some(s => s === 'developing' || s === 'prime')
}

export default CareerStageBadge
