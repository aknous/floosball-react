import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from './SeasonWebSocketContext'
import { api } from '@/services/api'
import type { CurrentGame } from '@/hooks/useCurrentGames'

interface GamesContextValue {
  games: Map<number, CurrentGame>
  loading: boolean
  error: string | null
  getGame: (gameId: number) => CurrentGame | undefined
  refetch: () => Promise<void>
  fetchGamePlays: (gameId: number) => Promise<void>
}

const GamesContext = createContext<GamesContextValue | undefined>(undefined)

export const GamesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Map<number, CurrentGame>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { event } = useSeasonWebSocket()
  const hasLoadedOnce = useRef(false)

  const fetchGames = async () => {
    const isInitial = !hasLoadedOnce.current
    try {
      if (isInitial) setLoading(true)
      const response = await api.games.getCurrentGames()
      setGames(prev => {
        const gamesMap = new Map<number, CurrentGame>()
        response.forEach(game => {
          const gameId = Number(game.id)
          const existing = prev.get(gameId)
          gamesMap.set(gameId, {
            ...existing,
            ...game,
            id: gameId,
            // Preserve plays and WP data accumulated via WebSocket
            plays: existing?.plays ?? (game as any).plays ?? [],
            homeWinProbability: existing?.homeWinProbability ?? (game as any).homeWinProbability,
            awayWinProbability: existing?.awayWinProbability ?? (game as any).awayWinProbability,
          })
        })
        return gamesMap
      })
      hasLoadedOnce.current = true
      setError(null)
    } catch (err) {
      console.error('Error fetching games:', err)
      setError('Failed to load games')
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchGames()
  }, [])

  // Update games from WebSocket events
  useEffect(() => {
    if (!event) return

    // Handle week_start event - refetch all games for new week
    if (event.event === 'week_start') {
      fetchGames()
      return
    }

    // Only process game events (not season events)
    if (!('gameId' in event)) return
    
    const gameId = Number(event.gameId)
    if (!gameId) return

    setGames(prev => {
      const updated = new Map(prev)
      const game = updated.get(gameId)
      if (!game) return prev

      switch (event.event) {
        case 'game_start':
          updated.set(gameId, {
            ...game,
            status: 'Active' as const,
            quarter: 1,
            timeRemaining: '15:00'
          })
          break

        case 'game_state': {
          const lastPlayData = event.lastPlay ? {
            ...event.lastPlay,
            homeWinProbability: event.homeWinProbability,
            awayWinProbability: event.awayWinProbability,
            homeWpa: event.homeWpa,
            awayWpa: event.awayWpa
          } : null

          const updatedGameState = {
            ...game,
            status: event.status,
            homeScore: event.homeScore,
            awayScore: event.awayScore,
            quarterScores: event.quarterScores,
            possession: event.possession ?? undefined,
            homeTeamPoss: event.homeTeamPoss,
            awayTeamPoss: event.awayTeamPoss,
            quarter: event.quarter,
            timeRemaining: event.timeRemaining,
            down: event.down ?? undefined,
            yardsToFirstDown: event.distance ?? undefined,
            yardLine: event.yardLine ?? undefined,
            yardsToEndzone: event.yardsToEndzone ?? undefined,
            homeWinProbability: event.homeWinProbability,
            awayWinProbability: event.awayWinProbability,
            isHalftime: event.isHalftime,
            isOvertime: event.isOvertime,
            isUpsetAlert: event.isUpsetAlert ?? game.isUpsetAlert,
            gameStats: event.gameStats ?? game.gameStats,
            plays: lastPlayData ? [lastPlayData, ...(game.plays || [])] : (game.plays || [])
          }
          updated.set(gameId, updatedGameState)
          break
        }

        // Legacy event handlers (deprecated - kept for backward compatibility)
        case 'score_update':
          updated.set(gameId, {
            ...game,
            homeScore: event.homeScore,
            awayScore: event.awayScore
          })
          break

        case 'play_complete':
          updated.set(gameId, {
            ...game,
            quarter: event.play.quarter ?? game.quarter,
            timeRemaining: event.play.timeRemaining ?? game.timeRemaining,
            homeWinProbability: event.play.homeWinProbability ?? game.homeWinProbability,
            awayWinProbability: event.play.awayWinProbability ?? game.awayWinProbability,
            plays: [event.play, ...(game.plays || [])]
          })
          break

        case 'game_state_update':
          // Update current down/distance/possession
          updated.set(gameId, {
            ...game,
            down: event.state.down ?? game.down,
            yardsToFirstDown: event.state.distance ?? game.yardsToFirstDown,
            yardLine: event.state.yardLine ?? game.yardLine,
            possession: event.state.possession ?? game.possession
          })
          break

        case 'game_end': {
          const h = event.finalScore.home
          const a = event.finalScore.away
          const finalHomeWp = event.homeWinProbability ?? (h > a ? 100 : h < a ? 0 : 50)
          const finalAwayWp = event.awayWinProbability ?? (a > h ? 100 : a < h ? 0 : 50)
          updated.set(gameId, {
            ...game,
            status: 'Final',
            homeScore: h,
            awayScore: a,
            homeWinProbability: finalHomeWp,
            awayWinProbability: finalAwayWp,
            quarter: 4,
            timeRemaining: '0:00'
          })
          break
        }
      }

      return updated
    })

    // Refetch after game ends to pick up updated team records (wins/losses)
    if (event.event === 'game_end') {
      fetchGames()
    }
  }, [event])

  const getGame = (gameId: number) => games.get(gameId)

  const fetchGamePlays = useCallback(async (gameId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/games/${gameId}`)
      const gameData = await response.json()

      setGames(prev => {
        const updated = new Map(prev)
        const game = updated.get(gameId)
        if (game && gameData.plays) {
          // Build a map of enrichment data from plays already in memory (accumulated via WebSocket)
          const enrichByPlayNumber = new Map<number, {
            homeWinProbability: number; awayWinProbability: number
            homeWpa?: number; awayWpa?: number; isBigPlay?: boolean
          }>()
          ;(game.plays || []).forEach((p: any) => {
            if (p.playNumber != null && p.homeWinProbability != null) {
              enrichByPlayNumber.set(p.playNumber, {
                homeWinProbability: p.homeWinProbability,
                awayWinProbability: p.awayWinProbability,
                homeWpa: p.homeWpa,
                awayWpa: p.awayWpa,
                isBigPlay: p.isBigPlay,
              })
            }
          })

          // Merge: use API plays (complete history) enriched with any WP/WPA we have
          const mergedPlays = gameData.plays.map((p: any) => {
            const enrich = enrichByPlayNumber.get(p.playNumber)
            if (p.homeWinProbability != null) {
              // API has WP — still overlay WebSocket isBigPlay if API is missing it
              return enrich && p.isBigPlay == null ? { ...p, ...enrich } : p
            }
            return enrich ? { ...p, ...enrich } : p
          })

          updated.set(gameId, { ...game, plays: mergedPlays })
        }
        return updated
      })
    } catch (err) {
      console.error(`Error fetching plays for game ${gameId}:`, err)
    }
  }, [])

  const value: GamesContextValue = {
    games,
    loading,
    error,
    getGame,
    refetch: fetchGames,
    fetchGamePlays
  }

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>
}

export const useGames = (): GamesContextValue => {
  const context = useContext(GamesContext)
  if (context === undefined) {
    throw new Error('useGames must be used within a GamesProvider')
  }
  return context
}
