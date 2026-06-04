import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { bandVisual, CoreIcon, CORE_DISPLAY_NAMES, coreColor } from '@/utils/coresVisual'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Anchored popover for the Cores: the league's ominous status plus the live
// stream of the Cores talking among themselves. Deliberately exposes NO
// personality descriptions — who each Core is emerges from what they say, not
// from a label. Number-free: the band is the only "reading".

const PANEL_WIDTH = 360

interface CoreLine {
  id: string
  core?: string
  coreDisplayName?: string
  text: string
  eventType?: string
  exchangeId?: string
  turnIndex?: number
  turnCount?: number
  ambient?: boolean
  ts: number
}

interface Block {
  key: string
  turns: CoreLine[]
  ts: number
  eventType?: string
  ambient?: boolean
}

const EVENT_TAG: Record<string, { label: string; color: string }> = {
  warning_low: { label: 'WARNING', color: '#fbbf24' },
  warning_high: { label: 'WARNING', color: '#f97316' },
  suppression: { label: 'CONTAINMENT', color: '#38bdf8' },
  criticality: { label: 'CRITICALITY', color: '#ef4444' },
  reset: { label: 'RESET', color: '#a78bfa' },
}

const MAX_LINES = 80
const AMBIENT_MS = 45_000
const AMBIENT_QUIET_MS = 30_000

// Compact relative time for a block. Falls back to a clock time past a day so
// old backfilled history still reads clearly.
const formatRelative = (ts: number, now: number): string => {
  const diff = Math.max(0, now - ts)
  if (diff < 45_000) return 'now'
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

interface CoresPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  pinned?: boolean
  onPanelEnter?: () => void
  onPanelLeave?: () => void
}

