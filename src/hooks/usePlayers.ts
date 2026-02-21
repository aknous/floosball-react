import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { Player, PlayerFilters } from '@/types/api'

/**
 * Custom hook for fetching players
 * @param filters - Optional filters for players (position, team, rating, status)
 */
export const usePlayers = (filters?: PlayerFilters) => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.players.getAll(filters)
        setPlayers(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch players'))
        console.error('Error fetching players:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [filters?.position, filters?.team, filters?.minRating, filters?.maxRating, filters?.status])

  const refetch = () => {
    setLoading(true)
    setError(null)
    api.players
      .getAll(filters)
      .then(setPlayers)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch players')))
      .finally(() => setLoading(false))
  }

  return { players, loading, error, refetch }
}

/**
 * Custom hook for fetching a single player
 * @param playerId - The ID of the player to fetch
 */
export const usePlayer = (playerId: string | null) => {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!playerId) {
      setLoading(false)
      return
    }

    const fetchPlayer = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.players.getById(playerId)
        setPlayer(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch player'))
        console.error('Error fetching player:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [playerId])

  return { player, loading, error }
}

/**
 * Custom hook for fetching top players by position
 * @param position - The position to filter by
 * @param limit - Number of players to return (default: 10)
 */
export const useTopPlayers = (position: string, limit: number = 10) => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchTopPlayers = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.players.getTopByPosition(position, limit)
        setPlayers(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch top players'))
        console.error('Error fetching top players:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopPlayers()
  }, [position, limit])

  return { players, loading, error }
}
