import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type { SeasonRecapResponse } from '@/types/recap'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface UseSeasonRecapResult {
  recap: SeasonRecapResponse | null
  loading: boolean
  refetch: () => void
}

/** Fetches the current season's recap. Public endpoint; refetches on offseason
 *  WS events so the live draft/FA transactions fill in. */
export function useSeasonRecap(enabled: boolean = true): UseSeasonRecapResult {
  const [recap, setRecap] = useState<SeasonRecapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const hasLoaded = useRef(false)

  const fetchRecap = useCallback(async () => {
    // ⚠️ `enabled` exists because the FRONT PAGE mounts this hook on every load and only
    // reads it in the offseason. `/api/recap` is a consolidated payload — awards,
    // standings, leaders, every transaction, four fan leaderboards — so pulling it on
    // each visit to the landing page for eleven months of the year is pure waste.
    if (!enabled) { setLoading(false); return }
    try {
      if (!hasLoaded.current) setLoading(true)
      const resp = await fetch(`${API_BASE}/recap`)
      if (!resp.ok) { setRecap(null); hasLoaded.current = true; return }
      const json = await resp.json()
      const data = json?.data ?? json
      // Guard against error bodies (e.g. a 404 {detail:"Not Found"}) being
      // stored as a recap — a valid payload always carries `awards`.
      setRecap(data && typeof data === 'object' && 'awards' in data ? data : null)
      hasLoaded.current = true
    } catch (err) {
      console.error('Error fetching season recap:', err)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { fetchRecap() }, [fetchRecap])

  // Live: refresh as offseason moves + season transitions land.
  useEffect(() => {
    if (!event || !enabled) return
    const e = event.event
    if (
      e === 'offseason_pick' || e === 'offseason_cut' || e === 'offseason_team_complete' ||
      e === 'offseason_complete' || e === 'offseason_start' || e === 'season_end' ||
      e === 'season_start'
    ) {
      fetchRecap()
    }
  }, [event, enabled, fetchRecap])

  return { recap, loading, refetch: fetchRecap }
}