const CoresPopover: React.FC<CoresPopoverProps> = ({
  anchorRef, onClose, pinned = false, onPanelEnter, onPanelLeave,
}) => {
  const { subscribe } = useSeasonWebSocket()
  const { status } = useCoresStatus()
  const [lines, setLines] = useState<CoreLine[]>([])
  const lastLiveRef = useRef<number>(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  // Drives relative-time refresh ("now" → "3m" → "1h") without per-line timers.
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Position under the anchor, right-aligned, clamped to the viewport.
  useEffect(() => {
    const place = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const left = Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8))
      setPos({ top: r.bottom + 8, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef])

  // Dismiss on Esc or click outside (the anchor toggles itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [anchorRef, onClose])

  const addLines = (incoming: CoreLine[]) => {
    if (!incoming.length) return
    setLines(prev => {
      const seen = new Set(prev.map(l => l.id))
      const merged = [...prev]
      for (const l of incoming) if (!seen.has(l.id)) { merged.push(l); seen.add(l.id) }
      return merged.length > MAX_LINES ? merged.slice(merged.length - MAX_LINES) : merged
    })
  }

  // Backfill persisted Cores dialogue when the panel opens.
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/league-news/recent?category=cores&week=0&limit=40`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        if (cancelled || !Array.isArray(rows)) return
        addLines(rows.slice().reverse().map(r => ({
          id: `cn-${r.id}`,
          core: r.core ?? undefined,
          coreDisplayName: r.coreDisplayName ?? undefined,
          text: r.text,
          eventType: r.eventType ?? undefined,
          ts: r.createdAt ? Date.parse(r.createdAt) : Date.now(),
        })))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Live Cores dialogue.
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (!msg || msg.event !== 'league_news' || msg.category !== 'cores') return
      lastLiveRef.current = Date.now()
      addLines([{
        id: msg.exchangeId ? `live-${msg.exchangeId}-${msg.turnIndex ?? 0}`
          : `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        core: msg.core,
        coreDisplayName: msg.coreDisplayName,
        text: msg.text,
        eventType: msg.eventType,
        exchangeId: msg.exchangeId,
        turnIndex: msg.turnIndex,
        turnCount: msg.turnCount,
        ts: Date.now(),
      }])
    })
    return unsub
  }, [subscribe])

  // Ambient banter while the panel is open and nothing live is happening.
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (cancelled || Date.now() - lastLiveRef.current < AMBIENT_QUIET_MS) return
      fetch(`${API_BASE}/cores/conversation?event=idle`)
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (cancelled || !json) return
          const turns = ((json.data ?? json)?.turns ?? []) as any[]
          if (!turns.length) return
          const eid = `ambient-${Date.now()}`
          const ts = Date.now()
          addLines(turns.map((t, i) => ({
            id: `${eid}-${i}`, core: t.core, coreDisplayName: t.coreDisplayName,
            text: t.text, exchangeId: eid, turnIndex: t.turnIndex ?? i,
            turnCount: t.turnCount ?? turns.length, ambient: true, ts,
          })))
        })
        .catch(() => {})
    }
    const id = setInterval(tick, AMBIENT_MS)
    const prime = setTimeout(() => { if (!cancelled && lines.length === 0) tick() }, 1200)
    return () => { cancelled = true; clearInterval(id); clearTimeout(prime) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = []
    const byExchange = new Map<string, Block>()
    for (const ln of lines) {
      if (ln.exchangeId) {
        let b = byExchange.get(ln.exchangeId)
        if (!b) {
          b = { key: ln.exchangeId, turns: [], ts: ln.ts, eventType: ln.eventType, ambient: ln.ambient }
          byExchange.set(ln.exchangeId, b); out.push(b)
        }
        b.turns.push(ln); b.ts = Math.max(b.ts, ln.ts)
        if (ln.eventType) b.eventType = ln.eventType
      } else {
        out.push({ key: ln.id, turns: [ln], ts: ln.ts, eventType: ln.eventType, ambient: ln.ambient })
      }
    }
    for (const b of out) b.turns.sort((a, z) => (a.turnIndex ?? 0) - (z.turnIndex ?? 0))
    return out.sort((a, z) => z.ts - a.ts)
  }, [lines])

  const v = bandVisual(status.status)
  const description = status.description || v.fallback

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="The Cores"
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width: PANEL_WIDTH,
        maxWidth: 'calc(100vw - 16px)', maxHeight: 'min(70vh, 560px)',
        backgroundColor: '#0b1220', border: `1px solid ${v.color}44`,
        borderRadius: '10px', boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
        zIndex: 10010, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        // Portal renders outside the app's font-pixel root, so set the app font
        // explicitly (matches tailwind's `pixel` family) or it falls back to the
        // browser default.
        fontFamily: 'pressStart, sans-serif',
      }}
    >
      {/* Status header */}
      <div style={{ padding: '12px 14px', backgroundColor: v.tint, borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <StatusOrb color={v.color} pulseMs={v.pulseMs} />
          <span style={{
            fontSize: '14px', fontWeight: 800, color: v.color,
            textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1,
          }}>
            {status.label || v.label}
          </span>
          {pinned && (
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: '22px', height: '22px', borderRadius: '5px', flexShrink: 0,
                background: 'transparent', border: '1px solid #334155',
                color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '8px 0 0', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>

      {/* Dialogue */}
      <div style={{ padding: '10px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: '6px 2px' }}>
            The channel is quiet.
          </p>
        ) : (
          blocks.map(b => <ExchangeBlock key={b.key} block={b} now={now} />)
        )}
      </div>
    </div>,
    document.body
  )
}

const StatusOrb: React.FC<{ color: string; pulseMs: number }> = ({ color, pulseMs }) => (
  <span style={{ position: 'relative', width: '12px', height: '12px', flexShrink: 0 }}>
    <style>{`@keyframes coresPopOrbPulse{0%{transform:scale(1);opacity:.9}50%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:0}}`}</style>
    {pulseMs > 0 && (
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: color,
        animation: `coresPopOrbPulse ${pulseMs}ms ease-out infinite`,
      }} />
    )}
    <span style={{ position: 'absolute', inset: '2px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
  </span>
)

const ExchangeBlock: React.FC<{ block: Block; now: number }> = ({ block, now }) => {
  const tag = block.ambient ? null : (block.eventType ? EVENT_TAG[block.eventType] : null)
  const isConversation = block.turns.length > 1
  return (
    <div style={{
      backgroundColor: block.ambient ? 'rgba(148,163,184,0.05)' : '#0f172a',
      border: `1px solid ${tag ? `${tag.color}33` : '#1e293b'}`,
      borderRadius: '8px', padding: '10px 11px',
    }}>
      {/* Header row: event tag (or nothing) + when it happened */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', marginBottom: '7px',
      }}>
        {tag ? (
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: tag.color, textTransform: 'uppercase' }}>
            {tag.label}
          </span>
        ) : <span />}
        <span style={{ fontSize: '9px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatRelative(block.ts, now)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isConversation ? '7px' : '0' }}>
        {block.turns.map(t => {
          const c = coreColor(t.core)
          return (
            <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', borderLeft: `2px solid ${c}`, paddingLeft: '8px' }}>
              <span style={{ marginTop: '2px' }}>
                <CoreIcon core={t.core} color={c} size={13} />
              </span>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: c, marginRight: '6px' }}>
                  {t.coreDisplayName ?? CORE_DISPLAY_NAMES[(t.core ?? '').toLowerCase()] ?? 'The Core'}
                </span>
                <span style={{ fontSize: '13px', color: block.ambient ? '#cbd5e1' : '#e2e8f0', lineHeight: 1.5 }}>
                  {t.text}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CoresPopover
