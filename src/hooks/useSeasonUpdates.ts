import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type { SeasonWebSocketEvent } from '@/types/websocket'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export type OffseasonPhase =
  | 'post_bowl'
  | 'frontoffice'
  | 'rookie_draft'
  | 'pre_fa'
  | 'fa_draft'
  | 'training'

export interface SeasonState {
  seasonNumber: number
  currentWeek: number
  currentWeekText: string
  activeGames: number[]
  completedGames: number[]
  seasonComplete: boolean
  regularSeasonOver: boolean
  nextGameStartTime: string | null
  nextSeasonStartTime: string | null
  offseasonPhase: OffseasonPhase | null
  offseasonPhaseTargetTime: string | null
}

export const useSeasonUpdates = () => {
  const { event, connected, error } = useSeasonWebSocket()
  const hasConnected = useRef(false)

  const [seasonState, setSeasonState] = useState<SeasonState>({
    seasonNumber: 0,
    currentWeek: 0,
    currentWeekText: '',
    activeGames: [],
    completedGames: [],
    seasonComplete: false,
    regularSeasonOver: false,
    nextGameStartTime: null,
    nextSeasonStartTime: null,
    offseasonPhase: null,
    offseasonPhaseTargetTime: null,
  })

  const fetchSeasonData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/season`)
      const result = await response.json()
      if (result.success && result.data) {
        setSeasonState(prev => ({
          ...prev,
          seasonNumber: result.data.season_number ?? 0,
          currentWeek: result.data.current_week ?? 0,
          currentWeekText: result.data.current_week_text ?? '',
          activeGames: result.data.active_games || [],
          completedGames: result.data.completed_games || [],
          nextGameStartTime: result.data.next_game_start_time || null,
          nextSeasonStartTime: result.data.next_season_start_time || null,
          offseasonPhase: result.data.offseason_phase || null,
          offseasonPhaseTargetTime: result.data.offseason_phase_target_time || null,
          seasonComplete: result.data.is_complete || false,
          regularSeasonOver: result.data.regular_season_over || false,
        }))
      }
    } catch (err) {
      console.error('Failed to fetch season data:', err)
    }
  }, [])

  // Fetch on mount
  useEffect(() => { fetchSeasonData() }, [fetchSeasonData])

  // Re-fetch when WebSocket reconnects (covers missed events during tab background)
  useEffect(() => {
    if (connected) {
      if (hasConnected.current) {
        // This is a reconnect — re-sync state from API
        fetchSeasonData()
      }
      hasConnected.current = true
    }
  }, [connected, fetchSeasonData])

  useEffect(() => {
    if (!event) return

    switch (event.event) {
      case 'season_start':
        setSeasonState(prev => ({
          ...prev,
          seasonNumber: event.seasonNumber || prev.seasonNumber,
          currentWeek: 1,
          currentWeekText: 'Week 1',
          activeGames: [],
          completedGames: [],
          seasonComplete: false,
          regularSeasonOver: false,
        }))
        break

      case 'week_start':
        setSeasonState(prev => ({
          ...prev,
          currentWeek: event.weekNumber,
          currentWeekText: (event as any).weekText ?? `Week ${event.weekNumber}`,
          activeGames: [],
          completedGames: [],
          nextGameStartTime: (event as any).nextGameStartTime || null,
        }))
        break

      case 'game_start':
        setSeasonState(prev => ({
          ...prev,
          activeGames: [...prev.activeGames, event.gameId],
          nextGameStartTime: null,
        }))
        break

      case 'game_end':
        setSeasonState(prev => {
          const remaining = prev.activeGames.filter(id => id !== event.gameId)
          if (remaining.length === 0) {
            // All games done — re-fetch to get nextGameStartTime and updated state
            fetchSeasonData()
          }
          return {
            ...prev,
            activeGames: remaining,
            completedGames: [...prev.completedGames, event.gameId]
          }
        })
        break

      case 'week_end':
        setSeasonState(prev => ({
          ...prev,
          activeGames: [],
          completedGames: [],
          nextGameStartTime: (event as any).nextGameStartTime || null,
        }))
        break

      case 'season_end':
        setSeasonState(prev => ({
          ...prev,
          seasonComplete: true,
          activeGames: [],
          completedGames: []
        }))
        // Re-fetch to get nextSeasonStartTime and final champion data
        fetchSeasonData()
        break

      case 'regular_season_complete':
        setSeasonState(prev => ({
          ...prev,
          regularSeasonOver: true,
        }))
        break

      case 'offseason_start':
        // Backend just entered the front-office phase. Re-fetch so we get
        // the new offseason_phase + target_time without waiting on the next
        // poll. The 30s navbar countdown tick is too slow for the user's
        // first paint after the bowl ends.
        setSeasonState(prev => ({
          ...prev,
          currentWeekText: 'Offseason',
          activeGames: [],
          completedGames: [],
        }))
        fetchSeasonData()
        break

      case 'offseason_phase_change' as any: {
        // Live phase transition — backend fires this every time the offseason
        // flow moves between post_bowl / frontoffice / rookie_draft / pre_fa /
        // fa_draft / training. Pull the phase + target straight from the event
        // so countdowns flip without waiting for the next /api/season poll.
        const ev = event as any
        const phase = ev.phase ?? null
        const targetTime = ev.targetTime ?? null
        setSeasonState(prev => ({
          ...prev,
          offseasonPhase: phase,
          offseasonPhaseTargetTime: targetTime,
        }))
        break
      }

      // Fallbacks: if offseason_phase_change is dropped (e.g., coalesced by
      // React batching when bursts of events arrive at once), these
      // pre-existing draft-start / window-close events still drive the phase
      // forward so the navbar countdown doesn't stay stuck on "starting soon".
      case 'rookie_draft_start' as any:
        setSeasonState(prev => ({
          ...prev,
          offseasonPhase: 'rookie_draft' as OffseasonPhase,
          offseasonPhaseTargetTime: null,
        }))
        break

      case 'rookie_draft_complete' as any:
        // Pre-FA wait kicks in next — re-fetch to pick up the new target time
        fetchSeasonData()
        break

      case 'gm_fa_window_close' as any:
        // Window close fires right when the FA draft starts.
        setSeasonState(prev => ({
          ...prev,
          offseasonPhase: 'fa_draft' as OffseasonPhase,
          offseasonPhaseTargetTime: null,
        }))
        break

      case 'offseason_complete' as any:
        setSeasonState(prev => ({
          ...prev,
          offseasonPhase: 'training' as OffseasonPhase,
          offseasonPhaseTargetTime: null,
        }))
        break
    }
  }, [event, fetchSeasonData])

  return {
    seasonState,
    connected,
    error,
    lastEvent: event
  }
}
