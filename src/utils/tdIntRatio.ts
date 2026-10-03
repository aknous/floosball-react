/**
 * A quarterback's TD:INT ratio, one definition for the stats page and the player profile.
 *
 * Touchdown passes per interception, one decimal. No interceptions reads as the infinity
 * sign when he has thrown a touchdown, and as a dash when he has thrown neither.
 */
export const formatTdIntRatio = (tds: any, ints: any): string => {
  const td = Number(tds ?? 0), int = Number(ints ?? 0)
  if (!int) return td ? '∞' : '—'
  return (td / int).toFixed(1)
}

/**
 * Sort value for the ratio. No interceptions ranks above every real ratio, more
 * touchdowns first. Finite on purpose: tables sort by subtraction, and
 * Infinity - Infinity is NaN.
 */
export const tdIntRatioSortValue = (tds: any, ints: any): number => {
  const td = Number(tds ?? 0), int = Number(ints ?? 0)
  return int ? td / int : (td ? 1e6 + td : -1)
}
