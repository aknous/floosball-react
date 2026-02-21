import { useState, useEffect } from 'react'
import { useFloosball } from '@/contexts/FloosballContext'
import { api } from '@/services/api'

export interface CurrentGame {
  id: string
  homeTeam: {
    id: string
    name: string
    city: string
    abbr: string
    color: string
    record: string
  }
  awayTeam: {
    id: string
    name: string
    city: string
    abbr: string
    color: string
    record: string
  }
  status: 'Scheduled' | 'Active' | 'Final'
  homeScore: number
  awayScore: number
  quarter: number
  timeRemaining: string
  homeWinProbability: number
  awayWinProbability: number
  startTime?: number
}

export const useCurrentGames = () => {
  const [games, setGames] = useState<CurrentGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { seasonState } = useFloosball()

  const fetchGames = async () => {
    try {
      setLoading(true)
      const response = await api.games.getCurrentGames()
      setGames(response)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch games'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()

    // Refetch when games start/end via WebSocket events
    const interval = setInterval(fetchGames, 60000) // Backup polling every 60s
    return () => clearInterval(interval)
  }, [seasonState.currentWeek])

  // Refetch when new games are detected
  useEffect(() => {
    if (seasonState.activeGames.length > 0) {
      fetchGames()
    }
  }, [seasonState.activeGames.length])

  return { games, loading, error, refetch: fetchGames }
}
