import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PickEmDaySlot, PickEmGame } from '@/types/pickem'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const slotGameKey = (week: number, gameIndex: number) => `${week}:${gameIndex}`

/** How long the "saved" acknowledgement stays on screen. */
const SAVED_NOTICE_MS = 2000

export type PickSaveState = 'idle' | 'saving' | 'saved' | 'error' | 'closed'

interface UsePickEmDayResult {
  slots: PickEmDaySlot[]
  season: number
  day: number | null
  currentWeek: number
  loading: boolean
  submitting: boolean
  dirtyCount: number
  /** How the autosave is getting on, for the page's indicator. */
  saveState: PickSaveState
  /** Make a pick. It shows instantly and saves itself. */
  setPick: (week: number, gameIndex: number, teamId: number) => void
  /** Pick the higher-ELO (favorite) team in every still-pickable, unpicked game in a slot. */
  pickFavoritesForSlot: (week: number) => void
  /** Send every staged-but-unsent pick in one request. The autosave calls this; it stays
   *  exposed so a failed save can be retried by hand. */
  submitAll: () => Promise<{ saved: number; skipped: number }>
  refetch: () => void
}

export function usePickEmDay(): UsePickEmDayResult {
  const [slots, setSlots] = useState<PickEmDaySlot[]>([])
  const [season, setSeason] = useState(0)
  const [day, setDay] = useState<number | null>(null)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { event } = useSeasonWebSocket()
  const { getToken } = useAuth()
  const hasLoadedOnce = useRef(false)
  const fetchIdRef = useRef(0)
  /**
   * Picks staged locally but not yet confirmed by the server — "week:gameIndex" → teamId.
   *
   * ⚠️ IT HOLDS THE PICK, not just a flag, and that is what makes it survive a refetch.
   * As a bare Set of keys it could only mark which games were edited, so the pick itself
   * lived in `slots` — which `fetchDay` overwrites wholesale. With a save landing every
   * few hundred milliseconds and its own reconciling refetch behind it, a pick made while
   * an EARLIER refetch was still in flight was wiped by that response and then dropped by
   * the flush (no `userPick` left to send), while the indicator still said "Picks saved".
   * Reported exactly that way: the pick unselects itself a moment after it saves.
   */
  const stagedRef = useRef<Map<string, number>>(new Map())
  const [dirtyCount, setDirtyCount] = useState(0)
  const [saveState, setSaveState] = useState<PickSaveState>('idle')
  // A save is in flight, and whether a pick was made while it was.
  const inFlight = useRef(false)
  const savePending = useRef(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ⚠️ Indirection on purpose: the save needs `submitAll`, which is declared further down,
  // and a pick handler naming it directly would read it before initialization on every
  // render. The timer only ever calls what this ref points at.
  const flushRef = useRef<() => void>(() => {})
  // Same indirection, for the staged-pick overlay `fetchDay` applies (it is built from
  // `applyPick`, below).
  const applyStagedRef = useRef<(slots: PickEmDaySlot[]) => PickEmDaySlot[]>(s => s)

  const syncDirtyCount = useCallback(() => setDirtyCount(stagedRef.current.size), [])

  /**
   * Send the pick. Every pick lands here.
   *
   * ⚠️ IMMEDIATELY, not on a timer. A pick is only accepted until its game kicks off, and
   * a debounce spends that budget for nothing: measured against a running sim, a pick made
   * seconds before kickoff came back `{savedCount: 0, skipped: [{reason: "started"}]}` and
   * the reader watched their selection undo itself. Whatever delay is chosen is a window
   * in which a pick can be lost, so there is no good number — send it now. A pick made
   * while a save is in flight rides the next one rather than opening a second request.
   */
  const scheduleSave = useCallback(() => {
    if (inFlight.current) { savePending.current = true; return }
    flushRef.current()
  }, [])

  // Leaving the page with a pick still waiting behind an in-flight save must not cost it.
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (savePending.current) flushRef.current()
  }, [])

  const fetchDay = useCallback(async () => {
    const isInitial = !hasLoadedOnce.current
    const fetchId = ++fetchIdRef.current
    try {
      if (isInitial) setLoading(true)
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers['Authorization'] = `Bearer ${tok}`
      // ⚠️ `no-store` because this refetch exists to RECONCILE a save that just landed.
      // The endpoint used to answer it `public, max-age=10`, so the browser served the
      // reconcile out of its own cache from before the pick existed and the pick
      // unselected itself on screen. The header is fixed too; this is the half that does
      // not wait for a deploy, and it says at the call site why a cache is wrong here.
      const resp = await fetch(`${API_BASE}/pickem/day`, { headers, cache: 'no-store' })
      const json = await resp.json()
      if (fetchId !== fetchIdRef.current) return
      const data = json.data ?? json
      // ⚠️ The server is the source of truth for everything EXCEPT a pick that has not
      // been confirmed yet. Those are re-applied on top, because this response was
      // already on its way when they were made and cannot know about them. Anything the
      // save has confirmed is out of `stagedRef` by then, so it comes back from the
      // server like every other pick.
      setSlots(applyStagedRef.current(data.slots ?? []))
      setSeason(data.season ?? 0)
      setDay(data.day ?? null)
      setCurrentWeek(data.currentWeek ?? 0)
      syncDirtyCount()
      hasLoadedOnce.current = true
    } catch (err) {
      console.error('Error fetching pick-em day:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [getToken, syncDirtyCount])

  useEffect(() => { fetchDay() }, [fetchDay])

  // Refetch on week/game transitions so the day stays current — but NOT while
  // the user has staged-but-unsubmitted picks, or we'd wipe their draft. They
  // submit soon (which reconciles with the server); finals are skipped server-side.
  useEffect(() => {
    if (!event) return
    if (stagedRef.current.size > 0) return
    if (
      event.event === 'week_start' ||
      event.event === 'week_end' ||
      event.event === 'game_start' ||
      event.event === 'game_end' ||
      event.event === 'pickem_results'
    ) {
      fetchDay()
    }
  }, [event, fetchDay])

  const applyPick = useCallback((g: PickEmGame, teamId: number): PickEmGame => {
    const isHome = teamId === g.homeTeam.id
    const estUnderdog = g.underdogInfo
      ? (isHome ? g.underdogInfo.homeMultiplier : g.underdogInfo.awayMultiplier)
      : 1.0
    return {
      ...g,
      userPick: teamId,
      pointsMultiplier: g.currentMultiplier,
      underdogMultiplier: estUnderdog,
    }
  }, [])

  const setPick = useCallback((week: number, gameIndex: number, teamId: number) => {
    setSlots(prev => prev.map(slot => {
      if (slot.week !== week) return slot
      return {
        ...slot,
        games: slot.games.map(g => {
          if (g.gameIndex !== gameIndex) return g
          if (!g.pickable || g.result?.correct != null) return g
          return applyPick(g, teamId)
        }),
      }
    }))
    stagedRef.current.set(slotGameKey(week, gameIndex), teamId)
    syncDirtyCount()
    scheduleSave()
  }, [applyPick, syncDirtyCount, scheduleSave])

  /** Lay every not-yet-confirmed pick back over a fresh payload from the server. */
  const applyStaged = useCallback((incoming: PickEmDaySlot[]): PickEmDaySlot[] => {
    if (stagedRef.current.size === 0) return incoming
    return incoming.map(slot => ({
      ...slot,
      games: slot.games.map(g => {
        const teamId = stagedRef.current.get(slotGameKey(slot.week, g.gameIndex))
        if (teamId == null) return g
        // The server has since closed this game — it wins, and the pick stops being
        // staged, or it would be re-applied forever against a game nobody can pick.
        if (!g.pickable) {
          stagedRef.current.delete(slotGameKey(slot.week, g.gameIndex))
          return g
        }
        return applyPick(g, teamId)
      }),
    }))
  }, [applyPick])

  useEffect(() => { applyStagedRef.current = applyStaged }, [applyStaged])

  const pickFavoritesForSlot = useCallback((week: number) => {
    setSlots(prev => prev.map(slot => {
      if (slot.week !== week) return slot
      return {
        ...slot,
        games: slot.games.map(g => {
          if (!g.pickable || g.result?.correct != null) return g
          if (g.userPick != null) return g  // never overwrite an existing pick
          const favId = g.homeTeam.elo >= g.awayTeam.elo ? g.homeTeam.id : g.awayTeam.id
          stagedRef.current.set(slotGameKey(week, g.gameIndex), favId)
          return applyPick(g, favId)
        }),
      }
    }))
    syncDirtyCount()
    scheduleSave()
  }, [applyPick, syncDirtyCount, scheduleSave])

  const submitAll = useCallback(async (): Promise<{ saved: number; skipped: number }> => {
    if (stagedRef.current.size === 0) return { saved: 0, skipped: 0 }
    const tok = await getToken()
    if (!tok) return { saved: 0, skipped: 0 }

    // ⚠️ Sent STRAIGHT FROM the staged map, not looked back up in `slots`. The slate is
    // refetched constantly while a slate is live, and reading the pick back out of state
    // meant a refetch landing mid-flight could leave the pick with nothing to send.
    const sending = Array.from(stagedRef.current.entries())
    const picks = sending.map(([key, pickedTeamId]) => {
      const [week, gameIndex] = key.split(':').map(Number)
      return { week, gameIndex, pickedTeamId }
    })

    setSubmitting(true)
    try {
      const resp = await fetch(`${API_BASE}/pickem/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ picks }),
      })
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => null)
        throw new Error(errJson?.detail || 'Failed to submit picks')
      }
      const json = await resp.json()
      const data = json.data ?? json
      // Unstage exactly what was sent, and only where the reader has not since changed
      // their mind — a pick made DURING the request is still waiting to go.
      for (const [key, teamId] of sending) {
        if (stagedRef.current.get(key) === teamId) stagedRef.current.delete(key)
      }
      syncDirtyCount()
      const skipped = data.skippedCount ?? 0
      // ⚠️ A CLEAN SAVE DOES NOT REFETCH — this is how the old panel worked and why it
      // never showed this bug (`usePickEm.submitPick` patches its one game from the
      // response and only refetches on failure). The optimistic pick already carries what
      // the card shows, every pick is pre-game so the timing multiplier is a fixed 1.0,
      // and the next week/game event refetches anyway. Reconciling here means the pick a
      // reader just made is only as durable as a GET that races it.
      //
      // A SKIP is the one case worth a round trip: the server refused a pick the card is
      // still showing, so the card has to be corrected.
      if (skipped > 0) fetchDay()
      return { saved: data.savedCount ?? picks.length, skipped }
    } catch (err) {
      console.error('Error submitting day picks:', err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [getToken, fetchDay, syncDirtyCount])

  /**
   * Save whatever is staged, and say so.
   *
   * A failed save leaves the picks DIRTY on purpose — they stay on screen, the indicator
   * says they did not save, and the next pick retries the lot. Rolling the UI back to the
   * server's answer would take away a pick the reader watched themselves make.
   */
  const flush = useCallback(async () => {
    if (stagedRef.current.size === 0 || inFlight.current) return
    inFlight.current = true
    savePending.current = false
    setSaveState('saving')
    try {
      const { saved, skipped } = await submitAll()
      // ⚠️ SKIPPED IS NOT SAVED. The server takes a pick until its game kicks off and
      // answers 200 either way, so a request that saved nothing looked identical to one
      // that saved everything — the bar said "Picks saved" and the pick then vanished on
      // the reconciling refetch, with nothing on screen accounting for it.
      setSaveState(saved === 0 && skipped > 0 ? 'closed' : 'saved')
      // An acknowledgement, not a status — it should go away on its own.
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveState('idle'), SAVED_NOTICE_MS)
    } catch {
      setSaveState('error')  // stays up: this one needs the reader
    } finally {
      inFlight.current = false
      // A pick made while that request was out goes now.
      if (savePending.current) {
        savePending.current = false
        flushRef.current()
      }
    }
  }, [submitAll])

  useEffect(() => { flushRef.current = flush }, [flush])

  return {
    slots, season, day, currentWeek, loading, submitting, dirtyCount, saveState,
    setPick, pickFavoritesForSlot, submitAll, refetch: fetchDay,
  }
}
