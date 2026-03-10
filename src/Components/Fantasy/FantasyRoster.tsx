import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFantasyLivePoints } from '@/hooks/useFantasyLivePoints'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import type { CardBreakdownEntry, EquationSummary, ModifierInfo } from '@/hooks/useFantasySnapshot'
import { Stars } from '@/Components/Stars'
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
  players: FantasyRosterPlayer[]
  swapHistory: SwapHistoryEntry[]
}

const SLOTS = [
  { key: 'QB', label: 'QB', position: 'QB' },
  { key: 'RB', label: 'RB', position: 'RB' },
  { key: 'WR1', label: 'WR', position: 'WR' },
  { key: 'WR2', label: 'WR', position: 'WR' },
  { key: 'TE', label: 'TE', position: 'TE' },
  { key: 'K', label: 'K', position: 'K' },
]

// Canonical FP-type colors used everywhere in the breakdown
const TYPE_COLORS = {
  fp: '#4ade80',       // +FP — green
  mult: '#a78bfa',     // +FPx — purple
  xmult: '#f472b6',    // xFPx — pink/red
  floobits: '#eab308', // Floobits — yellow/gold
} as const

const CATEGORY_COLORS: Record<string, string> = {
  flat_fp: TYPE_COLORS.fp,
  multiplier: TYPE_COLORS.mult,
  floobits: TYPE_COLORS.floobits,
  conditional: '#60a5fa',
  streak: '#fb923c',
}

const EDITION_SHORT: Record<string, string> = {
  base: 'BASE',
  chrome: 'CHRM',
  holographic: 'HOLO',
  gold: 'GOLD',
  prismatic: 'PRSM',
  diamond: 'DMND',
}

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  chrome: '#f59e0b',
  holographic: '#ec4899',
  gold: '#eab308',
  prismatic: '#a78bfa',
  diamond: '#22d3ee',
}

