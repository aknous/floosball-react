import { useEffect, useState } from 'react'

/**
 * Time until the next slate kicks off.
 *
 * ⚠️ ONE implementation on purpose. This logic existed twice already — once in
 * `DashboardNew` returning a formatted string, once inside `FantasyPage`'s
 * LockCountdown returning raw seconds — so a third copy on the game board would
 * have made three places that could disagree about what "soon" looks like. Both
 * shapes are returned here so neither caller has to re-derive the other.
 *
 * `seconds` is null when there is nothing to count down to: the field is null
 * whenever games are already running (the sim only publishes a start time
 * between slates), and it stays null in the timing modes that have no wall
 * clock at all — `fast`, `turbo`, `sequential`. A caller must treat "no
 * countdown" as the normal case rather than an error.
 */
export interface NextGameCountdown {
  /** "1:04:12" past an hour, "4:12" under it. Empty string when there is nothing to show. */
  text: string
  seconds: number | null
}

export function useNextGameCountdown(nextGameStartTime: string | null | undefined): NextGameCountdown {
  const [state, setState] = useState<NextGameCountdown>({ text: '', seconds: null })

  useEffect(() => {
    if (!nextGameStartTime) {
      setState({ text: '', seconds: null })
      return
    }
    const target = new Date(nextGameStartTime).getTime()
    if (!Number.isFinite(target)) {
      setState({ text: '', seconds: null })
      return
    }

    const tick = () => {
      const remaining = Math.max(0, target - Date.now())
      if (remaining <= 0) {
        // Kickoff has passed but the state has not caught up yet. A frozen 0:00
        // reads as broken, so nothing is shown until the sim says otherwise.
        setState({ text: '', seconds: 0 })
        return
      }
      const seconds = Math.floor(remaining / 1000)
      const hrs = Math.floor(remaining / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setState({
        text: hrs > 0
          ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : `${mins}:${String(secs).padStart(2, '0')}`,
        seconds,
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [nextGameStartTime])

  return state
}

export default useNextGameCountdown
