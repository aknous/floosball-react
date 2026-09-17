import { useState, useEffect } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Trades settled in the current week, for the nav badge.
 *
 * ⚠️ ITS OWN ENDPOINT, NOT `/api/transactions`. The nav renders on every page and that
 * payload builds the draft order, the walk-year list and the whole trading block, pricing
 * every listing in the league to do it. A number in the sidebar must not cost that.
 *
 * ⚠️ THE CURRENT WEEK, NOT THE SEASON. A season total only grows, so late on it reads "31"
 * and means nothing anybody can act on. Scoped to the week it answers "did something just
 * happen", and empties itself at the rollover with no read-state to track.
 */
export function useRecentTrades(pollMs = 120000): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let live = true
    const read = () => {
      fetch(`${API_BASE}/transactions/recent`)
        .then(r => (r.ok ? r.json() : null))
        .then(j => { if (live && j) setCount(j.data?.trades ?? 0) })
        .catch(() => { /* the badge simply does not appear */ })
    }
    read()
    const id = setInterval(read, pollMs)
    return () => { live = false; clearInterval(id) }
  }, [pollMs])

  return count
}
