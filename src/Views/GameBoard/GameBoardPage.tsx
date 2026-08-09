import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGames } from '@/contexts/GamesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useScoringModel } from '@/contexts/ScoringModelContext'
import { useOpenGame } from '@/hooks/useOpenGame'
import { GameModalNew } from '@/Components/GameModalNew'
import { ScoreboardWeekNav } from '@/Components/ScoreboardWeekNav'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'
import BoardCardLarge from './BoardCardLarge'
import BoardCardSmall from './BoardCardSmall'
import { rankGames, chipFor, type Ranked } from './ranking'
import { PulsingDot } from './boardPieces'
import ActiveRulesStrip from './ActiveRulesStrip'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const DENSITY_KEY = 'floosball:boardDensity'

type Density = 'large' | 'small'

/**
 * The game board — every game of the week at once, ranked so the most interesting is
 * first and the user's own is pinned above the ranking.
 *
 * No sidebar: standings, news and prognostications each have their own nav entry, so the
 * games get the full content width. A dense scoreboard TABLE was built and rejected in
 * review (16 rows read as chaotic even wide), as was a third LIST density, a sort
 * control, a re-rank button, an interest-rank number in the header, and pick-em on the
 * cards. Cards at two densities is what survived.
 */
const GameBoardPage: React.FC = () => {
  const { games } = useGames()
  const { user } = useAuth()
  const { seasonState } = useFloosball()
  // The league's scoring model is mutable (additive / spread / subtractive), and it is a
  // lens over how every score on this board READS.
  const scoringModel = useScoringModel()

  const [density, setDensity] = useState<Density>(() => {
    try { return (localStorage.getItem(DENSITY_KEY) as Density) || 'large' } catch { return 'large' }
  })
  // Desktop routes to the game's own page; mobile keeps the modal.
  const { openGame, modalGameId, closeGame } = useOpenGame()
  const [viewWeek, setViewWeek] = useState<number | null>(null)

  useEffect(() => {
    try { localStorage.setItem(DENSITY_KEY, density) } catch { /* preference is best-effort */ }
  }, [density])

  // Which league each team belongs to, for the ranking's tiebreak toward the user's own
  // league. Fetched once — league membership does not change mid-season.
  const [leagueByTeam, setLeagueByTeam] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/standings`)
      .then(r => r.json())
      .then((leagues: any[]) => {
        if (cancelled || !Array.isArray(leagues)) return
        const map: Record<string, string> = {}
        leagues.forEach(lg => (lg.standings || []).forEach((t: any) => { map[String(t.id)] = lg.name }))
        setLeagueByTeam(map)
      })
      .catch(() => { /* ranking falls back to no league tiebreak */ })
    return () => { cancelled = true }
  }, [])

  const favouriteTeamId = user?.favoriteTeamId ?? null
  const favouriteLeague = favouriteTeamId != null ? leagueByTeam[String(favouriteTeamId)] ?? null : null

  const gameList = useMemo(() => Array.from(games.values()), [games])

  /**
   * ⚠️ The ORDER is computed once and frozen; the game data inside it stays live.
   *
   * Cards must never re-sort under the cursor as scores land — that was the specific
   * thing the fixed ranking exists to avoid. So the ranking produces a list of ids, and
   * the render maps those ids back through the live games map. The order is recalculated
   * only when the set of games changes (a new slate) or the page is loaded again.
   */
  const orderRef = useRef<number[]>([])
  const orderKeyRef = useRef<string>('')
  const slateKey = gameList.map(g => g.id).sort((a, b) => a - b).join(',')
  if (slateKey && slateKey !== orderKeyRef.current && Object.keys(leagueByTeam).length > 0) {
    orderKeyRef.current = slateKey
    orderRef.current = rankGames(
      gameList,
      favouriteTeamId,
      favouriteLeague,
      teamId => leagueByTeam[String(teamId)] ?? null,
    ).map(r => r.game.id)
  } else if (slateKey && orderRef.current.length === 0) {
    // Standings have not arrived yet — rank without the league tiebreak so the board
    // renders immediately, and let the effect above re-rank once they do.
    orderRef.current = rankGames(gameList, favouriteTeamId, null, () => null).map(r => r.game.id)
  }

  const ordered: Ranked[] = orderRef.current
    .map(id => games.get(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map(game => ({
      game,
      chip: chipFor(game),
      pinned: favouriteTeamId != null
        && (String(game.homeTeam?.id) === String(favouriteTeamId)
          || String(game.awayTeam?.id) === String(favouriteTeamId)),
    }))

  const liveCount = gameList.filter(g => g.status === 'Active').length
  const finalCount = gameList.filter(g => g.status === 'Final').length
  const total = gameList.length

  // The pill states the real situation rather than disappearing when nothing is live.
  const { pillText, pillColor } = (() => {
    if (total === 0) return { pillText: 'NO GAMES SCHEDULED', pillColor: TEXT.muted }
    if (liveCount === total) return { pillText: `ALL ${total} LIVE`, pillColor: ACCENT.live }
    if (liveCount > 0) return { pillText: `${liveCount} OF ${total} LIVE`, pillColor: ACCENT.live }
    if (finalCount === total) return { pillText: `ALL ${total} FINAL`, pillColor: TEXT.muted }
    return { pillText: `${total} TO COME`, pillColor: TEXT.muted }
  })()

  // The pinned card wears the user's own team colour as its top border. That is a FILL,
  // so it uses the raw colour; only the PINNED label uses the corrected pink.
  const pinnedGame = ordered.find(o => o.pinned)?.game
  const pinnedTeam = pinnedGame
    ? (String(pinnedGame.homeTeam?.id) === String(favouriteTeamId) ? pinnedGame.homeTeam : pinnedGame.awayTeam)
    : null
  const pinnedAccent = pinnedTeam?.color || ACCENT.ownTeam

  const columns = density === 'large' ? 2 : 4

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '15px 28px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`, fontFamily: FONT,
      }}>
        <h1 style={{ ...font(800, 22, 1, '-0.03em'), color: TEXT.primary, margin: 0 }}>Game board</h1>

        <span style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          ...font(700, 10, 1, '0.1em'), color: pillColor,
          background: pillColor === ACCENT.live ? 'rgba(74,222,128,0.10)' : 'transparent',
          border: `1px solid ${pillColor === ACCENT.live ? 'rgba(74,222,128,0.30)' : BORDER.hairline}`,
          padding: '5px 8px', whiteSpace: 'nowrap',
        }}>
          {liveCount > 0 && <PulsingDot size={5} />}
          {pillText}
        </span>

        <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />

        <ScoreboardWeekNav
          currentWeek={seasonState.currentWeek}
          viewWeek={viewWeek}
          onChange={setViewWeek}
          variant="board"
        />

        <span style={{ flex: 1 }} />

        <span style={{ ...font(700, 10, 1, '0.12em'), color: TEXT.muted }}>DENSITY</span>
        <div style={{ display: 'flex', background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
          {(['large', 'small'] as Density[]).map((option, i) => {
            const active = density === option
            return (
              <button
                key={option}
                onClick={() => setDensity(option)}
                style={{
                  ...font(active ? 800 : 500, 11),
                  color: active ? BG.shell : TEXT.muted,
                  background: active ? TEXT.secondary : 'transparent',
                  border: 'none',
                  borderLeft: i > 0 ? `1px solid ${BORDER.hairline}` : 'none',
                  padding: '8px 13px', cursor: 'pointer', fontFamily: FONT,
                }}
              >{option.toUpperCase()}</button>
            )
          })}
        </div>
      </div>

      <div style={{
        padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: '14px',
        fontFamily: FONT,
      }}>
        {/* Above the cards, not below: what these games are being played under has to be
            read before the scores, not after scrolling past sixteen of them. */}
        <ActiveRulesStrip />

        {total === 0 ? (
          <div style={{
            background: BG.card, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
          }}>
            No games running. The next slate will appear here.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: '14px',
          }}>
            {ordered.map(({ game, chip, pinned }) => (
              density === 'large' ? (
                <BoardCardLarge
                  key={game.id}
                  game={game}
                  chip={chip}
                  pinned={pinned}
                  pinnedAccent={pinnedAccent}
                  scoringModel={scoringModel}
                  onOpen={openGame}
                />
              ) : (
                <BoardCardSmall
                  key={game.id}
                  game={game}
                  chip={chip}
                  pinned={pinned}
                  pinnedAccent={pinnedAccent}
                  scoringModel={scoringModel}
                  onOpen={openGame}
                />
              )
            ))}
          </div>
        )}

      </div>

      {modalGameId != null && (
        <GameModalNew gameId={modalGameId} onClose={closeGame} />
      )}
    </>
  )
}

export default GameBoardPage
