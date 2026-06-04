import React, { useRef, useState } from 'react'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { bandVisual, isElevated } from '@/utils/coresVisual'
import CoresPopover from './CoresPopover'

// Header entry point for the Cores. Always present so the Cores are reachable
// (a faint dot while dormant), escalating to a colored, pulsing, labeled pill as
// the simulation tenses. Clicking toggles an anchored popover with the league's
// status and the live Cores conversation — no dedicated page, no personality
// descriptions.

const KEYFRAMES = `
@keyframes criticalityPulse {
  0%   { transform: scale(1);   opacity: 1; }
  50%  { transform: scale(1.7); opacity: 0.35; }
  100% { transform: scale(1);   opacity: 1; }
}`

const CriticalityIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { status } = useCoresStatus()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const elevated = isElevated(status.status)
  const v = bandVisual(status.status)
  // Dormant: a muted, label-less dot. Elevated: the band color, pulsing + label.
  const dotColor = elevated ? v.color : '#64748b'
  const showLabel = elevated && !compact

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-label={`The Cores — ${status.label || v.label}`}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: showLabel ? '7px' : '0',
          padding: compact ? '5px 6px' : (elevated ? '4px 10px' : '5px 7px'),
          borderRadius: '999px', cursor: 'pointer',
          background: elevated ? v.tint : 'transparent',
          border: elevated ? `1px solid ${v.color}55` : '1px solid transparent',
          lineHeight: 1, whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!elevated) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!elevated) e.currentTarget.style.background = 'transparent' }}
      >
        <style>{KEYFRAMES}</style>
        <span style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
          {elevated && v.pulseMs > 0 && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: dotColor,
              animation: `criticalityPulse ${v.pulseMs}ms ease-in-out infinite`,
            }} />
          )}
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: dotColor }} />
        </span>
        {showLabel && (
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
            color: v.color, textTransform: 'uppercase',
          }}>
            {v.label}
          </span>
        )}
      </button>
      {open && <CoresPopover anchorRef={btnRef} onClose={() => setOpen(false)} />}
    </>
  )
}

export default CriticalityIndicator
