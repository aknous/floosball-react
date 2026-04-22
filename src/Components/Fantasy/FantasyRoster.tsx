import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFantasyLivePoints } from '@/hooks/useFantasyLivePoints'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { useCardProjection, TIER_STYLES } from '@/hooks/useCardProjection'
import type { CardBreakdownEntry, EquationSummary, ModifierInfo, FavoriteTeamData, PlayerGameStats } from '@/hooks/useFantasySnapshot'
import { Stars } from '@/Components/Stars'
import HoverTooltip from '@/Components/HoverTooltip'
import { useIsMobile } from '@/hooks/useIsMobile'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import { PlayerPicker } from './PlayerPicker'
import type { PlayerCardInfo } from './PlayerPicker'
import type { FantasyRosterPlayer } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface SwapHistoryEntry {
  slot: string
  oldPlayerName: string
  newPlayerName: string
  swapWeek: number
  bankedFP: number
}

interface Roster {
  id: number
  season: number
  isLocked: boolean
  lockedAt: string | null
  totalPoints: number
  cardBonusPoints: number
  swapsAvailable: number
  purchasedSwaps: number
  hasFlexSlot?: boolean
  players: FantasyRosterPlayer[]
  swapHistory: SwapHistoryEntry[]
  swapCosts?: Record<string, number>
}

interface ActivePowerup {
  slug: string
  displayName: string
  weeksRemaining?: number
  expiring?: boolean
  overrideModifier?: string
  count?: number
  boostedCap?: number
  standardCap?: number
}

const BASE_SLOTS = [
  { key: 'QB', label: 'QB', position: 'QB' },
  { key: 'RB', label: 'RB', position: 'RB' },
  { key: 'WR1', label: 'WR', position: 'WR' },
  { key: 'WR2', label: 'WR', position: 'WR' },
  { key: 'TE', label: 'TE', position: 'TE' },
  { key: 'K', label: 'K', position: 'K' },
]
const FLEX_SLOT = { key: 'FLEX', label: 'FLEX', position: 'FLEX' }

// Canonical FP-type colors used everywhere in the breakdown
const TYPE_COLORS = {
  fp: '#4ade80',       // FP — green
  mult: '#f472b6',     // FPx — pink
  floobits: '#eab308', // Floobits — yellow/gold
} as const

const CATEGORY_COLORS: Record<string, string> = {
  flat_fp: TYPE_COLORS.fp,
  multiplier: TYPE_COLORS.mult,
  floobits: TYPE_COLORS.floobits,
  conditional: '#60a5fa',
  streak: '#fb923c',
  accumulator: '#fb923c',
}

// Behavior tags for breakdown — tells users which modifiers affect each card
const BEHAVIOR_TAGS: Record<string, { label: string; color: string; tooltip: string; activeModifier: string; activeText: string }> = {
  chance:      { label: 'CHC', color: '#c084fc', tooltip: 'Chance — Random trigger roll', activeModifier: 'fortunate', activeText: 'Fortunate active — trigger rates boosted' },
  conditional: { label: 'CND', color: '#60a5fa', tooltip: 'Conditional — Triggers on game condition', activeModifier: 'longshot', activeText: 'Longshot active — rewards doubled' },
  streak:      { label: 'STRK', color: '#fb923c', tooltip: 'Streak — Grows each week, resets when broken', activeModifier: 'ironclad', activeText: 'Ironclad active — streak protected' },
}

function getBreakdownBehavior(b: CardBreakdownEntry): keyof typeof BEHAVIOR_TAGS | null {
  if (b.isChanceEffect) return 'chance'
  if (b.category === 'conditional') return 'conditional'
  if (b.category === 'streak') return 'streak'
  return null
}

const EDITION_SHORT: Record<string, string> = {
  base: 'BASE',
  holographic: 'HOLO',
  prismatic: 'PRSM',
  diamond: 'DMND',
}

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  holographic: '#c4b5fd',
  prismatic: '#f472b6',
  diamond: '#67e8f9',
}

