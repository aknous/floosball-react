import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'
import { api } from '@/services/api'
import type { SeasonWebSocketEvent } from '@/types/websocket'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface SeasonState {
  seasonNumber: number
  currentWeek: number
  currentWeekText: string
  activeGames: number[]
  completedGames: number[]
  seasonComplete: boolean
  nextGameStartTime: string | null
}

export const useSeasonUpdates = () => {
  const { data: event, connected, error } = useWebSocket<SeasonWebSocketEvent>('/season')
  const hasConnected = useRef(false)

  const [seasonState, setSeasonState] = useState<SeasonState>({
    seasonNumber: 1,
    currentWeek: 1,
    currentWeekText: 'Week 1',
    activeGames: [],
    completedGames: [],
    seasonComplete: false,
    nextGameStartTime: null,
  })

  const fetchSeasonData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/season`)
      const result = await response.json()
      if (result.success && result.data) {
        setSeasonState(prev => ({
          ...prev,
          seasonNumber: result.data.season_number || 1,
          currentWeek: result.data.current_week || 1,
          currentWeekText: result.data.current_week_text || 'Week 1',
          activeGames: result.data.active_games || [],
          completedGames: result.data.completed_games || [],
          nextGameStartTime: result.data.next_game_start_time || null,
          seasonComplete: result.data.is_complete || false,
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
          seasonComplete: false
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
        setSeasonState(prev => ({
          ...prev,
          activeGames: prev.activeGames.filter(id => id !== event.gameId),
          completedGames: [...prev.completedGames, event.gameId]
        }))
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
        break

      case 'offseason_start':
        setSeasonState(prev => ({
          ...prev,
          currentWeekText: 'Offseason',
          activeGames: [],
          completedGames: []
        }))
        break
    }
  }, [event])

  return {
    seasonState,
    connected,
    error,
    lastEvent: event
  }
}
