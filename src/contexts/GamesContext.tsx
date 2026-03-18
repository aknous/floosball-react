import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from './SeasonWebSocketContext'
import { api } from '@/services/api'
import type { CurrentGame } from '@/hooks/useCurrentGames'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

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
  const { event, drainEvents } = useSeasonWebSocket()
  const hasLoadedOnce = useRef(false)

  const fetchGamePlays = useCallback(async (gameId: number) => {
    try {
      const response = await fetch(`${API_BASE}/games/${gameId}`)
      const gameData = await response.json()

      setGames(prev => {
        const updated = new Map(prev)
        const game = updated.get(gameId)
        if (game && gameData.plays) {
          // Build a map of enrichment data from plays already in memory (accumulated via WebSocket)
          const enrichByPlayNumber = new Map<number, {
            homeWinProbability: number; awayWinProbability: number
            homeWpa?: number; awayWpa?: number; isBigPlay?: boolean
            isClutchPlay?: boolean; isChokePlay?: boolean
          }>()
          ;(game.plays || []).forEach((p: any) => {
            if (p.playNumber != null && p.homeWinProbability != null) {
              enrichByPlayNumber.set(p.playNumber, {
                homeWinProbability: p.homeWinProbability,
                awayWinProbability: p.awayWinProbability,
                homeWpa: p.homeWpa,
                awayWpa: p.awayWpa,
                isBigPlay: p.isBigPlay,
                isClutchPlay: p.isClutchPlay,
                isChokePlay: p.isChokePlay,
              })
            }
          })

          // Merge: use API plays as base, overlay any enrichment from WebSocket
          const mergedPlays = gameData.plays.map((p: any) => {
            const enrich = enrichByPlayNumber.get(p.playNumber)
            return enrich ? { ...p, ...enrich } : p
          })

          updated.set(gameId, { ...game, plays: mergedPlays, gameStats: gameData.gameStats ?? game.gameStats })
        }
        return updated
      })
    } catch (err) {
      console.error(`Error fetching plays for game ${gameId}:`, err)
    }
  }, [])

  const fetchGames = useCallback(async (keepFinal = false) => {
    const isInitial = !hasLoadedOnce.current
    try {
      if (isInitial) setLoading(true)
      const response = await api.games.getCurrentGames()
      const gamesNeedingPlays: number[] = []
      setGames(prev => {
        const gamesMap = new Map<number, CurrentGame>()
        // When keepFinal is true, preserve Final games already in state
        // so they don't vanish when the backend removes them from activeGames
        if (keepFinal) {
          prev.forEach((g, id) => {
            if (g.status === 'Final') gamesMap.set(id, g)
          })
        }
        response.forEach(game => {
          const gameId = Number(game.id)
          const existing = prev.get(gameId)
          const existingPlays = existing?.plays ?? []
          gamesMap.set(gameId, {
            ...existing,
            ...game,
            id: gameId,
            // Preserve WebSocket-accumulated state that REST API may not include or may have stale
            plays: existingPlays.length > 0 ? existingPlays : (game as any).plays ?? [],
            homeWinProbability: existing?.homeWinProbability ?? (game as any).homeWinProbability,
            awayWinProbability: existing?.awayWinProbability ?? (game as any).awayWinProbability,
            possession: existing?.possession ?? (game as any).possession,
            homeTeamPoss: existing?.homeTeamPoss ?? (game as any).homeTeamPoss,
            awayTeamPoss: existing?.awayTeamPoss ?? (game as any).awayTeamPoss,
            yardsToEndzone: existing?.yardsToEndzone ?? (game as any).yardsToEndzone,
            momentum: existing?.momentum ?? (game as any).momentum,
            momentumTeam: existing?.momentumTeam ?? (game as any).momentumTeam,
          })
          // If game is active or final but has no plays loaded, queue it for fetching
          if (existingPlays.length === 0 && (game.status === 'Active' || game.status === 'Final')) {
            gamesNeedingPlays.push(gameId)
          }
        })
        return gamesMap
      })
      hasLoadedOnce.current = true
      setError(null)

      // Fetch plays for games that need them (e.g., after page refresh)
      for (const gameId of gamesNeedingPlays) {
        fetchGamePlays(gameId)
      }
    } catch (err) {
      console.error('Error fetching games:', err)
      setError('Failed to load games')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [fetchGamePlays])

  // Initial fetch
  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // Update games from WebSocket events.
  // Uses drainEvents() to process ALL queued messages, preventing drops
  // when React batches rapid state updates (e.g. timeout → next play).
  useEffect(() => {
    if (!event) return

    const events = drainEvents()
    if (events.length === 0) return

    // Handle week_start — refetch all games for new week
    if (events.some((e: any) => e.event === 'week_start')) {
      fetchGames()
    }

    let hasGameEnd = false

    setGames(prev => {
      const updated = new Map(prev)

      for (const evt of events) {
        // Skip non-game events
        if (!('gameId' in evt)) continue
        const gameId = Number((evt as any).gameId)
        if (!gameId) continue
        const game = updated.get(gameId)
        if (!game) continue

        switch ((evt as any).event) {
          case 'game_start':
            updated.set(gameId, {
              ...game,
              status: 'Active' as const,
              quarter: 1,
              timeRemaining: '15:00'
            })
            break

          case 'game_state': {
            const gsEvt = evt as any
            const lastPlayData = gsEvt.lastPlay ? {
              ...gsEvt.lastPlay,
              homeWinProbability: gsEvt.homeWinProbability,
              awayWinProbability: gsEvt.awayWinProbability,
              homeWpa: gsEvt.homeWpa,
              awayWpa: gsEvt.awayWpa
            } : null

            // finalPlay carries the actual last gameplay play alongside the "Final" event.
            const finalPlayData = gsEvt.finalPlay ?? null
            const curGame = updated.get(gameId)!
            let existingPlays = curGame.plays || []
            if (finalPlayData?.description) {
              const alreadyHave = existingPlays.some(
                (p: any) => p.description === finalPlayData.description && p.playResult === finalPlayData.playResult
              )
              if (!alreadyHave) {
                existingPlays = [finalPlayData, ...existingPlays]
              }
            }

            updated.set(gameId, {
              ...curGame,
              status: gsEvt.status,
              homeScore: gsEvt.homeScore,
              awayScore: gsEvt.awayScore,
              quarterScores: gsEvt.quarterScores,
              possession: gsEvt.possession ?? undefined,
              homeTeamPoss: gsEvt.homeTeamPoss,
              awayTeamPoss: gsEvt.awayTeamPoss,
              quarter: gsEvt.quarter,
              timeRemaining: gsEvt.timeRemaining,
              down: gsEvt.down ?? undefined,
              yardsToFirstDown: gsEvt.distance ?? undefined,
              yardLine: gsEvt.yardLine ?? undefined,
              yardsToEndzone: gsEvt.yardsToEndzone ?? undefined,
              homeWinProbability: gsEvt.homeWinProbability,
              awayWinProbability: gsEvt.awayWinProbability,
              homeTimeouts: gsEvt.homeTimeouts,
              awayTimeouts: gsEvt.awayTimeouts,
              isHalftime: gsEvt.isHalftime,
              isOvertime: gsEvt.isOvertime,
              isUpsetAlert: gsEvt.isUpsetAlert ?? curGame.isUpsetAlert,
              momentum: gsEvt.momentum,
              momentumTeam: gsEvt.momentumTeam,
              gameStats: gsEvt.gameStats ?? curGame.gameStats,
              plays: lastPlayData ? [lastPlayData, ...existingPlays] : existingPlays
            })
            break
          }

          // Legacy event handlers (deprecated - kept for backward compatibility)
          case 'score_update': {
            const suEvt = evt as any
            updated.set(gameId, {
              ...game,
              homeScore: suEvt.homeScore,
              awayScore: suEvt.awayScore
            })
            break
          }

          case 'play_complete': {
            const pcEvt = evt as any
            const curGame = updated.get(gameId)!
            updated.set(gameId, {
              ...curGame,
              quarter: pcEvt.play.quarter ?? curGame.quarter,
              timeRemaining: pcEvt.play.timeRemaining ?? curGame.timeRemaining,
              homeWinProbability: pcEvt.play.homeWinProbability ?? curGame.homeWinProbability,
              awayWinProbability: pcEvt.play.awayWinProbability ?? curGame.awayWinProbability,
              plays: [pcEvt.play, ...(curGame.plays || [])]
            })
            break
          }

          case 'game_state_update': {
            const gsuEvt = evt as any
            const curGame = updated.get(gameId)!
            updated.set(gameId, {
              ...curGame,
              down: gsuEvt.state.down ?? curGame.down,
              yardsToFirstDown: gsuEvt.state.distance ?? curGame.yardsToFirstDown,
              yardLine: gsuEvt.state.yardLine ?? curGame.yardLine,
              possession: gsuEvt.state.possession ?? curGame.possession
            })
            break
          }

          case 'game_end': {
            const geEvt = evt as any
            const curGame = updated.get(gameId)!
            const h = geEvt.finalScore.home
            const a = geEvt.finalScore.away
            const finalHomeWp = geEvt.homeWinProbability ?? (h > a ? 100 : h < a ? 0 : 50)
            const finalAwayWp = geEvt.awayWinProbability ?? (a > h ? 100 : a < h ? 0 : 50)
            updated.set(gameId, {
              ...curGame,
              status: 'Final',
              homeScore: h,
              awayScore: a,
              homeWinProbability: finalHomeWp,
              awayWinProbability: finalAwayWp,
              quarter: 4,
              timeRemaining: '0:00'
            })
            hasGameEnd = true
            break
          }
        }
      }

      return updated
    })

    // Refetch after game ends to pick up updated team records (wins/losses).
    // Use merge mode so Final games already in state aren't wiped out.
    if (hasGameEnd) {
      fetchGames(true)
    }
  }, [event, drainEvents, fetchGames])

  const getGame = (gameId: number) => games.get(gameId)

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
