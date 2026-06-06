import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Spectator cheer bar — the active non-fantasy income path. While you watch a
// LIVE game (modal open, tab visible), it fills locally from the play/score
// updates the season WebSocket already delivers (no polling) and banks the
// witnessed fill to the server, which credits only what actually happened in
// the game. Each completed segment pays Floobits; server-validated + weekly
// capped, so idling earns nothing. Mounted in the game modal for live games.
//
// Banking (POST /spectator/claim) happens on: a segment crossing (snappy
// payout), a slow keepalive, the tab going hidden, and on close/unmount
// (bank-on-close — so the in-flight partial isn't lost).

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const KEEPALIVE_MS = 30_000   // slow flush to bank trickle + keep presence alive

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

interface CheerBarProps {
  gameId: number
  isLive: boolean
  playCount?: number   // live play count (WS-fed via the game modal)
  score?: number       // combined live score (home + away)
  bigPlayCount?: number // count of big plays so far (WS-fed)
  compact?: boolean
}

const CheerBar: React.FC<CheerBarProps> = ({ gameId, isLive, playCount = 0, score = 0, bigPlayCount = 0, compact = false }) => {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<SpectatorStatus | null>(null)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')
  const [flash, setFlash] = useState(false)
  // Brief bar pulse when a play adds fill — 'big' (gold) for big plays/scores,
  // 'normal' (green) for an ordinary play, so it's clear the play moved the bar.
  const [pulse, setPulse] = useState<null | 'normal' | 'big'>(null)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Payout celebration: a gold sweep + floating "+N F" badge when a segment
  // completes. payoutKey re-keys the animated nodes so they re-fire each time.
  const [payoutKey, setPayoutKey] = useState(0)
  const [payoutAmount, setPayoutAmount] = useState(0)

  // Witnessed-since-last-bank accumulators + the baseline we diff against.
  const witPlays = useRef(0)
  const witPoints = useRef(0)
  const witBig = useRef(0)
  const basePlay = useRef<number | null>(null)
  const baseScore = useRef(0)
  const baseBig = useRef(0)
  const pendingFill = useRef(0)        // local optimistic fill since last bank
  const [, forceRender] = useState(0)  // nudge the bar as pendingFill grows
  const prevSegments = useRef<number | null>(null)  // null until first synced
  const flushing = useRef(false)

  const segmentSize = status?.segmentSize ?? 18

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Send the witnessed fill to the server and sync to its authoritative status.
  // The server caps our claim to the game's real progress, so a wrong/inflated
  // client count can't over-credit.
  const bank = useCallback(async () => {
    if (flushing.current) return
    const plays = witPlays.current
    const points = witPoints.current
    const bigs = witBig.current
    flushing.current = true
    try {
      const tok = await getToken()
      const res = await fetch(`${API_BASE}/spectator/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ gameId, witnessedPlays: plays, witnessedPoints: points, witnessedBigPlays: bigs }),
      })
      const json = await res.json()
      const s = (json?.data ?? null) as SpectatorStatus | null
      if (s) {
        // A segment (or more) just paid out → celebrate. Null-guard avoids a
        // spurious flash on the first sync; once synced, even the week's first
        // payout animates.
        if (prevSegments.current !== null && s.weeklySegments > prevSegments.current) {
          setPayoutAmount((s.weeklySegments - prevSegments.current) * (s.segmentPayout || 3))
          setPayoutKey(k => k + 1)
          setFlash(true); setTimeout(() => setFlash(false), 1200)
        }
        prevSegments.current = s.weeklySegments
        // Consume what we just banked; the server's barFill is now authoritative.
        witPlays.current = Math.max(0, witPlays.current - plays)
        witPoints.current = Math.max(0, witPoints.current - points)
        witBig.current = Math.max(0, witBig.current - bigs)
        pendingFill.current = 0
        setStatus(s)
      }
    } catch { /* keep last; retry on next trigger */ } finally {
      flushing.current = false
    }
  }, [getToken, gameId])

  // Latest bank() in a ref so the unmount cleanup always banks the final partial.
  const bankRef = useRef(bank)
  useEffect(() => { bankRef.current = bank }, [bank])

  // Initial sync: load the persisted bar and set the baseline at the current
  // play/score (no retroactive credit). Re-runs when the watched game changes.
  useEffect(() => {
    if (!isLive) return
    basePlay.current = null
    witPlays.current = 0
    witPoints.current = 0
    witBig.current = 0
    pendingFill.current = 0
    let cancelled = false
    ;(async () => {
      try {
        const tok = await getToken()
        const res = await fetch(`${API_BASE}/spectator/me`, { headers: { Authorization: `Bearer ${tok}` } })
        const json = await res.json()
        const s = (json?.data ?? null) as SpectatorStatus | null
        if (s && !cancelled) { prevSegments.current = s.weeklySegments; setStatus(s) }
      } catch { /* show optimistic only */ }
    })()
    return () => { cancelled = true }
  }, [gameId, isLive, getToken])

  // Witness plays/points off the WS-fed props. Only count while visible; when
  // hidden, advance the baseline without crediting (so closed-tab plays never
  // count). Bank immediately when the local bar crosses a segment.
  useEffect(() => {
    if (!isLive) return
    if (basePlay.current === null) { basePlay.current = playCount; baseScore.current = score; baseBig.current = bigPlayCount; return }
    const dPlays = playCount - basePlay.current
    const dScore = score - baseScore.current
    const dBig = bigPlayCount - baseBig.current
    basePlay.current = playCount
    baseScore.current = score
    baseBig.current = bigPlayCount
    if (dPlays < 0 || dScore < 0) return  // game reset / replay scrub — ignore
    if (!visible) return
    if (dPlays === 0 && dScore === 0 && dBig <= 0) return
    witPlays.current += dPlays
    witPoints.current += dScore
    if (dBig > 0) witBig.current += dBig
    pendingFill.current += dPlays + dScore * 0.6 + Math.max(0, dBig) * 4   // mirrors per-play/point/big-play fill for display
    // Pulse the bar so it's visible the play affected it (gold for big plays/scores).
    setPulse(dBig > 0 || dScore > 0 ? 'big' : 'normal')
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setPulse(null), 650)
    forceRender(n => n + 1)
    if ((status?.barFill ?? 0) + pendingFill.current >= segmentSize) bank()
  }, [playCount, score, bigPlayCount, visible, isLive, status, segmentSize, bank])

  // Slow keepalive: bank any pending fill (and refresh presence) periodically.
  useEffect(() => {
    if (!isLive || !visible) return
    const id = setInterval(() => { if (witPlays.current || witPoints.current || witBig.current) bank() }, KEEPALIVE_MS)
    return () => clearInterval(id)
  }, [isLive, visible, bank])

  // Bank when the tab goes hidden (covers most navigations/closes).
  useEffect(() => {
    if (!isLive) return
    if (!visible && (witPlays.current || witPoints.current || witBig.current)) bank()
  }, [visible, isLive, bank])

  // Bank-on-close: final flush of the in-flight partial when the modal unmounts.
  useEffect(() => () => { if (witPlays.current || witPoints.current || witBig.current) bankRef.current() }, [])
  useEffect(() => () => { if (pulseTimer.current) clearTimeout(pulseTimer.current) }, [])

  if (!isLive) return null

  const earning = visible && !status?.cappedOut
  const accent = status?.cappedOut ? C.muted : earning ? C.green : C.warn
  const displayFill = (status?.barFill ?? 0) + pendingFill.current
  const pct = Math.round(Math.min(1, displayFill / segmentSize) * 100)
  const weekly = status ? `${status.weeklyFloobits} / ${status.weeklyCap} F this week` : ''
  // Bar pulse styling: gold glow + gold fill for big plays/scores, accent glow
  // for an ordinary play.
  const pulseColor = pulse === 'big' ? C.gold : accent
  const fillColor = pulse === 'big' ? C.gold : accent
  const barGlow = pulse ? `0 0 8px ${pulseColor}` : 'none'

  // Payout gold sweep (clipped inside the bar) + floating "+N F" badge above it.
  // Both re-keyed by payoutKey so each payout restarts the CSS animation.
  const payoutSweep = payoutKey > 0 ? (
    <div key={payoutKey} className="cheer-payout-sweep" style={{
      position: 'absolute', inset: 0, borderRadius: 4, backgroundColor: C.gold, pointerEvents: 'none',
    }} />
  ) : null
  const payoutBadge = payoutKey > 0 ? (
    <span key={payoutKey} className="cheer-payout-badge" style={{
      position: 'absolute', left: '50%', bottom: '100%', marginBottom: 1,
      fontSize: 12, fontWeight: 800, color: C.gold, whiteSpace: 'nowrap', pointerEvents: 'none',
      textShadow: '0 1px 3px rgba(0,0,0,0.6)',
    }}>+{payoutAmount} F</span>
  ) : null

  // Compact single-line variant — fits inside the modal header row so it adds
  // no vertical height.
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: accent, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Spectating{status?.cappedOut ? ' · maxed' : earning ? '' : ' · paused'}
        </span>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 150, height: 9, borderRadius: 4, backgroundColor: '#1e293b', overflow: 'hidden', boxShadow: barGlow, transition: 'box-shadow 0.25s ease' }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: fillColor, transition: 'width 0.5s ease, background-color 0.25s ease' }} />
            {payoutSweep}
          </div>
          {payoutBadge}
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
      <div style={{ position: 'relative' }}>
        <div style={{ height: 8, borderRadius: 4, backgroundColor: '#1e293b', overflow: 'hidden', boxShadow: barGlow, transition: 'box-shadow 0.25s ease' }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 4,
            backgroundColor: fillColor, transition: 'width 0.5s ease, background-color 0.25s ease',
          }} />
          {payoutSweep}
        </div>
        {payoutBadge}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>{weekly}</span>
        {!visible && <span style={{ fontSize: 10, color: C.warn }}>return to the tab to earn</span>}
      </div>
    </div>
  )
}

export default CheerBar
