import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GameModalNew, PAGE_THREE_COLUMN_MIN } from '@/Components/GameModalNew'
import RallyButton from '@/Components/GameModal/RallyPanel'
import TeamHoverCard from '@/Components/TeamHoverCard'
import { useGames } from '@/contexts/GamesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { rankGames } from '@/Views/GameBoard/ranking'
import { ordinal } from '@/utils/ordinal'
import GameBleachers, { useRailEntries } from './gameBleachers'

/**
 * The live game, on its own route.
 *
 * It was a modal opened from the board, the team page and the front page, and a
 * modal is why the fan conversation had nowhere to live. The route spends the
 * width it gained on a 372px right rail: the game on the left, the talk on the
 * right.
 *
 * Everything inside the left column is `GameModalNew` in its `page` layout —
 * the same field SVG, WP chart, replay, play rows and insights the modal
 * renders. This view adds only what the modal could not have: the nav bar, the
 * full-width scoreboard band, and the rail.
 */

/**
 * How wide the page is allowed to get.
 *
 * The handoff drew a fixed 1440px screen (1244px of content beside the 196px
 * nav) with the game stacked over the plays. Running the plays BESIDE the field
 * instead — three columns — needs more room than that, so the cap is higher
 * whenever three columns are actually in play, and falls back to the drawn
 * measure when they are not.
 *
 * A cap either way: the rail is a fixed 372px, so on an uncapped page every
 * extra pixel of monitor lands in the game column, and the field — `width:100%`
 * of a 600×220 viewBox — grows with it until the pitch is a mural.
 *
 * The bands stay full-bleed (background and bottom rule span the window); only
 * their CONTENT is capped, so nothing reads as cut off on a wide display.
 */
const CONTENT_MAX_STACKED = 1244
const CONTENT_MAX_THREE_COLUMN = 1720

/**
 * Momentum.
 *
 * ⚠️ The SAME path the game card and the modal draw — a two-part flame with an
 * inner cutout, not a plain teardrop. A hand-rolled one read as a different
 * icon for the same idea. Only the size differs here: it sits beside a 46px
 * score rather than a 12px label.
 */
const FlameIcon: React.FC<{ color: string; size?: number; glow?: string }> = ({ color, size = 13, glow }) => (
  <svg
    viewBox="0 0 24 24" fill={color}
    style={{
      width: `${size}px`, height: `${size}px`, flexShrink: 0, display: 'block',
      filter: glow && glow !== 'none' ? `drop-shadow(${glow})` : undefined,
      transition: 'all 0.5s ease',
    }}
  >
    <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
  </svg>
)

const Chevron: React.FC<{ dir: 'left' | 'right' }> = ({ dir }) => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, display: 'block' }}>
    <path
      d={dir === 'left' ? 'M12 4l-6 6 6 6' : 'M8 4l6 6-6 6'}
      stroke={TEXT.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
)

