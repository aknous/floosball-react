import React from 'react'
import type { PlayerGameStats } from '@/hooks/useFantasySnapshot'

// This week's game stat line for one fielded player (QB/RB/WR/TE/K), plus FP.
// Shown when a locked lineup card is tapped. Mirrors the pre-fusion roster's
// expandable "Game Stats" block.
export const PlayerGameStatStrip: React.FC<{
  playerName: string
  positionLabel: string   // QB / RB / WR / TE / K
  stats: PlayerGameStats | null
  onClose: () => void
}> = ({ playerName, positionLabel, stats, onClose }) => {
  const items: { label: string; value: string }[] = []
  if (stats) {
    if (positionLabel === 'QB') {
      const p = stats.passing ?? {}
      items.push(
        { label: 'Comp/Att', value: `${p.comp ?? 0}/${p.att ?? 0}` },
        { label: 'Pass Yds', value: String(p.yards ?? 0) },
        { label: 'Pass TDs', value: String(p.tds ?? 0) },
        { label: 'INTs', value: String(p.ints ?? 0) },
      )
    } else if (positionLabel === 'RB') {
      const r = stats.rushing ?? {}
      items.push(
        { label: 'Carries', value: String(r.carries ?? 0) },
        { label: 'Rush Yds', value: String(r.yards ?? 0) },
        { label: 'Rush TDs', value: String(r.tds ?? 0) },
      )
    } else if (positionLabel === 'WR' || positionLabel === 'TE') {
      const rc = stats.receiving ?? {}
      items.push(
        { label: 'Rec/Tgt', value: `${rc.receptions ?? 0}/${rc.targets ?? 0}` },
        { label: 'Rec Yds', value: String(rc.yards ?? 0) },
        { label: 'Rec TDs', value: String(rc.tds ?? 0) },
        { label: 'YAC', value: String(rc.yac ?? 0) },
      )
    } else if (positionLabel === 'K') {
      const k = stats.kicking ?? {}
      items.push(
        { label: 'FG', value: `${k.fgs ?? 0}/${k.fgAtt ?? 0}` },
        { label: 'Longest', value: `${k.longest ?? 0} yds` },
      )
    }
  }

  return (
    <div style={{
      backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px',
      padding: '10px 14px', marginTop: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
          <span style={{ color: '#94a3b8', marginRight: 6 }}>{positionLabel}</span>{playerName}
        </span>
        <button onClick={onClose} aria-label="Close stats" style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          fontSize: 16, lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        Game Stats
      </div>
      {stats ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
          {items.map(s => (
            <div key={s.label} style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{s.label}</span>
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>FP</span>
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{(stats.fantasyPoints ?? 0).toFixed(1)}</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: '#64748b' }}>No stats yet — this player hasn't taken the field this week.</div>
      )}
    </div>
  )
}

export default PlayerGameStatStrip
