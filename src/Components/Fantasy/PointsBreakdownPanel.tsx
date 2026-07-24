import React, { useState } from 'react'
import HoverTooltip from '@/Components/HoverTooltip'
import type { CardBreakdownEntry, EquationSummary, ModifierInfo } from '@/hooks/useFantasySnapshot'

// The card-scoring breakdown panel. Rendered by ScoringPane on the fantasy page.
// Extracted from the retired FantasyRoster component (fusion cleanup) — it was the
// only live export left in that file.

// Signed FP (1 decimal): "+12.0", "0.0", "-1.0" (never "+-1.0").
const fmtSignedFP1 = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`

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
  standard: 'STND',
  base: 'BASE',
  holographic: 'HOLO',
  prismatic: 'PRSM',
  diamond: 'DMND',
}

const TIER_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  holographic: '#c4b5fd',
  prismatic: '#f472b6',
  diamond: '#67e8f9',
}

interface PlayerSummary {
  playerName: string
  position: string
  weekFP: number
}


export const PointsBreakdownPanel: React.FC<{
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

  // Build per-card value chips: each card shows all its outputs inline.
  // FPx cards surface the bonus-additive delta directly — the amount each
  // card contributes to the aggregate (1 + Σ deltas) multiplier — so the
  // chip ties one-to-one with the `+0.30` in the equation. Previously
  // showed `1.30x FPx (+0.30)` with the literal multiplier, which read
  // as the wrong number because the aggregator doesn't multiply 1.30 in.
  const formatValue = (val: number, type: 'fp' | 'mult' | 'floobits'): { str: string; color: string } => {
    if (type === 'fp') return { str: `+${val.toFixed(1)} FP`, color: TYPE_COLORS.fp }
    if (type === 'mult') {
      const delta = Math.max(0, val - 1)
      return { str: `+${delta.toFixed(2)} FPx`, color: TYPE_COLORS.mult }
    }
    return { str: `+${val}F`, color: TYPE_COLORS.floobits }
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
      {collapsibleHeader('playerFP', 'Roster Week Total', fmtSignedFP1(weekPlayerFP), '#22c55e', true)}
      {expanded['playerFP'] && (
        <>
          {playerSummaries.filter(p => p.position !== '').map((p, i) => (
            <div key={i} style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '700', flexShrink: 0, width: '22px' }}>{p.position}</span>
                <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.playerName}</span>
              </div>
              <span style={{ flexShrink: 0, color: p.weekFP < 0 ? '#ef4444' : '#22c55e', fontWeight: '600' }}>
                {fmtSignedFP1(p.weekFP)}
              </span>
            </div>
          ))}
          <div style={sectionTotalStyle}>
            <span style={{ color: '#cbd5e1' }}>Roster FP</span>
            <span style={{ color: weekPlayerFP < 0 ? '#ef4444' : '#22c55e' }}>{fmtSignedFP1(weekPlayerFP)}</span>
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

            // Multi-output cards (e.g. Believe, Comeback Kid, Domination,
            // Walk Off) join their equation parts with " | " — primary
            // payout first, then trigger bonuses. Split here so the
            // trigger bonus renders as its own sub-line (matching the
            // visual treatment of match/edition bonuses) instead of
            // crowding the primary equation line.
            const eqSplit = (b.equation || '').split(' | ')
            const eqPrimary = eqSplit[0] || ''
            const eqExtras = eqSplit.slice(1)
            if (b.primaryFP > 0 || fpMatched) {
              const c = TYPE_COLORS.fp
              if (eqPrimary) eqSegments.push({text: eqPrimary, color: c})
              else if (fpMatched) eqSegments.push({text: b.preMatchFP.toFixed(1), color: c})
              if (fpMatched) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (fpModTag) eqSegments.push({text: ` ${fpModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryFP, 'fp')
            } else if (b.primaryMult > 1) {
              const c = TYPE_COLORS.mult
              eqNegated = isGrounded
              if (eqPrimary) eqSegments.push({text: eqPrimary, color: c})
              else if (b.matchMultiplied) {
                // No compute equation — show the pre-match delta directly
                // so it lines up with the chip's delta result. Old display
                // showed the full multiplier (e.g., "1.32x") which then
                // looked smaller than the result delta and confused users.
                const preBonus = (b.preMatchMult ?? 1) - 1
                eqSegments.push({text: `+${preBonus.toFixed(2)} FPx`, color: c})
              }
              // Match bonus on FPx uses bonus-additive scaling: only the
              // bonus portion gets multiplied by the match factor. With
              // compute equations now using delta notation (+X FPx), the
              // multiplication chain reads correctly: +1.5 × 1.5 = +2.25.
              if (b.matchMultiplied) eqSegments.push({text: ` × ${mm}x match`, color: matchColor})
              if (multModTag) eqSegments.push({text: ` ${multModTag.trim()}`, color: c})
              eqResult = formatValue(b.primaryMult, 'mult')
            } else if (primaryF > 0) {
              const c = TYPE_COLORS.floobits
              if (eqPrimary) eqSegments.push({text: eqPrimary, color: c})
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
                eqResult = { str: `+${(b.preMatchMult - 1).toFixed(2)} FPx`, color: '#64748b' }
                eqNegated = true
              } else {
                eqSegments.push({text: b.equation, color: '#94a3b8'})
              }
            }

            // Sub-lines: conditional, edition bonuses (with negation tracking)
            const subLines: { label: React.ReactNode; chip: { str: string; color: string }; negated?: boolean }[] = []
            // Multi-output trigger bonuses split off the primary equation
            // (e.g. Believe's "+15F (fav team won this week)"). Each
            // extra " | "-separated piece renders as its own sub-line
            // with the floobits chip — matches the visual weight of a
            // match bonus. The chip value comes from primaryFloobits when
            // the trigger fired; if multiple extras exist they share that
            // total (rare — currently every multi-output card has at most
            // one trigger bonus).
            if (eqExtras.length > 0 && (b.primaryFloobits ?? 0) > 0) {
              const triggerFloobits = b.primaryFloobits ?? 0
              for (let xi = 0; xi < eqExtras.length; xi++) {
                const part = eqExtras[xi]
                // Strip a leading "+NF " if present so the label reads as
                // pure context — the chip already shows the value.
                const labelText = part.replace(/^\+?\d+F\s*/, '').trim() || part
                subLines.push({
                  label: <span style={{ color: TYPE_COLORS.floobits }}>{labelText}</span>,
                  chip: formatValue(xi === 0 ? triggerFloobits : 0, 'floobits'),
                })
              }
            }
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
                ? { str: `+${Math.max(0, realMult - 1).toFixed(2)} FPx`, color: '#64748b', negated: negateChip }
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
                  {b.gateActive === false && (
                    <HoverTooltip text={`Power bar not met${b.gateThreshold ? ` (needs ${b.gateThreshold} FP)` : ''} — this card's effect scored nothing this week.`} color="#94a3b8">
                      <span style={{
                        fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.04em',
                        background: 'rgba(148,163,184,0.14)', border: '1px solid rgba(148,163,184,0.3)',
                        borderRadius: '3px', padding: '0 4px', flexShrink: 0,
                      }}>GATE</span>
                    </HoverTooltip>
                  )}
                  {(b.tier ?? 1) >= 2 && (
                    <span style={{
                      fontSize: '9px', fontWeight: 800, color: '#fbbf24',
                      background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.35)',
                      borderRadius: '3px', padding: '0 4px', flexShrink: 0,
                    }}>{TIER_ROMAN[b.tier ?? 1] ?? b.tier}</span>
                  )}
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
            const hasDreamTeam = (syn.dreamTeam?.count ?? 0) >= 2
            if (!hasChance && !hasStreak && !hasMatch && !hasDreamTeam) return null
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
                {hasDreamTeam && (
                  <div style={{ ...rowStyle }}>
                    <span style={labelStyle}>Dream Team · {syn.dreamTeam!.count} All-Pros</span>
                    <span style={{ ...valStyle, color: '#fbbf24' }}>+{(syn.dreamTeam!.bonus * 100).toFixed(0)}% FPx</span>
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
        const factors = eq!.multFactors ?? []
        const hasMult = factors.length > 0
        // ── Criticality override ── A controlling Core's signature equation
        // replaces the standard aggregator; show that instead of (roster+FP)×FPx.
        const critCore = eq!.criticalityCore
        const critEq = eq!.criticalityEquation
        if (critCore && critEq) {
          const coreName = critCore.charAt(0).toUpperCase() + critCore.slice(1)
          return (
            <>
            {collapsibleHeader('formula', 'Week Score Total', `${(weekPlayerFP + weekCardBonus).toFixed(1)} pts`, '#f59e0b')}
            {expanded['formula'] && (
            <div style={{
              marginTop: '4px', padding: '10px 12px',
              backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: '8px',
              borderBottom: '2px solid rgba(245,158,11,0.5)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.4px', color: '#f59e0b', marginBottom: '6px', textTransform: 'uppercase' }}>
                Criticality &middot; {coreName}&rsquo;s Equation
              </div>
              <div style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace', lineHeight: '1.7', wordBreak: 'break-word' }}>
                {critEq}
              </div>
            </div>
            )}
            </>
          )
        }
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
              {hasMult && (
                <>
                  {/* Bonus-additive FPx aggregation: multiplier is
                      `1 + Σ(M − 1)`. Each card's contribution is its
                      delta above 1.0, shown explicitly so users see
                      what every FPx card brought to the table. */}
                  <span style={{ color: '#cbd5e1' }}> {'\u00d7'} (</span>
                  <span style={{ color: '#cbd5e1', textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}>1</span>
                  {factors.map((f, i) => {
                    const delta = Math.max(0, f - 1)
                    return (
                      <React.Fragment key={i}>
                        <span style={{ color: '#cbd5e1', textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}> + </span>
                        <span style={{ color: TYPE_COLORS.mult, textDecoration: isGrounded ? 'line-through' : 'none', opacity: isGrounded ? 0.45 : 1 }}>{delta.toFixed(2)}</span>
                      </React.Fragment>
                    )
                  })}
                  <span style={{ color: '#cbd5e1' }}>) </span>
                  <span style={{ color: '#cbd5e1', fontSize: '11px', opacity: 0.7 }}>FPx</span>
                </>
              )}
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
