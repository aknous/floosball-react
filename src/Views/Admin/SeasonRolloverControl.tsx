import React, { useState, useCallback, useEffect } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface RolloverStatus {
  phase: 'season' | 'offseason' | 'waiting'
  seasonNumber: number | null
  timingMode: string | null
  rolloverRequested: boolean
  usualRollover: string
}

const etTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  })

const buttonStyle = (enabled: boolean, color = '#3b82f6'): React.CSSProperties => ({
  padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#ffffff',
  backgroundColor: enabled ? color : '#334155', border: 'none', borderRadius: '4px',
  cursor: enabled ? 'pointer' : 'default', fontFamily: 'inherit',
})

const ghostStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: '12px', color: '#cbd5e1', backgroundColor: 'transparent',
  border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
}

const SeasonRolloverControl: React.FC<{ buildHeaders: () => Promise<Record<string, string>> }> = ({ buildHeaders }) => {
  const [status, setStatus] = useState<RolloverStatus | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const call = useCallback(async (method: 'GET' | 'POST' | 'DELETE') => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/season-rollover`, { method, headers: await buildHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setStatus(json)
      setConfirming(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [buildHeaders])

  useEffect(() => { call('GET') }, [call])

  // While a request is pending, refresh so the panel shows the rollover once it happens.
  useEffect(() => {
    if (!status?.rolloverRequested) return
    const id = setInterval(() => call('GET'), 15000)
    return () => clearInterval(id)
  }, [status?.rolloverRequested, call])

  const nextSeason = status?.seasonNumber != null ? status.seasonNumber + 1 : null

  let message = ''
  if (status?.phase === 'season') {
    message = `Season ${status.seasonNumber} has rolled over: cards are minted and the shop is open.`
  } else if (status?.rolloverRequested) {
    message = status.phase === 'offseason'
      ? `Season ${nextSeason} will roll over as soon as the offseason finishes.`
      : `Season ${nextSeason} is rolling over now. This takes about 30 seconds.`
  } else if (status?.phase === 'offseason') {
    message = 'The offseason is still running. Rolling over now queues it for the moment the offseason finishes.'
  } else if (status) {
    message = `The offseason is done. Season ${nextSeason} rolls over on its own ${etTime(status.usualRollover)}.`
  }

  const canRequest = !!status && status.phase !== 'season' && !status.rolloverRequested && !busy

  return (
    <div style={{ padding: '14px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#0f172a', marginBottom: '20px', maxWidth: '560px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Season Rollover</div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
        Rolling over creates the new season: cards mint, the shop sells packs again, and lineups and
        pick-em open for week 1. Games still start at their usual time.
      </div>
      {status && <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '12px' }}>{message}</div>}
      {status && status.timingMode && status.timingMode !== 'scheduled' && status.phase !== 'season' && (
        <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '12px' }}>
          The sim is running in {status.timingMode} mode, which does not wait between seasons.
        </div>
      )}
      {status && status.phase !== 'season' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {status.rolloverRequested ? (
            <button type="button" onClick={() => call('DELETE')} disabled={busy} style={ghostStyle}>Cancel</button>
          ) : !confirming ? (
            <button type="button" onClick={() => setConfirming(true)} disabled={!canRequest} style={buttonStyle(canRequest)}>
              Roll over now
            </button>
          ) : (
            <>
              <button type="button" onClick={() => call('POST')} disabled={busy} style={buttonStyle(!busy, '#d97706')}>
                Confirm: roll over to Season {nextSeason}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} style={ghostStyle}>Back</button>
            </>
          )}
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px' }}>{error}</div>}
    </div>
  )
}

export default SeasonRolloverControl
