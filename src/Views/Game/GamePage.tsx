import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GameModalNew, PAGE_THREE_COLUMN_MIN } from '@/Components/GameModalNew'
import RallyButton from '@/Components/GameModal/RallyPanel'
import CheerBar from '@/Components/CheerBar'
import TeamHoverCard from '@/Components/TeamHoverCard'
import { useGames } from '@/contexts/GamesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, SHELL_MOBILE_MAX, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { rankGames } from '@/Views/GameBoard/ranking'
import { FormatScore } from '@/Views/GameBoard/gameFormat'
import { useScoringModel } from '@/contexts/ScoringModelContext'
import { ordinal } from '@/utils/ordinal'
import GameBleachers, { useRailEntries } from './gameBleachers'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

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
  const liveGame: any = games.get(id)

  /**
   * A game from a PAST week, fetched on demand.
   *
   * ⚠️ `GamesContext` only ever holds the CURRENT round, so opening a game from an
   * earlier week found nothing and the page said "This game is not in the current
   * round" — which is true of the context and useless to a reader who has just
   * clicked a result. The backend serves it perfectly well: `/api/games/{id}` falls
   * back to rebuilding a finished game from the database, box score and all.
   *
   * The context stays the preferred source when it HAS the game — those rows are
   * websocket-updated, and a fetched snapshot would go stale mid-drive.
   */
  const [fetched, setFetched] = useState<any>(null)
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'missing'>('idle')
  useEffect(() => {
    if (liveGame || !Number.isFinite(id)) { setFetched(null); setFetchState('idle'); return }
    let cancelled = false
    setFetched(null)
    setFetchState('loading')
    fetch(`${API_BASE}/games/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled) return
        const data = json?.data ?? json
        if (data && data.homeTeam && data.awayTeam) { setFetched(data); setFetchState('idle') }
        else setFetchState('missing')
      })
      .catch(() => { if (!cancelled) setFetchState('missing') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!liveGame])

  const gameData: any = liveGame ?? fetched

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
  // Phone: the nav bar and the body both give back their 28px side padding.
  const narrow = useIsMobile(SHELL_MOBILE_MAX)
  const contentMax = threeColumn ? CONTENT_MAX_THREE_COLUMN : CONTENT_MAX_STACKED

  const scoringModel = useScoringModel()

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
        {fetchState === 'loading' ? 'Loading the game.' : 'That game could not be found.'}
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

  /**
   * The period breakdown for the band, in whatever the game's format calls a period.
   *
   * ⚠️ This used to bail out on innings and frames, which left the band as a name and
   * a total with nothing between them, and left `GameModalNew` showing its OLD
   * scoreboard block underneath to carry the line score. Two scoreboards on one page,
   * one of them mostly blank. All three formats have the same SHAPE — a row per club,
   * a column per period, a total — so they all go in the band.
   *
   * `null` in `values` means "not played yet" and renders as a dash, which innings
   * needs (the home side has not batted the bottom of the current inning) and frames
   * needs (future frames exist but have no score).
   */
  const periodLine: {
    labels: string[]
    activeIndex: number | null
    /** Frames only: won / lost / halved, for the cell tint. */
    tone: ((side: 'home' | 'away', i: number) => 'won' | 'lost' | 'tie' | null) | null
    rows: { side: 'home' | 'away'; values: (number | null)[] }[]
  } | null = (() => {
    const fr = gameData.frames
    if (fr?.active) {
      const N = fr.framesPerGame
      const done = fr.frameResults ?? []
      const frame = (i: number) => {   // i is 1-based
        if (i <= done.length) return done[i - 1]
        if (i === done.length + 1 && i <= N) return { home: fr.frameHome, away: fr.frameAway, winner: null }
        return null
      }
      return {
        labels: Array.from({ length: N }, (_, k) => String(k + 1)),
        activeIndex: fr.currentFrame ? fr.currentFrame - 1 : null,
        tone: (side, i) => {
          const d: any = frame(i + 1)
          if (!d || d.winner == null) return null
          return d.winner === 'tie' ? 'tie' : d.winner === side ? 'won' : 'lost'
        },
        rows: (['away', 'home'] as const).map(side => ({
          side,
          values: Array.from({ length: N }, (_, k) => {
            const d: any = frame(k + 1)
            return d ? (side === 'home' ? d.home : d.away) : null
          }),
        })),
      }
    }

    const inn = gameData.innings
    if (inn?.active && inn.lineScore) {
      const ls = inn.lineScore
      return {
        labels: ls.innings.map(String),
        activeIndex: ls.innings.indexOf(inn.inning) >= 0 ? ls.innings.indexOf(inn.inning) : null,
        tone: null,
        rows: (['away', 'home'] as const).map(side => ({
          side,
          values: ls.innings.map((innNum: number, i: number) => {
            // Away bats the top, home the bottom — so home's cell for the current
            // inning stays blank until the half turns over.
            const batted = side === 'away'
              ? innNum <= inn.inning
              : (innNum < inn.inning || (innNum === inn.inning && inn.half === 'bottom'))
            return batted ? ((ls as any)[side][i] ?? 0) : null
          }),
        })),
      }
    }

    const qs = gameData.quarterScores
    if (!qs) return null
    const hasOt = (qs.home?.ot ?? 0) > 0 || (qs.away?.ot ?? 0) > 0
    const keys = hasOt ? ['q1', 'q2', 'q3', 'q4', 'ot'] : ['q1', 'q2', 'q3', 'q4']
    const q = Number(gameData.quarter) || 0
    return {
      labels: keys.map(k => k.toUpperCase()),
      activeIndex: isLive && q > 0 ? Math.min(q - 1, keys.length - 1) : null,
      tone: null,
      rows: (['away', 'home'] as const).map(side => ({
        side,
        values: keys.map(k => (qs[side]?.[k] ?? 0) as number),
      })),
    }
  })()

  /**
   * In frames the SCORE does not decide the game — frames won does, with points only
   * as the tiebreak. So the band gains a FRAMES column and the points total keeps the
   * right-hand slot it has in every other format.
   */
  const framesWon = gameData.frames?.active
    ? { home: gameData.frames.framesWonHome ?? 0, away: gameData.frames.framesWonAway ?? 0 }
    : null

  /**
   * Chess clock: each club's REMAINING OFFENSE BUDGET, per team, on its own row.
   *
   * ⚠️ In this format the budget is the thing you actually watch — once a club runs
   * out it cannot get the ball back, so "8:21" on the game clock says nothing about
   * who is running out of game. The board carried the quarter line and the score and
   * never showed it; only the old modal did.
   *
   * A per-team COLUMN rather than a line underneath, because it is a per-team number
   * and the band already has the shape for one (frames won took the same slot).
   */
  const chess = gameData.chessClock?.active && gameData.status !== 'Scheduled'
    ? {
        home: gameData.chessClock.homeBudget ?? 0,
        away: gameData.chessClock.awayBudget ?? 0,
        homeLockedOut: !!gameData.chessClock.homeLockedOut,
        awayLockedOut: !!gameData.chessClock.awayLockedOut,
      }
    : null

  /** Budget health, matching the thresholds the game modal has always used. */
  const CHESS_LOW_SECS = 60
  const CHESS_HIGH_SECS = 300
  const chessClockText = (secs: number, locked: boolean) =>
    locked ? 'OUT' : `${Math.floor(Math.max(0, secs) / 60)}:${String(Math.max(0, Math.round(secs)) % 60).padStart(2, '0')}`
  const chessClockColor = (secs: number, locked: boolean) =>
    locked || secs <= CHESS_LOW_SECS ? ACCENT.negative
      : secs <= CHESS_HIGH_SECS ? ACCENT.warning
      : ACCENT.live

  /**
   * ⚠️ The period columns TIGHTEN past five of them. A quarter line is four columns and
   * leaves the club plenty of room; six frames plus FR plus PTS at the same widths left
   * about 40px for the name and rendered "Monum..." / "Stran...". Innings can run to
   * nine. The club's name is the one thing on the band that must never truncate, so the
   * numbers give up the width.
   */
  // ⚠️ A phone drops the period columns entirely. Even tightened they left about 60px
  // for the club and rendered "Buf..." / "Cra..." on a 375px screen, and the club is the
  // one thing on a scoreboard that must never truncate. The quarter, frame or inning
  // breakdown is a detail; who is playing and what the score is are not.
  const periodCount = narrow ? 0 : (periodLine?.labels.length ?? 0)
  // ⚠️ The chess clock counts toward the squeeze, at roughly the two period cells its
  // 62px is worth. The rule only counted PERIODS, so a chess-clock game — four
  // quarters, well under the threshold — never tightened, and its extra column plus
  // the momentum flame ate the name instead: "Washington Monum..." on a club the band
  // had room for a moment earlier. The flame is the part that makes it intermittent,
  // which is why it reads as a glitch rather than a layout limit.
  const numberColumns = periodCount + (chess ? 2 : 0)
  const tight = numberColumns > 5
  const CELL_W = tight ? 25 : 34
  const COL_GAP = tight ? 5 : 8

  /**
   * One row of the scoreboard: crest, club, its period scores, its total.
   *
   * The band used to be two team blocks with a spacer shoving each score to the
   * middle, and the period line as a separate centred table underneath. That is
   * a lot of empty band for four numbers. As rows against shared period columns
   * it is the shape a scoreboard actually has, and the width goes to the numbers
   * instead of the gap.
   */
  /**
   * The period and the clock as one string.
   *
   * Innings and frames have no quarter clock at all and say so in their own
   * words; everything else reads "Q3 · 8:21", with OT past regulation.
   */
  const periodClock = (() => {
    if (gameData.innings?.active) {
      const inn = gameData.innings
      return `${inn.half === 'bottom' ? 'BOT' : 'TOP'} ${inn.inning}`
    }
    if (gameData.frames?.active && !gameData.frames.overtime) {
      // The frame clock is the only clock a frames game has, so it belongs beside
      // the frame the same way a quarter clock belongs beside its quarter.
      return [`Frame ${gameData.frames.currentFrame}`, gameData.frames.frameClock]
        .filter(Boolean).join(' · ')
    }
    const q = Number(gameData.quarter) || 0
    const label = q > 4 ? 'OT' : q > 0 ? `Q${q}` : null
    const clock = gameData.timeRemaining
    return [label, clock].filter(Boolean).join(' · ') || '—'
  })()

  const teamRow = (side: 'home' | 'away') => {
    const team = side === 'home' ? gameData.homeTeam : gameData.awayTeam
    const score = side === 'home' ? gameData.homeScore : gameData.awayScore
    const hasBall = isLive && gameData.possession === team.abbr
    const hasMomentum = isLive && gameData.momentumTeam === team.abbr
    const record = side === 'home' ? gameData.homeRecord : gameData.awayRecord
    const periods = periodLine?.rows.find(r => r.side === side)?.values ?? []
    const tone = periodLine?.tone
    // A won frame reads green, a halved one amber, a lost one recedes. Everything
    // else in the band is neutral, which is the point: in match play the only thing
    // that matters is who took the frame.
    // ⚠️ A lost frame's number is content, so it sits at the readable floor (muted)
    // rather than receding to #475569. The winner is separated by COLOUR and WEIGHT,
    // which is enough contrast without making half the line score unreadable.
    const TONE_COLOR = { won: ACCENT.live, tie: ACCENT.warning, lost: TEXT.muted } as const

    return (
      <React.Fragment key={side}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: tight ? '9px' : '12px',
          minWidth: 0, padding: '5px 0',
          // Never let the name touch the first number, however tight the columns get.
          paddingRight: '8px',
        }}>
          <TeamHoverCard teamId={team.id}>
            <img
              src={`/avatars/${team.id}.png`}
              alt=""
              width={tight ? 26 : 32}
              height={tight ? 26 : 32}
              style={{
                borderRadius: '50%', flexShrink: 0, display: 'block',
                // The possession ring — the one thing on the band that moves.
                outline: hasBall ? '2px solid #ffffff' : 'none',
                outlineOffset: '2px',
              }}
            />
          </TeamHoverCard>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ ...font(500, 11, 1, '0.04em'), color: TEXT.muted, display: 'block' }}>{team.city}</span>
              {record && <span style={{ ...font(500, 10), color: TEXT.muted }}>{record}</span>}
            </span>
            <Link to={`/team/${team.id}`} style={{ textDecoration: 'none' }}>
              <span style={{
                // ⚠️ lineHeight 1, not 1.1. The rows share a pitch, so a taller
                // line box on the name eats the gap between the two clubs —
                // measured 23px between the names against 26px between the
                // period numbers, which is exactly the difference in box height.
                display: 'block', ...font(800, tight ? 15 : 17, 1, '-0.025em'), color: TEXT.primary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{team.name}</span>
            </Link>
          </span>
          {hasMomentum && <FlameIcon color={flameColor} size={20} glow={flameGlow} />}
        </div>

        {!narrow && periods.map((value, i) => {
          const t = tone?.(side, i) ?? null
          return (
            <div key={i} style={{
              ...font(t === 'won' ? 800 : 600, 16),
              // A dash for an unplayed period is decoration, not content, so it may sit
              // below the floor; every real number stays at or above muted.
              color: value == null ? TEXT.faint : t ? TONE_COLOR[t] : TEXT.secondary,
              textAlign: 'center', ...TABULAR,
            }}>
              {value == null ? '-' : value}
            </div>
          )
        })}

        {/* ⚠️ ONE cell, not a frames column and a points column. Split across two grid
            columns they sat a whole column gap apart and read as two unrelated scores,
            with the club's name squeezed to make room. The large board card had already
            solved this: frames, a hairline, then the points at 45% size and muted, all
            in one tight cluster — so this uses that component rather than a second
            implementation of the same idea, and inherits its level-match highlight. */}
        {chess && (
          <div style={{
            ...font(800, 15, 1), ...TABULAR, textAlign: 'right',
            color: chessClockColor(
              side === 'home' ? chess.home : chess.away,
              side === 'home' ? chess.homeLockedOut : chess.awayLockedOut,
            ),
          }}>
            {chessClockText(
              side === 'home' ? chess.home : chess.away,
              side === 'home' ? chess.homeLockedOut : chess.awayLockedOut,
            )}
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <FormatScore
            game={gameData}
            side={side}
            scoringModel={scoringModel}
            size={framesWon ? 24 : 28}
            color={TEXT.primary}
          />
        </div>
      </React.Fragment>
    )
  }

  return (
    // Fills the shell's content column, so the plays panel below can be told to
    // run to the bottom of the page instead of guessing at a height.
    <div style={{ fontFamily: FONT, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Nav bar — back to the board, and the round in its interest order. */}
      <div style={{
        background: BG.shell, borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        padding: narrow ? '10px 12px' : '13px 28px', maxWidth: contentMax, margin: '0 auto',
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

        {/* ⚠️ The spectating bar lives HERE because the page hides the modal's
            header entirely (`display: asPage ? 'none' : 'flex'` in GameModalNew),
            and the bar was the only thing in it that still had a job. So a reader
            who moved from the modal to the page stopped earning for watching and
            got no indication that anything had changed.

            The nav row is this page's header. It is also the right place on its
            own terms: the bar is about the reader, not the game, so it does not
            belong on the scoreboard band beside the score and the down. The
            component returns null off a live game, so a final keeps a clean row.

            Signed out it is hidden: every number in it would be a zero that never
            moves, and it would promise a payout that cannot be credited. */}
        {user && <CheerBar
          gameId={id}
          isLive={isLive}
          playCount={(gameData.plays as any[] | undefined)
            ?.filter((p: any) => !p.event && !p.isSidelineCutaway).length ?? 0}
          score={(gameData.homeScore ?? 0) + (gameData.awayScore ?? 0)}
          bigPlayCount={(gameData.plays as any[] | undefined)
            ?.filter((p: any) => p.isBigPlay && !p.isSidelineCutaway).length ?? 0}
          compact
        />}
      </div>
      </div>

      {/* Body. The COLUMNS are decided inside the game view, not here: the rail
          only earns one while the Plays view is up, and only that component
          knows which view that is. */}
      <div style={{
        padding: narrow ? '12px 10px 20px' : '20px 28px 24px',
        maxWidth: contentMax, margin: '0 auto',
        flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column',
      }}>
        <GameModalNew
            fallbackGame={fetched as any}
          gameId={id}
          layout="page"
          onClose={() => navigate('/games')}
          scoreboard={(
            <div style={{
              background: `linear-gradient(100deg, ${awayDisplayColor}1a 0%, ${BG.card} 45%, ${BG.card} 55%, ${homeColor}22 100%)`,
              borderBottom: `1px solid ${BORDER.raised}`,
              padding: '13px 15px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: [
                  'minmax(0,1fr)',
                  `repeat(${periodCount}, ${CELL_W}px)`,
                  // The clock holds "12:34" or "OUT" and nothing wider, so it takes
                  // only what those need — and gives up more once the band is tight.
                  chess ? (tight ? '46px' : '54px') : null,
                  framesWon ? '78px' : '56px',
                ].filter(Boolean).join(' '),
                alignItems: 'center',
                columnGap: `${COL_GAP}px`,
              }}>
                {periodLine && !narrow && (
                  <>
                    <span />
                    {periodLine.labels.map((label, i) => (
                      <span key={label} style={{
                        ...font(700, 11, 1, '0.1em'),
                        // The live period is named louder than the ones behind it.
                        color: i === periodLine.activeIndex ? TEXT.body : TEXT.muted,
                        textAlign: 'center',
                      }}>{label}</span>
                    ))}
                    {/* In frames the big number is frames WON and the small one beside
                        it is points, so the pair is labelled. Everywhere else the biggest
                        number on a scoreboard does not need a heading. */}
                    {chess && (
                      <span style={{ ...font(700, 10, 1, '0.1em'), color: TEXT.muted, textAlign: 'right' }}>
                        CLOCK
                      </span>
                    )}
                    <span style={framesWon
                      ? { ...font(700, 10, 1, '0.1em'), color: TEXT.muted, textAlign: 'right' }
                      : undefined}>{framesWon ? 'FRAMES · PTS' : null}</span>
                  </>
                )}
                {teamRow('away')}
                {teamRow('home')}
              </div>

              {/* Where the game IS, under the board that says where it stands.
                  The quarter belongs here with the clock — "8:21" alone does not
                  tell you whether this is the first quarter or the last. */}
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap',
                marginTop: '11px', paddingTop: '10px',
                borderTop: `1px solid ${BORDER.hairline}`,
              }}>
                {/* No LIVE badge. A moving clock and a down-and-distance say the
                    game is on; the badge was repeating them. */}
                <span style={{ ...font(800, 17, 1), color: TEXT.primary, ...TABULAR }}>
                  {gameData.status === 'Final'
                    ? `FINAL${gameData.isOvertime ? ' / OT' : ''}`
                    : periodClock}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ ...font(600, 13, 1.4, '0.06em'), color: TEXT.secondary }}>
                  {/* ⚠️ Distance is `yardsToFirstDown`; `yardsToGo` does not exist
                      on the payload and rendered "4 & undefined". A scheduled game
                      carries down 0, hence `> 0` rather than a null check. */}
                  {[
                    Number(gameData.down) > 0 && gameData.yardsToFirstDown != null
                      ? `${ordinal(Number(gameData.down))} & ${gameData.yardsToFirstDown}`
                      : null,
                    gameData.yardLine,
                  ].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
          )}
          railContent={(
            <GameBleachers
              entries={railEntries}
              watching={watching}
              gameId={id}
              // No header on the cheer row. The buttons say "Cheer" and carry
              // their club's crest and colour, so a RALLY label only repeated
              // what they already show.
              rally={isLive ? (
                <>
                  <RallyButton game={gameData} teamId={Number(gameData.homeTeam.id)} teamColor={homeColor} />
                  <RallyButton game={gameData} teamId={Number(gameData.awayTeam.id)} teamColor={awayDisplayColor} />
                </>
              ) : undefined}
            />
          )}
        />
      </div>
    </div>
  )
}

export default GamePage
