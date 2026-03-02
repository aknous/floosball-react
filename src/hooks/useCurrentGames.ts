import { useState, useEffect } from 'react'
import { useFloosball } from '@/contexts/FloosballContext'
import { api } from '@/services/api'
import type { GameStats } from '@/types/websocket'
export type { GameStats }

export interface CurrentGame {
  id: number
  homeTeam: {
    id: string
    name: string
    city: string
    abbr: string
    color: string
    secondaryColor: string
    tertiaryColor: string
    record: string
    elo?: number
  }
  awayTeam: {
    id: string
    name: string
    city: string
    abbr: string
    color: string
    secondaryColor: string
    tertiaryColor: string
    record: string
    elo?: number
  }
  quarterScores?: {
    home: {
      q1: number
      q2: number
      q3: number
      q4: number
    }
    away: {
      q1: number
      q2: number
      q3: number
      q4: number
    }
  }
  possession?: string  // Team ID that has possession
  down?: number
  yardsToFirstDown?: number
  yardLine?: string  // e.g., "BAL 25"
  yardsToEndzone?: number
  downText?: string
  status: 'Scheduled' | 'Active' | 'Final'
  homeScore: number
  awayScore: number
  homeTeamPoss?: boolean
  awayTeamPoss?: boolean
  quarter: number
  timeRemaining: string
  homeWinProbability: number
  awayWinProbability: number
  startTime?: number
  isOvertime?: boolean
  isHalftime?: boolean
  isUpsetAlert?: boolean
  isFeatured?: boolean
  gameStats?: GameStats
  plays?: any[]
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
