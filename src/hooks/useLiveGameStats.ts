import { useState, useEffect } from 'react'
import type { PlayerGameStats, TeamGameStats } from '@/types/api'
import type { GameWebSocketEvent } from '@/types/websocket'

/**
 * Hook for tracking real-time player and team stats during a live game
 * @param gameId - The ID of the game to track
 * @param gameEvent - WebSocket event data from useWebSocket
 */
export const useLiveGameStats = (
  gameId: string,
  gameEvent: GameWebSocketEvent | null
) => {
  const [homePlayerStats, setHomePlayerStats] = useState<PlayerGameStats[]>([])
  const [awayPlayerStats, setAwayPlayerStats] = useState<PlayerGameStats[]>([])
  const [homeTeamStats, setHomeTeamStats] = useState<TeamGameStats | null>(null)
  const [awayTeamStats, setAwayTeamStats] = useState<TeamGameStats | null>(null)

  useEffect(() => {
    if (!gameEvent || gameEvent.gameId !== gameId) return

    switch (gameEvent.event) {
      case 'player_stats_update':
        // Full stats update (sent periodically or on quarter end)
        setHomePlayerStats(gameEvent.homePlayerStats)
        setAwayPlayerStats(gameEvent.awayPlayerStats)
        break

      case 'team_stats_update':
        // Team-wide stats update
        setHomeTeamStats(gameEvent.homeTeamStats)
        setAwayTeamStats(gameEvent.awayTeamStats)
        break

      case 'play_complete':
        // Update individual player stats if included in play event
        if (gameEvent.playerStatsUpdate) {
          const { playerId, playerName, statType, yards, touchdown } = gameEvent.playerStatsUpdate
          const play = gameEvent.play

          // Determine which team's stats to update
          const isHomeTeam = play.offensiveTeam === homeTeamStats?.teamName
          const updateStats = isHomeTeam ? setHomePlayerStats : setAwayPlayerStats

          updateStats((prevStats) => {
            const existingPlayerIndex = prevStats.findIndex((p) => p.playerId === playerId)

            if (existingPlayerIndex >= 0) {
              // Update existing player
              const updatedStats = [...prevStats]
              const player = { ...updatedStats[existingPlayerIndex] }

              // Update stats based on play type
              switch (statType) {
                case 'passing':
                  player.passingAttempts = (player.passingAttempts || 0) + 1
                  if (yards && yards > 0) {
                    player.passingCompletions = (player.passingCompletions || 0) + 1
                    player.passingYards = (player.passingYards || 0) + yards
                  }
                  if (touchdown) {
                    player.passingTouchdowns = (player.passingTouchdowns || 0) + 1
                  }
                  break

                case 'rushing':
                  player.rushingAttempts = (player.rushingAttempts || 0) + 1
                  if (yards) {
                    player.rushingYards = (player.rushingYards || 0) + yards
                  }
                  if (touchdown) {
                    player.rushingTouchdowns = (player.rushingTouchdowns || 0) + 1
                  }
                  break

                case 'receiving':
                  player.targets = (player.targets || 0) + 1
                  if (yards && yards > 0) {
                    player.receptions = (player.receptions || 0) + 1
                    player.receivingYards = (player.receivingYards || 0) + yards
                  }
                  if (touchdown) {
                    player.receivingTouchdowns = (player.receivingTouchdowns || 0) + 1
                  }
                  break

                case 'defense':
                  if (yards) {
                    player.sacks = (player.sacks || 0) + 1
                  }
                  break

                case 'kicking':
                  if (play.playType === 'field_goal') {
                    player.fieldGoalsAttempted = (player.fieldGoalsAttempted || 0) + 1
                    if (touchdown) {
                      player.fieldGoalsMade = (player.fieldGoalsMade || 0) + 1
                    }
                  } else if (play.playType === 'extra_point') {
                    player.extraPointsAttempted = (player.extraPointsAttempted || 0) + 1
                    if (touchdown) {
                      player.extraPointsMade = (player.extraPointsMade || 0) + 1
                    }
                  }
                  break
              }

              updatedStats[existingPlayerIndex] = player
              return updatedStats
            } else {
              // Add new player (shouldn't happen often, but handle it)
              const newPlayer: PlayerGameStats = {
                playerId,
                playerName,
                position: '',
                team: play.offensiveTeam,
              }

              // Initialize the stat
              switch (statType) {
                case 'passing':
                  newPlayer.passingAttempts = 1
                  newPlayer.passingCompletions = yards && yards > 0 ? 1 : 0
                  newPlayer.passingYards = yards || 0
                  newPlayer.passingTouchdowns = touchdown ? 1 : 0
                  break
                case 'rushing':
                  newPlayer.rushingAttempts = 1
                  newPlayer.rushingYards = yards || 0
                  newPlayer.rushingTouchdowns = touchdown ? 1 : 0
                  break
                case 'receiving':
                  newPlayer.targets = 1
                  newPlayer.receptions = yards && yards > 0 ? 1 : 0
                  newPlayer.receivingYards = yards || 0
                  newPlayer.receivingTouchdowns = touchdown ? 1 : 0
                  break
              }

              return [...prevStats, newPlayer]
            }
          })
        }
        break

      case 'turnover':
        // Handle interceptions
        if (gameEvent.turnoverType === 'interception') {
          // Increment interceptions for QB (would need QB id from backend)
          // This is a simplified version - backend should send player info
        }
        break

      case 'game_start':
        // Reset stats when game starts
        setHomePlayerStats([])
        setAwayPlayerStats([])
        setHomeTeamStats(null)
        setAwayTeamStats(null)
        break
    }
  }, [gameEvent, gameId, homeTeamStats?.teamName])

  return {
    homePlayerStats,
    awayPlayerStats,
    homeTeamStats,
    awayTeamStats,
  }
}

/**
 * Hook to get top performers from current game stats
 */
export const useTopPerformers = (
  homePlayerStats: PlayerGameStats[],
  awayPlayerStats: PlayerGameStats[]
) => {
  const allPlayers = [...homePlayerStats, ...awayPlayerStats]

  const topPasser = allPlayers.reduce((top, player) => {
    const yards = player.passingYards || 0
    const topYards = top?.passingYards || 0
    return yards > topYards ? player : top
  }, allPlayers[0])

  const topRusher = allPlayers.reduce((top, player) => {
    const yards = player.rushingYards || 0
    const topYards = top?.rushingYards || 0
    return yards > topYards ? player : top
  }, allPlayers[0])

  const topReceiver = allPlayers.reduce((top, player) => {
    const yards = player.receivingYards || 0
    const topYards = top?.receivingYards || 0
    return yards > topYards ? player : top
  }, allPlayers[0])

  return {
    topPasser,
    topRusher,
    topReceiver,
  }
}
