import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { GameStats, GameResult } from '@/types/api'

/**
 * Custom hook for fetching game statistics
 * @param gameId - The ID of the game
 */
export const useGameStats = (gameId: string | null) => {
  const [game, setGame] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!gameId) {
      setLoading(false)
      return
    }

    const fetchGame = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.games.getStats(gameId)
        setGame(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch game stats'))
        console.error('Error fetching game stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGame()
  }, [gameId])

  return { game, loading, error }
}

/**
 * Custom hook for fetching game results by week
 * @param week - The week number
 */
export const useWeekResults = (week: number) => {
  const [results, setResults] = useState<GameResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.games.getResultsByWeek(week)
        setResults(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch week results'))
        console.error('Error fetching week results:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [week])

  return { results, loading, error }
}

/**
 * Custom hook for fetching currently live games
 * Note: This will be replaced by WebSocket in Phase 2
 */
export const useCurrentGames = () => {
  const [games, setGames] = useState<GameStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchCurrentGames = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.games.getCurrentGames()
        setGames(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch current games'))
        console.error('Error fetching current games:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentGames()
    
    // TODO: Replace with WebSocket in Phase 2
    // Temporary polling until WebSocket is implemented
    const interval = setInterval(fetchCurrentGames, 10000)

    return () => clearInterval(interval)
  }, [])

  return { games, loading, error }
}
