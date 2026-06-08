import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useSeasonWebSocket } from './SeasonWebSocketContext'

// Shared Criticality status + the Cores conversation, owned here (app-level,
// always mounted) so the dialogue accumulates in the background and the popover
// just reads the latest. Number-free by design — /api/cores/status returns only
// a qualitative band.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const POLL_MS = 20_000
const AMBIENT_MS = 150_000        // idle banter fires occasionally, in the background
const AMBIENT_QUIET_MS = 30_000   // don't talk over a real Cores event
const MAX_LINES = 80

export interface CoresStatus {
  status: string        // dormant | stirring | unstable | critical | stabilizing
  label: string
  description: string
  inSuppression: boolean
  patchesApplied: number
  activeCore: string | null
  activeCoreDisplayName: string | null
  criticalityActive: boolean
}

export interface CoreLine {
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

const DORMANT: CoresStatus = {
  status: 'dormant',
  label: 'Dormant',
  description: 'All readings nominal.',
  inSuppression: false,
  patchesApplied: 0,
  activeCore: null,
  activeCoreDisplayName: null,
  criticalityActive: false,
}

interface CoresStatusContextType {
  status: CoresStatus
  loading: boolean
  lines: CoreLine[]
}

const CoresStatusContext = createContext<CoresStatusContextType | undefined>(undefined)

export const CoresStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<CoresStatus>(DORMANT)
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState<CoreLine[]>([])
  const { subscribe } = useSeasonWebSocket()
  const lastLiveRef = useRef<number>(0)
  const linesRef = useRef<CoreLine[]>([])

  const addLines = (incoming: CoreLine[]) => {
    if (!incoming.length) return
    const seen = new Set(linesRef.current.map(l => l.id))
    const next = [...linesRef.current]
    let changed = false
    for (const l of incoming) if (!seen.has(l.id)) { next.push(l); seen.add(l.id); changed = true }
    if (!changed) return
    linesRef.current = next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
    setLines(linesRef.current)
  }

  // ── Status polling ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const poll = () => {
      fetch(`${API_BASE}/cores/status`)
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (cancelled || !json) return
          const data = (json.data ?? json) as Partial<CoresStatus>
          if (data && typeof data.status === 'string') {
            setStatus({ ...DORMANT, ...data } as CoresStatus)
          }
        })
        .catch(() => { /* keep last known; the sim may be mid-restart */ })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
          timer = setTimeout(poll, POLL_MS)
        })
    }
    poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [])

  // ── Backfill persisted Cores dialogue once ──────────────────────────────
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

  // ── Live Cores dialogue (WS) ────────────────────────────────────────────
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

  // ── Ambient idle banter, running in the background ──────────────────────
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      // Skip while the tab is hidden (no point talking to no one) or right
      // after a real Core event.
      if (typeof document !== 'undefined' && document.hidden) return
      if (Date.now() - lastLiveRef.current < AMBIENT_QUIET_MS) return
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
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <CoresStatusContext.Provider value={{ status, loading, lines }}>
      {children}
    </CoresStatusContext.Provider>
  )
}

export const useCoresStatus = (): CoresStatusContextType => {
  const ctx = useContext(CoresStatusContext)
  if (ctx === undefined) {
    return { status: DORMANT, loading: false, lines: [] }
  }
  return ctx
}
