import React from 'react'
import { Link } from 'react-router-dom'
import { BORDER, TEXT, ACCENT, font } from '@/Components/Shell/tokens'

/**
 * A section header: title, an optional badge, a rule that eats the remaining width, and
 * a right-hand link out to the full thing.
 */
export const SectionHeader: React.FC<{
  title: string
  badge?: { text: string; color: string; dot?: boolean }
  link?: { to: string; label: string }
  rail?: boolean
}> = ({ title, badge, link, rail = false }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
    <span style={{ ...font(800, rail ? 12 : 13, 1, '0.1em'), color: rail ? TEXT.body : TEXT.strong }}>
      {title}
    </span>
    {badge && (
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', ...font(700, 9, 1, '0.1em'), color: badge.color }}>
        {badge.dot && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: badge.color }} />}
        {badge.text}
      </span>
    )}
    <span style={{ flex: 1, height: '2px', background: BORDER.hairline }} />
    {link && (
      <Link
        to={link.to}
        className="hd"
        style={{ ...font(700, 10, 1, '0.08em'), color: ACCENT.info, textDecoration: 'none', whiteSpace: 'nowrap' }}
      >{link.label}</Link>
    )}
  </div>
)

/**
 * An outlined relationship tag. Only FANTASY survives — the YOURS variants came off every
 * surface (owner), because a tinted row or cell in the team's own color already says it
 * and the badge was repeating the point.
 */
export const RelationTag: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{
    ...font(700, 9, 1, '0.08em'),
    color,
    border: `1px solid ${color}66`,
    padding: '3px 5px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  }}>{label}</span>
)

/** How long ago, in the compact form the news rows use. */
export const timeAgo = (iso?: string | null): string => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
