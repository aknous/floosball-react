import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGames } from '@/contexts/GamesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useScoringModel } from '@/contexts/ScoringModelContext'
import { useOpenGame } from '@/hooks/useOpenGame'
import { GameModalNew } from '@/Components/GameModalNew'
import { ScoreboardWeekNav } from '@/Components/ScoreboardWeekNav'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import BoardCardLarge from './BoardCardLarge'
import BoardCardSmall from './BoardCardSmall'
import { rankGames, chipFor, type Ranked } from './ranking'
import { PulsingDot } from './boardPieces'
import ActiveRulesStrip from './ActiveRulesStrip'
import { useNextGameCountdown } from '@/hooks/useNextGameCountdown'

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

  /**
   * A PAST week, fetched on demand.
   *
   * ⚠️ The week selector used to be decorative here: `viewWeek` was stored and
   * never read, so clicking back a week moved the label and left the current
   * slate on screen. `GamesContext` only ever holds the round in progress, so a
   * past week has to come from `/weekGames` the way `GameGridNew` already does.
   *
   * That payload is a SUMMARY — teams, score, quarter lines, status. It carries
   * no `gameStats` and no `plays`, because per-game TEAM stats are not persisted
   * at all (only the player rows are). So a past-week card knows the result and
   * nothing about how it was reached, and the rows that would need that data are
   * hidden rather than filled with dashes.
   */
  const [pastGames, setPastGames] = useState<any[]>([])
  const [pastLoading, setPastLoading] = useState(false)
  useEffect(() => {
    if (viewWeek === null) { setPastGames([]); return }
    let cancelled = false
    setPastLoading(true)
    fetch(`${API_BASE}/weekGames?week=${viewWeek}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setPastGames(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setPastGames([]) })
      .finally(() => { if (!cancelled) setPastLoading(false) })
    return () => { cancelled = true }
  }, [viewWeek])

  const isPast = viewWeek !== null
  const gameList = useMemo(
    () => (isPast ? pastGames : Array.from(games.values())),
    [isPast, pastGames, games],
  )

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
  const slateKey = gameList.map(g => Number(g.id)).sort((a, b) => a - b).join(',')
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

  // A past week resolves against its own fetched list — `games` holds only the
  // round in progress, so looking these ids up there returns nothing.
  const byId = useMemo(() => {
    if (!isPast) return games
    const map = new Map<number, any>()
    pastGames.forEach(g => map.set(Number(g.id), g))
    return map
  }, [isPast, pastGames, games])

  const ordered: Ranked[] = orderRef.current
    .map(id => byId.get(Number(id)))
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

  // Time to the next kickoff. Null in the no-wall-clock timing modes and while
  // games are running, so the chip simply does not appear — which is the normal
  // case, not a failure.
  const { text: countdown } = useNextGameCountdown(seasonState.nextGameStartTime)

  // The pinned card wears the user's own team colour as its top border. That is a FILL,
  // so it uses the raw colour; only the PINNED label uses the corrected pink.
  const pinnedGame = ordered.find(o => o.pinned)?.game
  const pinnedTeam = pinnedGame
    ? (String(pinnedGame.homeTeam?.id) === String(favouriteTeamId) ? pinnedGame.homeTeam : pinnedGame.awayTeam)
    : null
  const pinnedAccent = pinnedTeam?.color || ACCENT.ownTeam

  const columns = density === 'large' ? 2 : 4

  const renderGrid = (items: Ranked[]) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: '14px',
      // `start` rather than the default `stretch`: within a section cards are
      // the same height anyway, but a past week whose games predate the
      // team_stats column renders shorter than one whose games do not.
      alignItems: 'start',
    }}>
      {items.map(({ game, chip, pinned }) => (
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
  )

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

        {/* Next kickoff. Sits with the status pill because it answers the same
            question — what is happening on this board right now — and it is the
            only thing worth reading when nothing is live. */}
        {!isPast && countdown && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            ...font(700, 10, 1, '0.1em'), color: ACCENT.info,
            border: `1px solid ${ACCENT.info}40`,
            padding: '5px 8px', whiteSpace: 'nowrap',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke={ACCENT.info} strokeWidth="2.4" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
            <span style={TABULAR}>NEXT IN {countdown}</span>
          </span>
        )}

        <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />

        <ScoreboardWeekNav
          currentWeek={seasonState.currentWeek}
          viewWeek={viewWeek}
          onChange={setViewWeek}
          variant="board"
        />

        {/* The rules sit in the header row (owner), not as a slab above the cards.
            What these games are played under is a property of the board, so it
            belongs with the board's own title and controls. */}
        <ActiveRulesStrip />

        <span style={{ flex: 1 }} />

        <span style={{ ...font(700, 10, 1, '0.12em'), color: TEXT.muted, flexShrink: 0 }}>DENSITY</span>
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
        {pastLoading ? (
          <div style={{
            background: BG.card, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
          }}>
            Loading week {viewWeek}.
          </div>
        ) : total === 0 ? (
          <div style={{
            background: BG.card, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
          }}>
            {isPast ? `Nothing was played in week ${viewWeek}.` : 'No games running. The next slate will appear here.'}
          </div>
        ) : (
          /* Finished games sit in their OWN section (owner). A final card is
             genuinely shorter than a live one — it drops the win-probability
             gauge, which is a live readout and nothing else — so mixing the two
             in one grid left dead space inside every final card that happened to
             share a row with a live one. Splitting them makes each section
             uniform, which is a structural fix rather than an alignment tweak. */
          <>
            {ordered.some(o => o.game.status !== 'Final') && renderGrid(ordered.filter(o => o.game.status !== 'Final'))}

            {ordered.some(o => o.game.status === 'Final') && (
              <>
                {/* The heading earns its place only when there is something to
                    separate FROM. A whole week of finals is just the board. */}
                {ordered.some(o => o.game.status !== 'Final') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
                    <span style={{ ...font(700, 11, 1, '0.12em'), color: TEXT.muted, flexShrink: 0 }}>
                      FINAL
                    </span>
                    <span style={{ flex: 1, height: '1px', background: BORDER.hairline }} />
                  </div>
                )}
                {renderGrid(ordered.filter(o => o.game.status === 'Final'))}
              </>
            )}
          </>
        )}

      </div>

      {modalGameId != null && (
        <GameModalNew gameId={modalGameId} onClose={closeGame} />
      )}
    </>
  )
}

export default GameBoardPage
