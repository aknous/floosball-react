/**
 * Design tokens for the redesigned shell and the three pages that live inside it
 * (front page, game board, standings).
 *
 * These are deliberately separate from the older palette in `index.css` / the legacy
 * components: the redesign steps its backgrounds (page -> shell -> panel -> card) where
 * the old one used one flat `#0f172a` plus borders. Mixing the two reads as a bug, so a
 * component belongs to one system or the other, not both.
 *
 * House rules baked in here:
 *   - `muted` (#94a3b8) is the FLOOR for any label. Anything dimmer failed contrast in
 *     design review. `dim`/`faint`/`ghost` are for rules, separators and decoration only.
 *   - No radii except circles (crests, avatars, status dots, seed badges).
 *   - No shadows. Depth comes from the background steps and 1px borders.
 */

import type { CSSProperties } from 'react'

export const BG = {
  page: '#070c15',
  shell: '#0b1220',
  panel: '#0f172a',
  card: '#131e2f',
  cardOwn: '#17222f',
  plateHover: '#1b2739',
} as const

export const BORDER = {
  hairline: '#1e293b',
  subtle: '#16202f',
  raised: '#334155',
  hover: '#475569',
  aliveOutsideCut: '#26344a',
  eliminated: '#5b2b2f',
} as const

export const TEXT = {
  primary: '#f8fafc',
  strong: '#f1f5f9',
  body: '#e2e8f0',
  secondary: '#cbd5e1',
  /** The floor for anything a user has to read. */
  muted: '#94a3b8',
  dim: '#64748b',
  faint: '#475569',
  ghost: '#3f4c60',
} as const

export const ACCENT = {
  live: '#4ade80',
  success: '#22c55e',
  info: '#38bdf8',
  warning: '#f59e0b',
  negative: '#f87171',
  anomaly: '#c084fc',
  rules: '#2dd4bf',
  cards: '#c4b5fd',
  ownTeam: '#f472b6',
  upset: '#f97316',
  featured: '#a78bfa',
} as const

/** Muted, not neon — full-saturation playoff colours read as too loud in review. */
export const PLAYOFF = {
  topSeedRing: '#a87c33',
  topSeedText: '#e3b767',
  topSeedFill: 'rgba(200,150,63,0.16)',
  divisionRing: '#4b7d5c',
  divisionText: '#83c294',
  divisionFill: 'rgba(92,158,111,0.16)',
  wildcardRing: '#4a6e94',
  wildcardText: '#93b6de',
  wildcardFill: 'rgba(91,135,184,0.16)',
  cutline: '#c8963f',
  cutlineText: '#d9a94f',
} as const

export const MOMENTUM = { high: '#f97316', mid: '#fb923c', low: '#fdba74' } as const

export const FONT = "'pressStart', ui-monospace, monospace"

/** Every number that can change is tabular and lives in a fixed-width container. */
export const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const

/**
 * The Footer is `position: fixed; bottom: 0`, so it floats OVER the page and the layout
 * has to reserve its height or the last rows of every page sit underneath it. The old
 * layout did this with a hardcoded `paddingBottom: 33`; this is the same reservation with
 * a name, plus a little clearance.
 */
export const FOOTER_HEIGHT = 40

export const NAV_WIDTH = 196
export const RAIL_WIDTH = 330
/** The Cores' own column on the front page, left of the personal rail. */
export const CORES_WIDTH = 280

/**
 * Shorthand for the `font:` values the handoffs are written in, so a component can say
 * `font(800, 13, 1, '0.1em')` instead of repeating the family five times.
 */
export const font = (
  weight: number,
  size: number,
  lineHeight: number | string = 1,
  letterSpacing?: string,
): CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: `${size}px`,
  lineHeight: typeof lineHeight === 'number' ? lineHeight : lineHeight,
  ...(letterSpacing ? { letterSpacing } : {}),
})
