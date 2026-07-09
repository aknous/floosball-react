import React, { useCallback, useEffect, useRef, useState } from 'react'
import RulebookPopover from './RulebookPopover'
import { useRuleVote } from '@/contexts/RuleVoteContext'
import { coreColor } from '@/utils/coresVisual'

// Header entry point for the league Rulebook, sitting beside the Cores indicator.
// Interaction mirrors CriticalityIndicator: hover opens the popover (a peek),
// click pins it open until you click again, press Esc, or click outside.

const CLOSE_GRACE_MS = 220
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const SEEN_KEY = 'rulesSeenChangeCount'

const RulebookIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [open, setOpen] = useState(false)
  const [pinned, setPinnedState] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinnedRef = useRef(false)

  // Notification dot: a live rule vote (colored by the Core), or a rule change
  // the user hasn't looked at since (amber). Cleared once the popover is opened.
  const rv = useRuleVote()
  const [changeCount, setChangeCount] = useState<number | null>(null)
  const [seenCount, setSeenCount] = useState<number>(() => Number(localStorage.getItem(SEEN_KEY) ?? 0))
  useEffect(() => {
    let cancelled = false
    const load = () => fetch(`${API_BASE}/rules`).then(r => r.json())
      .then(j => { if (!cancelled) setChangeCount(j?.data?.changeCount ?? 0) }).catch(() => {})
    load()
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])
  const hasUnseenChange = changeCount != null && changeCount > seenCount
  const markSeen = useCallback(() => {
    if (changeCount != null) { localStorage.setItem(SEEN_KEY, String(changeCount)); setSeenCount(changeCount) }
  }, [changeCount])
  const dotColor = rv.open ? coreColor(rv.core || undefined) : (hasUnseenChange ? '#f59e0b' : null)

  const setPinned = (v: boolean) => { pinnedRef.current = v; setPinnedState(v) }
  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])
  const openNow = useCallback(() => { cancelClose(); setOpen(true); markSeen() }, [cancelClose, markSeen])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => { if (!pinnedRef.current) setOpen(false) }, CLOSE_GRACE_MS)
  }, [cancelClose])
  const togglePin = useCallback(() => {
    cancelClose()
    // A vote is live — the pill's job is to relaunch it (the ruleset is glitching
    // / about to change anyway). Hover still peeks the rules popover underneath.
    if (rv.open) { rv.openModal(); return }
    if (pinnedRef.current) { setPinned(false); setOpen(false) }
    else { setPinned(true); setOpen(true); markSeen() }
  }, [cancelClose, markSeen, rv])
  const handleClose = useCallback(() => { cancelClose(); setPinned(false); setOpen(false) }, [cancelClose])

  const accent = '#e2e8f0'

  return (
    <>
      <button
        ref={btnRef}
        onClick={togglePin}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        aria-label="Current Ruleset"
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'inline-flex', alignItems: 'center', gap: compact ? '0' : '7px',
          padding: compact ? '5px 6px' : '5px 9px',
          borderRadius: '999px', cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: open ? `1px solid ${accent}55` : '1px solid transparent',
          lineHeight: 1, whiteSpace: 'nowrap',
        }}
      >
        {/* Scroll / codex glyph */}
        <svg width="15" height="15" viewBox="0 0 20 20" fill={open ? accent : '#94a3b8'} style={{ flexShrink: 0 }}>
          <path d="M5 2h9a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 011-1.73V2zm2 4h6v1.5H7V6zm0 3h6v1.5H7V9zm0 3h4v1.5H7V12z" />
        </svg>
        {!compact && (
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
            color: open ? accent : '#94a3b8', textTransform: 'uppercase',
          }}>
            Current Ruleset
          </span>
        )}
        {dotColor && !open && (
          <span style={{
            position: 'absolute', top: '1px', right: '1px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: dotColor, boxShadow: '0 0 0 2px #0f172a',
          }} />
        )}
      </button>
      {open && (
        <RulebookPopover
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

export default RulebookIndicator
