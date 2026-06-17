/**
 * Color utilities for picking text color against arbitrary backgrounds.
 *
 * Used to keep button labels legible when the background is a team's primary
 * color — light teams (Cleveland Rocks, etc.) wash out white text and need
 * dark text instead.
 */

/**
 * Pick a legible text color (#000 or #fff) for a given background hex color.
 * Uses the standard WCAG relative-luminance formula.
 *
 * @param hex Background color, e.g. "#E91E8C" or "E91E8C"
 * @returns "#000000" for light backgrounds, "#ffffff" for dark backgrounds
 */
export function getContrastTextColor(hex: string): string {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return '#ffffff'
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  // sRGB luminance approximation (good enough for picking text color)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}

// ── Team color-clash handling ────────────────────────────────────────────────
// Two teams with near-identical primary colors are hard to tell apart on a WP
// meter / scoreboard / field. Plain RGB euclidean distance with a "basically
// the same" cutoff (tunable).
const COLOR_CLASH_THRESHOLD = 72

function hexToRgb(hex?: string | null): [number, number, number] | null {
  if (!hex) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function colorsTooClose(a?: string | null, b?: string | null): boolean {
  const ra = hexToRgb(a), rb = hexToRgb(b)
  if (!ra || !rb) return false
  const dr = ra[0] - rb[0], dg = ra[1] - rb[1], db = ra[2] - rb[2]
  return Math.sqrt(dr * dr + dg * dg + db * db) < COLOR_CLASH_THRESHOLD
}

/**
 * Away team's effective display color. When its primary is basically the same
 * as the home primary, fall back to its secondary (only if that actually
 * separates from home) so the two stay distinguishable. Home is the reference.
 */
export function effectiveAwayColor(homeColor?: string | null, awayColor?: string | null, awaySecondary?: string | null): string {
  const away = awayColor ?? '#888'
  if (colorsTooClose(homeColor, away) && awaySecondary && !colorsTooClose(homeColor, awaySecondary)) {
    return awaySecondary
  }
  return away
}
