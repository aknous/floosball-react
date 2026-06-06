import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Spectator cheer bar — the active non-fantasy income path. While you watch a
// LIVE game (tab visible, modal open), it heartbeats the server, which credits
// fill for plays that actually happened; each completed segment pays Floobits.
// Server-validated + weekly-capped, so idling earns nothing. Mounted in the game
// modal for live games only.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const HEARTBEAT_MS = 12_000

interface SpectatorStatus {
  barFill: number
  segmentSize: number
  segmentProgress: number   // 0..1 toward the next segment
  segmentPayout: number
  weeklyFloobits: number
  weeklyCap: number
  weeklySegments: number
  cappedOut: boolean
  present: boolean
}

const C = {
  panel: '#0f172a', border: '#1e293b', text: '#e2e8f0', body: '#cbd5e1',
  muted: '#94a3b8', green: '#22c55e', gold: '#fbbf24', warn: '#f59e0b',
}

const CheerBar: React.FC<{ gameId: number; isLive: boolean; compact?: boolean }> = ({ gameId, isLive, compact = false }) => {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<SpectatorStatus | null>(null)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')
  const prevSegments = useRef<number>(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const beat = useCallback(async () => {
    try {
      const tok = await getToken()
      const res = await fetch(`${API_BASE}/spectator/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ gameId }),
      })
      const json = await res.json()
      const s = (json?.data ?? null) as SpectatorStatus | null
      if (s) {
        // Flash when a new segment paid out.
        if (s.weeklySegments > prevSegments.current && prevSegments.current > 0) {
          setFlash(true); setTimeout(() => setFlash(false), 1200)
        }
        prevSegments.current = s.weeklySegments
        setStatus(s)
      }
    } catch { /* keep last */ }
  }, [getToken, gameId])

  // Heartbeat loop, only while live and the tab is visible.
  useEffect(() => {
    if (!isLive || !visible) return
    beat()
    const id = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [isLive, visible, beat])

  if (!isLive) return null

  const earning = visible && !status?.cappedOut
  const accent = status?.cappedOut ? C.muted : earning ? C.green : C.warn
  const pct = Math.round((status?.segmentProgress ?? 0) * 100)
  const weekly = status ? `${status.weeklyFloobits} / ${status.weeklyCap} F this week` : ''

  // Compact single-line variant — fits inside the modal header row so it adds
  // no vertical height.
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: accent, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Spectating{status?.cappedOut ? ' · maxed' : earning ? '' : ' · paused'}
        </span>
        <div style={{ width: 150, height: 9, borderRadius: 4, backgroundColor: '#1e293b', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: accent, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: flash ? 700 : 600, color: C.gold, whiteSpace: 'nowrap' }}>
          {flash ? `+${status?.segmentPayout} F!` : `${status?.weeklyFloobits ?? 0}/${status?.weeklyCap ?? 60} F`}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: C.panel, border: `1px solid ${flash ? C.gold : C.border}`,
      borderRadius: 8, padding: '8px 12px', transition: 'border-color 0.4s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: accent, textTransform: 'uppercase' }}>
          Spectating{status?.cappedOut ? ' · maxed' : earning ? '' : ' · paused'}
        </span>
        <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>
          {flash ? <span style={{ fontWeight: 700 }}>+{status?.segmentPayout} F!</span>
            : `next +${status?.segmentPayout ?? 3} F`}
        </span>
      </div>
      {/* segment progress bar */}
      <div style={{ height: 8, borderRadius: 4, backgroundColor: '#1e293b', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          backgroundColor: accent, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>{weekly}</span>
        {!visible && <span style={{ fontSize: 10, color: C.warn }}>return to the tab to earn</span>}
      </div>
    </div>
  )
}

export default CheerBar
