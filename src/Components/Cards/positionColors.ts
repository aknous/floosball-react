// Shared per-position accent colors (QB/RB/WR/TE/K). Used on the card front, the fantasy
// lineup slots, and the scoring breakdown so the color coding stays consistent everywhere.
export const POSITION_COLORS: Record<number, string> = {
  1: '#f59e0b', // QB — amber
  2: '#22c55e', // RB — green
  3: '#38bdf8', // WR — sky
  4: '#a78bfa', // TE — violet
  5: '#fb7185', // K  — rose
}

const LABEL_TO_NUM: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5 }

// Neutral slate for FLEX / unknown positions.
export const POSITION_NEUTRAL = '#94a3b8'

// Accept a position number (1-5), a label ('QB' / 'WR1' / …), or nullish.
export function positionColor(pos: number | string | null | undefined): string {
  if (pos == null) return POSITION_NEUTRAL
  if (typeof pos === 'number') return POSITION_COLORS[pos] || POSITION_NEUTRAL
  const key = pos.toUpperCase().replace(/[0-9]+$/, '') // 'WR1' -> 'WR'
  const num = LABEL_TO_NUM[key]
  return num ? POSITION_COLORS[num] : POSITION_NEUTRAL
}
