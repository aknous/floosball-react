import React from 'react'
import { ROUND_ORDER, ROUND_LABEL } from '@/types/playoffBracket'

// Weeks 29-32 are the playoff rounds (Round 1 / Round 2 / League Championship /
// Floos Bowl); show the round name instead of a raw week number.
const weekLabel = (w: number): string => {
  if (w >= 29 && w <= 32) return ROUND_LABEL[ROUND_ORDER[w - 29]]
  return `Week ${w}`
}

interface ScoreboardWeekNavProps {
  currentWeek: number
  /** null = live current week; a number = a completed past week being viewed */
  viewWeek: number | null
  onChange: (week: number | null) => void
}

/**
 * Compact ‹ Week N › selector for the dashboard "Games" header. Lives in the
 * existing header row (not above the grid) so paging weeks never shifts the
 * game cards. Forward from the last completed week returns to the live week.
 */
export const ScoreboardWeekNav: React.FC<ScoreboardWeekNavProps> = ({ currentWeek, viewWeek, onChange }) => {
  if (!currentWeek || currentWeek <= 1) return null  // nothing completed yet

  const isLive = viewWeek === null
  const canBack = (isLive ? currentWeek : viewWeek) > 1
  const goBack = () => onChange(isLive ? Math.max(1, currentWeek - 1) : Math.max(1, (viewWeek as number) - 1))
  const goForward = () => {
    if (isLive) return
    const next = (viewWeek as number) + 1
    onChange(next >= currentWeek ? null : next)
  }

  const btn = (enabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '26px', height: '26px', borderRadius: '6px',
    border: '1px solid #2a3a4e',
    background: enabled ? 'rgba(51,65,85,0.4)' : 'transparent',
    color: enabled ? '#e2e8f0' : '#475569',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '15px', lineHeight: 1, fontWeight: 700, padding: 0,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button aria-label="Previous week" onClick={goBack} disabled={!canBack} style={btn(canBack)}>‹</button>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
        {weekLabel(isLive ? currentWeek : (viewWeek as number))}
        <span style={{ marginLeft: '5px', fontSize: '10px', fontWeight: 600, color: isLive ? '#22c55e' : '#94a3b8' }}>
          {isLive ? 'LIVE' : 'FINAL'}
        </span>
      </span>
      <button aria-label="Next week" onClick={goForward} disabled={isLive} style={btn(!isLive)}>›</button>
    </div>
  )
}
