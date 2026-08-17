import React from 'react'
import { PlayerGameStats, TrackedStat } from '@/hooks/useFantasySnapshot'

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

/** Stats the compact line above already prints, per position, so a card watching one of
 *  them does not repeat it. The overlap is real: Possession watches receptions, and a WR
 *  line opens with receptions. */
const ALREADY_SHOWN: Record<string, string[]> = {
  QB: ['yards', 'comp', 'att', 'tds', 'ints'],
  RB: ['carries', 'yards', 'tds'],
  WR: ['receptions', 'targets', 'yards', 'tds'],
  TE: ['receptions', 'targets', 'yards', 'tds'],
  K: ['fgs', 'fgAtt', 'longest'],
}

/**
 * The stat the equipped card is actually watching, for the line under the game line.
 *
 * ⚠️ A CARD CAN PAY ON A NUMBER THE GAME NEVER SHOWS YOU. Around twenty effects score off
 * stats that appear on no box score — well-placed and bad throws, yards after contact,
 * broken tackles, contested catches, bailouts, punt placement, return yards — so a
 * breakdown could show a payout beside a stat line holding none of the figures behind it.
 *
 * ⚠️ RESOLVES ON `dbKey`, NOT `key`. `playerGameStats` ships raw DB blobs, because the
 * compact line above was written against those names, while the effect code reads a
 * renamed card shape. Ten keys differ (`passYards` against `yards`, `fg40plus` against
 * `fg40+`, `twentyPlus` against `20+`). Using the wrong one does not throw, it reads 0,
 * which is indistinguishable from a quiet week.
 *
 * Returns null for roster-wide effects, which send no tracked stats on purpose.
 */
export function trackedStatLine(
  stats: PlayerGameStats | null | undefined,
  tracked: TrackedStat[] | null | undefined,
  pos: string,
): string | null {
  if (!stats || !tracked?.length) return null
  const shown = ALREADY_SHOWN[pos] ?? []
  const parts = tracked
    .filter(t => !shown.includes(t.dbKey))
    .map(t => {
      const blob = (stats as any)?.[t.group] as Record<string, number> | undefined
      return `${Number(blob?.[t.dbKey] ?? 0)} ${t.label.toLowerCase()}`
    })
  return parts.length ? parts.join(' · ') : null
}

/** Brighter than the game line: this is the number the card is being paid on. */
export const trackedLineStyle: React.CSSProperties = {
  ...statLineStyle, color: '#cbd5e1', marginTop: 1,
}
