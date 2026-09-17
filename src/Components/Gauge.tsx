/**
 * The house rating gauge, as primitives.
 *
 * ⚠️ ONE PATTERN, PREVIOUSLY THREE COPIES. `PlayerPage.attrRow`, `PlayerHoverCard` and
 * `TeamPage.Gauge` each carried their own track colour, width function and colour bands;
 * this is that pattern extracted so a fourth surface reuses it instead of inventing a
 * fourth. TeamPage now imports these. The other two still hold their own copies and should
 * be migrated when they are next touched.
 */

export const GAUGE_TRACK = '#334155'

/**
 * ⚠️ THE RAW 0-100 VALUE. Do NOT normalize to a 60-100 window to "use the space": it draws
 * an 80 as a half-full bar and empties anything under 60, so two gauges stop being
 * comparable with any other gauge in the app. A prospect chart built on a 60-100 window
 * looked right on its own and disagreed with every roster plate on the same page.
 */
export function barWidth(rating: number): number {
  return Math.max(0, Math.min(100, rating))
}

/** Green / amber / red, at the bands every gauge in the app already uses. */
export function gaugeColor(rating: number): string {
  if (rating >= 85) return '#22c55e'
  if (rating >= 72) return '#f59e0b'
  return '#ef4444'
}
