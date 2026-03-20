import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type {
  PickEmGame,
  PickEmWeekSummary,
  PickEmLeaderboardEntry,
} from '@/types/pickem'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface UsePickEmResult {
  picks: Map<number, number>            // gameIndex -> pickedTeamId
  results: Map<number, boolean | null>  // gameIndex -> correct (null if unresolved)
  games: PickEmGame[]
  weekSummary: PickEmWeekSummary | null
  season: number
  week: number
  weekText: string
  seasonLeaderboard: PickEmLeaderboardEntry[]
  weekLeaderboard: PickEmLeaderboardEntry[]
  loading: boolean
  submitPick: (gameIndex: number, teamId: number) => Promise<void>
  refetch: () => void
}

export function usePickEm(): UsePickEmResult {
  const [games, setGames] = useState<PickEmGame[]>([])
  const [weekSummary, setWeekSummary] = useState<PickEmWeekSummary | null>(null)
  const [season, setSeason] = useState(0)
  const [week, setWeek] = useState(0)
  const [weekText, setWeekText] = useState('')
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<PickEmLeaderboardEntry[]>([])
  const [weekLeaderboard, setWeekLeaderboard] = useState<PickEmLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const { getToken } = useAuth()
  const hasLoadedOnce = useRef(false)
  const fetchIdRef = useRef(0)
  const lastQuartersRef = useRef<Map<number, number>>(new Map())

  const fetchWeek = useCallback(async () => {
    const isInitial = !hasLoadedOnce.current
    const fetchId = ++fetchIdRef.current
    try {
      if (isInitial) setLoading(true)
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers['Authorization'] = `Bearer ${tok}`
      const resp = await fetch(`${API_BASE}/pickem/week`, { headers })
      const json = await resp.json()
      if (fetchId !== fetchIdRef.current) return
      const data = json.data ?? json
      setGames(data.games ?? [])
      setWeekSummary(data.weekSummary ?? null)
      setSeason(data.season ?? 0)
      setWeek(data.week ?? 0)
      setWeekText(data.weekText ?? '')
      hasLoadedOnce.current = true
    } catch (err) {
      console.error('Error fetching pick-em week:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [getToken])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/pickem/leaderboard`)
      const json = await resp.json()
      const data = json.data ?? json
      setSeasonLeaderboard(data.season?.entries ?? [])
      setWeekLeaderboard(data.week?.entries ?? [])
    } catch (err) {
      console.error('Error fetching pick-em leaderboard:', err)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchWeek()
    fetchLeaderboard()
  }, [fetchWeek, fetchLeaderboard])

  // WS-driven updates — refetch on key game lifecycle events
  useEffect(() => {
    if (!event) return

    if (
      event.event === 'week_start' ||
      event.event === 'week_end' ||
      event.event === 'game_start' ||
      event.event === 'game_end' ||
      event.event === 'pickem_results'
    ) {
      fetchWeek()
      fetchLeaderboard()
      return
    }

    // Refetch on quarter changes so multiplier badges stay current
    if (event.event === 'game_state') {
      const gameId = (event as any).gameId
      const quarter = (event as any).quarter
      if (gameId != null && quarter != null) {
        const prev = lastQuartersRef.current.get(gameId)
        if (prev !== quarter) {
          lastQuartersRef.current.set(gameId, quarter)
          fetchWeek()
        }
      }
    }
  }, [event, fetchWeek, fetchLeaderboard])

  const submitPick = useCallback(async (gameIndex: number, teamId: number) => {
    const tok = await getToken()
    if (!tok) return

    // Optimistic update — set the pick and lock in current multiplier
    setGames(prev =>
      prev.map(g =>
        g.gameIndex === gameIndex
          ? { ...g, userPick: teamId, pointsMultiplier: g.currentMultiplier }
          : g,
      ),
    )

    try {
      const resp = await fetch(`${API_BASE}/pickem/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`,
        },
        body: JSON.stringify({ gameIndex, pickedTeamId: teamId }),
      })
      if (!resp.ok) {
        // Revert optimistic update
        fetchWeek()
        const errJson = await resp.json().catch(() => null)
        throw new Error(errJson?.detail || 'Failed to submit pick')
      }
      // Update with actual multiplier from server
      const json = await resp.json()
      const pickData = (json.data ?? json).pick
      if (pickData) {
        setGames(prev =>
          prev.map(g =>
            g.gameIndex === gameIndex
              ? { ...g, pointsMultiplier: pickData.pointsMultiplier }
              : g,
          ),
        )
      }
    } catch (err) {
      console.error('Error submitting pick:', err)
      fetchWeek()
      throw err
    }
  }, [getToken, fetchWeek])

  // Derive picks + results maps from games
  const picks = new Map<number, number>()
  const results = new Map<number, boolean | null>()
  for (const g of games) {
    if (g.userPick != null) picks.set(g.gameIndex, g.userPick)
    if (g.result?.correct != null) {
      results.set(g.gameIndex, g.result.correct)
    } else {
      results.set(g.gameIndex, null)
    }
  }

  return {
    picks,
    results,
    games,
    weekSummary,
    season,
    week,
    weekText,
    seasonLeaderboard,
    weekLeaderboard,
    loading,
    submitPick,
    refetch: fetchWeek,
  }
}
