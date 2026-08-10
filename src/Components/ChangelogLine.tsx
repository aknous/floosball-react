import React from 'react'

/**
 * ⚠️ Looked up CASE-INSENSITIVELY, and every tag the changelog actually uses needs an
 * entry. A tag with no entry falls back to grey, and the v1.00 notes introduced a dozen
 * new ones (Everywhere, League, Standings, News, Fixes and so on) that all landed on the
 * fallback, so a release meant to be colour-coded read as one flat grey list. `Pick-Em`
 * also missed `Pick-em` on capitalisation alone.
 */
const TAG_COLORS: Record<string, { fg: string; bg: string }> = {
  'UI/UX':         { fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Everywhere':    { fg: '#e879f9', bg: 'rgba(232,121,249,0.12)' },
  'Front Page':    { fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Games':         { fg: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  'League':        { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  'Standings':     { fg: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  'Playoffs':      { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'News':          { fg: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  'Stats':         { fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Search':        { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  'Mobile':        { fg: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  'Accounts':      { fg: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  'Fixes':         { fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Simulation':    { fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Fantasy':       { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'Cards':         { fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Pick-em':       { fg: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'Achievements':  { fg: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Front Office':  { fg: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  'Teams':         { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  'Shop':          { fg: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  'Hall of Fame':  { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'Prospects':     { fg: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  'Team Funding':  { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'Discord':       { fg: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  'Guide':         { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  'Personality':   { fg: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
}

const TAG_RE = /^\[([^\]]+)\]\s*/

const TAG_LOOKUP: Record<string, { fg: string; bg: string }> = Object.fromEntries(
  Object.entries(TAG_COLORS).map(([k, v]) => [k.toLowerCase(), v]),
)

export const ChangelogLine: React.FC<{ text: string }> = ({ text }) => {
  const match = text.match(TAG_RE)
  if (!match) {
    return <>{text}</>
  }
  const tag = match[1]
  const rest = text.slice(match[0].length)
  const colors = TAG_LOOKUP[tag.toLowerCase()] || { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
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
