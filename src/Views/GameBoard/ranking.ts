import type { CurrentGame } from '@/hooks/useCurrentGames'
import type { ChipKind } from './boardPieces'

/**
 * The board's fixed order. There is no sort control and no re-rank button by design.
 *
 * ⚠️ Recalculated on PAGE LOAD only. It must never re-sort while the user is watching —
 * cards moving under the cursor as scores land was the specific thing being avoided, and
 * it is why the ranked ids are frozen in a ref by the page rather than recomputed from
 * live game state on every render.
 */

const ONE_SCORE = 8

export type Ranked = {
  game: CurrentGame
  chip: ChipKind | null
  pinned: boolean
}

/** The single interest chip a card may carry, most-interesting first. */
export function chipFor(game: CurrentGame): ChipKind | null {
  const live = game.status === 'Active'
  const margin = Math.abs((game.homeScore ?? 0) - (game.awayScore ?? 0))
  if (live && margin === 0) return 'TIED'
  if (game.isUpsetAlert) return 'UPSET'
  if (live && margin <= ONE_SCORE) return '1-SCORE'
  if (game.isFeatured) return 'FEATURED'
  return null
}

function interestScore(game: CurrentGame): number {
  // Lower is more interesting. Tied, then upsets, then one-score, then margin.
  const margin = Math.abs((game.homeScore ?? 0) - (game.awayScore ?? 0))
  const live = game.status === 'Active'
  if (live && margin === 0) return 0
  if (game.isUpsetAlert) return 1
  if (live && margin <= ONE_SCORE) return 2
  return 3 + margin
}

/**
 * Order the board: the user's game pinned first, then by interest, ties broken toward the
 * game in the user's own league.
 */
export function rankGames(
  games: CurrentGame[],
  favouriteTeamId: number | null,
  favouriteLeague: string | null,
  leagueOfTeam: (teamId: string | number) => string | null,
): Ranked[] {
  const favouriteKey = favouriteTeamId != null ? String(favouriteTeamId) : null
  const isYours = (g: CurrentGame) =>
    favouriteKey != null
    && (String(g.homeTeam?.id) === favouriteKey || String(g.awayTeam?.id) === favouriteKey)

  const inYourLeague = (g: CurrentGame) => {
    if (!favouriteLeague) return false
    return leagueOfTeam(g.homeTeam?.id) === favouriteLeague
  }

  const decorated = games.map(game => ({
    game,
    chip: chipFor(game),
    pinned: isYours(game),
    score: interestScore(game),
    ownLeague: inYourLeague(game),
  }))

  decorated.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.score !== b.score) return a.score - b.score
    if (a.ownLeague !== b.ownLeague) return a.ownLeague ? -1 : 1
    // A stable final key so two equally interesting games never swap between loads.
    return a.game.id - b.game.id
  })

  return decorated.map(({ game, chip, pinned }) => ({ game, chip, pinned }))
}
