// Display a team score. Scores can be fractional now (float scoring-value rules —
// a touchdown worth 6.4, and the per-game chaos rulesets during a Criticality), so
// we must NOT round to an integer. Whole numbers show as-is (14), fractional scores
// show one decimal with trailing zeros dropped (8.8), and float artifacts from
// summing (22.800000000000004) are cleaned to their true value (22.8).
export function formatScore(v: number | null | undefined): string {
  if (v == null) return '0'
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10   // clean to 1 decimal (drops float artifacts)
  return String(rounded)                    // 14 -> "14", 8.8 -> "8.8", 8 -> "8"
}
