import { useState, useEffect } from 'react'
import type { CurrentGame } from './useCurrentGames'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface UseGameDataResult {
  game: CurrentGame | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useGameData = (gameId: number | null, pollingInterval?: number): UseGameDataResult => {
  const [game, setGame] = useState<CurrentGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchGame = async () => {
    if (!gameId) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/games/${gameId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch game: ${response.statusText}`)
      }
      const data = await response.json()
      console.log('Game data from API:', data)
      console.log('Possession:', data.possession, 'Down:', data.down, 'DownText:', data.downText)
      setGame(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch game data:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGame()

    // Set up polling if interval provided
    if (pollingInterval && pollingInterval > 0) {
      const interval = setInterval(fetchGame, pollingInterval)
      return () => clearInterval(interval)
    }
  }, [gameId, pollingInterval])

  return { game, loading, error, refetch: fetchGame }
}
