import { useState, useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import type { SeasonWebSocketEvent } from '@/types/websocket'

export interface SeasonState {
  currentWeek: number
  activeGames: string[]
  completedGames: string[]
  seasonComplete: boolean
}

export const useSeasonUpdates = () => {
  const { data: event, connected, error } = useWebSocket<SeasonWebSocketEvent>('/season')
  
  const [seasonState, setSeasonState] = useState<SeasonState>({
    currentWeek: 1,
    activeGames: [],
    completedGames: [],
    seasonComplete: false
  })

  useEffect(() => {
    if (!event) return

    switch (event.event) {
      case 'season_start':
        setSeasonState({
          currentWeek: 1,
          activeGames: [],
          completedGames: [],
          seasonComplete: false
        })
        break

      case 'week_start':
        setSeasonState(prev => ({
          ...prev,
          currentWeek: event.weekNumber,
          activeGames: [],
          completedGames: []
        }))
        break

      case 'game_start':
        setSeasonState(prev => ({
          ...prev,
          activeGames: [...prev.activeGames, event.gameId]
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
          completedGames: []
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
    }
  }, [event])

  return {
    seasonState,
    connected,
    error,
    lastEvent: event
  }
}
