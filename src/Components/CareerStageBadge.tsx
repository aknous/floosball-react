import React from 'react'

// Career stage badge, shown in the roster's retirement-status slot (both the
// Team page and the Front Office "team management" roster). Driven by the
// `stages` map on /teams/{id}/retirement-watch.
//
// By default only the young/peak stages render: in the Front Office roster the
// aging end is the retirement badge's job, and two badges saying the same thing
// is noise. Pass `full` where there is no retirement badge alongside (the team
// page) and the whole arc renders.
const CAREER_STAGE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  developing:      { label: 'DEVELOPING', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  prime:           { label: 'PRIME',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  aging:           { label: 'AGING',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  // "Twilight" rather than the backend's near_retirement: the runway is nearly
  // gone, but nothing has been decided, and "near retirement" reads as settled.
  near_retirement: { label: 'TWILIGHT',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  retiring:        { label: 'RETIRING',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const YOUNG_STAGES = ['developing', 'prime']

const CareerStageBadge: React.FC<{ stage?: string; full?: boolean }> = ({ stage, full = false }) => {
  const style = stage && (full || YOUNG_STAGES.includes(stage))
    ? CAREER_STAGE_STYLES[stage]
    : undefined
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
