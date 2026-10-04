import React, { useState, useCallback, useEffect } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface StartMoment { firstGameDay: string; opensAt: string; firstKickoff: string }
interface SeasonStartStatus {
  phase: 'season' | 'pending' | 'offseason' | 'waiting'
  timingMode: string | null
  normal: StartMoment
  effective: StartMoment
  early: boolean
  override: string | null
}

// A YYYY-MM-DD game day as "Monday, Oct 5". Read at UTC midnight so the browser's own
// timezone cannot move it to the day before.
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })

const todayEt = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

const PHASE_TEXT: Record<SeasonStartStatus['phase'], string> = {
  season: "This season's games have started. An early start can be set once it ends.",
  pending: 'The season is set up and waiting for its first games. Moving it re-times the schedule right away.',
  offseason: 'The offseason is still running. An early start takes effect once it finishes.',
  waiting: 'The offseason is done and the league is waiting for the next season.',
}

const SeasonStartControl: React.FC<{ buildHeaders: () => Promise<Record<string, string>> }> = ({ buildHeaders }) => {
  const [status, setStatus] = useState<SeasonStartStatus | null>(null)
  const [day, setDay] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const call = useCallback(async (method: 'GET' | 'POST' | 'DELETE', body?: object) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/season-start`, {
        method, headers: await buildHeaders(), body: body ? JSON.stringify(body) : undefined,
      })
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

  const inSeason = status?.phase === 'season'
  const scheduled = !status?.timingMode || ['scheduled', 'catchup', 'fast-catchup'].includes(status.timingMode)

  return (
    <div style={{ padding: '14px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#0f172a', marginBottom: '20px', maxWidth: '560px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Next Season Start</div>
      {status && (
        <>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>{PHASE_TEXT[status.phase]}</div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '4px' }}>
            First game day: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{dayLabel(status.effective.firstGameDay)}</span>
            {status.early && <span style={{ color: '#fbbf24' }}> (early start)</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
            The league opens the evening before, and games run four days from the first game day.
            {status.early && <> The usual start is {dayLabel(status.normal.firstGameDay)}.</>}
          </div>
          {!scheduled && (
            <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '12px' }}>
              The sim is running in {status.timingMode} mode, which does not wait for a start date, so this has no effect until it runs scheduled.
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={day}
              min={todayEt()}
              max={status.normal.firstGameDay}
              onChange={e => { setDay(e.target.value); setConfirming(false) }}
              disabled={busy || inSeason}
              style={{ padding: '6px 8px', fontSize: '13px', color: '#e2e8f0', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontFamily: 'inherit', colorScheme: 'dark' }}
            />
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy || inSeason || !day}
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#ffffff', backgroundColor: (busy || inSeason || !day) ? '#334155' : '#3b82f6', border: 'none', borderRadius: '4px', cursor: (busy || inSeason || !day) ? 'default' : 'pointer', fontFamily: 'inherit' }}
              >
                Start early
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => call('POST', { firstGameDay: day })}
                  disabled={busy}
                  style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#ffffff', backgroundColor: '#d97706', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Confirm: first games {dayLabel(day)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  style={{ padding: '6px 10px', fontSize: '12px', color: '#cbd5e1', backgroundColor: 'transparent', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Back
                </button>
              </>
            )}
            {status.early && !confirming && (
              <button
                type="button"
                onClick={() => call('DELETE')}
                disabled={busy}
                style={{ padding: '6px 10px', fontSize: '12px', color: '#cbd5e1', backgroundColor: 'transparent', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel early start
              </button>
            )}
          </div>
        </>
      )}
      {error && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px' }}>{error}</div>}
    </div>
  )
}

export default SeasonStartControl
