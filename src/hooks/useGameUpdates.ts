import { useState, useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import type { GameWebSocketEvent, PlayCompleteEvent } from '@/types/websocket'

export interface GameState {
  gameId: string
  homeScore: number
  awayScore: number
  homeWinProbability: number
  awayWinProbability: number
  quarter: number
  timeRemaining: string
  lastPlay: PlayCompleteEvent['play'] | null
  plays: PlayCompleteEvent['play'][]
  isComplete: boolean
}

export const useGameUpdates = (gameId: string) => {
  const { data: event, connected, error } = useWebSocket<GameWebSocketEvent>(`/game/${gameId}`)
  
  const [gameState, setGameState] = useState<GameState>({
    gameId,
    homeScore: 0,
    awayScore: 0,
    homeWinProbability: 50,
    awayWinProbability: 50,
    quarter: 1,
    timeRemaining: '15:00',
    lastPlay: null,
    plays: [],
    isComplete: false
  })

  useEffect(() => {
    if (!event) return

    switch (event.event) {
      case 'game_start':
        setGameState(prev => ({
          ...prev,
          isComplete: false,
          plays: []
        }))
        break

      case 'play_complete':
        setGameState(prev => ({
          ...prev,
          homeScore: event.homeScore || prev.homeScore,
          awayScore: event.awayScore || prev.awayScore,
          quarter: event.play.quarter || prev.quarter,
          timeRemaining: event.play.timeRemaining || prev.timeRemaining,
          lastPlay: event.play,
          plays: [event.play, ...prev.plays]
        }))
        break

      case 'score_update':
        setGameState(prev => ({
          ...prev,
          homeScore: event.homeScore,
          awayScore: event.awayScore
        }))
        break

      case 'win_probability_update':
        setGameState(prev => ({
          ...prev,
          homeWinProbability: event.homeWinProbability,
          awayWinProbability: event.awayWinProbability
        }))
        break

      case 'game_end':
        setGameState(prev => ({
          ...prev,
          homeScore: event.finalScore.home,
          awayScore: event.finalScore.away,
          isComplete: true
        }))
        break
    }
  }, [event])

  return {
    gameState,
    connected,
    error,
    lastEvent: event
  }
}
