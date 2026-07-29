import React from 'react'
import HoverTooltip from '@/Components/HoverTooltip'

// Shared FP power-bar tooltip + meter, used by both the lineup performance block and the
// scoring breakdown so they never drift. Two bar modes:
//   * on/off gate — "6/8 FP · Effect Active"; the fill ramps to the threshold.
//   * CHANCE cards — the bar IS the trigger probability: its fill = the odds, filled by the
//     player's FP plus the card's condition. Tooltip: "62% trigger chance · Missed".

// All-Pro accent (matches the AP classification badge). An All-Pro card's bar is lowered
// 30%, so it's tinted purple to signal the reduced threshold at a glance.
export const AP_ACCENT = '#a78bfa'

export interface GateTooltipOpts {
  playerFP?: number
  threshold: number
  active: boolean
  inverse?: boolean
  allPro?: boolean         // All-Pro card: bar lowered 30% (CARD_GATE_ALLPRO_MULT)
  isChance?: boolean
  chancePct?: number       // 0-1 trigger probability (this IS the bar fill for chance cards)
  chanceTriggered?: boolean
  chanceResolved?: boolean // false while the week is live (roll resolves at week end)
}

export function gateTooltipText(o: GateTooltipOpts): string {
  if (o.isChance) {
    const pct = o.chancePct != null ? `${Math.round(o.chancePct * 100)}% ` : ''
    // Three states: the roll resolves at WEEK END, so while it's still pending don't call
    // it "Missed" (chanceTriggered is just false-because-not-yet-rolled). Only a resolved
    // roll reads Triggered / Missed.
    const verdict = o.chanceTriggered ? 'Triggered' : o.chanceResolved ? 'Missed' : 'Pending'
    return `${pct}trigger chance · ${verdict}`
  }
  const lines = [
    `${o.playerFP != null ? `${o.playerFP.toFixed(0)}/${o.threshold}` : o.threshold} FP · Effect ${o.active ? 'Active' : 'Inactive'}`,
  ]
  if (o.inverse) lines.push(`Inverse: active while under ${o.threshold} FP`)
  if (o.allPro) lines.push('All-Pro: bar lowered 30%')
  return lines.join('\n')
}

// Bar color: chance cards go green once triggered, amber while still just odds; gates are
// green when active, muted when not.
export function gateBarColor(o: Pick<GateTooltipOpts, 'active' | 'isChance' | 'chanceTriggered'>): string {
  if (o.isChance) return o.chanceTriggered ? '#22c55e' : '#f59e0b'
  return o.active ? '#22c55e' : '#64748b'
}

// Fill fraction (0-1): chance cards fill to their trigger odds; normal gates ramp up to the
// threshold; inverse starts full and empties.
export function gateFill(o: Pick<GateTooltipOpts, 'playerFP' | 'threshold' | 'active' | 'inverse' | 'isChance' | 'chancePct'>): number {
  if (o.isChance) return Math.max(0, Math.min(1, o.chancePct ?? 0))
  const raw = o.playerFP != null && o.threshold > 0
    ? (o.inverse ? (o.threshold - o.playerFP) / o.threshold : o.playerFP / o.threshold)
    : (o.active ? 1 : 0)
  return Math.max(0, Math.min(1, raw))
}

// Compact inline meter for a scoring-breakdown card row.
export const GateMeter: React.FC<GateTooltipOpts> = (props) => {
  const color = gateBarColor(props)
  return (
    <HoverTooltip text={gateTooltipText(props)} color={props.allPro ? AP_ACCENT : color}>
      <div style={{
        width: 46, height: 6, backgroundColor: 'rgba(148,163,184,0.20)', borderRadius: 3,
        overflow: 'hidden', flexShrink: 0, cursor: 'help',
        boxShadow: props.allPro ? `0 0 0 1px ${AP_ACCENT}` : undefined,
      }}>
        <div style={{ width: `${gateFill(props) * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </div>
    </HoverTooltip>
  )
}
