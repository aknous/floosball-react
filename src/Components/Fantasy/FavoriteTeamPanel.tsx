import React from 'react'
import type { FavoriteTeamData } from '@/hooks/useFantasySnapshot'

// The user's favorite team at a glance: record, current streak, this-week result,
// and playoff position. Restored from the pre-fusion fantasy page.
export const FavoriteTeamPanel: React.FC<{ ft: FavoriteTeamData; isMobile: boolean }> = ({ ft, isMobile }) => {
  const streakText = ft.streak > 0 ? `W${ft.streak}` : ft.streak < 0 ? `L${Math.abs(ft.streak)}` : '--'
  const streakColor = ft.streak > 0 ? '#22c55e' : ft.streak < 0 ? '#ef4444' : '#94a3b8'
  const [w, l] = ft.record.split('-').map(Number)
  const played = (w + l) >= 1

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px',
      padding: isMobile ? '8px 10px' : '10px 14px',
      backgroundColor: '#0f172a', borderRadius: '10px',
      borderLeft: `3px solid ${ft.teamColor}`,
      border: '1px solid #334155',
    }}>
      <img
        src={`/avatars/${ft.teamId}.png`}
        alt={ft.teamAbbr}
        style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '50%', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 600, color: '#f1f5f9' }}>
          {ft.teamName}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>ELO <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{ft.elo.toFixed(0)}</span></span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ft.record}</span>
          <span style={{ fontSize: '11px', color: streakColor, fontWeight: 600 }}>{streakText}</span>
          {ft.gameScore && <span style={{ fontSize: '11px', color: ft.wonThisWeek ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{ft.gameScore}</span>}
        </div>
      </div>
      {played && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '10px', fontWeight: 600,
            color: ft.inPlayoffs ? '#22c55e' : '#94a3b8',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              {ft.inPlayoffs ? (
                <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
            {ft.inPlayoffs ? 'Playoff Spot' : 'Outside Playoffs'}
          </div>
        </div>
      )}
    </div>
  )
}

export default FavoriteTeamPanel
