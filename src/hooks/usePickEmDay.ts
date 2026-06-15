import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PickEmDaySlot, PickEmGame } from '@/types/pickem'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const slotGameKey = (week: number, gameIndex: number) => `${week}:${gameIndex}`

interface UsePickEmDayResult {
  slots: PickEmDaySlot[]
  season: number
  day: number | null
  currentWeek: number
  loading: boolean
  submitting: boolean
  dirtyCount: number
  /** Stage a pick locally (not yet submitted). */
  setPick: (week: number, gameIndex: number, teamId: number) => void
  /** Stage the higher-ELO (favorite) team for every still-pickable, unpicked game in a slot. */
  pickFavoritesForSlot: (week: number) => void
  /** Submit every staged-but-unsent pick in one request. */
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
  // Picks staged locally but not yet POSTed — key "week:gameIndex".
  const dirtyRef = useRef<Set<string>>(new Set())
  const [dirtyCount, setDirtyCount] = useState(0)

  const syncDirtyCount = useCallback(() => setDirtyCount(dirtyRef.current.size), [])

  const fetchDay = useCallback(async () => {
    const isInitial = !hasLoadedOnce.current
    const fetchId = ++fetchIdRef.current
    try {
      if (isInitial) setLoading(true)
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers['Authorization'] = `Bearer ${tok}`
      const resp = await fetch(`${API_BASE}/pickem/day`, { headers })
      const json = await resp.json()
      if (fetchId !== fetchIdRef.current) return
      const data = json.data ?? json
      setSlots(data.slots ?? [])
      setSeason(data.season ?? 0)
      setDay(data.day ?? null)
      setCurrentWeek(data.currentWeek ?? 0)
      // Server is now the source of truth — drop any stale local edits.
      dirtyRef.current = new Set()
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
    if (dirtyRef.current.size > 0) return
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
    dirtyRef.current.add(slotGameKey(week, gameIndex))
    syncDirtyCount()
  }, [applyPick, syncDirtyCount])

  const pickFavoritesForSlot = useCallback((week: number) => {
    setSlots(prev => prev.map(slot => {
      if (slot.week !== week) return slot
      return {
        ...slot,
        games: slot.games.map(g => {
          if (!g.pickable || g.result?.correct != null) return g
          if (g.userPick != null) return g  // never overwrite an existing pick
          const favId = g.homeTeam.elo >= g.awayTeam.elo ? g.homeTeam.id : g.awayTeam.id
          dirtyRef.current.add(slotGameKey(week, g.gameIndex))
          return applyPick(g, favId)
        }),
      }
    }))
    syncDirtyCount()
  }, [applyPick, syncDirtyCount])

  const submitAll = useCallback(async (): Promise<{ saved: number; skipped: number }> => {
    if (dirtyRef.current.size === 0) return { saved: 0, skipped: 0 }
    const tok = await getToken()
    if (!tok) return { saved: 0, skipped: 0 }

    // Collect staged picks from current slot state.
    const picks: Array<{ week: number; gameIndex: number; pickedTeamId: number }> = []
    for (const slot of slots) {
      for (const g of slot.games) {
        if (dirtyRef.current.has(slotGameKey(slot.week, g.gameIndex)) && g.userPick != null) {
          picks.push({ week: slot.week, gameIndex: g.gameIndex, pickedTeamId: g.userPick })
        }
      }
    }
    if (picks.length === 0) return { saved: 0, skipped: 0 }

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
      dirtyRef.current = new Set()
      syncDirtyCount()
      // Reconcile with the server (locks in real multipliers + skipped picks).
      fetchDay()
      return { saved: data.savedCount ?? picks.length, skipped: data.skippedCount ?? 0 }
    } catch (err) {
      console.error('Error submitting day picks:', err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [getToken, slots, fetchDay, syncDirtyCount])

  return {
    slots, season, day, currentWeek, loading, submitting, dirtyCount,
    setPick, pickFavoritesForSlot, submitAll, refetch: fetchDay,
  }
}
