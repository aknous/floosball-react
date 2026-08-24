import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Supporter dividends waiting to be claimed, and the claim itself.
 *
 * ⚠️ ONE FETCH, SHARED. This was written out longhand in `Sidebar` (for its badge) and
 * again in `FrontOffice/SupporterCard` (for the card), and a third copy was about to go
 * into the nav and the front page. They have to agree — a nav dot that says there is
 * something to collect while the panel says there is not is worse than either surface
 * being wrong on its own.
 *
 * ⚠️ `supporter:claimed` is the cross-surface signal, and it is BOTH listened for and
 * dispatched here: claiming on the front page has to clear the nav's dot immediately,
 * and `SupporterCard` claiming on the Front Office page has to do the same. Polling
 * alone would leave a stale dot for up to the interval.
 */
export function useSupporterDividend() {
  const { user, getToken } = useAuth()
  const [unclaimed, setUnclaimed] = useState(0)
  const [claiming, setClaiming] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setUnclaimed(0); return }
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/supporter/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const json = await res.json()
      setUnclaimed((json?.data?.unclaimed ?? 0) as number)
    } catch {
      /* keep the last known figure rather than flashing zero on a blip */
    }
  }, [user, getToken])

  useEffect(() => {
    load()
    // Slow poll: the dividend accrues at week end, so this only has to catch a rollover
    // the user sat through.
    const id = setInterval(load, 180_000)
    window.addEventListener('supporter:claimed', load)
    return () => {
      clearInterval(id)
      window.removeEventListener('supporter:claimed', load)
    }
  }, [load])

  const claim = useCallback(async () => {
    if (unclaimed <= 0 || claiming) return
    setClaiming(true)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API_BASE}/supporter/claim`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}` },
      })
      await load()
      window.dispatchEvent(new Event('supporter:claimed'))
    } catch {
      /* leave the figure alone; the next poll corrects it */
    } finally {
      setClaiming(false)
    }
  }, [unclaimed, claiming, getToken, load])

  return { unclaimed, claim, claiming, reload: load }
}

export default useSupporterDividend
