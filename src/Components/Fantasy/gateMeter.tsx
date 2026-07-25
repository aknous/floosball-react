import React from 'react'
import HoverTooltip from '@/Components/HoverTooltip'

// Shared FP power-bar tooltip + meter, used by both the lineup performance block and the
// scoring breakdown so they never drift. Concise: "6/8 FP · Effect Active", with an extra
// line for inverse gates and for chance cards' trigger odds/result.

export interface GateTooltipOpts {
  playerFP?: number
  threshold: number
  active: boolean
  inverse?: boolean
  isChance?: boolean
  chancePct?: number       // 0-1 trigger probability
  chanceTriggered?: boolean
}

export function gateTooltipText(o: GateTooltipOpts): string {
  const lines = [
    `${o.playerFP != null ? `${o.playerFP.toFixed(0)}/${o.threshold}` : o.threshold} FP · Effect ${o.active ? 'Active' : 'Inactive'}`,
  ]
  if (o.inverse) lines.push(`Inverse — active while under ${o.threshold} FP`)
  if (o.isChance) lines.push(`Chance ${o.chancePct ? `${Math.round(o.chancePct * 100)}% ` : ''}· ${o.chanceTriggered ? 'Triggered' : 'Missed'}`)
  return lines.join('\n')
}

// Fill fraction (0-1): normal ramps up to the threshold; inverse starts full and empties.
export function gateFill(o: Pick<GateTooltipOpts, 'playerFP' | 'threshold' | 'active' | 'inverse'>): number {
  const raw = o.playerFP != null && o.threshold > 0
    ? (o.inverse ? (o.threshold - o.playerFP) / o.threshold : o.playerFP / o.threshold)
    : (o.active ? 1 : 0)
  return Math.max(0, Math.min(1, raw))
}

// Compact inline meter for a scoring-breakdown card row.
export const GateMeter: React.FC<GateTooltipOpts> = (props) => {
  const color = props.active ? '#22c55e' : '#64748b'
  return (
    <HoverTooltip text={gateTooltipText(props)} color={color}>
      <div style={{ width: 46, height: 6, backgroundColor: 'rgba(148,163,184,0.20)', borderRadius: 3, overflow: 'hidden', flexShrink: 0, cursor: 'help' }}>
        <div style={{ width: `${gateFill(props) * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </div>
    </HoverTooltip>
  )
}
