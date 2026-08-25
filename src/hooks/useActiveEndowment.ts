import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface ActiveEndowment {
  slug: string
  displayName?: string
  boostPercent?: number
  weeksRemaining?: number
  expiresAtWeek?: number
  expiring?: boolean
}

/**
 * The user's active Endowment (the `income_boost` powerup), or null.
 *
 * ⚠️ A HOOK BECAUSE THERE ARE TWO HEADERS. The indicator was built inline in the
 * original `Navbar`, and the redesigned shell header (`Shell/AppHeader`) — which is
 * what actually renders on every page now — simply did not carry it across, so an
 * active Endowment showed nothing. Navbar's own comment already warns about this
 * exact hazard for the account menu ("mounts the SAME account menu rather than
 * growing a second one that drifts from this"); this is the same rule applied to the
 * thing that got missed.
 *
 * ⚠️ GATED ON THE USER AND RE-RUN WHEN THAT FLIPS. Fetching on mount alone never
 * works here: `getToken()` returns null until Clerk has resolved the session, and
 * `getToken` is stable, so a mount-only effect bails once and is never retried.
 * Confirmed from the production API logs, which carried ZERO requests to this
 * endpoint while every other authenticated header call was being served.
 *
 * Failures are swallowed deliberately — a header badge is not worth surfacing an
 * error for — which is also why the bug above was invisible for so long.
 */
export function useActiveEndowment(): ActiveEndowment | null {
  const { user, getToken } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()
  const [endowment, setEndowment] = useState<ActiveEndowment | null>(null)
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const hasUser = !!user

  const fetchEndowment = useCallback(async () => {
    try {
      const tok = await getTokenRef.current()
      if (!tok) { setEndowment(null); return }
      const res = await fetch(`${API_BASE}/shop/powerups/active`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const j = await res.json()
      const active: ActiveEndowment[] = j?.data?.active ?? []
      setEndowment(active.find(p => p.slug === 'income_boost') ?? null)
    } catch { /* silent — a header badge is not worth an error state */ }
  }, [])

  useEffect(() => {
    if (!hasUser) { setEndowment(null); return }
    fetchEndowment()
  }, [hasUser, fetchEndowment])

  // Powerups expire on a week/season rollover, so re-read on those.
  useEffect(() => {
    const ev = (wsEvent as { event?: string } | null)?.event
    if (ev && ['week_start', 'week_end', 'season_end', 'season_start'].includes(ev)) {
      fetchEndowment()
    }
  }, [wsEvent, fetchEndowment])

  // And immediately when one is bought, so the badge appears without a reload.
  useEffect(() => {
    const handler = () => fetchEndowment()
    window.addEventListener('floosball:shop-purchase', handler)
    return () => window.removeEventListener('floosball:shop-purchase', handler)
  }, [fetchEndowment])

  return endowment
}