const NavPlate: React.FC<{
  onClick?: () => void
  to?: string
  children: React.ReactNode
  disabled?: boolean
}> = ({ onClick, to, children, disabled }) => {
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: BG.card, border: `1px solid ${BORDER.raised}`,
    padding: '8px 11px', cursor: disabled ? 'default' : 'pointer',
    textDecoration: 'none', fontFamily: FONT,
    opacity: disabled ? 0.4 : 1,
  }
  if (to && !disabled) return <Link className="plate" to={to} style={style}>{children}</Link>
  return <button className={disabled ? undefined : 'plate'} onClick={onClick} disabled={disabled} style={style}>{children}</button>
}

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { games } = useGames()
  const { user } = useAuth()
  const { seasonState } = useFloosball()

  const id = Number(gameId)
  const gameData: any = games.get(id)

  /**
   * Prev / next walk the GAME BOARD'S OWN interest order, not the schedule.
   *
   * "Next" therefore means the next most interesting game, which is the point —
   * and the ranking is frozen in a ref for exactly the reason the board freezes
   * it: it must not re-sort under the reader as scores land.
   */
  const allGames = useMemo(() => Array.from(games.values()), [games])
  const rankedRef = useRef<number[] | null>(null)
  const ranked = useMemo(() => {
    if (rankedRef.current && rankedRef.current.length) return rankedRef.current
    if (!allGames.length) return []
    const order = rankGames(
      allGames as any,
      user?.favoriteTeamId ?? null,
      null,
      () => null,
    ).map(r => Number((r.game as any).id ?? (r.game as any).gameId))
    rankedRef.current = order
    return order
  }, [allGames, user?.favoriteTeamId])

  const position = ranked.indexOf(id)
  const prevId = position > 0 ? ranked[position - 1] : ranked.length ? ranked[ranked.length - 1] : null
  const nextId = position >= 0 && position < ranked.length - 1 ? ranked[position + 1] : ranked.length ? ranked[0] : null
  const nameOf = (otherId: number | null): string => {
    if (otherId == null) return ''
    const other: any = games.get(otherId)
    if (!other) return ''
    return `${other.awayTeam?.abbr ?? '???'} at ${other.homeTeam?.abbr ?? '???'}`
  }

  // Reset the frozen order when the round changes underneath us.
  useEffect(() => { rankedRef.current = null }, [seasonState?.currentWeek])

  // Must agree with GameModalNew's own threshold, or the page caps at a width
  // the three columns cannot use.
  const threeColumn = !useIsMobile(PAGE_THREE_COLUMN_MIN)
  const contentMax = threeColumn ? CONTENT_MAX_THREE_COLUMN : CONTENT_MAX_STACKED

  const railEntries = useRailEntries(gameData?.plays)

  /**
   * How many people are here. It rides the season socket rather than the game
   * payload, so the rail has to ask for it itself — and it is the Bleachers'
   * empty state too: a game nobody has posted in still says who is watching.
   */
  const { subscribe: subscribeSeason } = useSeasonWebSocket()
  const [watching, setWatching] = useState<number | null>(null)
  useEffect(() => {
    setWatching(null)   // never carry a count across a game switch
    return subscribeSeason((msg: any) => {
      if (msg?.event === 'viewer_count' && String(msg.gameId) === String(id)) {
        setWatching(Number(msg.count) || 0)
      }
    })
  }, [id, subscribeSeason])

  const awayDisplayColor = useMemo(
    () => effectiveAwayColor(
      gameData?.homeTeam?.color, gameData?.awayTeam?.color, gameData?.awayTeam?.secondaryColor,
    ),
    [gameData?.homeTeam?.color, gameData?.awayTeam?.color, gameData?.awayTeam?.secondaryColor],
  )

  if (!gameData) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', ...font(400, 13), color: TEXT.muted, fontFamily: FONT }}>
        This game is not in the current round.
      </div>
    )
  }

  const homeColor = gameData.homeTeam.color
  const isLive = gameData.status === 'Active'
  const absMomentum = Math.abs(gameData.momentum ?? 0)
  const flameColor = absMomentum >= 25 ? '#f97316' : absMomentum >= 15 ? '#fb923c' : '#fdba74'
  // Same glow rule as the game card: only a real run gets it.
  const flameGlow = absMomentum >= 25 ? '0 0 6px #f97316' : 'none'
  const yourTeamId = user?.favoriteTeamId ?? null
  const isYours = yourTeamId != null
    && (Number(gameData.homeTeam.id) === yourTeamId || Number(gameData.awayTeam.id) === yourTeamId)

  const teamBlock = (side: 'home' | 'away') => {
    const team = side === 'home' ? gameData.homeTeam : gameData.awayTeam
    const colour = side === 'home' ? homeColor : awayDisplayColor
    const score = side === 'home' ? gameData.homeScore : gameData.awayScore
    const hasBall = isLive && gameData.possession === team.abbr
    const hasMomentum = isLive && gameData.momentumTeam === team.abbr
    const record = side === 'home' ? gameData.homeRecord : gameData.awayRecord

    const identity = (
      <>
        <TeamHoverCard teamId={team.id}>
          <img
            src={`/avatars/${team.id}.png`}
            alt=""
            width={46}
            height={46}
            style={{
              borderRadius: '50%', flexShrink: 0, display: 'block',
              // The possession ring — the one thing on the band that moves.
              outline: hasBall ? '2px solid #ffffff' : 'none',
              outlineOffset: '3px',
            }}
          />
        </TeamHoverCard>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ ...font(500, 12, 1, '0.04em'), color: TEXT.muted }}>{team.city}</span>
            {record && <span style={{ ...font(500, 11), color: TEXT.muted }}>{record}</span>}
          </span>
          <Link to={`/team/${team.id}`} style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'block', ...font(800, 24, 1, '-0.025em'), color: TEXT.primary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{team.name}</span>
          </Link>
        </span>
      </>
    )

    // The flame rides the SCORE, not the record line — momentum is about who is
    // taking the game over, so it belongs next to the number that says so. It
    // sits on the outer side of each score so the two big numbers stay
    // symmetric about the centre clock.
    const scoreEl = (
      <span style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {side === 'away' && hasMomentum && <FlameIcon color={flameColor} size={30} glow={flameGlow} />}
        <span style={{ ...font(800, 46, 1), color: TEXT.primary, ...TABULAR }}>
          {score ?? 0}
        </span>
        {side === 'home' && hasMomentum && <FlameIcon color={flameColor} size={30} glow={flameGlow} />}
      </span>
    )

    // Away reads left-to-right, home right-to-left, matching the field's ends.
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '14px', justifyContent: side === 'home' ? 'flex-end' : 'flex-start' }}>
        {side === 'away' ? <>{identity}<span style={{ flex: 1 }} />{scoreEl}</> : <>{scoreEl}<span style={{ flex: 1 }} />{identity}</>}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FONT }}>

      {/* Nav bar — back to the board, and the round in its interest order. */}
      <div style={{
        background: BG.shell, borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        padding: '13px 28px', maxWidth: contentMax, margin: '0 auto',
      }}>
        <NavPlate to="/games">
          <span style={{ ...font(800, 14), color: TEXT.body }}>←</span>
          <span style={{ ...font(700, 11, 1, '0.08em'), color: TEXT.body }}>GAME BOARD</span>
        </NavPlate>
        <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />
        <NavPlate onClick={() => prevId != null && navigate(`/game/${prevId}`)} disabled={prevId == null}>
          <Chevron dir="left" />
          <span style={{ ...font(600, 11, 1, '0.06em'), color: TEXT.muted }}>{nameOf(prevId)}</span>
        </NavPlate>
        {position >= 0 && (
          <span style={{ ...font(600, 11, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>
            GAME {position + 1} OF {ranked.length}
          </span>
        )}
        <NavPlate onClick={() => nextId != null && navigate(`/game/${nextId}`)} disabled={nextId == null}>
          <span style={{ ...font(600, 11, 1, '0.06em'), color: TEXT.muted }}>{nameOf(nextId)}</span>
          <Chevron dir="right" />
        </NavPlate>
        <span style={{ flex: 1 }} />
        <span style={{ ...font(600, 10, 1, '0.12em'), color: TEXT.muted }}>INTEREST ORDER</span>
        {isYours && (
          <span style={{
            ...font(700, 10, 1, '0.1em'), color: ACCENT.ownTeam,
            border: '1px solid rgba(244,114,182,0.35)', padding: '5px 8px',
          }}>YOUR TEAM</span>
        )}
      </div>
      </div>

      {/* Scoreboard band — away tint left, home tint right, matching the field.
          The gradient spans the window; the teams sit on the capped measure. */}
      <div style={{
        borderBottom: `1px solid ${BORDER.raised}`,
        background: `linear-gradient(100deg, ${awayDisplayColor}1a 0%, ${BG.shell} 42%, ${BG.shell} 58%, ${homeColor}22 100%)`,
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '26px',
        padding: '18px 28px', maxWidth: contentMax, margin: '0 auto',
      }}>
        {teamBlock('away')}
        <div style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '9px', padding: '0 8px',
        }}>
          {isLive && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse" style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: ACCENT.live, display: 'block',
              }} />
              <span style={{ ...font(700, 11, 1, '0.12em'), color: ACCENT.live }}>LIVE</span>
            </span>
          )}
          <span style={{ ...font(800, 26, 1), color: TEXT.primary, ...TABULAR }}>
            {gameData.status === 'Final' ? 'FINAL' : (gameData.timeRemaining ?? '—')}
          </span>
          <span style={{ ...font(600, 10, 1, '0.1em'), color: TEXT.muted, textAlign: 'center' }}>
            {/* ⚠️ Distance is `yardsToFirstDown`, not `yardsToGo` — the latter does
                not exist on the payload and rendered "4 & undefined". Goal-line
                carries the string "Goal" rather than a number. */}
            {gameData.status === 'Final'
              ? `${gameData.homeTeam.abbr} ${gameData.homeScore} · ${gameData.awayTeam.abbr} ${gameData.awayScore}`
              : [
                  // `> 0`, not `!= null`: a scheduled game carries down 0 and
                  // distance 0, which rendered "0th & 0" before kickoff.
                  Number(gameData.down) > 0 && gameData.yardsToFirstDown != null
                    ? `${ordinal(Number(gameData.down))} & ${gameData.yardsToFirstDown}`
                    : null,
                  gameData.yardLine,
                ].filter(Boolean).join(' · ') || '—'}
          </span>
        </div>
        {teamBlock('home')}
      </div>
      </div>

      {/* Body. The COLUMNS are decided inside the game view, not here: the rail
          only earns one while the Plays view is up, and only that component
          knows which view that is. */}
      <div style={{
        padding: '20px 28px 32px',
        maxWidth: contentMax, margin: '0 auto',
      }}>
        <GameModalNew
          gameId={id}
          layout="page"
          onClose={() => navigate('/games')}
          railContent={(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              {/* No header. The buttons say "Cheer" and carry their club's crest
                  and colour, so a RALLY label above them only repeated what they
                  already show. */}
              {isLive && (
                <div style={{
                  background: BG.card, border: `1px solid ${BORDER.hairline}`,
                  padding: '14px', display: 'flex', gap: '10px',
                }}>
                  <RallyButton game={gameData} teamId={Number(gameData.homeTeam.id)} teamColor={homeColor} />
                  <RallyButton game={gameData} teamId={Number(gameData.awayTeam.id)} teamColor={awayDisplayColor} />
                </div>
              )}

              <GameBleachers entries={railEntries} watching={watching} gameId={id} />
            </div>
          )}
        />
      </div>
    </div>
  )
}

export default GamePage
