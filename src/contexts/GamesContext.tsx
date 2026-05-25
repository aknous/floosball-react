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
  // Merge a fresh reactions aggregate into the central game cache so a
  // close/reopen of the modal shows updated reactions without waiting on
  // the refetch effect. Called by PlayReactions on POST success and on WS
  // play_reaction_update events.
  updateGameReactions: (
    gameId: number, playNumber: number, targetType: string, aggregate: any
  ) => void
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

          // Merge: use API plays as base, overlay any enrichment from WebSocket.
          // Stamp _receivedAt for plays that came from REST without one — back-
          // dated by one hour so they always sort below anything fired live.
          const restBaseMs = Date.now() - 60 * 60 * 1000
          const mergedPlays = gameData.plays.map((p: any) => {
            const enrich = enrichByPlayNumber.get(p.playNumber)
            const merged = enrich ? { ...p, ...enrich } : p
            return merged._receivedAt
              ? merged
              : { ...merged, _receivedAt: restBaseMs - (1000 - (p.playNumber || 0)) * 1000 }
          })

          updated.set(gameId, {
            ...game,
            plays: mergedPlays,
            gameStats: gameData.gameStats ?? game.gameStats,
            matchupPreview: gameData.matchupPreview ?? game.matchupPreview,
            // Persist the reactions aggregate so reopening the modal shows
            // existing reactions instead of an empty bucket. WS updates
            // continue to merge in over this baseline.
            reactions: gameData.reactions ?? (game as any).reactions,
          } as any)
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
            // Stamp _receivedAt so the cross-source HighlightFeed can sort
            // plays by recency against off-day events (which use epoch-ms).
            const nowMs = Date.now()
            const lastPlayData = gsEvt.lastPlay ? {
              ...gsEvt.lastPlay,
              _receivedAt: nowMs,
              homeWinProbability: gsEvt.homeWinProbability,
              awayWinProbability: gsEvt.awayWinProbability,
              homeWpa: gsEvt.homeWpa,
              awayWpa: gsEvt.awayWpa
            } : null

            // finalPlay carries the actual last gameplay play alongside the "Final" event.
            const finalPlayData = gsEvt.finalPlay
              ? { ...gsEvt.finalPlay, _receivedAt: nowMs }
              : null
            const curGame = updated.get(gameId)!
            let existingPlays = curGame.plays || []

            // Identity check for plays. Primary key: playNumber (set by backend
            // and unique per play). Fall back to description+playResult for
            // entries that don't carry a numeric playNumber (event messages,
            // cutaways with fractional playNumbers).
            const sameAsExisting = (cand: any) => {
              if (!cand) return false
              if (cand.playNumber != null && Number.isInteger(cand.playNumber)) {
                if (existingPlays.some((p: any) => p.playNumber === cand.playNumber && !(p as any).isSidelineCutaway)) return true
              }
              if (cand.description) {
                if (existingPlays.some((p: any) => p.description === cand.description && p.playResult === cand.playResult)) return true
              }
              return false
            }

            if (finalPlayData && !sameAsExisting(finalPlayData)) {
              existingPlays = [finalPlayData, ...existingPlays]
            }

            // Sideline cutaway — render as a flavor entry in the feed (between
            // plays, ordered immediately after the play that just happened).
            const cutawayEntry = gsEvt.sidelineCutaway ? {
              isSidelineCutaway: true,
              sidelineCutaway: gsEvt.sidelineCutaway,
              quarter: gsEvt.quarter,
              timeRemaining: gsEvt.timeRemaining,
              // give it a sortable playNumber just after the most recent play
              playNumber: (existingPlays[0]?.playNumber ?? 0) + 0.5,
              _receivedAt: nowMs,
            } : null

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
              plays: (() => {
                let next = existingPlays
                if (lastPlayData && !sameAsExisting(lastPlayData)) next = [lastPlayData, ...next]
                if (cutawayEntry) next = [cutawayEntry, ...next]
                return next
              })(),
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
            const stampedPlay = { ...pcEvt.play, _receivedAt: Date.now() }
            const existing = curGame.plays || []
            const dup = existing.some((p: any) => (
              (stampedPlay.playNumber != null && Number.isInteger(stampedPlay.playNumber) && p.playNumber === stampedPlay.playNumber && !p.isSidelineCutaway)
              || (stampedPlay.description && p.description === stampedPlay.description && p.playResult === stampedPlay.playResult)
            ))
            updated.set(gameId, {
              ...curGame,
              quarter: pcEvt.play.quarter ?? curGame.quarter,
              timeRemaining: pcEvt.play.timeRemaining ?? curGame.timeRemaining,
              homeWinProbability: pcEvt.play.homeWinProbability ?? curGame.homeWinProbability,
              awayWinProbability: pcEvt.play.awayWinProbability ?? curGame.awayWinProbability,
              plays: dup ? existing : [stampedPlay, ...existing]
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
              timeRemaining: '0:00',
              // Stamp when this game ended so the HighlightFeed can sort the
              // game_end card by real recency, not pin it to the top forever.
              _endedAt: Date.now(),
            } as any)
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

  const updateGameReactions = useCallback((
    gameId: number, playNumber: number, targetType: string, aggregate: any
  ) => {
    setGames(prev => {
      const game = prev.get(gameId)
      if (!game) return prev
      const next = new Map(prev)
      const existing = (game as any).reactions || {}
      const playKey = String(playNumber)
      const playBucket = { ...(existing[playKey] || {}) }
      if (aggregate && Object.keys(aggregate).length > 0) {
        playBucket[targetType] = aggregate
      } else {
        delete playBucket[targetType]
      }
      const nextReactions = { ...existing }
      if (Object.keys(playBucket).length > 0) {
        nextReactions[playKey] = playBucket
      } else {
        delete nextReactions[playKey]
      }
      next.set(gameId, { ...game, reactions: nextReactions } as any)
      return next
    })
  }, [])

  const value: GamesContextValue = {
    games,
    loading,
    error,
    getGame,
    refetch: fetchGames,
    fetchGamePlays,
    updateGameReactions,
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
