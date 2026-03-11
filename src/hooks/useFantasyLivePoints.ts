import { useMemo } from 'react'
import { useGames } from '@/contexts/GamesContext'
import type { FantasyRosterPlayer } from '@/contexts/AuthContext'

/**
 * Computes live fantasy points using totalFantasyPoints from WebSocket gameStats.
 *
 * totalFantasyPoints = seasonFP + gameFP (server-computed, always accurate).
 * earnedPoints = totalFantasyPoints - pointsAtLock.
 *
 * Falls back to REST earnedPoints when no live game data is available.
 *
 * Card bonus computation has been removed — it now comes from the
 * FantasyTracker backend via useFantasySnapshot.
 */

interface LivePlayerData {
  totalFantasyPoints: number
  gameFantasyPoints: number
  gameStats: Record<string, any>
  teamId?: number
}

function buildLivePlayerMap(games: Map<number, any>): Map<number, LivePlayerData> {
  const map = new Map<number, LivePlayerData>()
  games.forEach(game => {
    if (!game.gameStats) return
    for (const side of ['home', 'away'] as const) {
      const players = (game.gameStats as any)[side]?.players
      if (!players) continue
      for (const pos of Object.values(players) as any[]) {
        if (pos?.id != null && pos?.totalFantasyPoints != null) {
          map.set(pos.id, {
            totalFantasyPoints: pos.totalFantasyPoints,
            gameFantasyPoints: pos.fantasyPoints ?? 0,
            gameStats: pos,
            teamId: pos.teamId,
          })
        }
      }
    }
  })
  return map
}

export function useFantasyLivePoints(
  rosterPlayers: FantasyRosterPlayer[] | undefined,
) {
  const { games } = useGames()

  // Map of playerId → live data from WebSocket
  const livePlayerMap = useMemo(() => buildLivePlayerMap(games), [games])

  // Compute live earned points for a single player
  const getLiveEarnedPoints = (p: FantasyRosterPlayer): number => {
    const data = livePlayerMap.get(p.playerId)
    if (data == null) return p.earnedPoints ?? 0
    return Math.max(0, data.totalFantasyPoints - p.pointsAtLock)
  }

  // Total raw FP across all roster players
  const totalPoints = useMemo(() => {
    if (!rosterPlayers) return 0
    return rosterPlayers.reduce((sum, p) => {
      const data = livePlayerMap.get(p.playerId)
      if (data == null) return sum + (p.earnedPoints ?? 0)
      return sum + Math.max(0, data.totalFantasyPoints - p.pointsAtLock)
    }, 0)
  }, [rosterPlayers, livePlayerMap])

  return { getLiveEarnedPoints, totalPoints, livePlayerMap }
}
