import React from 'react'

export const STAR_COLORS: Record<number, string> = {
  5: '#f59e0b',  // gold  — elite
  4: '#22c55e',  // green — good
  3: '#3b82f6',  // blue  — average
  2: '#94a3b8',  // gray  — below average
  1: '#ef4444',  // red   — poor
}

/** Convert a raw numeric rating (0–100) to a 1–5 star count. */
export const calcStars = (rating: number): number =>
  Math.max(1, Math.min(5, Math.round(((rating - 50) / 50) * 4) + 1))

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
