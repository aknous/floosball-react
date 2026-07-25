import React from 'react'
import { PlayerGameStats } from '@/hooks/useFantasySnapshot'

// The fielded player's this-week game line as one compact, glanceable string per position.
// Extracted from the lineup performance block (which now shows only FP / gate / effect);
// re-home it wherever the raw game line should live (card back, hover, scoring pane, …).

// CardTemplate.position (1-based) → position label.
export const POSITION_LABEL: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K' }

export function compactStatLine(stats: PlayerGameStats | null | undefined, pos: string): string | null {
  if (!stats) return null
  if (pos === 'QB') {
    const p = stats.passing ?? {}
    const base = `${p.comp ?? 0}/${p.att ?? 0} · ${p.yards ?? 0} yd · ${p.tds ?? 0} TD`
    return (p.ints ?? 0) ? `${base} · ${p.ints} INT` : base
  }
  if (pos === 'RB') {
    const r = stats.rushing ?? {}
    return `${r.carries ?? 0} car · ${r.yards ?? 0} yd · ${r.tds ?? 0} TD`
  }
  if (pos === 'WR' || pos === 'TE') {
    const rc = stats.receiving ?? {}
    return `${rc.receptions ?? 0}/${rc.targets ?? 0} rec · ${rc.yards ?? 0} yd · ${rc.tds ?? 0} TD`
  }
  if (pos === 'K') {
    const k = stats.kicking ?? {}
    return `${k.fgs ?? 0}/${k.fgAtt ?? 0} FG · ${k.longest ?? 0} yd`
  }
  return null
}

export const statLineStyle: React.CSSProperties = {
  fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.35,
  maxWidth: 156, fontVariantNumeric: 'tabular-nums', marginTop: -2,
}
