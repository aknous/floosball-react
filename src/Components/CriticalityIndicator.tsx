import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { bandVisual, isElevated } from '@/utils/coresVisual'
import CoresPopover from './CoresPopover'

// Header entry point for the Cores. Always present so the Cores are reachable
// (a faint dot while dormant), escalating to a colored, pulsing, labeled pill as
// the simulation tenses.
//
// Interaction: hover opens the popover (a peek); click pins it open so you can
// read at leisure. While pinned it stays until you click the indicator again,
// press Esc, or click outside. While merely hovered it closes shortly after the
// pointer leaves both the indicator and the panel.

const KEYFRAMES = `
@keyframes criticalityPulse {
  0%   { transform: scale(1);   opacity: 1; }
  50%  { transform: scale(1.7); opacity: 0.35; }
  100% { transform: scale(1);   opacity: 1; }
}`

const CLOSE_GRACE_MS = 220

const CriticalityIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { status, lines } = useCoresStatus()
  const [open, setOpen] = useState(false)
  const [pinned, setPinnedState] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinnedRef = useRef(false)

  // Unread pip: show a dot when the control-room feed has lines newer than the
  // last time the popover was opened. Baselined on first load so the existing
  // backlog doesn't show as new; persisted so it survives refresh.
  const newestTs = useMemo(
    () => lines.reduce((m, l) => Math.max(m, l.ts || 0), 0), [lines])
  const [seenTs, setSeenTs] = useState<number>(
    () => Number(localStorage.getItem('coresSeenTs') || 0))
  const baselined = useRef(localStorage.getItem('coresSeenTs') != null)
  const markSeen = useCallback((ts: number) => {
    setSeenTs(ts)
    try { localStorage.setItem('coresSeenTs', String(ts)) } catch {}
  }, [])
  useEffect(() => {
    // First time we learn the newest timestamp, baseline to it (no pip for the
    // pre-existing backlog).
    if (!baselined.current && newestTs > 0) { baselined.current = true; markSeen(newestTs) }
  }, [newestTs, markSeen])
  useEffect(() => {
    // Opening the popover marks everything current as seen.
    if (open && newestTs > seenTs) markSeen(newestTs)
  }, [open, newestTs, seenTs, markSeen])
  const hasUnread = newestTs > seenTs && !open

  const setPinned = (v: boolean) => { pinnedRef.current = v; setPinnedState(v) }

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])

  const openNow = useCallback(() => { cancelClose(); setOpen(true) }, [cancelClose])

  // Hover-out: close after a short grace so the pointer can travel into the
  // panel without it vanishing. No-op while pinned.
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (!pinnedRef.current) setOpen(false)
    }, CLOSE_GRACE_MS)
  }, [cancelClose])

  const togglePin = useCallback(() => {
    cancelClose()
    if (pinnedRef.current) { setPinned(false); setOpen(false) }
    else { setPinned(true); setOpen(true) }
  }, [cancelClose])

  const handleClose = useCallback(() => {
    cancelClose(); setPinned(false); setOpen(false)
  }, [cancelClose])

  const elevated = isElevated(status.status)
  const v = bandVisual(status.status)
  const dotColor = elevated ? v.color : '#64748b'
  // Always label the pill (except in compact/mobile): elevated shows the band,
  // dormant shows "Cores" so the dot isn't an unexplained gray dot.
  const showLabel = !compact
  const labelText = elevated ? v.label : 'Cores'
  const labelColor = elevated ? v.color : '#94a3b8'

  return (
    <>
      <button
        ref={btnRef}
        onClick={togglePin}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        aria-label={`The Cores — ${status.label || v.label}`}
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'inline-flex', alignItems: 'center', gap: showLabel ? '7px' : '0',
          padding: compact ? '5px 6px' : (elevated ? '4px 10px' : '5px 7px'),
          borderRadius: '999px', cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.06)' : (elevated ? v.tint : 'transparent'),
          border: elevated ? `1px solid ${v.color}55` : '1px solid transparent',
          lineHeight: 1, whiteSpace: 'nowrap',
        }}
      >
        <style>{KEYFRAMES}</style>
        {hasUnread && (
          <span
            aria-label="New activity in the control room"
            style={{
              position: 'absolute', top: '-1px', right: '-1px',
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#38bdf8', border: '1.5px solid #0b1220',
              boxShadow: '0 0 6px #38bdf8',
            }}
          />
        )}
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
            color: labelColor, textTransform: 'uppercase',
          }}>
            {labelText}
          </span>
        )}
      </button>
      {open && (
        <CoresPopover
          anchorRef={btnRef}
          pinned={pinned}
          onClose={handleClose}
          onPanelEnter={cancelClose}
          onPanelLeave={scheduleClose}
        />
      )}
    </>
  )
}

export default CriticalityIndicator
