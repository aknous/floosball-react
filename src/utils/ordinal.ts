// English ordinal for any positive integer: 1 -> "1st", 4 -> "4th", 5 -> "5th"...
// Downs per series is a mutable rule now (can be 3, 5, ...), so a hardcoded
// ['1st','2nd','3rd','4th'] lookup renders "undefined" past 4th down.
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
