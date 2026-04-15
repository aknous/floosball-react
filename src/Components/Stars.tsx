import React from 'react'

export const STAR_COLORS: Record<number, string> = {
  5: '#f59e0b',  // gold  — elite
  4: '#22c55e',  // green — good
  3: '#3b82f6',  // blue  — average
  2: '#94a3b8',  // gray  — below average
  1: '#ef4444',  // red   — poor
}

/** Convert a raw numeric rating (60–100) to a 1–5 star count.
 *  Matches backend bands: 1★60-67, 2★68-75, 3★76-83, 4★84-91, 5★92-100 */
export const calcStars = (rating: number): number =>
  Math.min(5, Math.max(1, Math.floor((rating - 60) / 8) + 1))

interface StarsProps {
  /** Pre-computed 1–5 star count (use calcStars() to convert from a raw rating). */
  stars: number
  /** Font size in px. If omitted, inherits from parent. */
  size?: number
}

export const Stars: React.FC<StarsProps> = ({ stars, size }) => {
  const n = Math.max(1, Math.min(5, Math.round(stars)))
  return (
    <span style={{ letterSpacing: '1px', lineHeight: 1, ...(size != null ? { fontSize: `${size}px` } : {}) }}>
      <span style={{ color: STAR_COLORS[n] }}>{'★'.repeat(n)}</span>
      {n < 5 && <span style={{ color: '#1e3a52' }}>{'★'.repeat(5 - n)}</span>}
    </span>
  )
}

// ── SVG icons for offense / defense ──────────────────────────────────────────

export const SwordIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#94a3b8' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M13.5 1l-1 1-4.5 4.5-1.5-1.5L8 3.5 6.5 2l-1 1 1.5 1.5L5.5 6 4 4.5l-1 1L4.5 7 3 8.5l1 1L5.5 8l1.5 1.5-1.5 1.5 1 1L8 10.5l1.5 1.5 1-1L9 9.5l4.5-4.5 1-1V1h-1z" fill={color} />
  </svg>
)

export const ShieldIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#94a3b8' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M8 1.5L2.5 4v4c0 3.3 2.4 6.2 5.5 7 3.1-.8 5.5-3.7 5.5-7V4L8 1.5z" fill={color} fillOpacity="0.9" />
    <path d="M8 1.5L2.5 4v4c0 3.3 2.4 6.2 5.5 7 3.1-.8 5.5-3.7 5.5-7V4L8 1.5z" stroke={color} strokeWidth="0.5" fill="none" />
  </svg>
)

// ── Dual stars (offense + defense) ───────────────────────────────────────────

interface DualStarsProps {
  offensiveStars: number
  defensiveStars: number
  /** Font size in px for the star characters. */
  size?: number
  /** Show sword/shield icon labels. Default true. */
  showIcons?: boolean
}

export const DualStars: React.FC<DualStarsProps> = ({ offensiveStars, defensiveStars, size, showIcons = true }) => {
  const iconSize = size ? Math.round(size * 0.9) : 12
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {showIcons && <SwordIcon size={iconSize} color="#94a3b8" />}
        <Stars stars={offensiveStars} size={size} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {showIcons && <ShieldIcon size={iconSize} color="#94a3b8" />}
        <Stars stars={defensiveStars} size={size} />
      </div>
    </div>
  )
}
