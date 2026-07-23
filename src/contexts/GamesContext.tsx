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
          // Stamp _receivedAt for plays that came from REST without one. Anchor
          // just under "now" — this is the current slate the user is looking at,
          // so its plays belong above older league-news (anomaly/Cores) items,
          // which fired at the weekly tick. The small per-playNumber offset keeps
          // intra-game order; staying a hair in the past lets a brand-new live WS
          // play (stamped Date.now()) still sort above the snapshot.
          const restBaseMs = Date.now() - 1000
          const restPlayNumbers = new Set<number>()
          const restPlayDescs = new Set<string>()
          gameData.plays.forEach((p: any) => {
            if (p.playNumber != null && Number.isInteger(p.playNumber)) restPlayNumbers.add(p.playNumber)
            if (p.description && p.playResult) restPlayDescs.add(`${p.description}|${p.playResult}`)
          })
          const mergedPlays = gameData.plays.map((p: any) => {
            const enrich = enrichByPlayNumber.get(p.playNumber)
            const merged = enrich ? { ...p, ...enrich } : p
            return merged._receivedAt
              ? merged
              : { ...merged, _receivedAt: restBaseMs - (1000 - (p.playNumber || 0)) }
          })
          // Preserve WS-only plays the REST snapshot missed (race: snapshot taken
          // before the play was inserted into gameFeed but WS already fired).
          // Without this guard, a fresh /api/games/{id} fetch silently wipes
          // recently-broadcast plays from the modal feed.
          const missingWsPlays: any[] = []
          ;(game.plays || []).forEach((p: any) => {
            if (!p || p._type || p.isSidelineCutaway) return
            const pn = p.playNumber
            const descKey = p.description && p.playResult ? `${p.description}|${p.playResult}` : null
            // REST is the source of truth for event-only entries (kickoffs,
            // quarter starts, halftime, timeouts). Only carry forward true
            // plays — those with an integer playNumber or description+playResult.
            if ((pn == null || !Number.isInteger(pn)) && descKey == null) return
            const inRestByNum = pn != null && Number.isInteger(pn) && restPlayNumbers.has(pn)
            const inRestByDesc = descKey != null && restPlayDescs.has(descKey)
            if (inRestByNum || inRestByDesc) return
            missingWsPlays.push(p)
          })
          if (missingWsPlays.length > 0) {
            mergedPlays.unshift(...missingWsPlays)
          }

          updated.set(gameId, {
            ...game,
            plays: mergedPlays,
            gameStats: gameData.gameStats ?? game.gameStats,
            matchupPreview: gameData.matchupPreview ?? game.matchupPreview,
            // Per-format box-score state (innings line score, frames results, chess-clock
            // budgets). This used to arrive ONLY on live game_state events, so a refresh
            // or opening a finished game rendered an empty breakdown. The detail endpoint
            // now returns it; keep whatever we already have if the fetch doesn't carry it.
            innings: gameData.innings ?? (game as any).innings,
            frames: gameData.frames ?? (game as any).frames,
            chessClock: gameData.chessClock ?? (game as any).chessClock,
            playLimit: gameData.playLimit ?? (game as any).playLimit,
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

            // Merge a freshly-broadcast play into the feed. A play's identity is
            // its integer playNumber + description: the SAME play gets re-emitted
            // at quarter boundaries / turnovers with an updated playResult or WP,
            // so we must REPLACE the existing entry (newest data wins) rather than
            // append a duplicate. (Matching playResult too — as the old check did —
            // let those rebroadcasts slip through as dupes.) Two real kneels have
            // different playNumbers, so that case is unaffected. Entries without an
            // integer playNumber (event messages, cutaways) fall back to a
            // description+playResult dedup.
            const mergePlay = (list: any[], cand: any): any[] => {
              if (!cand) return list
              const hasInt = cand.playNumber != null && Number.isInteger(cand.playNumber)
              if (hasInt) {
                // A real play's identity is its integer playNumber ALONE. The same play
                // is re-emitted around quarter/halftime boundaries and turnovers —
                // sometimes with an empty or shifting description — so keying dedup on
                // playNumber+description let those re-sends slip through and STACK (the
                // pre-halftime play appearing 5x in a live game). Replace the existing
                // entry (newest data wins) instead of appending. Fractional playNumbers
                // (cutaways +0.5, contest beats +0.9) are non-integer, so they're
                // excluded here and unaffected.
                const idx = list.findIndex((p: any) => p.playNumber === cand.playNumber && !p.isSidelineCutaway)
                if (idx !== -1) {
                  const copy = list.slice()
                  const merged = { ...copy[idx], ...cand }
                  // Don't let a sparser re-send blank out already-good fields.
                  if (!cand.description && copy[idx].description) merged.description = copy[idx].description
                  if (!cand.playResult && copy[idx].playResult) merged.playResult = copy[idx].playResult
                  copy[idx] = merged
                  return copy
                }
              } else if (cand.description) {
                if (list.some((p: any) => p.description === cand.description && p.playResult === cand.playResult)) return list
              }
              return [cand, ...list]
            }

            if (finalPlayData) existingPlays = mergePlay(existingPlays, finalPlayData)

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
              // Per-game downs-per-series. Criticality chaos can set this to 3 or 5,
              // differing from the season-wide /api/rules value. This merge is an
              // explicit allowlist, so omitting it dropped the field on every update
              // and the feed coloured 4th down as the do-or-die down in a 5-down game.
              downsPerSeries: (gsEvt as any).downsPerSeries ?? (curGame as any).downsPerSeries,
              yardsToFirstDown: gsEvt.distance ?? undefined,
              yardLine: gsEvt.yardLine ?? undefined,
              yardsToEndzone: gsEvt.yardsToEndzone ?? undefined,
              driveClock: gsEvt.driveClock ?? null,
              // Per-play format state (server-computed, doesn't derive from score/clock) —
              // thread it through live so chess-clock budgets, play/inning/frame counters,
              // and hoop state update as plays arrive instead of only on a refresh.
              chessClock: gsEvt.chessClock ?? undefined,
              playLimit: gsEvt.playLimit ?? undefined,
              innings: gsEvt.innings ?? undefined,
              frames: gsEvt.frames ?? undefined,
              sidelineGoals: gsEvt.sidelineGoals ?? null,
              homeWinProbability: gsEvt.homeWinProbability,
              awayWinProbability: gsEvt.awayWinProbability,
              homeTimeouts: gsEvt.homeTimeouts,
              awayTimeouts: gsEvt.awayTimeouts,
              isHalftime: gsEvt.isHalftime,
              isFloosBowl: gsEvt.isFloosBowl ?? curGame.isFloosBowl,
              isOvertime: gsEvt.isOvertime,
              isUpsetAlert: gsEvt.isUpsetAlert ?? curGame.isUpsetAlert,
              momentum: gsEvt.momentum,
              momentumTeam: gsEvt.momentumTeam,
              gameStats: gsEvt.gameStats ?? curGame.gameStats,
              plays: (() => {
                let next = existingPlays
                if (lastPlayData) next = mergePlay(next, lastPlayData)
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

          // Live in-game fan rally — update the team's rally pool totals
          // and stash the most recent rally event for transient UI flash.
          case 'game_rally': {
            const rEvt = evt as any
            const curGame = updated.get(gameId)
            if (!curGame) break
            const teamIdKey = String(rEvt.teamId)
            const prevRally = curGame.rally || { teamTotals: {} }
            // Only prepend a play-feed entry when the backend crossed
            // the surge threshold and emitted a feedMessage. Most
            // individual cheers don't generate a feed line — only
            // collective surges do.
            const existingPlays = curGame.plays || []
            const nextPlays = rEvt.feedMessage
              ? [{ event: { text: rEvt.feedMessage, _type: 'rally' }, _ts: Date.now() }, ...existingPlays]
              : existingPlays
            updated.set(gameId, {
              ...curGame,
              plays: nextPlays,
              rally: {
                teamTotals: {
                  ...prevRally.teamTotals,
                  [teamIdKey]: rEvt.teamTotals,
                },
                lastRally: {
                  teamId: rEvt.teamId,
                  userId: rEvt.userId,
                  username: rEvt.username,
                  tier: rEvt.tier,
                  costPaid: rEvt.costPaid,
                  confidenceDelta: rEvt.confidenceDelta,
                  determinationDelta: rEvt.determinationDelta,
                  ts: Date.now(),
                },
              },
            })
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
