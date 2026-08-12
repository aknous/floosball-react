/**
 * The two rating ramps the app reads numbers through.
 *
 * They were duplicated inline in PlayerPage and PlayInsightsPanel, which is how
 * a green on one surface ends up a different green on another. One definition
 * each, imported everywhere.
 */

/** Attribute bar fills — 0-100. Steeper bands than the stat ramp: an attribute
 *  is what a player IS, so 85 is where "good" starts. */
export function attrBarColor(v: number): string {
  if (v >= 85) return '#22c55e'
  if (v >= 72) return '#f59e0b'
  return '#ef4444'
}

/** Performance numbers — PERF, DEF RTG, coach and matchup readouts. These are
 *  percentile-of-production, so the bands sit lower and the colors run lighter
 *  because they tint text rather than fill a bar. */
export function statRampColor(v: number): string {
  if (v >= 80) return '#4ade80'
  if (v >= 70) return '#eab308'
  return '#f87171'
}
