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
// Two teams with similar primary colors are hard to tell apart on a WP meter /
// scoreboard / field. We flag a clash two ways:
//   1. A perceptually-weighted ("redmean") distance that weights green ~4x (the
//      eye's most sensitive channel) — catches near-identical colors of any hue
//      (two pinks like Melons/Broads, two greens like Rocks/Pinecones).
//   2. A hue-family check — adjacent hues read as "similar" even when their
//      redmean distance is larger (blue vs purple, yellow vs lime), so we also
//      clash colors whose hues sit within HUE_CLASH_DEGREES, gated on both being
//      saturated enough that hue is meaningful and not wildly different in
//      lightness (a light tint and a dark shade of one hue stay distinct).
const COLOR_CLASH_THRESHOLD = 155
const HUE_CLASH_DEGREES = 60          // adjacent hues within this clash (blue/purple ≈ 60°)
const HUE_CLASH_MIN_SAT = 0.25        // below this a color is too gray for hue to matter
const HUE_CLASH_MAX_LIGHT_DIFF = 0.35 // a light vs dark shade of one hue stays distinguishable

function hexToRgb(hex?: string | null): [number, number, number] | null {
  if (!hex) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return [h, s, l]
}

export function colorsTooClose(a?: string | null, b?: string | null): boolean {
  const ra = hexToRgb(a), rb = hexToRgb(b)
  if (!ra || !rb) return false
  // 1) Redmean weighted euclidean distance. https://www.compuphase.com/cmetric.htm
  const dr = ra[0] - rb[0], dg = ra[1] - rb[1], db = ra[2] - rb[2]
  const rmean = (ra[0] + rb[0]) / 2
  const dist = Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db,
  )
  if (dist < COLOR_CLASH_THRESHOLD) return true
  // 2) Same hue-family clash (blue/purple, yellow/lime): close hue, both
  // saturated, similar lightness.
  const [ha, sa, la] = rgbToHsl(ra[0], ra[1], ra[2])
  const [hb, sb, lb] = rgbToHsl(rb[0], rb[1], rb[2])
  let hueDiff = Math.abs(ha - hb)
  if (hueDiff > 180) hueDiff = 360 - hueDiff
  return (
    hueDiff <= HUE_CLASH_DEGREES &&
    Math.min(sa, sb) >= HUE_CLASH_MIN_SAT &&
    Math.abs(la - lb) <= HUE_CLASH_MAX_LIGHT_DIFF
  )
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