// Color coding for weekly modifiers: green = beneficial, yellow = neutral, red = restrictive
const MODIFIER_COLORS: Record<string, { color: string; bg: string }> = {
  amplify:   { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  cascade:   { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  frenzy:    { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  overdrive: { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  payday:    { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  longshot:  { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  synergy:   { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  fortunate: { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  ironclad:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' },
  wildcard:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' },
  steady:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  grounded:  { color: '#f87171', bg: 'rgba(248,113,113,0.18)' },
}

interface PlayerSummary {
  playerName: string
  position: string
  weekFP: number
}


const PointsBreakdownPanel: React.FC<{
  playerSummaries: PlayerSummary[]
  breakdowns: CardBreakdownEntry[]
  equationSummary?: EquationSummary
  weekPlayerFP: number
  weekCardBonus: number
  seasonEarnedFP: number
  seasonCardBonus: number
  seasonTotal: number
  modifier?: ModifierInfo | null
}> = ({ playerSummaries, breakdowns, equationSummary, weekPlayerFP, weekCardBonus, seasonEarnedFP, seasonCardBonus, seasonTotal, modifier }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ formula: true })
  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '13px',
  }
  const sectionHeader: React.CSSProperties = {
    fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '4px', marginTop: '10px',
  }
  const divider: React.CSSProperties = {
    borderTop: '1px solid #334155', marginTop: '6px', paddingTop: '6px',
  }
  const collapsibleHeader = (key: string, label: string, summaryValue: string, summaryColor: string, isFirst?: boolean) => (
    <div
      onClick={() => toggle(key)}
      style={{
        marginTop: isFirst ? 0 : '10px',
        cursor: 'pointer', userSelect: 'none',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px',
        borderRadius: '6px',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', width: '14px', textAlign: 'center' }}>
          {expanded[key] ? '−' : '+'}
        </span>
        {label}
      </span>
      {!expanded[key] && (
        <span style={{ color: summaryColor, fontWeight: '700', fontSize: '13px' }}>
          {summaryValue}
        </span>
      )}
    </div>
  )

  const eq = equationSummary
  const hasEquation = eq && (eq.totalBonusFP > 0 || (eq.multFactors?.length ?? 0) > 0)

  // Build per-card value chips: each card shows all its outputs inline
  const formatValue = (val: number, type: 'fp' | 'mult' | 'floobits'): { str: string; color: string } => {
    if (type === 'fp') return { str: `+${val.toFixed(1)} FP`, color: TYPE_COLORS.fp }
    if (type === 'mult') return { str: `${val.toFixed(2)}x FPx`, color: TYPE_COLORS.mult }
    return { str: `+${val}F`, color: TYPE_COLORS.floobits }
  }

  // Colorize FP-type values in card effect text (e.g. "+1.1 FPx" → purple)
  const colorizeEffectText = (text: string, baseColor: string): React.ReactNode => {
    const pattern = /([+-]?\d+\.?\d*x?\s*)?(\+?FPx|FP\b|Floobits\b|F\b)/g
    const parts: React.ReactNode[] = []
    let lastIdx = 0
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
      const kw = m[2]
      const color = (kw === 'FPx' || kw === '+FPx') ? TYPE_COLORS.mult
        : (kw === 'Floobits' || kw === 'F') ? TYPE_COLORS.floobits
        : TYPE_COLORS.fp
      parts.push(<span key={m.index} style={{ color }}>{m[0]}</span>)
      lastIdx = m.index + m[0].length
    }
    if (parts.length === 0) return text
    if (lastIdx < text.length) parts.push(text.slice(lastIdx))
    return <>{parts}</>
  }

  // Determine if modifier negates certain types
  const mod = modifier?.name ?? ''
  const isGrounded = mod === 'grounded'

  // Compute totals from breakdowns for the equation
  const totalFloobits = breakdowns.reduce((s, b) => s + (b.floobitsEarned ?? 0), 0)

  const sectionTotalStyle: React.CSSProperties = {
    ...rowStyle, ...divider, fontWeight: '700', fontSize: '13px',
  }

  return (
    <div style={{
      backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px',
      padding: '10px 14px', marginTop: '0px',
    }}>
      {/* This Week — Player FP */}
      {collapsibleHeader('playerFP', 'Roster Week Total', `+${weekPlayerFP.toFixed(1)}`, '#22c55e', true)}
      {expanded['playerFP'] && (
        <>
          {playerSummaries.filter(p => p.position !== '').map((p, i) => (
            <div key={i} style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '700', flexShrink: 0, width: '22px' }}>{p.position}</span>
                <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.playerName}</span>
              </div>
              <span style={{ flexShrink: 0, color: '#22c55e', fontWeight: '600' }}>
                +{p.weekFP.toFixed(1)}
              </span>
            </div>
          ))}
          <div style={sectionTotalStyle}>
            <span style={{ color: '#cbd5e1' }}>Roster FP</span>
            <span style={{ color: '#22c55e' }}>+{weekPlayerFP.toFixed(1)}</span>
          </div>
        </>
      )}

      {/* Equipped Cards */}
      {breakdowns.length > 0 && (
        <>
          {collapsibleHeader('cards', 'Equipped Cards Total', weekCardBonus > 0 ? `+${weekCardBonus.toFixed(1)} bonus` : `${breakdowns.length} cards`, '#a78bfa')}
          {expanded['cards'] && (<>
          {breakdowns.map((b, i) => {
            const edTag = EDITION_SHORT[b.edition] ?? b.edition
            const edColor = EDITION_COLORS[b.edition] ?? '#94a3b8'
            const effectLabel = b.displayName || b.effectName
            const behaviorKey = getBreakdownBehavior(b)
            const bTag = behaviorKey ? BEHAVIOR_TAGS[behaviorKey] : null

            const floobitsTotal = b.floobitsEarned ?? 0

            // Build equation segments: each piece gets its own color (match = blue)
            let eqSegments: {text: string, color: string}[] = []
            let eqResult: { str: string; color: string } | null = null
            let eqNegated = false // true when modifier negates this output type
            const mm = b.matchMultiplier ?? 1.5
            const fpMatched = b.matchMultiplied && (b.preMatchFP ?? 0) > 0 && b.preMatchFP !== b.primaryFP
            const fMatched = b.matchMultiplied && (b.preMatchFloobits ?? 0) > 0
            const primaryF = floobitsTotal - (b.secondaryFloobits ?? 0)
            const matchColor = '#60a5fa'

            // Determine which modifier tag to append per output type
            const isLongshot = mod === 'longshot' && b.category === 'conditional'
            const fpModTag = mod === 'frenzy' ? ' × 2x frenzy'
              : isLongshot ? ' × 2x longshot' : ''
            const multModTag = (mod === 'amplify' || mod === 'cascade') ? ` × 2x ${mod}`
              : isLongshot ? ' × 2x longshot'
              : isGrounded ? ' (grounded)' : ''
            const fModTag = mod === 'payday' ? ' × 3x payday'
              : isLongshot ? ' × 2x longshot' : ''

            if (b.primaryFP > 0 || fpMatched) {
              const c = TYPE_COLORS.fp
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (fpMatched) eqSegments.push({text: b.preMatchFP.toFixed(1), color: c})
              if (fpMatched) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (fpModTag) eqSegments.push({text: ` ${fpModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryFP, 'fp')
            } else if (b.primaryMult > 1) {
              const c = TYPE_COLORS.mult
              eqNegated = isGrounded
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (b.matchMultiplied) {
                const preMult = 1 + (b.primaryMult - 1) / mm
                eqSegments.push({text: `${preMult.toFixed(2)}x`, color: c})
              }
              if (b.matchMultiplied) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (multModTag) eqSegments.push({text: ` ${multModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryMult, 'mult')
            } else if (primaryF > 0) {
              const c = TYPE_COLORS.floobits
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (fMatched) eqSegments.push({text: `${b.preMatchFloobits}F`, color: c})
              if (fMatched && b.preMatchFloobits !== primaryF) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (fModTag) eqSegments.push({text: ` ${fModTag.trim()}`, color: c})
              eqResult = formatValue(primaryF, 'floobits')
            } else if (b.equation) {
              // Grounded mult: show equation with struck-through would-be value
              if (isGrounded && b.outputType === 'mult' && (b.preMatchMult || 0) > 1) {
                const c = TYPE_COLORS.mult
                eqSegments.push({text: b.equation, color: c})
                eqSegments.push({text: ' (grounded)', color: '#ef4444'})
                eqResult = { str: `${b.preMatchMult.toFixed(2)}x FPx`, color: '#64748b' }
                eqNegated = true
              } else {
                eqSegments.push({text: b.equation, color: '#94a3b8'})
              }
            }

            // Sub-lines: conditional, edition bonuses (with negation tracking)
            const subLines: { label: React.ReactNode; chip: { str: string; color: string }; negated?: boolean }[] = []
            // Conditional bonus (match bonus — only triggers when card player is on roster)
            if ((b.conditionalBonus ?? 0) > 0) {
              const condLabel = <><span style={{ color: matchColor, fontWeight: '700' }}>Match</span> {b.conditionalLabel || 'Conditional bonus'}</>
              subLines.push({ label: condLabel, chip: formatValue(b.conditionalBonus, 'fp') })
            }
            // Edition secondary bonuses
            const edLabel = <><span style={{ color: edColor, fontWeight: '700' }}>{edTag}</span> bonus</>
            if ((b.secondaryFP ?? 0) > 0) subLines.push({ label: edLabel, chip: formatValue(b.secondaryFP, 'fp') })
            if ((b.secondaryMult ?? 0) > 1) subLines.push({ label: edLabel, chip: formatValue(b.secondaryMult, 'mult'), negated: isGrounded })
            if ((b.secondaryFloobits ?? 0) > 0) subLines.push({ label: edLabel, chip: formatValue(b.secondaryFloobits, 'floobits') })

            // Zero state: show dimmed output type on header when no equation/results
            const hasOutput = eqSegments.length > 0 || eqResult
            let zeroChip: { str: string; color: string; negated?: boolean } | null = null
            if (!hasOutput) {
              const t = b.outputType
              const negateChip = isGrounded && t === 'mult'
              // When grounded, use pre-modifier values to show what the card WOULD produce
              const realMult = negateChip ? (b.preMatchMult || b.primaryMult || 1) : (b.primaryMult || 1)
              zeroChip = t === 'mult'
                ? { str: `${realMult.toFixed(2)}x FPx`, color: '#64748b', negated: negateChip }
                : t === 'floobits'
                ? { str: '+0F', color: '#64748b' }
                : { str: '+0.0 FP', color: '#64748b' }
            }

            return (
              <div key={i} style={{
                marginBottom: i < breakdowns.length - 1 ? '6px' : 0,
                paddingBottom: i < breakdowns.length - 1 ? '6px' : 0,
                borderBottom: i < breakdowns.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                {/* Card header line — identity only, no values */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
                  <span style={{ color: edColor, fontWeight: '700', fontSize: '11px', flexShrink: 0 }}>{edTag}</span>
                  <span style={{ color: '#f1f5f9', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.playerName}
                  </span>
                  <HoverTooltip text={b.detail || ''} color={(TYPE_COLORS as any)[b.outputType] ?? CATEGORY_COLORS[b.category] ?? '#cbd5e1'}>
                    <span style={{ color: (TYPE_COLORS as any)[b.outputType] ?? CATEGORY_COLORS[b.category] ?? '#cbd5e1', fontSize: '11px', flexShrink: 0 }}>
                      {effectLabel}
                    </span>
                  </HoverTooltip>
                  {b.matchMultiplied && (
                    <span style={{
                      color: '#60a5fa', fontSize: '10px', fontWeight: '700', flexShrink: 0,
                      backgroundColor: 'rgba(96,165,250,0.15)', padding: '2px 5px', borderRadius: '3px',
                    }}>MATCH</span>
                  )}
                  {bTag && (
                    <HoverTooltip text={mod === bTag.activeModifier ? bTag.activeText : bTag.tooltip} color={bTag.color}>
                      <span style={{
                        color: bTag.color, fontSize: '10px', flexShrink: 0,
                        backgroundColor: `${bTag.color}30`, padding: '2px 5px', borderRadius: '3px',
                      }}>{bTag.label}</span>
                    </HoverTooltip>
                  )}
                  {zeroChip && (
                    <span style={{ color: zeroChip.color, fontWeight: '600', fontSize: '12px', marginLeft: 'auto', textDecoration: zeroChip.negated ? 'line-through' : 'none', opacity: zeroChip.negated ? 0.45 : 1 }}>{zeroChip.str}</span>
                  )}
                </div>
                {/* Streak status line */}
                {b.streakActive != null && (
                  <div style={{ paddingLeft: '16px', fontSize: '11px', padding: '2px 0 0 16px' }}>
                    {b.streakActive ? (
                      <span style={{ color: '#fb923c', fontWeight: '600' }}>
                        Streak Active (streak = {Math.max(0, (b.streakCount ?? 0) - 1)})
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>
                        Streak Inactive — awaiting condition (streak = {Math.max(0, (b.streakCount ?? 0) - 1)})
                      </span>
                    )}
                  </div>
                )}
                {/* Equation line with result right-aligned */}
                {(eqSegments.length > 0 || eqResult) && (
                  <div style={{ ...rowStyle, paddingLeft: '16px', opacity: eqNegated ? 0.45 : 1 }}>
                    <span style={{ fontSize: '11px', fontStyle: 'italic', textDecoration: eqNegated ? 'line-through' : 'none' }}>
                      {eqSegments.map((seg, j) => (
                        <span key={j} style={{ color: seg.color }}>{seg.text}</span>
                      ))}
                    </span>
                    {eqResult && (
                      <span style={{ color: eqResult.color, fontWeight: '700', fontSize: '13px', textDecoration: eqNegated ? 'line-through' : 'none' }}>{eqResult.str}</span>
                    )}
                  </div>
                )}
                {/* Sub-lines: conditional, edition bonuses */}
                {subLines.map((sub, j) => (
                  <div key={j} style={{ ...rowStyle, paddingLeft: '16px', opacity: sub.negated ? 0.45 : 1 }}>
                    <span style={{ color: '#cbd5e1', fontSize: '11px', textDecoration: sub.negated ? 'line-through' : 'none' }}>{sub.label}</span>
                    <span style={{ color: sub.chip.color, fontSize: '12px', fontWeight: '600', textDecoration: sub.negated ? 'line-through' : 'none' }}>{sub.chip.str}</span>
                  </div>
                ))}
                {/* Roster player stats */}
                {b.playerStatLine && (
                  <div style={{ paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', padding: '2px 0 2px 16px' }}>
                    <span style={{ color: '#64748b' }}>Slot stats: </span>{b.playerStatLine}
                  </div>
                )}
              </div>
            )
          })}

          {/* Hand synergy summary */}
          {eq?.handSynergies && (() => {
            const syn = eq.handSynergies!
            const hasChance = syn.chance.count > 0
            const hasStreak = syn.streak.count > 1
            const hasMatch = syn.match.count > 0
            if (!hasChance && !hasStreak && !hasMatch) return null
            const synStyle = { ...divider, padding: '6px 0 4px 0' }
            const labelStyle = { color: '#94a3b8', fontSize: '11px' as const }
            const valStyle = { fontSize: '11px' as const, fontWeight: '600' as const }
            return (
              <div style={synStyle}>
                <div style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Hand Synergies</div>
                {hasChance && (
                  <div style={{ marginBottom: '3px' }}>
                    <div style={{ ...rowStyle }}>
                      <span style={labelStyle}>Chance · {syn.chance.count} card{syn.chance.count !== 1 ? 's' : ''}</span>
                      <span style={{ ...valStyle, color: '#a78bfa' }}>+{(syn.chance.totalBonus * 100).toFixed(0)}% boost</span>
                    </div>
                    {syn.chance.innateBonus > 0 && (
                      <div style={{ paddingLeft: '12px', fontSize: '10px', color: '#94a3b8' }}>
                        Innate: +{(syn.chance.innateBonus * 100).toFixed(0)}%
                      </div>
                    )}
                    {syn.chance.amplifiers.map((amp, j) => (
                      <div key={j} style={{ paddingLeft: '12px', fontSize: '10px', color: '#94a3b8' }}>
                        {amp.name}: +{(amp.bonus * 100).toFixed(0)}%
                      </div>
                    ))}
                    {syn.chance.hasAdvantage && (
                      <div style={{ paddingLeft: '12px', fontSize: '10px', color: '#94a3b8' }}>
                        Advantage: rolling twice
                      </div>
                    )}
                  </div>
                )}
                {hasStreak && (
                  <div style={{ ...rowStyle, marginBottom: '3px' }}>
                    <span style={labelStyle}>Streak · {syn.streak.count} cards</span>
                    <span style={{ ...valStyle, color: '#fb923c' }}>{syn.streak.activeCount} active</span>
                  </div>
                )}
                {hasMatch && (
                  <div style={{ ...rowStyle }}>
                    <span style={labelStyle}>Match bonus</span>
                    <span style={{ ...valStyle, color: '#60a5fa' }}>{syn.match.count}/{syn.match.total} matched · 1.5x each</span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Totals summary */}
          {totalFloobits > 0 && (
            <div style={{ ...rowStyle, ...divider }}>
              <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '13px' }}>Floobits earned</span>
              <span style={{ color: TYPE_COLORS.floobits, fontWeight: '700', fontSize: '13px' }}>+{totalFloobits}F</span>
            </div>
          )}
          </>)}
        </>
      )}

      {/* Formula box */}
      {hasEquation && (() => {
        const baseFP = eq!.weekRawFP + eq!.totalBonusFP
        const factors = eq!.multFactors ?? []
        const multProduct = factors.length > 0 ? factors.reduce((a, b) => a * b, 1) : 1
        const hasMult = factors.length > 0
        return (
          <>
          {collapsibleHeader('formula', 'Week Score Total', `${(weekPlayerFP + weekCardBonus).toFixed(1)} pts`, '#818cf8')}
          {expanded['formula'] && (
          <div style={{
            marginTop: '4px', padding: '10px 12px',
            backgroundColor: 'rgba(99,102,241,0.10)', borderRadius: '8px',
            borderBottom: '2px solid rgba(99,102,241,0.5)',
          }}>
            <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', lineHeight: '1.8' }}>
              <span style={{ color: '#cbd5e1' }}>(</span>
              <span style={{ color: '#22c55e' }}>{eq!.weekRawFP.toFixed(1)}</span>
              <span style={{ color: '#cbd5e1' }}> roster</span>
              {eq!.totalBonusFP > 0 && (
                <>
                  <span style={{ color: '#cbd5e1' }}> + </span>
                  <span style={{ color: TYPE_COLORS.fp }}>{eq!.totalBonusFP.toFixed(1)}</span>
                  <span style={{ color: '#cbd5e1' }}> FP</span>
                </>
              )}
              <span style={{ color: '#cbd5e1' }}>)</span>
              {hasMult && factors.map((f, i) => (
                <React.Fragment key={i}>
                  <span style={{ color: '#cbd5e1' }}> {'\u00d7'} </span>
                  <span style={{ color: TYPE_COLORS.mult, textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}>{f.toFixed(2)}</span>
                  <span style={{ color: '#cbd5e1', textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}> FPx</span>
                </React.Fragment>
              ))}
            </div>

            {/* Total */}
            <div style={{
              textAlign: 'right', marginTop: '6px',
              paddingTop: '6px', borderTop: '1px solid rgba(99,102,241,0.15)',
            }}>
              <span style={{
                fontSize: '20px', fontWeight: '800', color: '#22c55e',
                fontFamily: 'monospace',
              }}>= {(weekPlayerFP + weekCardBonus).toFixed(1)}</span>
            </div>
          </div>
          )}
          </>
        )
      })()}

      {/* Season Totals */}
      {collapsibleHeader('season', 'Season Score Total', seasonTotal.toFixed(0) + ' pts', '#22c55e')}
      {expanded['season'] && (
        <>
          {seasonCardBonus > 0 && (
            <>
              <div style={rowStyle}>
                <span style={{ color: '#cbd5e1' }}>Player FP (all weeks)</span>
                <span style={{ color: '#22c55e', fontWeight: '600' }}>{seasonEarnedFP.toFixed(1)}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ color: '#cbd5e1' }}>Card bonuses (all weeks)</span>
                <span style={{ color: '#a78bfa', fontWeight: '600' }}>{seasonCardBonus.toFixed(1)}</span>
              </div>
            </>
          )}
          <div style={{ ...rowStyle, ...divider, fontSize: '14px' }}>
            <span style={{ color: '#f1f5f9', fontWeight: '700' }}>Season Total</span>
            <span style={{ color: '#22c55e', fontWeight: '700' }}>{seasonTotal.toFixed(0)}</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Pre-lock projection card — shown at the top of the Breakdown panel
 * before games start. Estimates what the current lineup + equipped cards
 * will score this week based on per-player season averages and an ELO-
 * driven win-probability forecast.
 */
const ProjectedWeekSummary: React.FC = () => {
  const { equipped, loading } = useCardProjection(false)
  if (loading || !equipped) return null
  const { projectedRosterFP, totalBonusFP, projectedTotalFP, cards, opponent, winProbability } = equipped

  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    fontSize: '12px', padding: '3px 0',
  }

  return (
    <div style={{
      backgroundColor: 'rgba(59,130,246,0.08)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: '8px',
      padding: '10px 12px',
      marginBottom: '12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '8px',
      }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: '#60a5fa',
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        }}>
          Projected This Week
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          Based on season averages{opponent ? ` · vs ${opponent} (${Math.round(winProbability * 100)}% win)` : ''}
        </span>
      </div>
      <div style={row}>
        <span style={{ color: '#cbd5e1' }}>Roster FP</span>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{projectedRosterFP.toFixed(1)}</span>
      </div>
      <div style={row}>
        <span style={{ color: '#cbd5e1' }}>Card Bonus</span>
        <span style={{ color: totalBonusFP > 0 ? '#4ade80' : '#94a3b8', fontWeight: 600 }}>
          {totalBonusFP > 0 ? '+' : ''}{totalBonusFP.toFixed(1)}
        </span>
      </div>
      <div style={{ ...row, borderTop: '1px solid rgba(59,130,246,0.3)', marginTop: '4px', paddingTop: '6px' }}>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '13px' }}>Base Payout</span>
        <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '14px' }}>
          {projectedTotalFP.toFixed(1)} FP
        </span>
      </div>
      {cards.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '5px' }}>
            Per card
          </div>
          {cards.map(c => {
            const tierCfg = TIER_STYLES[c.tier]
            const outputLabel = c.outputType === 'mult' && c.projectedMult > 1
              ? `×${c.projectedMult.toFixed(2)}`
              : c.outputType === 'floobits' && c.projectedFloobits > 0
                ? `+${c.projectedFloobits}F`
                : `${c.projectedFP > 0 ? '+' : ''}${c.projectedFP.toFixed(1)} FP`
            return (
              <div key={c.slotNumber} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '12px',
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: tierCfg.color, backgroundColor: tierCfg.bg,
                  padding: '1px 5px', borderRadius: '3px', minWidth: '22px', textAlign: 'center' as const,
                }}>
                  {tierCfg.short}
                </span>
                <span style={{ flex: 1, color: '#cbd5e1' }}>{c.displayName}</span>
                <span style={{ color: tierCfg.color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {outputLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


export const FantasyRoster: React.FC = () => {
  const isMobile = useIsMobile()
  const { user, getToken, refetchRoster } = useAuth()
  const { event: wsEvent, connected: wsConnected } = useSeasonWebSocket()
  const wsWasConnected = useRef(false)
  const [roster, setRoster] = useState<Roster | null>(null)
  const { getLiveEarnedPoints, livePlayerMap } = useFantasyLivePoints(
    roster?.isLocked ? roster.players : undefined,
  )
  const { myEntry, modifier, week } = useFantasySnapshot(user?.id)
  const [season, setSeason] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pickerSlot, setPickerSlot] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'roster' | 'breakdown'>('roster')
  const [scoreView, setScoreView] = useState<'season' | 'weekly'>('weekly')
  const [swapping, setSwapping] = useState(false)
  const [swapSlot, setSwapSlot] = useState<string | null>(null)
  const [pendingSwap, setPendingSwap] = useState<{ slot: string; player: any } | null>(null)
  const [gamesActive, setGamesActive] = useState(false)
  const [gamesInProgress, setGamesInProgress] = useState(false)
  const [hasFlexSlot, setHasFlexSlot] = useState(false)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  // Local draft state for unsaved changes
  const [draftPlayers, setDraftPlayers] = useState<Map<string, FantasyRosterPlayer>>(new Map())
  const [dirty, setDirty] = useState(false)

  const [playerCards, setPlayerCards] = useState<Map<number, PlayerCardInfo[]>>(new Map())
  const [activePowerups, setActivePowerups] = useState<ActivePowerup[]>([])

  const dirtyRef = useRef(false)
  dirtyRef.current = dirty

  // Listen for tutorial tab-switch requests
  useEffect(() => {
    const showRoster = () => setViewMode('roster')
    const showBreakdown = () => setViewMode('breakdown')
    window.addEventListener('floosball:show-roster', showRoster)
    window.addEventListener('floosball:show-breakdown', showBreakdown)
    return () => {
      window.removeEventListener('floosball:show-roster', showRoster)
      window.removeEventListener('floosball:show-breakdown', showBreakdown)
    }
  }, [])

  // Lookup: playerId → weekFP from snapshot (for weekly view)
  const weekFPByPlayer = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of myEntry?.players ?? []) m.set(p.playerId, p.weekFP)
    return m
  }, [myEntry?.players])

  // Get player stats: prefer live WS data during games, fall back to snapshot.
  // WS data has stats spread flat on the player object (one category per position),
  // while snapshot data has them nested under passing/rushing/receiving/kicking keys.
  const getPlayerStats = useCallback((playerId: number, position: string): { stats: Record<string, any> | null; fp: number } => {
    const liveData = livePlayerMap.get(playerId)
    if (liveData?.gameStats) {
      const gs = liveData.gameStats
      // WS spreads the primary stat category flat — reconstruct nested format
      const stats: Record<string, any> = {}
      if (position === 'QB') {
        stats.passing = { att: gs.att, comp: gs.comp, yards: gs.yards, tds: gs.tds, ints: gs.ints, longest: gs.longest }
      } else if (position === 'RB') {
        stats.rushing = { carries: gs.carries, yards: gs.yards, tds: gs.tds, longest: gs.longest, fumblesLost: gs.fumblesLost }
      } else if (position === 'WR' || position === 'TE') {
        stats.receiving = { targets: gs.targets, receptions: gs.receptions, yards: gs.yards, tds: gs.tds, yac: gs.yac, longest: gs.longest }
      } else if (position === 'K') {
        stats.kicking = { fgAtt: gs.fgAtt, fgs: gs.fgs, longest: gs.longest }
      }
      return { stats, fp: liveData.gameFantasyPoints }
    }
    const snapshotStats = myEntry?.playerGameStats?.[playerId]
    if (snapshotStats) {
      return { stats: snapshotStats, fp: snapshotStats.fantasyPoints }
    }
    return { stats: null, fp: 0 }
  }, [livePlayerMap, myEntry?.playerGameStats])

  const fetchRoster = useCallback(async (force?: boolean) => {
    const tok = await getToken()
    if (!tok) { setLoading(false); return }
    try {
      const res = await axios.get(`${API_BASE}/fantasy/roster`, { headers: { Authorization: `Bearer ${tok}` } })
      const data = res.data?.data || res.data
      setSeason(data.season)
      setGamesActive(data.gamesActive ?? false)
      setGamesInProgress(data.gamesInProgress ?? false)
      setHasFlexSlot(data.roster?.hasFlexSlot ?? data.hasFlexSlot ?? false)
      if (data.roster) {
        setRoster(data.roster)
        if (force || !dirtyRef.current) {
          const map = new Map<string, FantasyRosterPlayer>()
          data.roster.players.forEach((p: FantasyRosterPlayer) => map.set(p.slot, p))
          setDraftPlayers(map)
          setDirty(false)
        }
      } else {
        setRoster(null)
        if (force || !dirtyRef.current) {
          setDraftPlayers(new Map())
          setDirty(false)
        }
      }
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchRoster(true) }, [fetchRoster])

  // Fetch active power-ups
  const fetchActivePowerups = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/shop/powerups/active`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        const j = await res.json()
        setActivePowerups(j.data?.active ?? [])
      }
    } catch { /* silent */ }
  }, [getToken])

  useEffect(() => { fetchActivePowerups() }, [fetchActivePowerups])

  // Re-fetch roster + powerups when a shop purchase happens (e.g. FLEX slot)
  useEffect(() => {
    const handler = () => { fetchRoster(true); fetchActivePowerups() }
    window.addEventListener('floosball:shop-purchase', handler)
    return () => window.removeEventListener('floosball:shop-purchase', handler)
  }, [fetchRoster, fetchActivePowerups])

  // Fetch card collection so PlayerPicker can show card details
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const tok = await getToken()
        if (!tok) return
        const res = await fetch(`${API_BASE}/cards/collection?activeOnly=true`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) return
        const json = await res.json()
        const cards: { playerId: number; edition: string; effectConfig: any }[] = json.data?.cards ?? []
        const map = new Map<number, PlayerCardInfo[]>()
        for (const c of cards) {
          const info: PlayerCardInfo = { edition: c.edition, effectConfig: c.effectConfig }
          const existing = map.get(c.playerId)
          if (existing) existing.push(info)
          else map.set(c.playerId, [info])
        }
        setPlayerCards(map)
      } catch {
        // silent
      }
    }
    fetchCards()
  }, [getToken])

  // Re-fetch roster on week transitions (lock/unlock changes)
  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'week_start' || wsEvent.event === 'week_end') {
      if (!dirtyRef.current) {
        fetchRoster()
      }
      refetchRoster()
    }
  }, [wsEvent, fetchRoster, refetchRoster])

  // Re-fetch on WS reconnect (covers missed events while tab was backgrounded)
  useEffect(() => {
    if (wsConnected) {
      if (wsWasConnected.current) {
        fetchRoster()
      }
      wsWasConnected.current = true
    }
  }, [wsConnected, fetchRoster])

  const handlePlayerSelect = (slotKey: string, player: any) => {
    const rp: FantasyRosterPlayer = {
      slot: slotKey,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      teamId: player.teamId,
      teamName: player.teamName,
      teamAbbr: player.teamAbbr,
      teamColor: player.teamColor,
      ratingStars: player.ratingStars,
      pointsAtLock: 0,
      seasonFantasyPoints: 0,
      currentFantasyPoints: player.fantasyPoints || 0,
      earnedPoints: 0,
    }
    setDraftPlayers(prev => new Map(prev).set(slotKey, rp))
    setDirty(true)
    setPickerSlot(null)
  }

  const handleSave = async () => {
    const tok = await getToken()
    if (!tok || draftPlayers.size === 0) return
    setSaving(true)
    setMessage(null)
    try {
      const headers = { Authorization: `Bearer ${tok}` }
      const players = Array.from(draftPlayers.values()).map(p => ({
        playerId: p.playerId,
        slot: p.slot,
      }))
      await axios.put(`${API_BASE}/fantasy/roster`, { players }, { headers })
      setMessage('Roster saved')
      setDirty(false)
      await fetchRoster(true)
      refetchRoster()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to save roster')
    } finally {
      setSaving(false)
    }
  }


  const handleSwapSelect = (player: any) => {
    if (!swapSlot) return
    setPendingSwap({ slot: swapSlot, player })
    setSwapSlot(null)
  }

  const confirmSwap = () => {
    if (!pendingSwap) return
    performSwap(pendingSwap.slot, pendingSwap.player.id)
    setPendingSwap(null)
  }

  const performSwap = async (slot: string, newPlayerId: number) => {
    const tok = await getToken()
    if (!tok) return
    setSwapping(true)
    setMessage(null)
    try {
      const headers = { Authorization: `Bearer ${tok}` }
      const swapRes = await axios.post(`${API_BASE}/fantasy/roster/swap`, { slot, newPlayerId }, { headers })
      const swapMsg = swapRes.data?.data?.message || 'Player swapped successfully!'
      setMessage(swapMsg)
      await fetchRoster(true)
      refetchRoster()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to swap player')
    } finally {
      setSwapping(false)
    }
  }

  if (!user) {
    return (
      <div style={cardStyleFn(isMobile)}>
        <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
          Sign in to manage your fantasy roster
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={cardStyleFn(isMobile)}>
        <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
      </div>
    )
  }

  const isLocked = roster?.isLocked ?? false
  const organicSwaps = roster?.swapsAvailable ?? 0
  const purchasedSwaps = roster?.purchasedSwaps ?? 0
  const swapsAvailable = organicSwaps + purchasedSwaps
  const swapHistory = roster?.swapHistory ?? []
  const canSwap = isLocked && swapsAvailable > 0 && !gamesInProgress && !swapping
  const SLOTS = hasFlexSlot ? [...BASE_SLOTS, FLEX_SLOT] : BASE_SLOTS
  const allSlotsFilled = SLOTS.every(s => draftPlayers.has(s.key))
  const excludeIds = Array.from(draftPlayers.values()).map(p => p.playerId)
  const activePickerSlot = swapSlot ?? pickerSlot
  const pickerPosition = SLOTS.find(s => s.key === activePickerSlot)?.position || 'QB'

  // Snapshot-derived data for breakdown panel
  const weekPlayerFP = myEntry?.weekPlayerFP ?? 0
  const weekCardBonus = myEntry?.weekCardBonus ?? 0
  const seasonEarnedFP = myEntry?.seasonEarnedFP ?? 0
  const seasonCardBonus = myEntry?.seasonCardBonus ?? 0
  const seasonTotal = myEntry?.seasonTotal ?? 0
  const totalCardBonus = seasonCardBonus
  const cardBreakdowns = myEntry?.cardBreakdowns ?? []
  const equationSummary = myEntry?.equationSummary
  const playerSummaries: PlayerSummary[] = (myEntry?.players ?? []).map(p => ({
    playerName: p.playerName,
    position: p.position,
    weekFP: p.weekFP,
  }))

  return (
    <div style={cardStyleFn(isMobile)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>My Roster</div>
            {isLocked && (
              canSwap ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)',
                  padding: '4px 10px', borderRadius: '6px', fontWeight: '700',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" />
                  </svg>
                  SWAP WINDOW
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)',
                  padding: '4px 10px', borderRadius: '6px', fontWeight: '700',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  LOCKED
                </div>
              )
            )}
          </div>
          {season && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Season {season}{scoreView === 'weekly' && week ? ` — Week ${week}` : ''}</div>}
        </div>
        {isLocked && (
          <div
            onClick={() => setScoreView(v => v === 'season' ? 'weekly' : 'season')}
            style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>
              {scoreView === 'season' ? 'Season' : `Week ${week ?? ''}`} ▸
            </div>
            {scoreView === 'season' ? (
              <>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
                  {seasonTotal.toFixed(0)} pts
                </div>
                {totalCardBonus > 0 && (
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#a78bfa', marginTop: '3px' }}>
                    +{totalCardBonus.toFixed(1)} card bonus
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
                  {(weekPlayerFP + weekCardBonus).toFixed(0)} pts
                </div>
                {weekCardBonus > 0 && (
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#a78bfa', marginTop: '3px' }}>
                    +{weekCardBonus.toFixed(1)} card bonus
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Roster / Breakdown tab bar + breakdown panel */}
      {isLocked && (
        <div data-tour="fantasy-breakdown">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '6px' }}>
            {(['roster', 'breakdown'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '5px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                  fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                  border: 'none',
                  backgroundColor: viewMode === v ? 'rgba(167,139,250,0.15)' : 'transparent',
                  color: viewMode === v ? '#a78bfa' : '#64748b',
                }}
              >
                {v === 'roster' ? 'Roster' : 'Breakdown'}
              </button>
            ))}
          </div>

          {/* Breakdown view */}
          {viewMode === 'breakdown' && (
            <>
              {/* Pre-lock projection — shows what the current lineup +
                  equipped cards are projected to score this week,
                  based on per-player season averages and ELO forecasts. */}
              {!gamesActive && !gamesInProgress && (
                <ProjectedWeekSummary />
              )}
              <PointsBreakdownPanel
                playerSummaries={playerSummaries}
                breakdowns={cardBreakdowns}
                equationSummary={equationSummary}
                weekPlayerFP={weekPlayerFP}
                weekCardBonus={weekCardBonus}
                seasonEarnedFP={seasonEarnedFP}
                seasonCardBonus={seasonCardBonus}
                seasonTotal={seasonTotal}
                modifier={modifier}
              />
            </>
          )}
        </div>
      )}

      {/* Instructions (unlocked only) */}
      {!isLocked && (
        <div style={{
          fontSize: '13px', color: '#cbd5e1', lineHeight: '1.7',
          marginBottom: '6px', padding: '8px 14px',
          backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #475569',
        }}>
          {draftPlayers.size === 0 ? (
            <>Fill each slot by selecting a player. Your roster will auto-lock and start earning points when the next week's games begin.</>
          ) : !allSlotsFilled ? (
            <>Fill your remaining slots, then <span style={{ color: '#3b82f6', fontWeight: '600' }}>save</span> your roster.</>
          ) : dirty ? (
            <><span style={{ color: '#3b82f6', fontWeight: '600' }}>Save</span> your roster to finalize your picks.</>
          ) : gamesActive ? (
            <>Your roster is saved! Points will start accumulating next week.</>
          ) : (
            <>Your roster is saved! It will auto-lock and start earning points when games begin.</>
          )}
        </div>
      )}

      {/* Active Temp Flex indicator */}
      {(() => {
        const flexPU = activePowerups.find(p => p.slug === 'temp_flex')
        if (!flexPU) return null
        return (
          <div style={{
            fontSize: isMobile ? '12px' : '13px', color: '#a78bfa', lineHeight: '1.5',
            marginBottom: '6px', padding: isMobile ? '6px 10px' : '6px 14px',
            backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: '8px',
            border: '1px solid rgba(167,139,250,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: '700' }}>FLEX Slot Active</span>
            <span style={{
              fontSize: '10px',
              color: flexPU.expiring ? '#f59e0b' : '#94a3b8',
              fontWeight: flexPU.expiring ? '700' : '400',
            }}>
              {flexPU.expiring ? 'Expires after this week' : `${flexPU.weeksRemaining ?? 0} week${(flexPU.weeksRemaining ?? 0) !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
        )
      })()}

      {/* Active Endowment (income_boost) indicator — raised weekly FP floobit cap */}
      {(() => {
        const boostPU = activePowerups.find(p => p.slug === 'income_boost')
        if (!boostPU) return null
        const capText = boostPU.boostedCap && boostPU.standardCap
          ? ` · cap ${boostPU.standardCap}F \u2192 ${boostPU.boostedCap}F`
          : ''
        return (
          <div style={{
            fontSize: isMobile ? '12px' : '13px', color: '#fbbf24', lineHeight: '1.5',
            marginBottom: '6px', padding: isMobile ? '6px 10px' : '6px 14px',
            backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: '8px',
            border: '1px solid rgba(251,191,36,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: '700' }}>
              Endowment Active<span style={{ color: '#eab308', fontWeight: 400, fontSize: '11px' }}>{capText}</span>
            </span>
            <span style={{
              fontSize: '10px',
              color: boostPU.expiring ? '#f59e0b' : '#94a3b8',
              fontWeight: boostPU.expiring ? '700' : '400',
            }}>
              {boostPU.expiring ? 'Expires after this week' : `${boostPU.weeksRemaining ?? 0} week${(boostPU.weeksRemaining ?? 0) !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
        )
      })()}

      {/* Slots (roster view or unlocked) */}
      {(!isLocked || viewMode === 'roster') && <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {SLOTS.map(slot => {
          const player = draftPlayers.get(slot.key)
          const isExpanded = expandedSlot === slot.key
          const { stats: playerStats, fp: gameFP } = player ? getPlayerStats(player.playerId, player.position) : { stats: null, fp: 0 }
          return (
            <div key={slot.key} style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px',
                  padding: isMobile ? '7px 10px' : '8px 14px',
                  backgroundColor: player ? '#1e293b' : '#172033',
                  borderRadius: isExpanded ? '10px 10px 0 0' : '10px',
                  border: '1px solid #334155',
                  borderBottom: isExpanded ? '1px solid #2d3d52' : '1px solid #334155',
                  cursor: player && isLocked ? 'pointer' : undefined,
                }}
                onClick={() => {
                  if (player && isLocked) setExpandedSlot(isExpanded ? null : slot.key)
                }}
              >
                <div style={{
                  width: isMobile ? '30px' : '40px', textAlign: 'center', flexShrink: 0,
                  fontSize: isMobile ? '11px' : '13px', fontWeight: '700',
                  color: player ? (player.teamColor || '#cbd5e1') : '#64748b',
                }}>
                  {slot.key === 'FLEX' && player ? player.position : slot.key}
                </div>
                {player ? (
                  <>
                    {player.teamId && (
                      <img
                        src={`/avatars/${player.teamId}.png`}
                        alt={player.teamAbbr}
                        style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '50%', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <PlayerHoverCard playerId={player.playerId} playerName={player.playerName}>
                        <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {player.playerName}
                        </span>
                      </PlayerHoverCard>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{player.teamAbbr}</span>
                        <Stars stars={player.ratingStars} size={16} />
                        {player.fatigue > 2 && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: player.fatigue < 5 ? '#4ade80' : player.fatigue < 10 ? '#eab308' : player.fatigue < 15 ? '#f97316' : '#ef4444',
                          }}>
                            {player.fatigue.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {isLocked ? (
                        scoreView === 'season' ? (
                          <>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>
                              +{getLiveEarnedPoints(player).toFixed(0)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>earned</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>
                              +{(weekFPByPlayer.get(player.playerId) ?? 0).toFixed(0)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>this week</div>
                          </>
                        )
                      ) : (
                        <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '600' }}>
                          {player.currentFantasyPoints.toFixed(0)} FP
                        </div>
                      )}
                    </div>
                    {/* Chevron expand indicator (locked only) */}
                    {isLocked && (
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                    {!isLocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPickerSlot(slot.key) }}
                        style={{
                          background: 'none', border: '1px solid #475569', borderRadius: '6px',
                          color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '6px 10px',
                          fontFamily: 'inherit',
                        }}
                      >
                        Change
                      </button>
                    )}
                    {canSwap && (() => {
                      const slotCost = roster?.swapCosts?.[slot.key] ?? 15
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSwapSlot(slot.key) }}
                          style={{
                            background: 'none', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '6px',
                            color: '#fbbf24', cursor: 'pointer', fontSize: '11px', padding: '6px 10px',
                            fontFamily: 'inherit',
                          }}
                        >
                          Swap ({slotCost}F)
                        </button>
                      )
                    })()}
                  </>
                ) : (
                  <button
                    onClick={() => isLocked ? setSwapSlot(slot.key) : setPickerSlot(slot.key)}
                    style={{
                      flex: 1, background: 'none', border: '1px dashed #475569', borderRadius: '8px',
                      color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: '10px',
                      fontFamily: 'inherit', textAlign: 'center',
                    }}
                  >
                    {isLocked ? `Add ${slot.label}` : `Select ${slot.label}`}
                  </button>
                )}
              </div>
              {/* Expanded stats panel */}
              {isExpanded && player && (
                <div style={{
                  backgroundColor: '#1e293b', padding: isMobile ? '6px 10px' : '8px 14px',
                  borderRadius: '0 0 10px 10px', border: '1px solid #334155', borderTop: 'none',
                }}>
                  {playerStats ? (() => {
                    const pos = player.position
                    const statItems: { label: string; value: string }[] = []
                    if (pos === 'QB') {
                      const p = playerStats.passing ?? {}
                      statItems.push(
                        { label: 'Comp/Att', value: `${p.comp ?? 0}/${p.att ?? 0}` },
                        { label: 'Pass Yds', value: String(p.yards ?? 0) },
                        { label: 'Pass TDs', value: String(p.tds ?? 0) },
                        { label: 'INTs', value: String(p.ints ?? 0) },
                      )
                    } else if (pos === 'RB') {
                      const r = playerStats.rushing ?? {}
                      statItems.push(
                        { label: 'Carries', value: String(r.carries ?? 0) },
                        { label: 'Rush Yds', value: String(r.yards ?? 0) },
                        { label: 'Rush TDs', value: String(r.tds ?? 0) },
                      )
                    } else if (pos === 'WR' || pos === 'TE') {
                      const rc = playerStats.receiving ?? {}
                      statItems.push(
                        { label: 'Rec/Tgt', value: `${rc.receptions ?? 0}/${rc.targets ?? 0}` },
                        { label: 'Rec Yds', value: String(rc.yards ?? 0) },
                        { label: 'Rec TDs', value: String(rc.tds ?? 0) },
                        { label: 'YAC', value: String(rc.yac ?? 0) },
                      )
                    } else if (pos === 'K') {
                      const k = playerStats.kicking ?? {}
                      statItems.push(
                        { label: 'FG', value: `${k.fgs ?? 0}/${k.fgAtt ?? 0}` },
                        { label: 'Longest', value: `${k.longest ?? 0} yds` },
                      )
                    }
                    return (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Game Stats</div>
                        <div style={{
                          display: 'flex', flexWrap: 'wrap', gap: isMobile ? '6px 12px' : '6px 20px',
                        }}>
                        {statItems.map(s => (
                          <div key={s.label} style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{s.label}</span>
                            <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600' }}>{s.value}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>FP</span>
                          <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>{(gameFP ?? 0).toFixed(1)}</span>
                        </div>
                        </div>
                      </div>
                    )
                  })() : (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>No stats yet</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>}

      {/* Favorite Team Slot */}
      {myEntry?.favoriteTeamData && (viewMode === 'roster' || !isLocked) && (() => {
        const ft = myEntry.favoriteTeamData
        const streakText = ft.streak > 0 ? `W${ft.streak}` : ft.streak < 0 ? `L${Math.abs(ft.streak)}` : '--'
        const streakColor = ft.streak > 0 ? '#22c55e' : ft.streak < 0 ? '#ef4444' : '#94a3b8'
        return (
          <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Team</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '8px 10px' : '8px 14px',
            backgroundColor: '#1e293b', borderRadius: '10px',
            borderLeft: `3px solid ${ft.teamColor}`,
            border: '1px solid #334155',
          }}>
            <img
              src={`/avatars/${ft.teamId}.png`}
              alt={ft.teamAbbr}
              style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '50%', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '600', color: '#f1f5f9' }}>
                {ft.teamName}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>ELO <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{ft.elo.toFixed(0)}</span></span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ft.record}</span>
                <span style={{ fontSize: '11px', color: streakColor, fontWeight: '600' }}>{streakText}</span>
                {ft.gameScore && <span style={{ fontSize: '11px', color: ft.wonThisWeek ? '#22c55e' : '#ef4444', fontWeight: '600' }}>{ft.gameScore}</span>}
              </div>
            </div>
            {(() => {
              const [w, l] = ft.record.split('-').map(Number)
              if ((w + l) < 1) return null
              return (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: '10px', fontWeight: '600',
                    color: ft.inPlayoffs ? '#22c55e' : '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      {ft.inPlayoffs ? (
                        <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      )}
                    </svg>
                    {ft.inPlayoffs ? 'Playoff Spot' : 'Outside Playoffs'}
                  </div>
                </div>
              )
            })()}
          </div>
          </div>
        )
      })()}

      {/* Actions */}
      {!isLocked && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handleSave}
            disabled={saving || !dirty || draftPlayers.size === 0}
            style={{
              ...buttonStyle,
              backgroundColor: dirty ? '#3b82f6' : '#1e3a5f',
              opacity: saving || !dirty ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Roster'}
          </button>
        </div>
      )}

      {message && (() => {
        const isError = /fail|insufficient|cannot|no swap|not |already|invalid/i.test(message)
        return (
          <div style={{
            marginTop: '14px', fontSize: '12px', padding: '10px 14px', borderRadius: '8px',
            backgroundColor: isError ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            color: isError ? '#ef4444' : '#4ade80',
          }}>
            {message}
          </div>
        )
      })()}

      {/* Swap History (collapsible) */}
      {isLocked && swapHistory.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <div
            onClick={() => setShowSwapHistory(v => !v)}
            style={{
              fontSize: '12px', color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            Swap History ({swapHistory.length})
            <span style={{ fontSize: '10px', opacity: 0.7 }}>{showSwapHistory ? '\u25B2' : '\u25BC'}</span>
          </div>
          {showSwapHistory && (
            <div style={{
              marginTop: '8px', padding: '10px 14px',
              backgroundColor: '#0f172a', borderRadius: '8px',
              border: '1px solid #334155',
            }}>
              {swapHistory.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 0', fontSize: '12px',
                  borderBottom: i < swapHistory.length - 1 ? '1px solid #1e293b' : 'none',
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '10px', marginRight: '8px' }}>W{s.swapWeek}</span>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>{s.slot}</span>
                    <span style={{ color: '#64748b', margin: '0 6px' }}>{s.oldPlayerName}</span>
                    <span style={{ color: '#475569' }}>{'\u2192'}</span>
                    <span style={{ color: '#e2e8f0', marginLeft: '6px' }}>{s.newPlayerName}</span>
                  </div>
                  {s.bankedFP > 0 && (
                    <span style={{ color: '#4ade80', fontSize: '11px', flexShrink: 0 }}>
                      +{s.bankedFP.toFixed(1)} banked
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Swap confirmation dialog */}
      {pendingSwap && (() => {
        const currentPlayer = draftPlayers.get(pendingSwap.slot)
        const isEmptySlot = !currentPlayer
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }} onClick={() => setPendingSwap(null)}>
            <div style={{
              backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
              padding: '24px', maxWidth: '340px', width: '90%',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '12px' }}>
                {isEmptySlot ? `Add ${pendingSwap.slot} Player` : 'Confirm Swap'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px' }}>
                {currentPlayer && (
                  <span style={{ color: '#e2e8f0' }}>{currentPlayer.playerName}</span>
                )}
                {currentPlayer ? ' → ' : ''}
                <span style={{ color: '#e2e8f0' }}>{pendingSwap.player.name}</span>
                <span style={{ color: '#64748b' }}> ({pendingSwap.slot})</span>
              </div>
              {!isEmptySlot && (() => {
                const slotCost = roster?.swapCosts?.[pendingSwap.slot] ?? 15
                return (
                  <div style={{
                    fontSize: '13px', fontWeight: '700', color: '#eab308', marginBottom: '16px',
                    textAlign: 'center', padding: '8px', borderRadius: '6px',
                    backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                  }}>
                    {slotCost} Floobits
                  </div>
                )
              })()}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setPendingSwap(null)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                    border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSwap}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                    border: '1px solid rgba(234,179,8,0.4)', backgroundColor: 'rgba(234,179,8,0.12)',
                    color: '#eab308', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {isEmptySlot ? 'Add' : 'Swap'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Player Picker Modal — for both draft picks and swaps */}
      <PlayerPicker
        visible={pickerSlot !== null || swapSlot !== null}
        onClose={() => { setPickerSlot(null); setSwapSlot(null) }}
        onSelect={(player) => {
          if (swapSlot) {
            handleSwapSelect(player)
          } else if (pickerSlot) {
            handlePlayerSelect(pickerSlot, player)
          }
        }}
        position={pickerPosition}
        excludeIds={excludeIds}
        playerCards={playerCards}
      />
    </div>
  )
}

const cardStyleFn = (mobile: boolean): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  borderRadius: '14px',
  border: '1px solid #334155',
  padding: mobile ? '10px' : '16px',
})

const buttonStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'pressStart',
  fontSize: '12px',
  fontWeight: '700',
  padding: '10px 14px',
  transition: 'opacity 0.2s',
}
