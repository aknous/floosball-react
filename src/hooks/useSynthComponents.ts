import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface SynthComponentBalance {
  held: number
  holdCap: number
  remainingToday: number
  price: number
  canBuy: boolean
  blockedBy: string | null
}

/**
 * How many Synth Components the user is holding.
 *
 * ⚠️ A HOOK BECAUSE THREE PLACES ALREADY WANTED IT — the shop offer, the transplant
 * modal's build button, and now the header chip. Two of them had grown their own copy of
 * the fetch, which is how the header came to have no idea the resource existed. Same rule
 * `useActiveEndowment` records for the same reason.
 *
 * ⚠️ THE ENDPOINT RETURNS A RAW DICT, NOT THE `{success, data}` ENVELOPE. 11 of the 34
 * shop/card/pack routes do. Reading `j.data` alone yields undefined and the balance
 * silently reads as nothing — which is exactly how the shop's Components section failed to
 * render the first time.
 *
 * ⚠️ GATED ON THE USER AND RE-RUN WHEN THAT FLIPS. `getToken()` returns null until Clerk
 * has resolved the session and `getToken` is stable, so a mount-only effect bails once and
 * is never retried.
 */
export function useSynthComponents(): SynthComponentBalance | null {
  const { user, getToken } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()
  const [balance, setBalance] = useState<SynthComponentBalance | null>(null)
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const hasUser = !!user

  const fetchBalance = useCallback(async () => {
    try {
      const tok = await getTokenRef.current()
      if (!tok) { setBalance(null); return }
      const res = await fetch(`${API_BASE}/shop/synth-components`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const j = await res.json()
      const d = (j?.data ?? j) as SynthComponentBalance | null
      setBalance(d && typeof d.held === 'number' ? d : null)
    } catch { /* silent — a header chip is not worth an error state */ }
  }, [])

  useEffect(() => {
    if (!hasUser) { setBalance(null); return }
    fetchBalance()
  }, [hasUser, fetchBalance])

  // Components are season-scoped, and the daily allowance turns over on the week rollover.
  useEffect(() => {
    const ev = (wsEvent as { event?: string } | null)?.event
    if (ev && ['week_start', 'week_end', 'season_end', 'season_start'].includes(ev)) {
      fetchBalance()
    }
  }, [wsEvent, fetchBalance])

  // ⚠️ BOUGHT **AND** SPENT. A component leaves the balance through the transplant, not
  // through the shop, so listening only for a purchase would show a stale count until the
  // next week rolled over — the direction a user notices most, since they just spent it.
  useEffect(() => {
    const handler = () => fetchBalance()
    window.addEventListener('floosball:shop-purchase', handler)
    window.addEventListener('floosball:component-spent', handler)
    return () => {
      window.removeEventListener('floosball:shop-purchase', handler)
      window.removeEventListener('floosball:component-spent', handler)
    }
  }, [fetchBalance])

  return balance
}
