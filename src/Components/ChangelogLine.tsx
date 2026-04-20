import React from 'react'

const TAG_COLORS: Record<string, { fg: string; bg: string }> = {
  'UI/UX':         { fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Simulation':    { fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Fantasy':       { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'Cards':         { fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Pick-em':       { fg: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'Achievements':  { fg: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Front Office':  { fg: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  'Prospects':     { fg: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  'Team Funding':  { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'Discord':       { fg: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  'Guide':         { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const TAG_RE = /^\[([^\]]+)\]\s*/

export const ChangelogLine: React.FC<{ text: string }> = ({ text }) => {
  const match = text.match(TAG_RE)
  if (!match) {
    return <>{text}</>
  }
  const tag = match[1]
  const rest = text.slice(match[0].length)
  const colors = TAG_COLORS[tag] || { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return (
    <>
      <span style={{
        display: 'inline-block',
        fontSize: '10px',
        fontWeight: 700,
        color: colors.fg,
        backgroundColor: colors.bg,
        padding: '1px 6px',
        borderRadius: '4px',
        marginRight: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        verticalAlign: '1px',
      }}>{tag}</span>
      {rest}
    </>
  )
}
