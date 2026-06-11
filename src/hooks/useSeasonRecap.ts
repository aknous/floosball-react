import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type { SeasonRecapResponse } from '@/types/recap'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface UseSeasonRecapResult {
  recap: SeasonRecapResponse | null
  season: number | null          // the season being viewed (null = default/current)
  setSeason: (s: number | null) => void
  loading: boolean
  refetch: () => void
}

/** Fetches the consolidated Season Recap. Public endpoint; refetches on
 *  offseason WS events so the live draft/FA transactions fill in. */
export function useSeasonRecap(): UseSeasonRecapResult {
  const [recap, setRecap] = useState<SeasonRecapResponse | null>(null)
  const [season, setSeason] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const hasLoaded = useRef(false)

  const fetchRecap = useCallback(async () => {
    try {
      if (!hasLoaded.current) setLoading(true)
      const qs = season != null ? `?season=${season}` : ''
      const resp = await fetch(`${API_BASE}/recap${qs}`)
      const json = await resp.json()
      setRecap(json.data ?? json)
      hasLoaded.current = true
    } catch (err) {
      console.error('Error fetching season recap:', err)
    } finally {
      setLoading(false)
    }
  }, [season])

  useEffect(() => { fetchRecap() }, [fetchRecap])

  // Live: refresh as offseason moves + season transitions land.
  useEffect(() => {
    if (!event) return
    const e = event.event
    if (
      e === 'offseason_pick' || e === 'offseason_cut' || e === 'offseason_team_complete' ||
      e === 'offseason_complete' || e === 'offseason_start' || e === 'season_end' ||
      e === 'season_start'
    ) {
      fetchRecap()
    }
  }, [event, fetchRecap])

  return { recap, season, setSeason, loading, refetch: fetchRecap }
}
