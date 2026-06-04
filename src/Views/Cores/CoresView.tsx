import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { bandVisual, CoreIcon, CORE_DISPLAY_NAMES } from '@/utils/coresVisual'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// The Cores control room. Surfaces the league's ominous Criticality status and
// a live stream of the Cores talking among themselves — warnings, the near-miss
// patch scrambles, and ambient banter between events. Number-free: the band IS
// the information.

const CORES_AMBER = '#fbbf24'

// Per-Core one-line characterization for the roster strip.
const CORE_BLURB: Record<string, string> = {
  cassian: 'Keeps the records because he is a fanatic. The standings matter more to him than containment.',
  pyre: 'The enforcer. Finds the anomalies tedious and the sport more tedious still.',
  aris: 'Delighted by the chaos. Could not name a single standing.',
  halverson: 'Loves the players, and the game because they love it. Mourns ahead of time.',
  vera: 'The observer. Says almost nothing, and keeps perfect score anyway.',
}
const CORE_ORDER = ['cassian', 'pyre', 'aris', 'halverson', 'vera']

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

const MAX_LINES = 140
const AMBIENT_MS = 45_000       // how often to consider pulling idle banter
const AMBIENT_QUIET_MS = 30_000 // only inject banter if nothing live arrived recently

const CoresView: React.FC = () => {
  const { subscribe } = useSeasonWebSocket()
  const { status } = useCoresStatus()
  const [lines, setLines] = useState<CoreLine[]>([])
  const lastLiveRef = useRef<number>(0)

  const addLines = (incoming: CoreLine[]) => {
    if (!incoming.length) return
    setLines(prev => {
      const seen = new Set(prev.map(l => l.id))
      const merged = [...prev]
      for (const l of incoming) {
        if (!seen.has(l.id)) { merged.push(l); seen.add(l.id) }
      }
      // Keep the tail bounded.
      return merged.length > MAX_LINES ? merged.slice(merged.length - MAX_LINES) : merged
    })
  }

  // Backfill persisted Cores dialogue on mount (whole-season, not just this week).
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/league-news/recent?category=cores&week=0&limit=60`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        if (cancelled || !Array.isArray(rows)) return
        // API returns newest-first; reverse to chronological for the stream.
        const restored: CoreLine[] = rows.slice().reverse().map(r => ({
          id: `cn-${r.id}`,
          core: r.core ?? undefined,
          coreDisplayName: r.coreDisplayName ?? undefined,
          text: r.text,
          eventType: r.eventType ?? undefined,
          ts: r.createdAt ? Date.parse(r.createdAt) : Date.now(),
        }))
        addLines(restored)
      })
      .catch(() => { /* sim may be mid-restart; stream just starts empty */ })
    return () => { cancelled = true }
  }, [])

  // Live Cores dialogue via the season socket.
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (!msg || msg.event !== 'league_news' || msg.category !== 'cores') return
      lastLiveRef.current = Date.now()
      addLines([{
        id: msg.exchangeId
          ? `live-${msg.exchangeId}-${msg.turnIndex ?? 0}`
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

  // Ambient banter: when nothing live has happened recently, pull an idle
  // exchange so the room feels inhabited between events.
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (Date.now() - lastLiveRef.current < AMBIENT_QUIET_MS) return
      fetch(`${API_BASE}/cores/conversation?event=idle`)
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (cancelled || !json) return
          const data = json.data ?? json
          const turns = (data?.turns ?? []) as any[]
          if (!turns.length) return
          const eid = `ambient-${Date.now()}`
          const ts = Date.now()
          addLines(turns.map((t, i) => ({
            id: `${eid}-${i}`,
            core: t.core,
            coreDisplayName: t.coreDisplayName,
            text: t.text,
            exchangeId: eid,
            turnIndex: t.turnIndex ?? i,
            turnCount: t.turnCount ?? turns.length,
            ambient: true,
            ts,
          })))
        })
        .catch(() => {})
    }
    const id = setInterval(tick, AMBIENT_MS)
    // Prime one shortly after mount if the stream is empty.
    const prime = setTimeout(() => { if (!cancelled) tick() }, 4000)
    return () => { cancelled = true; clearInterval(id); clearTimeout(prime) }
  }, [])

  // Group consecutive turns of the same exchange into one conversation block.
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = []
    const byExchange = new Map<string, Block>()
    for (const ln of lines) {
      if (ln.exchangeId) {
        let b = byExchange.get(ln.exchangeId)
        if (!b) {
          b = { key: ln.exchangeId, turns: [], ts: ln.ts, eventType: ln.eventType, ambient: ln.ambient }
          byExchange.set(ln.exchangeId, b)
          out.push(b)
        }
        b.turns.push(ln)
        b.ts = Math.max(b.ts, ln.ts)
        if (ln.eventType) b.eventType = ln.eventType
      } else {
        out.push({ key: ln.id, turns: [ln], ts: ln.ts, eventType: ln.eventType, ambient: ln.ambient })
      }
    }
    for (const b of out) b.turns.sort((a, z) => (a.turnIndex ?? 0) - (z.turnIndex ?? 0))
    return out.sort((a, z) => z.ts - a.ts) // newest first
  }, [lines])

  const v = bandVisual(status.status)
  const description = status.description || v.fallback

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px 48px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '0.02em' }}>
          The Cores
        </h1>
      </div>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 18px', lineHeight: 1.5 }}>
        The intelligences running the simulation. They notice things before you do, and they talk to each other about it.
      </p>

      {/* Status panel */}
      <div style={{
        position: 'relative',
        backgroundColor: v.tint,
        border: `1px solid ${v.color}44`,
        borderRadius: '10px',
        padding: '16px 18px',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusOrb color={v.color} pulseMs={v.pulseMs} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em',
              color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px',
            }}>
              Simulation status
            </div>
            <div style={{
              fontSize: '20px', fontWeight: 800, color: v.color,
              textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.1,
            }}>
              {status.label || v.label}
            </div>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '12px 0 0', lineHeight: 1.5 }}>
          {description}
        </p>
        {status.inSuppression && status.activeCoreDisplayName && (
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }}>
            Last contained by {status.activeCoreDisplayName}.
          </p>
        )}
        {status.patchesApplied > 0 && (
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0' }}>
            The Cores have forced it back {status.patchesApplied === 1 ? 'once' : `${status.patchesApplied} times`} this season.
          </p>
        )}
      </div>

      {/* Roster */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '8px', marginBottom: '22px',
      }}>
        {CORE_ORDER.map(core => (
          <div key={core} style={{
            backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px',
            padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <CoreIcon core={core} color={CORES_AMBER} size={16} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                {CORE_DISPLAY_NAMES[core]}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.45 }}>
              {CORE_BLURB[core]}
            </span>
          </div>
        ))}
      </div>

      {/* Dialogue stream */}
      <div style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
        color: '#64748b', textTransform: 'uppercase', marginBottom: '10px',
      }}>
        Channel
      </div>
      {blocks.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
          The channel is quiet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {blocks.map(b => (
            <ExchangeBlock key={b.key} block={b} />
          ))}
        </div>
      )}
    </div>
  )
}

const StatusOrb: React.FC<{ color: string; pulseMs: number }> = ({ color, pulseMs }) => (
  <span style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
    <style>{`
      @keyframes coresOrbPulse {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(2.1); opacity: 0; }
        100% { transform: scale(1); opacity: 0; }
      }`}</style>
    {pulseMs > 0 && (
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: color,
        animation: `coresOrbPulse ${pulseMs}ms ease-out infinite`,
      }} />
    )}
    <span style={{
      position: 'absolute', inset: '3px', borderRadius: '50%', backgroundColor: color,
      boxShadow: `0 0 10px ${color}`,
    }} />
  </span>
)

const ExchangeBlock: React.FC<{ block: Block }> = ({ block }) => {
  const tag = block.ambient ? null : (block.eventType ? EVENT_TAG[block.eventType] : null)
  const isConversation = block.turns.length > 1
  return (
    <div style={{
      backgroundColor: block.ambient ? 'rgba(148,163,184,0.05)' : '#0f172a',
      border: `1px solid ${tag ? `${tag.color}33` : '#1e293b'}`,
      borderRadius: '8px',
      padding: '12px 14px',
    }}>
      {tag && (
        <div style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
          color: tag.color, textTransform: 'uppercase', marginBottom: '8px',
        }}>
          {tag.label}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isConversation ? '8px' : '0' }}>
        {block.turns.map(t => (
          <div key={t.id} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
            <span style={{ marginTop: '2px' }}>
              <CoreIcon core={t.core} color={CORES_AMBER} size={14} />
            </span>
            <div style={{ minWidth: 0 }}>
              <span style={{
                fontSize: '12px', fontWeight: 700, color: CORES_AMBER,
                marginRight: '7px',
              }}>
                {t.coreDisplayName ?? CORE_DISPLAY_NAMES[(t.core ?? '').toLowerCase()] ?? 'The Core'}
              </span>
              <span style={{ fontSize: '14px', color: block.ambient ? '#cbd5e1' : '#e2e8f0', lineHeight: 1.5 }}>
                {t.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CoresView
