import type { CurrentGame } from '@/hooks/useCurrentGames'
import type { ChipKind } from './boardPieces'
import { closenessCounts } from './gameFormat'

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

/**
 * The single interest chip a card may carry, most-interesting first.
 *
 * ⚠️ TIED and CLOSE GAME are both gated on `closenessCounts`. Every game kicks off 0-0, so
 * ungated the whole board reads TIED at the start of a slate — and gating only TIED just
 * hands all sixteen cards a CLOSE GAME chip instead, since 0-0 is also within one score.
 *
 * UPSET and FEATURED need no gate: the backend only raises an upset from Q2 with the
 * underdog genuinely ahead on win probability, and FEATURED is decided pre-game.
 */
export function chipFor(game: CurrentGame): ChipKind | null {
  const margin = Math.abs((game.homeScore ?? 0) - (game.awayScore ?? 0))
  const close = closenessCounts(game)
  if (close && margin === 0) return 'TIED'
  if (game.isUpsetAlert) return 'UPSET'
  if (close && margin <= ONE_SCORE) return 'CLOSE GAME'
  if (game.isFeatured) return 'FEATURED'
  return null
}

function interestScore(game: CurrentGame): number {
  // Lower is more interesting. Tied, then upsets, then one-score, then margin.
  // Closeness is gated exactly as the chips are — a slate that has just kicked off is not
  // sixteen equally thrilling ties, and the ranking should not claim it is.
  const margin = Math.abs((game.homeScore ?? 0) - (game.awayScore ?? 0))
  const close = closenessCounts(game)
  if (close && margin === 0) return 0
  if (game.isUpsetAlert) return 1
  if (close && margin <= ONE_SCORE) return 2
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
