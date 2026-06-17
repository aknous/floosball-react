import React from 'react'

// Shared position chip for the front-office ballots (free agent + prospect) so
// they speak the same visual language: one color per position.
export const POS_CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  QB: { bg: 'rgba(59,130,246,0.18)', fg: '#60a5fa' },
  RB: { bg: 'rgba(34,197,94,0.18)', fg: '#4ade80' },
  WR: { bg: 'rgba(245,158,11,0.18)', fg: '#fbbf24' },
  TE: { bg: 'rgba(168,85,247,0.18)', fg: '#c084fc' },
  K: { bg: 'rgba(148,163,184,0.18)', fg: '#cbd5e1' },
}

const PositionChip: React.FC<{ position: string }> = ({ position }) => {
  const c = POS_CHIP_COLORS[position] || { bg: '#1e293b', fg: '#94a3b8' }
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700,
      color: c.fg, backgroundColor: c.bg,
      padding: '2px 6px', borderRadius: '4px',
      letterSpacing: '0.04em',
      minWidth: 28, textAlign: 'center' as const,
    }}>
      {position}
    </span>
  )
}

export default PositionChip
