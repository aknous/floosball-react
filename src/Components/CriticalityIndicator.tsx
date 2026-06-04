import React from 'react'
import { Link } from 'react-router-dom'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { bandVisual, isElevated } from '@/utils/coresVisual'

// Compact header indicator for the league's Criticality state. Hidden while
// dormant so it only draws the eye when the simulation is actually tensing.
// Pulses faster as the band escalates; links through to the Cores control room.

const KEYFRAMES = `
@keyframes criticalityPulse {
  0%   { transform: scale(1);   opacity: 1; }
  50%  { transform: scale(1.7); opacity: 0.35; }
  100% { transform: scale(1);   opacity: 1; }
}`

const CriticalityIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { status } = useCoresStatus()
  if (!isElevated(status.status)) return null

  const v = bandVisual(status.status)

  return (
    <Link
      to="/cores"
      aria-label={`Cores: ${v.label}`}
      title={`The Cores — ${v.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: compact ? '4px 7px' : '4px 10px',
        borderRadius: '999px',
        textDecoration: 'none',
        backgroundColor: v.tint,
        border: `1px solid ${v.color}55`,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <style>{KEYFRAMES}</style>
      <span style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
        {v.pulseMs > 0 && (
          <span
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              backgroundColor: v.color,
              animation: `criticalityPulse ${v.pulseMs}ms ease-in-out infinite`,
            }}
          />
        )}
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: v.color,
        }} />
      </span>
      {!compact && (
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
          color: v.color, textTransform: 'uppercase',
        }}>
          {v.label}
        </span>
      )}
    </Link>
  )
}

export default CriticalityIndicator
