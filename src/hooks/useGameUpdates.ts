import { useState, useEffect } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type { GameStateEvent } from '@/types/websocket'

type LastPlay = NonNullable<GameStateEvent['lastPlay']>

export interface GameState {
  gameId: number
  homeScore: number
  awayScore: number
  homeWinProbability: number
  awayWinProbability: number
  quarter: number
  timeRemaining: string
  lastPlay: LastPlay | null
  plays: LastPlay[]
  isComplete: boolean
  possession: string | null
  down: number | null
  distance: number | null
}

export const useGameUpdates = (
  gameId: number,
  initialHomeScore?: number,
  initialAwayScore?: number,
  initialQuarter?: number,
  initialTimeRemaining?: string,
  initialStatus?: 'Scheduled' | 'Active' | 'Final'
) => {
  const { event, connected, error } = useSeasonWebSocket()

  const [gameState, setGameState] = useState<GameState>({
    gameId,
    homeScore: initialHomeScore ?? 0,
    awayScore: initialAwayScore ?? 0,
    homeWinProbability: 50,
    awayWinProbability: 50,
    quarter: initialQuarter ?? 1,
    timeRemaining: initialTimeRemaining ?? '15:00',
    lastPlay: null,
    plays: [],
    isComplete: initialStatus === 'Final',
    possession: null,
    down: null,
    distance: null,
  })

  useEffect(() => {
    if (!event) return

    if (!('gameId' in event)) return
    if (Number(event.gameId) !== Number(gameId)) return

    switch (event.event) {
      case 'game_start':
        setGameState(prev => ({
          ...prev,
          isComplete: false,
          plays: []
        }))
        break

      case 'game_state':
        setGameState(prev => ({
          ...prev,
          homeScore: event.homeScore,
          awayScore: event.awayScore,
          homeWinProbability: event.homeWinProbability,
          awayWinProbability: event.awayWinProbability,
          quarter: event.quarter,
          timeRemaining: event.timeRemaining,
          possession: event.possession ?? prev.possession,
          down: event.down ?? prev.down,
          distance: event.distance ?? prev.distance,
          isComplete: event.status === 'Final',
          lastPlay: event.lastPlay ?? prev.lastPlay,
          plays: event.lastPlay ? [event.lastPlay, ...prev.plays] : prev.plays
        }))
        break

      case 'game_end':
        setGameState(prev => ({
          ...prev,
          homeScore: event.finalScore.home,
          awayScore: event.finalScore.away,
          homeWinProbability: event.homeWinProbability,
          awayWinProbability: event.awayWinProbability,
          quarter: 4,
          timeRemaining: '0:00',
          isComplete: true
        }))
        break
    }
  }, [event, gameId])

  return {
    gameState,
    connected,
    error,
    lastEvent: event
  }
}