// Color coding for weekly modifiers: green = beneficial, yellow = neutral, red = restrictive
const MODIFIER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  amplify:   { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  cascade:   { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  frenzy:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  overdrive: { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  payday:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  spotlight: { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  longshot:  { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  ironclad:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.30)' },
  wildcard:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.30)' },
  steady:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.20)' },
  grounded:  { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.30)' },
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
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
  const hasEquation = eq && (eq.totalBonusFP > 0 || eq.totalMultBonus > 0 || (eq.xMultFactors?.length ?? 0) > 0)

  // Build per-card value chips: each card shows all its outputs inline
  const formatValue = (val: number, type: 'fp' | 'mult' | 'xmult' | 'floobits'): { str: string; color: string } => {
    if (type === 'fp') return { str: `+${val.toFixed(1)} FP`, color: TYPE_COLORS.fp }
    if (type === 'mult') return { str: `+${val.toFixed(1)}x +FPx`, color: TYPE_COLORS.mult }
    if (type === 'xmult') return { str: `${val.toFixed(2)}x xFPx`, color: TYPE_COLORS.xmult }
    return { str: `+${val}F`, color: TYPE_COLORS.floobits }
  }

  // Colorize FP-type values in card effect text (e.g. "+1.1 FPx" → purple)
  const colorizeEffectText = (text: string, baseColor: string): React.ReactNode => {
    const pattern = /([+-]?\d+\.?\d*x?\s*)(xFPx|\+?FPx|FP\b|Floobits\b|F\b)/g
    const parts: React.ReactNode[] = []
    let lastIdx = 0
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
      const kw = m[2]
      const color = kw === 'xFPx' ? TYPE_COLORS.xmult
        : (kw === 'FPx' || kw === '+FPx') ? TYPE_COLORS.mult
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
            const fpModTag = mod === 'frenzy' ? ' × 2x frenzy'
              : mod === 'spotlight' && b.playerStatLine ? ' × 1.5x spotlight'
              : ''
            const multModTag = mod === 'amplify' ? ' × 2x amplify'
              : isGrounded ? ' (grounded)' : ''
            const xMultModTag = mod === 'cascade' ? ' × 2x cascade'
              : isGrounded ? ' (grounded)' : ''
            const fModTag = mod === 'payday' ? ' × 3x payday' : ''

            if (b.primaryFP > 0 || fpMatched) {
              const c = TYPE_COLORS.fp
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (fpMatched) eqSegments.push({text: b.preMatchFP.toFixed(1), color: c})
              if (fpMatched) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (fpModTag) eqSegments.push({text: ` ${fpModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryFP, 'fp')
            } else if (b.primaryMult > 0) {
              const c = TYPE_COLORS.mult
              eqNegated = isGrounded
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (b.matchMultiplied) eqSegments.push({text: `+${(b.primaryMult / mm).toFixed(2)}x`, color: c})
              if (b.matchMultiplied) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (multModTag) eqSegments.push({text: ` ${multModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryMult, 'mult')
            } else if (b.primaryXMult > 1) {
              const c = TYPE_COLORS.xmult
              eqNegated = isGrounded
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (b.matchMultiplied) {
                const preXMult = 1 + (b.primaryXMult - 1) / mm
                eqSegments.push({text: `${preXMult.toFixed(2)}x`, color: c})
              }
              if (b.matchMultiplied) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (xMultModTag) eqSegments.push({text: ` ${xMultModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryXMult, 'xmult')
            } else if (primaryF > 0) {
              const c = TYPE_COLORS.floobits
              if (b.equation) eqSegments.push({text: b.equation, color: c})
              else if (fMatched) eqSegments.push({text: `${b.preMatchFloobits}F`, color: c})
              if (fMatched && b.preMatchFloobits !== primaryF) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (fModTag) eqSegments.push({text: ` ${fModTag.trim()}`, color: c})
              eqResult = formatValue(primaryF, 'floobits')
            } else if (b.equation) {
              eqSegments.push({text: b.equation, color: '#94a3b8'})
            }

            // Sub-lines: conditional, edition bonuses (with negation tracking)
            const subLines: { label: string; chip: { str: string; color: string }; negated?: boolean }[] = []
            // Conditional bonus
            if ((b.conditionalBonus ?? 0) > 0) {
              subLines.push({ label: b.conditionalLabel || 'Conditional bonus', chip: formatValue(b.conditionalBonus, 'fp') })
            }
            // Edition secondary bonuses
            if ((b.secondaryFP ?? 0) > 0) subLines.push({ label: `${edTag} edition`, chip: formatValue(b.secondaryFP, 'fp') })
            if ((b.secondaryMult ?? 0) > 0) subLines.push({ label: `${edTag} edition`, chip: formatValue(b.secondaryMult, 'mult'), negated: isGrounded })
            if ((b.secondaryXMult ?? 0) > 1) subLines.push({ label: `${edTag} edition`, chip: formatValue(b.secondaryXMult, 'xmult'), negated: isGrounded })
            if ((b.secondaryFloobits ?? 0) > 0) subLines.push({ label: `${edTag} edition`, chip: formatValue(b.secondaryFloobits, 'floobits') })

            // Zero state: show dimmed output type on header when no equation/results
            const hasOutput = eqSegments.length > 0 || eqResult
            let zeroChip: { str: string; color: string; negated?: boolean } | null = null
            if (!hasOutput) {
              const t = b.outputType
              const negateChip = isGrounded && (t === 'mult' || t === 'xmult')
              // When grounded, use pre-modifier values to show what the card WOULD produce
              const realXMult = negateChip ? (b.preMatchXMult || b.primaryXMult || 1) : (b.primaryXMult || 1)
              const realMult = negateChip ? (b.preMatchMult || b.primaryMult || 0) : (b.primaryMult || 0)
              zeroChip = t === 'xmult'
                ? { str: `${realXMult.toFixed(2)}x xFPx`, color: '#64748b', negated: negateChip }
                : t === 'mult'
                ? { str: `+${realMult.toFixed(1)}x +FPx`, color: '#64748b', negated: negateChip }
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
                  <span style={{ color: CATEGORY_COLORS[b.category] ?? '#cbd5e1', fontSize: '11px', flexShrink: 0 }} title={b.detail || undefined}>
                    {effectLabel}
                  </span>
                  {b.matchMultiplied && (
                    <span style={{
                      color: '#60a5fa', fontSize: '10px', fontWeight: '700', flexShrink: 0,
                      backgroundColor: 'rgba(96,165,250,0.15)', padding: '2px 5px', borderRadius: '3px',
                    }}>MATCH</span>
                  )}
                  {zeroChip && (
                    <span style={{ color: zeroChip.color, fontWeight: '600', fontSize: '12px', marginLeft: 'auto', textDecoration: zeroChip.negated ? 'line-through' : 'none', opacity: zeroChip.negated ? 0.45 : 1 }}>{zeroChip.str}</span>
                  )}
                </div>
                {/* Equation line with result right-aligned */}
                {eqSegments.length > 0 && (
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
                {/* Card player stats */}
                {b.playerStatLine && (
                  <div style={{ paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', padding: '2px 0 2px 16px' }}>
                    <span style={{ color: '#64748b' }}>Card player stats: </span>{b.playerStatLine}
                  </div>
                )}
              </div>
            )
          })}

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
        const addMultPool = 1 + eq!.totalMultBonus
        const xFactors = eq!.xMultFactors ?? []
        const xMultProduct = xFactors.length > 0 ? xFactors.reduce((a, b) => a * b, 1) : 1
        const totalMult = addMultPool * xMultProduct
        const hasMult = eq!.totalMultBonus > 0 || xFactors.length > 0
        return (
          <>
          {collapsibleHeader('formula', 'Week Score Total', `${(weekPlayerFP + weekCardBonus).toFixed(1)} pts`, '#818cf8')}
          {expanded['formula'] && (
          <div style={{
            marginTop: '4px', padding: '10px 12px',
            backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: '8px',
            border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', lineHeight: '1.8' }}>
              <span style={{ color: '#cbd5e1' }}>(</span>
              <span style={{ color: '#22c55e' }}>{eq!.weekRawFP.toFixed(1)}</span>
              <span style={{ color: '#cbd5e1' }}> roster</span>
              {eq!.totalBonusFP > 0 && (
                <>
                  <span style={{ color: '#cbd5e1' }}> + </span>
                  <span style={{ color: TYPE_COLORS.fp }}>{eq!.totalBonusFP.toFixed(1)}</span>
                  <span style={{ color: '#cbd5e1' }}> +FP</span>
                </>
              )}
              <span style={{ color: '#cbd5e1' }}>)</span>
              {hasMult && (
                <>
                  <span style={{ color: '#cbd5e1' }}> {'\u00d7'} </span>
                  {eq!.totalMultBonus > 0 && xFactors.length > 0 && <span style={{ color: '#cbd5e1' }}>(</span>}
                  {eq!.totalMultBonus > 0 && (
                    <>
                      <span style={{ color: TYPE_COLORS.mult, textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}>{addMultPool.toFixed(2)}</span>
                      <span style={{ color: '#cbd5e1', textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}> +FPx</span>
                    </>
                  )}
                  {xFactors.map((x, i) => (
                    <React.Fragment key={i}>
                      {(i > 0 || eq!.totalMultBonus > 0) && <span style={{ color: '#cbd5e1' }}> {'\u00d7'} </span>}
                      <span style={{ color: TYPE_COLORS.xmult, textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}>{x.toFixed(2)}</span>
                      <span style={{ color: '#cbd5e1', textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}> xFPx</span>
                    </React.Fragment>
                  ))}
                  {eq!.totalMultBonus > 0 && xFactors.length > 0 && <span style={{ color: '#cbd5e1' }}>)</span>}
                </>
              )}
            </div>

            {/* Balatro-style FP × Mult display */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              marginTop: '10px', padding: '8px 0',
              borderTop: '1px solid rgba(99,102,241,0.15)',
            }}>
              <span style={{
                fontSize: '22px', fontWeight: '800', color: TYPE_COLORS.fp,
                fontFamily: 'monospace',
              }}>{baseFP.toFixed(1)}</span>
              {hasMult && (
                <>
                  <span style={{ fontSize: '16px', color: '#cbd5e1', fontWeight: '700' }}>{'\u00d7'}</span>
                  <span style={{
                    fontSize: '22px', fontWeight: '800', color: TYPE_COLORS.xmult,
                    fontFamily: 'monospace',
                    textDecoration: isGrounded ? 'line-through' : 'none',
                    opacity: isGrounded ? 0.45 : 1,
                  }}>{totalMult.toFixed(2)}</span>
                </>
              )}
              <span style={{ fontSize: '16px', color: '#cbd5e1', fontWeight: '700' }}>=</span>
              <span style={{
                fontSize: '22px', fontWeight: '800', color: '#22c55e',
                fontFamily: 'monospace',
              }}>{(weekPlayerFP + weekCardBonus).toFixed(1)}</span>
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

export const FantasyRoster: React.FC = () => {
  const { user, getToken, refetchRoster } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()
  const [roster, setRoster] = useState<Roster | null>(null)
  const { getLiveEarnedPoints } = useFantasyLivePoints(
    roster?.isLocked ? roster.players : undefined,
  )
  const { myEntry, modifier, week } = useFantasySnapshot(user?.id)
  const [season, setSeason] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locking, setLocking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pickerSlot, setPickerSlot] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'roster' | 'breakdown'>('roster')
  const [scoreView, setScoreView] = useState<'season' | 'weekly'>('season')
  const [swapping, setSwapping] = useState(false)
  const [swapSlot, setSwapSlot] = useState<string | null>(null)
  const [gamesActive, setGamesActive] = useState(false)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  // Local draft state for unsaved changes
  const [draftPlayers, setDraftPlayers] = useState<Map<string, FantasyRosterPlayer>>(new Map())
  const [dirty, setDirty] = useState(false)

  const [playerCards, setPlayerCards] = useState<Map<number, PlayerCardInfo[]>>(new Map())

  const dirtyRef = useRef(false)
  dirtyRef.current = dirty

  // Lookup: playerId → weekFP from snapshot (for weekly view)
  const weekFPByPlayer = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of myEntry?.players ?? []) m.set(p.playerId, p.weekFP)
    return m
  }, [myEntry?.players])

  const fetchRoster = useCallback(async (force?: boolean) => {
    const tok = await getToken()
    if (!tok) { setLoading(false); return }
    try {
      const res = await axios.get(`${API_BASE}/fantasy/roster`, { headers: { Authorization: `Bearer ${tok}` } })
      const data = res.data?.data || res.data
      setSeason(data.season)
      setGamesActive(data.gamesActive ?? false)
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

  // Re-fetch roster from REST when games end (season stats updated)
  // Skip if user has unsaved draft changes to avoid clearing their selections
  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'game_end' || wsEvent.event === 'season_end' || wsEvent.event === 'week_start' || wsEvent.event === 'week_end') {
      if (!dirtyRef.current) {
        fetchRoster()
      }
      refetchRoster()
    }
  }, [wsEvent, fetchRoster, refetchRoster])

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

  const handleLock = async () => {
    const tok = await getToken()
    if (!tok) return
    setLocking(true)
    setMessage(null)
    try {
      const headers = { Authorization: `Bearer ${tok}` }
      await axios.post(`${API_BASE}/fantasy/roster/lock`, {}, { headers })
      setMessage('Roster locked! Points are now accumulating.')
      await fetchRoster(true)
      refetchRoster()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to lock roster')
    } finally {
      setLocking(false)
    }
  }

  const handleSwapSelect = (player: any) => {
    if (!swapSlot) return
    performSwap(swapSlot, player.id)
    setSwapSlot(null)
  }

  const performSwap = async (slot: string, newPlayerId: number) => {
    const tok = await getToken()
    if (!tok) return
    setSwapping(true)
    setMessage(null)
    try {
      const headers = { Authorization: `Bearer ${tok}` }
      await axios.post(`${API_BASE}/fantasy/roster/swap`, { slot, newPlayerId }, { headers })
      setMessage('Player swapped successfully!')
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
      <div style={cardStyle}>
        <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
          Sign in to manage your fantasy roster
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
      </div>
    )
  }

  const isLocked = roster?.isLocked ?? false
  const swapsAvailable = roster?.swapsAvailable ?? 0
  const swapHistory = roster?.swapHistory ?? []
  const canSwap = isLocked && swapsAvailable > 0 && !gamesActive && !swapping
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
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>My Roster</div>
            {isLocked && (
              <div style={{
                fontSize: '10px', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)',
                padding: '4px 10px', borderRadius: '6px', fontWeight: '700',
              }}>
                LOCKED
              </div>
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
                  {(weekPlayerFP + weekCardBonus).toFixed(1)} pts
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

      {/* Roster / Breakdown tab bar */}
      {isLocked && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '10px' }}>
          {(['roster', 'breakdown'] as const).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '5px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                border: viewMode === v ? '1px solid #a78bfa' : '1px solid rgba(148,163,184,0.2)',
                backgroundColor: viewMode === v ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: viewMode === v ? '#a78bfa' : '#64748b',
              }}
            >
              {v === 'roster' ? 'Roster' : 'Breakdown'}
            </button>
          ))}
        </div>
      )}

      {/* Weekly Modifier Banner */}
      {modifier && (() => {
        const modStyle = MODIFIER_COLORS[modifier.name] ?? MODIFIER_COLORS.steady
        const isSteady = modifier.name === 'steady'
        return (
          <div style={{
            fontSize: '13px', color: modStyle.color, lineHeight: '1.5',
            marginBottom: '10px', padding: '8px 14px',
            backgroundColor: modStyle.bg, borderRadius: '8px',
            border: `1px solid ${modStyle.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                This Week
              </span>
              <span style={{ fontWeight: '700' }}>
                {modifier.displayName}
              </span>
            </div>
            <span style={{ fontSize: '11px', opacity: isSteady ? 0.6 : 0.85 }}>
              {modifier.description}
            </span>
          </div>
        )
      })()}

      {/* Breakdown view (locked only) */}
      {isLocked && viewMode === 'breakdown' && (
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
      )}

      {/* Instructions (unlocked only) */}
      {!isLocked && (
        <div style={{
          fontSize: '13px', color: '#cbd5e1', lineHeight: '1.7',
          marginBottom: '10px', padding: '10px 14px',
          backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #475569',
        }}>
          {draftPlayers.size === 0 ? (
            <>Fill each slot by selecting a player. Only points earned after locking count, so lock your roster before the next week begins!</>
          ) : !allSlotsFilled ? (
            <>Fill your remaining slots, then <span style={{ color: '#3b82f6', fontWeight: '600' }}>save</span> and <span style={{ color: '#22c55e', fontWeight: '600' }}>lock</span> your roster.</>
          ) : dirty ? (
            <><span style={{ color: '#3b82f6', fontWeight: '600' }}>Save</span> your roster changes, then lock to start earning points.</>
          ) : (
            <>Your roster is saved! <span style={{ color: '#22c55e', fontWeight: '600' }}>Lock</span> it to start earning points.</>
          )}
        </div>
      )}

      {/* Swap Available Banner (roster view only) */}
      {isLocked && viewMode === 'roster' && swapsAvailable > 0 && (
        <div style={{
          fontSize: '13px', color: '#fbbf24', lineHeight: '1.5',
          marginBottom: '10px', padding: '8px 14px',
          backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: '8px',
          border: '1px solid rgba(251,191,36,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{swapsAvailable} swap{swapsAvailable !== 1 ? 's' : ''} available{gamesActive ? ' (wait for games to end)' : ' — tap Swap on any slot'}</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Cost: 1 Floobit each</span>
        </div>
      )}

      {/* Slots (roster view or unlocked) */}
      {(!isLocked || viewMode === 'roster') && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {SLOTS.map(slot => {
          const player = draftPlayers.get(slot.key)
          return (
            <div
              key={slot.key}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                backgroundColor: player ? '#1e293b' : '#172033',
                borderRadius: '10px', border: '1px solid #334155',
              }}
            >
              <div style={{
                width: '40px', textAlign: 'center', flexShrink: 0,
                fontSize: '13px', fontWeight: '700',
                color: player ? (player.teamColor || '#cbd5e1') : '#64748b',
              }}>
                {slot.key}
              </div>
              {player ? (
                <>
                  {player.teamId && (
                    <img
                      src={`${API_BASE}/teams/${player.teamId}/avatar?size=34&v=2`}
                      alt={player.teamAbbr}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PlayerHoverCard playerId={player.playerId} playerName={player.playerName}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {player.playerName}
                      </span>
                    </PlayerHoverCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{player.teamAbbr}</span>
                      <Stars stars={player.ratingStars} size={16} />
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
                  {!isLocked && (
                    <button
                      onClick={() => setPickerSlot(slot.key)}
                      style={{
                        background: 'none', border: '1px solid #475569', borderRadius: '6px',
                        color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '6px 10px',
                        fontFamily: 'inherit',
                      }}
                    >
                      Change
                    </button>
                  )}
                  {canSwap && (
                    <button
                      onClick={() => setSwapSlot(slot.key)}
                      style={{
                        background: 'none', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '6px',
                        color: '#fbbf24', cursor: 'pointer', fontSize: '11px', padding: '6px 10px',
                        fontFamily: 'inherit',
                      }}
                    >
                      Swap
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setPickerSlot(slot.key)}
                  style={{
                    flex: 1, background: 'none', border: '1px dashed #475569', borderRadius: '8px',
                    color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: '10px',
                    fontFamily: 'inherit', textAlign: 'center',
                  }}
                >
                  Select {slot.label}
                </button>
              )}
            </div>
          )
        })}
      </div>}

      {/* Actions */}
      {!isLocked && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
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
            <button
              onClick={handleLock}
              disabled={locking || dirty || !allSlotsFilled}
              style={{
                ...buttonStyle,
                backgroundColor: allSlotsFilled && !dirty ? '#22c55e' : '#1a3d2a',
                opacity: locking || dirty || !allSlotsFilled ? 0.5 : 1,
              }}
            >
              {locking ? 'Locking...' : 'Lock Now'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <div style={{ flex: 1, fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Save your picks
            </div>
            <div style={{ flex: 1, fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Lock to earn points
            </div>
          </div>
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

const cardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '14px',
  border: '1px solid #334155',
  padding: '20px',
}

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
