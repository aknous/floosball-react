import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGames } from '@/contexts/GamesContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { XIcon } from '@heroicons/react/solid'
import PlayerHoverCard from './PlayerHoverCard'
import TeamHoverCard from './TeamHoverCard'
import HoverTooltip from './HoverTooltip'
import { Stars } from './Stars'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PlayInsightsPanel } from './PlayInsightsPanel'
import { personalityAccent } from '@/utils/personality'
import { pressureHandlingTier } from '@/utils/mentalProfile'
import { PlayReactions } from './GameModal/PlayReactions'
import RallyButton from './GameModal/RallyPanel'
import CheerBar from './CheerBar'
import { GlitchedText } from './GlitchedText'
import { effectiveAwayColor } from '@/utils/colors'
import { formatScore } from '@/utils/formatScore'
import { displayScore, ScoringModel } from '@/utils/displayScore'
import { ordinal } from '@/utils/ordinal'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Viewport width at which the game route runs three columns — game state, plays,
 * Bleachers — instead of stacking the first two.
 *
 * Exported because the page sets its own max width off the same threshold: the
 * two have to agree or the layout caps at a width the columns cannot use.
 */
export const PAGE_THREE_COLUMN_MIN = 1500

interface GameModalNewProps {
  onClose: () => void
  gameId: number
  /**
   * `modal` (default) is the overlay opened from the board, the team page and
   * the front page. `page` is the same game rendered inline as the left column
   * of the game route — no overlay, no card, no close button, and no scores
   * block, because the route puts a full-width scoreboard band above it.
   *
   * A prop rather than a fork: everything that makes this component worth
   * reusing — the field SVG, the WP chart, replay, the play rows and their
   * insights, the box score — is identical in both, and a copy would drift.
   */
  layout?: 'modal' | 'page'
  /**
   * The Bleachers rail, rendered BESIDE the play feed rather than as a sibling
   * column of the page.
   *
   * It lives here because it belongs to the Plays view: the fan feed is what you
   * read while watching, and the box score and player stats are a different job
   * that wants the width instead. As a page-level column it took 372px away
   * from a box score that needed it and gave it to a feed nobody reads while
   * studying a stat line.
   */
  railContent?: React.ReactNode
}

interface ReplayControlBarProps {
  active: boolean
  playing: boolean
  index: number
  count: number
  speed: number
  isLive: boolean
  accentColor: string
  onStart: (speed?: number) => void
  onExit: () => void
  onStep: (delta: number) => void
  onScrub: (i: number) => void
  onToggle: () => void
  onCycleSpeed: () => void
}

/** Replay / catch-up transport, rendered on the "Field Position" header line so
 *  it never adds a row of its own. Idle = label + a compact button; active =
 *  the full transport replaces the label. */
const ReplayControlBar: React.FC<ReplayControlBarProps> = ({
  active, playing, index, count, speed, isLive, accentColor,
  onStart, onExit, onStep, onScrub, onToggle, onCycleSpeed,
}) => {
  const iconBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '26px', backgroundColor: '#1e293b',
    border: '1px solid #334155', borderRadius: '5px',
    color: '#e2e8f0', cursor: 'pointer', flexShrink: 0,
  }
  const atEnd = index >= count - 1

  if (!active) {
    return (
      <>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Field Position
        </span>
        <span style={{ flex: 1 }} />
        {count > 0 && (
          <button
            onClick={() => onStart(isLive ? 4 : 1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 11px', backgroundColor: '#1e293b',
              border: '1px solid #334155', borderRadius: '6px',
              color: '#e2e8f0', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l11 6-11 6z" /></svg>
            {isLive ? 'Catch Up' : 'Replay'}
          </button>
        )}
      </>
    )
  }

  return (
    <>
      <button onClick={() => onStep(-1)} disabled={index <= 0}
        style={{ ...iconBtn, opacity: index <= 0 ? 0.4 : 1 }} aria-label="Previous play">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M5 2v12H3V2zm9 0v12L6 8z" /></svg>
      </button>
      <button onClick={onToggle} style={iconBtn} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h4v12H3zm6 0h4v12H9z" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l11 6-11 6z" /></svg>
        )}
      </button>
      <button onClick={() => onStep(1)} disabled={atEnd}
        style={{ ...iconBtn, opacity: atEnd ? 0.4 : 1 }} aria-label="Next play">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M11 2v12h2V2zM2 2v12l8-6z" /></svg>
      </button>
      <input
        type="range" min={0} max={count - 1} value={index}
        onChange={e => onScrub(Number(e.target.value))}
        style={{ flex: 1, minWidth: '70px', accentColor, cursor: 'pointer' }}
      />
      <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums', minWidth: '48px', textAlign: 'center' }}>
        {index + 1}/{count}
      </span>
      <button onClick={onCycleSpeed} style={{ ...iconBtn, width: '32px', fontSize: '11px', fontWeight: 700 }} aria-label="Playback speed">
        {speed}×
      </button>
      <button onClick={onExit} style={{
        padding: '4px 10px',
        backgroundColor: isLive ? '#166534' : 'transparent',
        border: isLive ? '1px solid #22c55e' : '1px solid #334155',
        borderRadius: '5px',
        color: isLive ? '#dcfce7' : '#94a3b8',
        fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
      }}>
        {isLive ? 'Go Live' : 'Exit'}
      </button>
    </>
  )
}

/** Tiny icon + tooltip shown wherever we surface clock state. Used both in
    the per-play feed row and next to the main game clock. */
const ClockStateIcon: React.FC<{ stopped: boolean }> = ({ stopped }) => {
  const color = stopped ? '#fbbf24' : '#22c55e'
  return (
    <HoverTooltip text={stopped ? 'Clock stopped' : 'Clock running'} color={color}>
      <span style={{ display: 'inline-flex', alignItems: 'center', color, marginLeft: '2px' }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
             stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5" />
          {stopped ? (
            <>
              <line x1="6.5" y1="5.5" x2="6.5" y2="10.5" />
              <line x1="9.5" y1="5.5" x2="9.5" y2="10.5" />
            </>
          ) : (
            <path d="M6.5 5.5 L11 8 L6.5 10.5 Z" fill="currentColor" />
          )}
        </svg>
      </span>
    </HoverTooltip>
  )
}

/** Frames won can be fractional (½ for a halved frame) — render "2", "2½", "½". */
function fmtFramesWon(v: number): string {
  const whole = Math.floor(v)
  const half = v - whole >= 0.5
  return half ? `${whole > 0 ? whole : ''}½` : `${whole}`
}

/** Returns a consistent badge background color for any PlayResult string. */
/** Returns true for play results that warrant a badge in the field graphic (scores + turnovers). */
function isFieldBadgeResult(playResult: string): boolean {
  return playResult.includes('Touchdown') || playResult.includes('2-Pt')
    || playResult.includes('Conversion')
    || playResult === 'XP Good' || playResult === 'XP No Good'
    || playResult === 'Field Goal is Good' || playResult === 'Safety'
    || playResult === 'Fumble' || playResult === 'Interception'
    || playResult === 'Turnover On Downs' || playResult === 'Drive Clock Expired'
    || playResult.includes('Sideline Goal') || playResult === 'Bust'
    || playResult.includes('Contest') || playResult === 'Provisional Score'
    || playResult === 'Punt'
}

function getResultColor(playResult: string, lastDown = 4): string | null {
  if (!playResult) return null
  // Down-marker results ('1st Down' .. 'Nth Down'). downsPerSeries is a mutable
  // rule, so color the ACTUAL last down amber (urgent), the first blue, the rest
  // uncolored — instead of hardcoding 4th.
  const downMatch = playResult.match(/^(\d+)(?:st|nd|rd|th) Down$/)
  if (downMatch) {
    const d = parseInt(downMatch[1], 10)
    if (d === 1) return '#3b82f6'
    if (d >= lastDown) return '#f59e0b'
    return null
  }
  // XP now fires as its own play (PlayResult.ExtraPointGood / ExtraPointNoGood).
  // Check XP first because 'XP Good' would otherwise match the legacy 'Touchdown'
  // include below if both ever co-occurred. 'Touchdown, XP is Good' / 'Touchdown,
  // XP No Good' enums survive in historical game data and stay green for
  // backward-compatible coloring via the Touchdown match.
  if (playResult === 'XP Good') return '#22c55e'
  if (playResult === 'XP No Good') return '#f59e0b'
  if (playResult.includes('Touchdown')) return '#22c55e'
  if (playResult === 'Field Goal is Good') return '#22c55e'
  if (playResult === 'Safety') return '#ef4444'
  if (playResult.includes('2-Pt') && !playResult.includes('No Good')) return '#22c55e'
  // Conversion Ladder — a higher-rung go-for-it try (from further out).
  if (playResult.includes('Conversion') && !playResult.includes('No Good')) return '#22c55e'
  if (playResult === 'Fumble' || playResult === 'Interception' || playResult === 'Turnover On Downs') return '#ef4444'
  if (playResult === 'Drive Clock Expired') return '#ef4444'   // a turnover — red, distinct badge text
  if (playResult === 'Sideline Goal Good') return '#22c55e'    // banked a point (drive continues)
  if (playResult === 'Sideline Goal Miss') return '#94a3b8'    // just an incompletion (no turnover)
  if (playResult === 'Bust') return '#ef4444'                  // darts: overshot X, no points, turnover
  if (playResult === 'Provisional Score') return '#f59e0b'     // contested: reached the end zone, contest pending
  if (playResult === 'Contest Lost') return '#ef4444'          // contested: stuffed, no points (won contests emit 'Touchdown')
  if (playResult.includes('2-Pt No Good')) return '#f59e0b'
  if (playResult.includes('Conversion No Good')) return '#f59e0b'
  if (playResult === 'Punt' || playResult === 'Field Goal is No Good') return '#94a3b8'
  return '#64748b'
}


export const GameModalNew: React.FC<GameModalNewProps> = ({ onClose, gameId, layout = 'modal', railContent }) => {
  const asPage = layout === 'page'
  const [activeTab, setActiveTab] = useState<'box' | 'plays' | 'stats'>('plays')
  const [showHighlightsOnly, setShowHighlightsOnly] = useState(false)
  const [expandedPlayKey, setExpandedPlayKey] = useState<string | null>(null)
  const [expandedStatKey, setExpandedStatKey] = useState<string | null>(null)
  // The league's current downs-per-series (a mutable rule) so the ACTUAL last down
  // is colored urgent, not a hardcoded 4th.
  const [lastDown, setLastDown] = useState(4)
  // The league's active score display model (additive / spread / share) — the same
  // /api/rules fetch that drives the last-down color.
  const [scoringModel, setScoringModel] = useState<ScoringModel>('additive')
  // Active game format + target (win condition) — same /api/rules read.
  const [gameFormat, setGameFormat] = useState<string>('standard')
  const [targetScore, setTargetScore] = useState<number>(30)
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/rules`).then(r => r.json())
      .then(j => {
        if (cancelled) return
        setLastDown(Number(j?.data?.rules?.downsPerSeries) || 4)
        const m = j?.data?.rules?.scoringModel
        if (m === 'additive' || m === 'spread' || m === 'subtractive') setScoringModel(m)
        setGameFormat(String(j?.data?.rules?.gameFormat ?? 'standard'))
        setTargetScore(Number(j?.data?.rules?.targetScore) || 30)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const isMobile = useIsMobile()
  // Stats table has its own (higher) tight-layout breakpoint — the panel
  // is only ~60% of modal width on tablet/desktop, so a 900px landscape
  // phone gives the stats area ~540px which is too tight for 6 columns
  // and a readable player name. Engage the condensed layout below 1000px.
  const isTightStats = useIsMobile(1000)
  /**
   * The modal's body is two columns side by side: game state left, plays right.
   *
   * The route keeps that split whenever there is room for it, which makes the
   * page THREE columns — state, plays, Bleachers — so the play feed is beside
   * the field rather than below it. That was the point of the route: you should
   * not have to scroll past the pitch to watch the game.
   *
   * Below `PAGE_THREE_COLUMN_MIN` the two panels stack (the mobile path) and the
   * page falls back to game-over-talk.
   */
  const pageNarrow = useIsMobile(PAGE_THREE_COLUMN_MIN)
  const stacked = isMobile || (asPage && pageNarrow)

  // Get game from central state and fetch plays
  const { games, fetchGamePlays } = useGames()
  const liveGameData = useMemo(() => games.get(gameId), [games, gameId])
  // Freeze last known data so the modal stays populated after week rollover clears the game
  const frozenRef = useRef(liveGameData)
  if (liveGameData) frozenRef.current = liveGameData

  // When the modal opened (per game). PlayReactions keys its ghost-click guard
  // off this rather than its own mount time, so top-of-feed widgets that remount
  // as plays merge/arrive can't reset the guard. Reset on game switch below.
  const modalOpenedAtRef = useRef(Date.now())
  const gameData = frozenRef.current
  // Prefer THIS game's own downs-per-series (Criticality chaos can set it to 3 or 5,
  // differing from the season-wide /api/rules value) so the true last down is colored
  // urgent, not a hardcoded 4th. Falls back to the /api/rules value for older payloads.
  const effectiveLastDown = Number((gameData as any)?.downsPerSeries) || lastDown
  // Formats with no standard quarter clock display (each renders its own clock).
  const noClockFormat = gameFormat === 'innings' || gameFormat === 'play_limit' || gameFormat === 'chess_clock'
  // Whether teams still have timeouts. Chess clock is time-based (game clock +
  // possession budget) so teams DO call timeouts there; only the truly clock-less
  // formats (innings / play_limit) have none.
  const hasTimeouts = gameFormat !== 'innings' && gameFormat !== 'play_limit'

  // Effective away-team display color: when the two primaries are basically the
  // same, swap the away team to its secondary so they're distinguishable — but
  // only if that secondary actually separates from home (else keep the primary).
  const awayDisplayColor = useMemo(
    () => effectiveAwayColor(gameData?.homeTeam?.color, gameData?.awayTeam?.color, (gameData?.awayTeam as any)?.secondaryColor),
    [gameData?.homeTeam?.color, gameData?.awayTeam?.color, (gameData?.awayTeam as any)?.secondaryColor]
  )

  // ── Replay mode ──────────────────────────────────────────────────────────
  // Step a finished game back through its plays, feeding the scoreboard, field
  // graphic, WP chart and feed the state as of each play — the same data the
  // live components already react to, just played back from a frozen snapshot.
  const [replayActive, setReplayActive] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1) // plays per second

  // Steppable plays, oldest-first (the snaps — events/cutaways excluded).
  const replaySequence = useMemo(() => {
    if (!gameData?.plays) return [] as any[]
    return (gameData.plays as any[])
      .filter(p => !p.event && p.playResult != null && !p.isSidelineCutaway)
      .slice()
      .reverse()
  }, [gameData?.plays])

  const replayCount = replaySequence.length
  const replayCursor = replayActive ? replaySequence[replayIndex] : undefined

  // Drive playback: one step per (1000 / speed) ms. On the last available
  // play, a finished game just stops; a live game rejoins the live feed —
  // the catch-up has reached the current play, so hand back to live. As live
  // plays keep arriving, replayCount grows and playback chases the edge until
  // it catches up.
  useEffect(() => {
    if (!replayActive || !replayPlaying) return
    if (replayIndex >= replayCount - 1) {
      if (gameData?.status === 'Active') setReplayActive(false)
      setReplayPlaying(false)
      return
    }
    const id = setTimeout(
      () => setReplayIndex(i => Math.min(i + 1, replayCount - 1)),
      1000 / replaySpeed,
    )
    return () => clearTimeout(id)
  }, [replayActive, replayPlaying, replayIndex, replaySpeed, replayCount, gameData?.status])

  // Ball spot isn't stored per play; derive it from the play's yardLine
  // ("TEAM YD") + which side has the ball — the same parse the API uses.
  const deriveYardsToEndzone = (play: any): number | null => {
    const yl = play?.yardLine
    if (typeof yl !== 'string' || !yl.includes(' ')) return null
    const parts = yl.split(' ')
    const num = parseInt(parts[1], 10)
    if (isNaN(num)) return null
    return parts[0] === play.defensiveTeam ? num : 100 - num
  }

  // Plays visible right now: sliced to the cursor in replay (preserving the
  // feed's newest-first order and interleaved events), full otherwise.
  const displayPlays = useMemo(() => {
    const all = (gameData?.plays as any[]) ?? []
    if (!replayActive || !replayCursor) return all
    const ci = all.indexOf(replayCursor)
    return ci >= 0 ? all.slice(ci) : all
  }, [gameData?.plays, replayActive, replayCursor])

  // Game-state values for the scoreboard / field / clock. In replay they read
  // off the cursor play; otherwise straight from the live snapshot.
  const dHomeScore = replayActive && replayCursor ? (replayCursor.homeTeamScore ?? 0) : gameData?.homeScore
  const dAwayScore = replayActive && replayCursor ? (replayCursor.awayTeamScore ?? 0) : gameData?.awayScore

  // Frames scoreboard cell: [frames won] | [actual points], matching the game card. When the
  // frames are level and points decide it, the leader's point total is highlighted green (no
  // separate tie note). Every other format's big number already IS the points.
  const renderModalScore = (side: 'home' | 'away', teamPts: number | null | undefined, oppPts: number | null | undefined): React.ReactNode => {
    const fr = gameData?.frames
    if (fr?.active) {
      const pointsWinner = fr.tiebreak?.decidedByPoints && fr.tiebreak.winner === side
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <span>{fmtFramesWon(side === 'home' ? fr.framesWonHome : fr.framesWonAway)}</span>
          <span style={{ width: '1px', height: '26px', backgroundColor: '#475569', flexShrink: 0 }} />
          {/* Fixed-width, LEFT-aligned: the total hugs the divider, 1- vs 2-digit reserves
              the same space so the frames score stays put. */}
          <span style={{ display: 'inline-block', minWidth: '28px', textAlign: 'left', fontSize: '19px', color: pointsWinner ? '#22c55e' : '#94a3b8', fontWeight: pointsWinner ? 800 : 600 }}>
            {displayScore(teamPts, oppPts, scoringModel)}
          </span>
        </span>
      )
    }
    return displayScore(teamPts, oppPts, scoringModel)
  }
  const dQuarter = replayActive && replayCursor ? replayCursor.quarter : gameData?.quarter
  const dClock = replayActive && replayCursor ? replayCursor.timeRemaining : gameData?.timeRemaining
  const dPossession = replayActive && replayCursor ? replayCursor.offensiveTeam : gameData?.possession
  const dYardsToEndzone = replayActive && replayCursor ? deriveYardsToEndzone(replayCursor) : gameData?.yardsToEndzone
  // Ball anchor for the field graphic. Runs/passes anchor on the END spot and
  // the trajectory walks back by yardsGained, so in replay we advance the
  // cursor's line of scrimmage by the yards gained. Punts/kicks are the
  // opposite — they anchor on the LOS and draw the arc forward to the landing
  // spot — so those keep the pre-snap position. Live state already reflects
  // the right spot, so this only adjusts replay.
  const dBallYardsToEndzone = (() => {
    if (!(replayActive && replayCursor)) return gameData?.yardsToEndzone
    const pre = deriveYardsToEndzone(replayCursor)
    if (pre == null) return null
    const pt = String(replayCursor.playType || '').toUpperCase()
    if (pt === 'PUNT' || pt === 'FIELDGOAL' || pt === 'EXTRAPOINT') return pre
    const gained = replayCursor.yardsGained ?? 0
    return Math.max(0, Math.min(100, pre - gained))
  })()
  const dDown = replayActive && replayCursor ? replayCursor.down : gameData?.down
  const dYardLine = replayActive && replayCursor ? replayCursor.yardLine : gameData?.yardLine
  const dDistance = replayActive && replayCursor ? replayCursor.distance : gameData?.yardsToFirstDown

  // Per-quarter breakdown as of the cursor. Plays carry the running cumulative
  // score, so the score through the end of each quarter is the last cumulative
  // in that quarter (filled forward for quarters not yet reached → 0 points).
  const dQuarterScores = useMemo(() => {
    if (!replayActive || !replayCursor) return gameData?.quarterScores
    const seq = replaySequence.slice(0, replayIndex + 1)
    let runH = 0, runA = 0
    const lastInQuarter: Record<number, { h: number; a: number }> = {}
    for (const p of seq) {
      if (p.homeTeamScore != null) runH = p.homeTeamScore
      if (p.awayTeamScore != null) runA = p.awayTeamScore
      const qc = Math.min(4, Math.max(1, p.quarter || 1))
      lastInQuarter[qc] = { h: runH, a: runA }
    }
    const through: Record<number, { h: number; a: number }> = { 0: { h: 0, a: 0 } }
    for (let q = 1; q <= 4; q++) through[q] = lastInQuarter[q] ?? through[q - 1]
    return {
      home: { q1: through[1].h - through[0].h, q2: through[2].h - through[1].h, q3: through[3].h - through[2].h, q4: through[4].h - through[3].h },
      away: { q1: through[1].a - through[0].a, q2: through[2].a - through[1].a, q3: through[3].a - through[2].a, q4: through[4].a - through[3].a },
    }
  }, [replayActive, replayCursor, replaySequence, replayIndex, gameData?.quarterScores])

  const startReplay = (speed = 1) => { setReplayIndex(0); setReplaySpeed(speed); setReplayActive(true); setReplayPlaying(true); setActiveTab('plays') }
  const exitReplay = () => { setReplayActive(false); setReplayPlaying(false) }
  const replayStep = (delta: number) => {
    setReplayPlaying(false)
    setReplayIndex(i => Math.max(0, Math.min(replayCount - 1, i + delta)))
  }
  const replayScrub = (i: number) => {
    setReplayPlaying(false)
    setReplayIndex(Math.max(0, Math.min(replayCount - 1, i)))
  }
  const toggleReplayPlay = () => {
    if (replayIndex >= replayCount - 1) { setReplayIndex(0); setReplayPlaying(true) }
    else setReplayPlaying(p => !p)
  }
  const cycleReplaySpeed = () => setReplaySpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))

  // Plays with WP data, in chronological order (oldest first), for the chart.
  // Innings is the only truly CLOCKLESS format (its clock loop is inert, so every play arrives
  // quarter=1 with a frozen timeRemaining) — bucket its plays by at-bat ordinal. Frames RUNS
  // the game clock (quarters advance normally), so it's just the standard elapsed x-axis split
  // into framesPerGame sections instead of 4 quarters.
  const framesClock = !!gameData?.frames?.active
  const wpPeriods = gameData?.innings?.active
    ? (gameData.innings.lineScore?.innings?.length || gameData.innings.inningsPerGame || 3)
    : 0
  const wpNoClock = wpPeriods > 0
  // Clock-based regulation sections: frames split regulation into framesPerGame; standard = 4.
  const regSections = framesClock ? (gameData!.frames!.framesPerGame || 6) : 4
  const sectionSecs = 3600 / regSections

  const wpPlays = useMemo(() => {
    const chronological = (displayPlays as any[])
      .filter(p => !p.event && p.homeWinProbability != null && (wpNoClock || (p.quarter && p.timeRemaining)))
      .slice()
      .reverse()
    // Order by playNumber, not by arrival. The feed list is newest-first by INSERTION,
    // and a play can land out of position: the backend re-emits a play at quarter
    // boundaries / turnovers, and an unmatched re-send is prepended (mergePlay) — so an
    // OLD play can sit at the head of the list. Reversed, that plotted a low playNumber
    // after high ones and the line jumped backwards. Sorting makes the chart independent
    // of arrival order and of the REST/WS merge. Fractional playNumbers (cutaways +0.5,
    // contest beats +0.9) sort naturally beside the play they belong to; if any entry
    // lacks a number, leave the order alone rather than sort against undefined.
    if (chronological.some(p => typeof p.playNumber !== 'number')) return chronological
    const sorted = chronological.sort((a, b) => a.playNumber - b.playNumber)
    // A re-send that slipped past the merge leaves two entries for one play; plotted,
    // that's two points at the same x and a vertical spike. Keep the last (the sort is
    // stable, so for equal playNumbers that's the most recently received copy).
    return sorted.filter((p, i) => i === sorted.length - 1 || sorted[i + 1].playNumber !== p.playNumber)
  }, [displayPlays, wpNoClock])

  const isHighlightPlay = (play: any) =>
    !play._type && !play.event && !play.text &&
    (play.isTouchdown || play.isTurnover || play.scoreChange || play.isBigPlay || play.isClutchPlay || play.isChokePlay || play.isMomentumShift)

  // Pre-process plays: inject drive separators between possession changes
  const processedPlays = useMemo(() => {
    const plays = displayPlays as any[]
    if (!plays.length) return []
    const result: any[] = []
    for (let i = 0; i < plays.length; i++) {
      const play = plays[i]
      // A charge-status beat gets its OWN feed entry, just above the play that triggered it
      // (the feed is newest-first, so the beat sits above its cause).
      if (play.awakenedStatus?.text) {
        result.push({ _type: 'awakened_status', text: play.awakenedStatus.text,
          status: play.awakenedStatus.status, _key: `awk-${play.playNumber ?? i}` })
      }
      result.push(play)
      const nextPlay = plays[i + 1]
      const isEvent = (p: any) => !!p.event || (!p.playResult && !!p.text) || !!p._type
      if (nextPlay &&
          play.offensiveTeam && nextPlay.offensiveTeam &&
          play.offensiveTeam !== nextPlay.offensiveTeam &&
          !isEvent(play) && !isEvent(nextPlay)) {
        result.push({ _type: 'possession_sep', _key: `sep-${i}` })
      }
    }
    return result
  }, [displayPlays])

  // Each point's x is a "section position" in [0, numSections]: one section per period
  // (quarter/OT for clock formats, inning/frame for no-clock). Clock formats map elapsed
  // seconds -> section; no-clock formats spread plays evenly by ordinal across the periods.
  const chartPoints = useMemo(() => {
    const pts: { pos: number; wp: number }[] = [{ pos: 0, wp: 50 }]
    if (wpNoClock) {
      const n = wpPlays.length
      // Innings: position each play at its ACTUAL at-bat progress (completed innings +
      // half + try), so the line stops at the current inning. The old ordinal spread
      // mapped the last play to the full axis, so a game in inning 2 ran into inning 3.
      // Plays share a try bucket (a try = one drive), so spread them within the try's
      // width to keep the line advancing smoothly. Frames (no `inning`) keep the ordinal
      // spread. Mirrors the backend InningsFormat.adjustGameProgress.
      const triesPer = gameData?.innings?.triesPerInning || 3
      const tryWidth = 0.5 / triesPer
      const bucketOf = (p: any): number | null => {
        if (p.inning == null) return null
        const halfFrac = p.inningHalf === 'bottom' ? 0.5 : 0
        const tryFrac = Math.max(0, (p.inningTry || 1) - 1) * tryWidth
        return (p.inning - 1) + halfFrac + tryFrac
      }
      const counts = new Map<number, number>()
      wpPlays.forEach((p: any) => {
        const b = bucketOf(p)
        if (b != null) counts.set(b, (counts.get(b) || 0) + 1)
      })
      const seen = new Map<number, number>()
      wpPlays.forEach((p: any, i: number) => {
        const b = bucketOf(p)
        if (b == null) {
          pts.push({ pos: n <= 0 ? 0 : ((i + 1) / n) * wpPeriods, wp: p.homeWinProbability })
          return
        }
        const k = seen.get(b) || 0
        seen.set(b, k + 1)
        const total = counts.get(b) || 1
        const frac = total > 1 ? (k + 1) / total : 1
        pts.push({ pos: Math.min(b + frac * tryWidth, wpPeriods), wp: p.homeWinProbability })
      })
      return pts
    }
    let prevElapsed = 0
    let otOffset = 0
    wpPlays.forEach((p: any) => {
      const [mins, secs] = p.timeRemaining.split(':').map(Number)
      const remaining = mins * 60 + secs
      let elapsed: number
      if (p.quarter <= 4) {
        elapsed = Math.max(0, (p.quarter - 1) * 900 + (900 - remaining))
      } else {
        // Quarter stays at 5 for all OT periods — detect reset when raw elapsed goes backward
        const rawOT = 3600 + otOffset + (600 - remaining)
        if (rawOT < prevElapsed) otOffset += 600
        elapsed = 3600 + otOffset + (600 - remaining)
      }
      prevElapsed = elapsed
      // Map regulation elapsed to [0, regSections] (a section per quarter, or per frame in
      // frames), then OT sections after. A clinched frames game simply stops early here — the
      // line ends where the game did, leaving the later frame sections empty (as it should).
      pts.push({ pos: elapsed <= 3600 ? elapsed / sectionSecs : regSections + (elapsed - 3600) / 600, wp: p.homeWinProbability })
    })
    return pts
  }, [wpPlays, wpNoClock, wpPeriods, gameData?.innings?.triesPerInning, sectionSecs, regSections])

  // Shared x-axis descriptor: how many equal-width sections, where the dividers fall
  // (in section units), the period labels, and which divider is the thicker
  // regulation/OT boundary. Derived once so wpSegments and the axis render agree.
  const wpAxis = useMemo(() => {
    if (wpNoClock) {
      // Innings only (frames is clock-based below).
      const n = Math.max(1, wpPeriods)
      const prefix = 'In'
      return {
        numSections: n,
        dividers: Array.from({ length: n - 1 }, (_, i) => i + 1),
        labels: Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`),
        bigDivider: -1,
      }
    }
    // Clock-based: regSections regulation sections (4 quarters, or framesPerGame frames), then
    // any OT sections. Frames label F1..Fn; standard Q1..Q4. The thick divider marks the
    // regulation/OT boundary.
    const lastPos = chartPoints.length ? chartPoints[chartPoints.length - 1].pos : 0
    const numOT = lastPos > regSections ? Math.ceil(lastPos - regSections) : 0
    const prefix = framesClock ? 'F' : 'Q'
    return {
      numSections: regSections + numOT,
      dividers: [
        ...Array.from({ length: regSections - 1 }, (_, i) => i + 1),
        ...(numOT > 0 ? [regSections] : []),
        ...Array.from({ length: Math.max(0, numOT - 1) }, (_, i) => regSections + (i + 1)),
      ],
      labels: [
        ...Array.from({ length: regSections }, (_, i) => `${prefix}${i + 1}`),
        ...Array.from({ length: numOT }, (_, i) => numOT === 1 ? 'OT' : `OT${i + 1}`),
      ],
      bigDivider: regSections,
    }
  }, [chartPoints, wpNoClock, wpPeriods, regSections, framesClock])

  const prevHomeScore = useRef(dHomeScore)
  const prevAwayScore = useRef(dAwayScore)
  const [homeFlash, setHomeFlash] = useState(false)
  const [awayFlash, setAwayFlash] = useState(false)

  useEffect(() => {
    if (prevHomeScore.current !== undefined && dHomeScore !== undefined && dHomeScore !== prevHomeScore.current) {
      setHomeFlash(false)
      requestAnimationFrame(() => setHomeFlash(true))
      const t = setTimeout(() => setHomeFlash(false), 700)
      prevHomeScore.current = dHomeScore
      return () => clearTimeout(t)
    }
    prevHomeScore.current = dHomeScore
  }, [dHomeScore])

  useEffect(() => {
    if (prevAwayScore.current !== undefined && dAwayScore !== undefined && dAwayScore !== prevAwayScore.current) {
      setAwayFlash(false)
      requestAnimationFrame(() => setAwayFlash(true))
      const t = setTimeout(() => setAwayFlash(false), 700)
      prevAwayScore.current = dAwayScore
      return () => clearTimeout(t)
    }
    prevAwayScore.current = dAwayScore
  }, [dAwayScore])

  // Fetch plays when modal opens
  useEffect(() => {
    modalOpenedAtRef.current = Date.now()
    fetchGamePlays(gameId)
  }, [gameId, fetchGamePlays])

  // ── Viewer count ────────────────────────────────────────────────────────
  // Tell the server this game is open so it can count watchers, and clear it on
  // close. The count is per DISTINCT USER, so this viewer's own tabs collapse to
  // one and a signed-out visitor isn't counted.
  const { subscribe: subscribeSeason, watchGame } = useSeasonWebSocket()
  const [viewerCount, setViewerCount] = useState<number | null>(null)

  useEffect(() => {
    watchGame(gameId)
    return () => { watchGame(null) }
  }, [gameId, watchGame])

  useEffect(() => {
    setViewerCount(null)   // don't carry a count across a game switch
    return subscribeSeason((msg: any) => {
      if (msg?.event === 'viewer_count' && String(msg.gameId) === String(gameId)) {
        setViewerCount(Number(msg.count) || 0)
      }
    })
  }, [gameId, subscribeSeason])

  // Helper function to render a play or event message
  const renderPlay = (play: any, keyPrefix: string, index: number) => {
    if (!gameData) return null

    // Drive separator (between possession changes)
    if (play._type === 'possession_sep') {
      return (
        <div key={play._key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e3a5f' }} />
          <span style={{ fontSize: '10px', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
            Drive
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e3a5f' }} />
        </div>
      )
    }

    // Awakened charge-status beat — its own slim, ethereal gold entry in the feed.
    if (play._type === 'awakened_status') {
      const charged = play.status === 'fully_charged'
      return (
        <div key={play._key} style={{
          borderBottom: '1px solid #334155',
          padding: '7px 12px',
          display: 'flex', alignItems: 'center', gap: '9px',
          backgroundColor: charged ? 'rgba(253,224,138,0.07)' : 'rgba(253,224,138,0.035)',
        }}>
          <span style={{
            flexShrink: 0, width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: '#fde68a',
            boxShadow: charged ? '0 0 10px 1px rgba(253,224,138,0.85)' : '0 0 6px rgba(253,224,138,0.55)',
          }} />
          <span style={{
            fontSize: '12.5px', fontStyle: 'italic', color: '#fde68a',
            fontWeight: charged ? 600 : 400, letterSpacing: '0.2px',
            textShadow: charged ? '0 0 9px rgba(253,224,138,0.50)' : '0 0 6px rgba(253,224,138,0.30)',
          }}>
            {play.text}
          </span>
        </div>
      )
    }

    // Skip reaction events (legacy gameFeed entries — reactions now render inline on plays)
    if (play.type === 'reaction' || play.event?.type === 'reaction') return null

    // Sideline cutaway — flavor entry between plays, formatted to mirror a regular play row
    // On the route these live in the Bleachers rail instead — rendering them
    // here as well printed every cutaway twice, once in each column.
    if (asPage && play.isSidelineCutaway) return null
    if (play.isSidelineCutaway && play.sidelineCutaway) {
      const cutaway = play.sidelineCutaway
      const accent = personalityAccent(cutaway.personality)
      return (
        <div key={`${keyPrefix}-${index}-cutaway`} style={{ borderBottom: '1px solid #334155' }}>
          <div style={{
            paddingBottom: '12px',
            paddingTop: '6px',
            paddingLeft: '10px',
            paddingRight: '6px',
            display: 'flex',
            gap: '12px',
          }}>
            {cutaway.teamId != null ? (
              <img
                src={`/avatars/${cutaway.teamId}.png`}
                alt={cutaway.teamAbbr || ''}
                crossOrigin="anonymous"
                style={{ width: '40px', height: '40px', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: '40px', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                {play.inning != null ? (
                  <><span>{`${play.inningHalf === 'bottom' ? 'BOT' : 'TOP'} ${play.inning}`}</span><span>•</span></>
                ) : play.frame != null ? (
                  <><span>{`Frame ${play.frame}`}</span><span>•</span></>
                ) : !noClockFormat ? (
                  // Frames OT plays carry no frame (standard points-decided OT), so they land
                  // here and show the OT/quarter clock like any clock format.
                  <><span>{`${play.quarter > 4 ? 'OT' : `Q${play.quarter}`} - ${play.timeRemaining}`}</span><span>•</span></>
                ) : null}
                <span style={{ color: '#cbd5e1', fontWeight: '500', letterSpacing: '0.04em' }}>SIDELINE</span>
              </div>
              <p style={{
                fontSize: '13px',
                color: '#e2e8f0',
                fontStyle: 'italic',
                margin: 0,
                backgroundColor: `${accent}10`,
                padding: '4px 8px',
                borderRadius: '4px',
                borderLeft: `2px solid ${accent}`,
              }}>
                {cutaway.text}
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Event message (game_start, quarter changes, halftime, etc.)
    // Handles REST API format (play.event.text) and WebSocket format (play.text with no playResult)
    const eventText = play.event?.text ?? (!play.playResult && play.text ? play.text : null)
    if (eventText) {
      // Rally events get a green accent so fans see their cheer land
      // distinctly from neutral game events (kickoff, quarter end, etc.).
      // WS-injected events use {event: {_type}}; REST-served events are
      // unwrapped so _type sits on the play itself — check both shapes.
      const isRally = play.event?._type === 'rally' || play._type === 'rally'
      // Chess-clock timeout: a team ran its offense budget to 0 — a notable turnover, so
      // give it a red accent (matches the clock going red) instead of the neutral grey.
      const isTimeout = play.event?._type === 'chess_timeout' || play._type === 'chess_timeout'
      // Innings change (new at-bat) or a frame change — a blue accent, like a period marker.
      const isInning = ['inning', 'frame'].includes(play.event?._type) || ['inning', 'frame'].includes(play._type)
      const lineColor = isRally ? '#22c55e55' : isTimeout ? '#ef444455' : isInning ? '#3b82f655' : '#334155'
      const textColor = isRally ? '#86efac' : isTimeout ? '#fca5a5' : isInning ? '#93c5fd' : '#64748b'
      return (
        <div key={`${keyPrefix}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: lineColor }} />
          <span style={{ fontSize: '12px', color: textColor, fontWeight: (isTimeout || isInning) ? '700' : '500', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {eventText}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: lineColor }} />
        </div>
      )
    }
    
    // Regular play rendering. A post-TD conversion (2-pt or a Conversion-Ladder rung)
    // shows an "Npt Try" label in place of down & distance — mirroring the 2-pt try —
    // driven by the serialized conversionPoints (falls back to the old 2-Pt detection
    // for plays simulated before that field existed).
    const convPts = (play as any).conversionPoints
    const isTwoPtPlay = String(play.playResult ?? '').includes('2-Pt')
    const downText = convPts != null ? `${convPts}pt Try`
      : isTwoPtPlay ? '2pt Try'
      : play.down && play.distance != null ?
        (play.distance === 'Goal' ?
          `${ordinal(play.down)} & Goal` :
          `${ordinal(play.down)} & ${play.distance}`)
        : null

    // Determine which team has possession for this play
    const offenseTeamId = play.offensiveTeam === gameData.homeTeam.abbr ? 
      gameData.homeTeam.id : 
      play.offensiveTeam === gameData.awayTeam.abbr ? 
        gameData.awayTeam.id : 
        null

    const isBigPlay = !!play.isBigPlay
    const isClutchPlay = !!play.isClutchPlay
    const isChokePlay = !!play.isChokePlay
    const isMomentumShift = !!play.isMomentumShift
    const hasGlitch = !!(play as any).glitchText
    const glitchLayer = (play as any).glitchLayer as ('micro' | 'personality' | 'signature' | undefined)
    const isGlitchL2 = glitchLayer === 'personality'
    const isGlitchL3 = glitchLayer === 'signature'
    const glitchDelta = (play as any).glitchYardDelta as number | null | undefined
    // Awakened (L4) fire — a player used their signature power. Styled ethereally (luminous, calm),
    // distinct from the chaotic glitch effect. The description is "PowerName: ..." — the power name
    // gets a glowing highlight below.
    const awakenedFire = (play as any).awakenedFire as { playerName?: string; powerName?: string; situation?: string } | null | undefined
    const hasAwakened = !!(awakenedFire && awakenedFire.powerName)
    // Pick a deterministic glitch variant (a/b/c) per play so the same
    // play always looks the same on re-render, but different anomaly
    // plays don't all use the identical effect.
    const glitchVariant = (() => {
      if (!hasGlitch) return ''
      const seed = (play.playNumber ?? 0) + ((play as any).glitchPlayerId ?? 0)
      return ['a', 'b', 'c'][Math.abs(seed) % 3]
    })()
    const glitchTextClass = hasGlitch
      ? (isGlitchL3 ? 'glitch-text-l3'
         : isGlitchL2 ? `glitch-text-l2-${glitchVariant}`
         : `glitch-text-l1-${glitchVariant}`)
      : ''
    const homeGained = (play.homeWpa ?? 0) > 0
    const bigPlayTeamAbbr = homeGained ? gameData.homeTeam.abbr : gameData.awayTeam.abbr
    const bigPlayTeamColor = homeGained ? gameData.homeTeam.color : awayDisplayColor
    const wpaValue = homeGained ? (play.homeWpa ?? 0) : (play.awayWpa ?? 0)
    const hasAccent = isBigPlay || isClutchPlay || isChokePlay || isMomentumShift
    const playKey = play.playNumber != null ? `pn-${play.playNumber}` : `${keyPrefix}-${index}`
    const hasInsights = play.insights && Object.keys(play.insights).length > 0
    const isExpanded = expandedPlayKey === playKey

    return (
      <div key={playKey} style={{ borderBottom: '1px solid #334155' }}>
        <div
          onClick={hasInsights ? () => setExpandedPlayKey(isExpanded ? null : playKey) : undefined}
          className={hasGlitch ? (isGlitchL3 ? 'anomaly-row-l3' : isGlitchL2 ? 'anomaly-row-l2' : 'anomaly-row-l1') : hasAwakened ? 'awakened-row' : undefined}
          style={{
            paddingBottom: '12px',
            paddingTop: '6px',
            paddingLeft: '10px',
            paddingRight: '6px',
            boxShadow: isBigPlay ? 'inset 3px 0 0 #f59e0b'
              : isClutchPlay ? 'inset 3px 0 0 #06b6d4'
              : isChokePlay ? 'inset 3px 0 0 #ef4444'
              : isMomentumShift ? 'inset 3px 0 0 #f97316'
              : 'none',
            backgroundColor: isBigPlay ? '#1a1300'
              : isClutchPlay ? '#001a1f'
              : isChokePlay ? '#1a0500'
              : isMomentumShift ? '#1a0f00'
              : 'transparent',
            borderRadius: hasAccent ? '4px' : '0',
            display: 'flex',
            gap: '12px',
            cursor: hasInsights ? 'pointer' : 'default',
          }}
        >
          {/* Team Avatar */}
          {offenseTeamId && (
            <img
              src={`/avatars/${offenseTeamId}.png`}
              alt={play.offensiveTeam}
              crossOrigin="anonymous"
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0
              }}
            />
          )}

          {/* Play Content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
              {/* Left: clock / situation */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {play.inning != null ? (
                    // Innings: the clock loop is inert, so show the at-bat context instead
                    // of a meaningless quarter/clock + start-stop icon.
                    `${play.inningHalf === 'bottom' ? 'BOT' : 'TOP'} ${play.inning} · Try ${play.inningTry}${gameData.innings?.triesPerInning ? `/${gameData.innings.triesPerInning}` : ''}`
                  ) : play.frame != null ? (
                    // Frames: 10-min frames don't line up with quarters — show the frame +
                    // time remaining in it.
                    <>
                      Frame {play.frame} - {play.frameClock}
                      {!play.scoreChange && <ClockStateIcon stopped={!!play.clockStopped} />}
                    </>
                  ) : (
                    <>
                      {play.quarter > 4 ? 'OT' : `Q${play.quarter}`} - {play.timeRemaining}
                      {/* Clock state — pause-in-circle when stopped, play-in-circle
                          when running. Hidden on scoring plays since the score
                          already conveys the clock will stop, and adding an icon
                          there would just be noise. */}
                      {!play.scoreChange && <ClockStateIcon stopped={!!play.clockStopped} />}
                    </>
                  )}
                </span>
                {downText && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{downText}</span>
                  </>
                )}
                {play.yardLine && !isTwoPtPlay && (
                  <>
                    <span>•</span>
                    <span>{play.yardLine}</span>
                  </>
                )}
                {isBigPlay && (
                  <span style={{ color: '#d97706', fontWeight: '600' }}>
                    ⚡ <span style={{ color: bigPlayTeamColor }}>{bigPlayTeamAbbr}</span> +{wpaValue.toFixed(1)}%
                  </span>
                )}
                {isMomentumShift && !isBigPlay && !isClutchPlay && !isChokePlay && (
                  <span style={{ color: '#f97316', fontWeight: '600', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <svg width="11" height="13" viewBox="0 0 12 16" fill="#f97316"><path d="M6 0C6 0 2 4 2 8c0 2.2 1.8 4 4 4s4-1.8 4-4C10 4 6 0 6 0zm0 10.5c-1.4 0-2.5-1.1-2.5-2.5 0-1.9 2.5-5.5 2.5-5.5s2.5 3.6 2.5 5.5c0 1.4-1.1 2.5-2.5 2.5z"/></svg>
                    MOMENTUM SHIFT
                  </span>
                )}
                {hasGlitch && (
                  <span className={isGlitchL3 ? 'anomaly-label-l3' : 'anomaly-label'} style={{
                    color: isGlitchL3 ? '#c4b5fd' : '#39ff14',
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '1px',
                    fontFamily: 'monospace',
                  }}>
                    {isGlitchL3 ? '◆◆ reality warped' : isGlitchL2 ? '◆ data corrupted' : '◇ aberration detected'}
                  </span>
                )}
                {hasAwakened && (
                  <span style={{
                    color: '#fde68a',
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '1px',
                    fontFamily: 'monospace',
                    textShadow: '0 0 7px rgba(253,224,138,0.55)',
                  }}>
                    ✦ awakened power
                  </span>
                )}
              </div>
              {/* Right: result label + expand indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {(() => {
                  const sackColor = '#f97316'
                  const isSafety = play.playResult === 'Safety'
                  const resultColor = play.playResult ? getResultColor(String(play.playResult), effectiveLastDown) : null
                  const badgeColor = isSafety ? resultColor : play.isSack ? sackColor : resultColor
                  // Innings: a turnover on downs is a spent try with no score — label it
                  // as a failed try, not the football "Turnover On Downs".
                  // Post-TD conversions (2-pt or any Conversion-Ladder rung) badge by their
                  // rung: "N-Pt Good" / "N-Pt No Good" (the shared 'Conversion Good' value
                  // carries no points, so drive it off conversionPoints).
                  const convPts = (play as any).conversionPoints
                  const badgeLabel = isSafety ? 'Safety' : play.isSack ? 'SACK'
                    : (gameFormat === 'innings' && play.playResult === 'Turnover On Downs') ? 'Try Over'
                    : convPts != null
                      ? `${convPts}-Pt ${String(play.playResult ?? '').includes('No Good') ? 'No Good' : 'Good'}`
                    : play.playResult
                  if (!badgeColor) return null
                  return (
                    <span style={{
                      fontSize: '10px',
                      color: badgeColor,
                      backgroundColor: `${badgeColor}30`,
                      padding: '1px 7px',
                      borderRadius: '3px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                      flexShrink: 0,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {badgeLabel}
                    </span>
                  )
                })()}
                {hasInsights && (
                  <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    style={{
                      flexShrink: 0,
                      marginLeft: '4px',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                      opacity: 0.5,
                    }}
                  >
                    <path d="M2 4l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: (play.scoreChange && play.homeTeamScore != null) || play.reaction || play.personalityEvent || (play as any).glitchText ? '4px' : '0' }}>
              {(() => {
                const gt = (play as any).glitchText
                const desc = play.description ?? ''
                // Awakened fire — the description leads with "PowerName: ...". Give the power name a
                // luminous glowing highlight, leave the rest as normal play text.
                if (hasAwakened && awakenedFire?.powerName && desc.startsWith(awakenedFire.powerName + ':')) {
                  const rest = desc.slice(awakenedFire.powerName.length + 1)
                  return (<><span className="awakened-power-name">{awakenedFire.powerName}</span>{rest}</>)
                }
                const cleaned = gt && desc.includes(gt)
                  ? desc.replace(`\n${gt}`, '').replace(gt, '').trim()
                  : desc
                // On an anomaly play, route the description through GlitchedText
                // so characters periodically swap to glitch glyphs. The row-level
                // class above also applies a chromatic shimmer to every text
                // descendant via CSS animation.
                // L1/L2 corrupt the description with character swaps. L3 stays
                // legible (no char-flip) — its drama is the steady violet charge
                // the row class lays over every line.
                if (hasGlitch && !isGlitchL3) {
                  return <GlitchedText text={cleaned} intensity={isGlitchL2 ? 'high' : 'low'} />
                }
                return cleaned
              })()}
            </p>
            {/* Clutch / choke attribution. Replaces the old badge with a
                short line below the play text naming the player(s) who
                actually rose to or buckled under the pressure. */}
            {(play.isClutchPlay || play.isChokePlay) && (() => {
              const performers = play.isClutchPlay
                ? (play.clutchPerformers ?? [])
                : (play.chokePerformers ?? [])
              if (!performers.length) return null
              const label = play.isClutchPlay ? 'Clutch' : 'Choke'
              const color = play.isClutchPlay ? '#06b6d4' : '#ef4444'
              const symbol = play.isClutchPlay ? '◆' : '▼'
              return (
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0' }}>
                  <span style={{ color, fontWeight: 700, marginRight: '6px' }}>
                    {symbol} {label}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>{performers.join(', ')}</span>
                </p>
              )
            })()}
            {play.reaction && (
              <p style={{ fontSize: '13px', color: '#e2e8f0', fontStyle: 'italic', margin: '4px 0 0', backgroundColor: 'rgba(51,65,85,0.5)', padding: '4px 8px', borderRadius: '4px', borderLeft: '2px solid #475569' }}>
                {play.reaction.text}
              </p>
            )}
            {/* Same rule as the cutaways: on the route a player's reaction is a
                voice, and the voices live in the Bleachers. */}
            {!asPage && play.personalityEvent && (() => {
              const accent = personalityAccent(play.personalityEvent.personality)
              return (
                <div style={{ margin: '4px 0 0' }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#e2e8f0',
                    fontStyle: 'italic',
                    margin: 0,
                    backgroundColor: `${accent}10`,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    borderLeft: `2px solid ${accent}`,
                  }}>
                    {play.personalityEvent.text}
                  </p>
                </div>
              )
            })()}
            {hasGlitch && (
              <p
                className={glitchTextClass}
                style={{
                  fontSize: '12px',
                  color: isGlitchL3 ? '#ddd6fe' : isGlitchL2 ? '#86efac' : '#bbf7d0',
                  fontStyle: 'italic',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2px',
                  margin: '6px 0 0',
                  backgroundColor: isGlitchL3 ? 'rgba(167,139,250,0.10)' : isGlitchL2 ? 'rgba(57,255,20,0.10)' : 'rgba(57,255,20,0.06)',
                  padding: '5px 9px',
                  borderRadius: '4px',
                  borderLeft: isGlitchL3 ? '2px solid #a78bfa' : '2px solid #39ff14',
                  display: isGlitchL3 ? 'flex' : undefined,
                  alignItems: isGlitchL3 ? 'center' : undefined,
                  gap: isGlitchL3 ? '8px' : undefined,
                }}>
                {isGlitchL3 ? (
                  <>
                    {typeof glitchDelta === 'number' && glitchDelta !== 0 && (
                      <span style={{
                        flexShrink: 0,
                        fontWeight: 700,
                        fontStyle: 'normal',
                        color: glitchDelta > 0 ? '#86efac' : '#fbbf24',
                        backgroundColor: glitchDelta > 0 ? 'rgba(134,239,172,0.14)' : 'rgba(251,191,36,0.14)',
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}>
                        {glitchDelta > 0 ? `+${glitchDelta}` : glitchDelta} yds
                      </span>
                    )}
                    <span>{(play as any).glitchText}</span>
                  </>
                ) : (
                  <GlitchedText text={(play as any).glitchText} intensity={isGlitchL2 ? 'high' : 'low'} />
                )}
              </p>
            )}
            {play.scoreChange && play.homeTeamScore != null && (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {gameData.homeTeam.abbr} {displayScore(play.homeTeamScore, play.awayTeamScore, scoringModel)} – {displayScore(play.awayTeamScore, play.homeTeamScore, scoringModel)} {gameData.awayTeam.abbr}
              </div>
            )}
            {/* Reactions for the play itself — only on plays with a stable
                INTEGER playNumber. Drive separators, event-only rows, and
                sideline cutaways (which use fractional playNumbers X.5/X.9
                to sort between real plays) are skipped — the DB column is
                Integer and truncates fractional values, which would map
                cutaway reactions onto the wrong adjacent play. */}
            {play.playNumber != null
              && Number.isInteger(play.playNumber)
              && !play._type
              && !(play as any).isSidelineCutaway && (
              <PlayReactions
                gameId={gameId}
                playNumber={play.playNumber}
                targetType="play"
                initial={(gameData as any).reactions?.[String(play.playNumber)]?.play}
                modalOpenedAt={modalOpenedAtRef.current}
              />
            )}
          </div>
        </div>
        {isExpanded && hasInsights && <PlayInsightsPanel insights={play.insights} />}
      </div>
    )
  }

  // Pre-compute WP segments for chart (used in left panel)
  const wpSegments = useMemo(() => {
    if (chartPoints.length < 2) return []
    const homeColor = gameData?.homeTeam.color ?? '#fff'
    const awayColor = awayDisplayColor
    const W = 800, H = 140
    const numSections = Math.max(1, wpAxis.numSections)
    // Equal visual width per section (chartPoints already carry a section position)
    const toX = (pos: number) => (pos / numSections) * W
    const toY = (wp: number) => H - (wp / 100) * H
    const segments: { pts: string; color: string }[] = []
    let curColor = chartPoints[0].wp >= 50 ? homeColor : awayColor
    let curPts: [number, number][] = [[toX(chartPoints[0].pos), toY(chartPoints[0].wp)]]
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p1 = chartPoints[i], p2 = chartPoints[i + 1]
      const x2 = toX(p2.pos), y2 = toY(p2.wp)
      const col2 = p2.wp >= 50 ? homeColor : awayColor
      if (col2 !== curColor) {
        const t = (50 - p1.wp) / (p2.wp - p1.wp)
        const xc = toX(p1.pos) + t * (x2 - toX(p1.pos))
        curPts.push([xc, H / 2])
        segments.push({ pts: curPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), color: curColor })
        curColor = col2
        curPts = [[xc, H / 2], [x2, y2]]
      } else {
        curPts.push([x2, y2])
      }
    }
    segments.push({ pts: curPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), color: curColor })
    return segments
  }, [chartPoints, wpAxis, gameData?.homeTeam.color, awayDisplayColor])

  // Momentum indicator (matches GameCard logic)
  const isLive = gameData?.status === 'Active'
  const absMomentum = Math.abs(gameData?.momentum ?? 0)
  const homeMomentum = isLive && gameData?.momentumTeam === gameData?.homeTeam.abbr
  const awayMomentum = isLive && gameData?.momentumTeam === gameData?.awayTeam.abbr
  const flameColor = absMomentum >= 25 ? '#f97316' : absMomentum >= 15 ? '#fb923c' : '#fdba74'
  const flameGlow = absMomentum >= 25 ? '0 0 6px #f97316' : 'none'

  if (!gameData) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '48px', color: '#e2e8f0' }}>
          <div>Game not found</div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={asPage ? undefined : onClose}
      style={asPage ? { minWidth: 0 } : {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: isMobile ? '0' : '24px'
      }}
    >
      <div
        onClick={asPage ? undefined : (e) => e.stopPropagation()}
        style={asPage ? {
          // On the route these two wrappers stop being chrome and become a plain
          // container: the page owns the background, the scrolling and the width.
          display: 'flex', flexDirection: 'column', minWidth: 0,
        } : {
          backgroundColor: '#0f172a',
          borderRadius: isMobile ? '0' : '12px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '1200px',
          height: isMobile ? '100dvh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header — the watching count, the cheer bar and the close button. The
            route carries all three in its own nav bar and scoreboard band. */}
        <div style={{
          display: asPage ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #334155',
          flexShrink: 0
        }}>
          {/* Left side of the header, opposite the close button: the watching count,
              then the cheer bar. The cheer bar lives in this existing row (live games
              only) so it adds no height and never pushes the body / WP graph down. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', minWidth: 0 }}>
            {/* Watching now. Hidden at 0 — that only happens signed out, and an empty
                count reads worse than no badge at all. */}
            {viewerCount != null && viewerCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: '#94a3b8', fontSize: '12px', flexShrink: 0
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {viewerCount} watching
                </span>
              </div>
            )}
            {/* Divider — only when BOTH sides are present, so it never floats next
                to a single element (no cheer bar off a live game, no count when
                signed out). */}
            {viewerCount != null && viewerCount > 0 && isLive && (
              <div style={{
                width: '1px', height: '18px', backgroundColor: '#334155', flexShrink: 0
              }} />
            )}
            {isLive && (
              <CheerBar
                gameId={gameId}
                isLive={isLive}
                playCount={(gameData?.plays as any[])?.filter((p: any) => !p.event && !p.isSidelineCutaway).length ?? 0}
                score={(gameData?.homeScore ?? 0) + (gameData?.awayScore ?? 0)}
                bigPlayCount={(gameData?.plays as any[])?.filter((p: any) => p.isBigPlay && !p.isSidelineCutaway).length ?? 0}
                compact
              />
            )}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <XIcon style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
          </button>
        </div>

        {/* Body: two-column in the modal, stacked on mobile and on the route */}
        <div style={{
          flex: asPage ? 'none' : 1,
          display: 'flex',
          flexDirection: stacked ? 'column' : 'row',
          gap: asPage ? '16px' : 0,
          // The modal clips and scrolls inside itself; the page must not, or the
          // columns inherit a height nothing has set and collapse.
          overflow: asPage ? 'visible' : stacked ? 'auto' : 'hidden',
          alignItems: asPage && !stacked ? 'flex-start' : undefined,
          minHeight: 0,
        }}>

          {/* Left panel: Scoreboard + Status + WP */}
          <div style={{
            // On the route this is the game-state column, and it is a FIXED
            // measure rather than a share: the field and the WP chart do not get
            // better with more width, so everything past this belongs to the
            // plays and the box score. As a percentage it grew with the window
            // and stole the width the box score actually needed.
            flex: stacked ? '0 0 auto' : asPage ? '0 0 400px' : '0 0 40%',
            minWidth: 0,
            // The route separates its columns with a gap, not a rule — the
            // panels already have their own borders and a divider between two
            // bordered stacks reads as a double line.
            borderRight: stacked || asPage ? 'none' : '1px solid #334155',
            borderBottom: stacked && !asPage ? '1px solid #334155' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: asPage ? '16px' : 0,
            overflowY: stacked || asPage ? 'visible' : 'auto'
          }}>

            {/* Scores.
                ⚠️ Only the two SCORE ROWS are hidden on the route — the route has
                a full-width scoreboard band above the grid. The frames and innings
                line scores live in this same block and must stay, or the two
                formats that have no quarter breakdown lose their whole line score. */}
            <div style={{ padding: '16px', backgroundColor: '#1e293b' }}>

              {/* Home team — outer flex row holds RallyButton and score
                  OUTSIDE the TeamHoverCard wrapper so hovering the
                  cheer button doesn't pop the team tooltip. */}
              <div style={{ display: asPage ? 'none' : 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                <TeamHoverCard teamId={gameData.homeTeam.id}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    outline: gameData.possession === gameData.homeTeam.abbr && gameData.status === 'Active' ? '2px solid #fff' : 'none',
                    outlineOffset: '2px'
                  }}>
                    <img
                      src={`/avatars/${gameData.homeTeam.id}.png`}
                      alt={gameData.homeTeam.name}
                      crossOrigin="anonymous"
                      style={{ width: '40px', height: '40px', display: 'block' }}
                    />
                  </div>
                  <Link to={`/team/${gameData.homeTeam.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gameData.homeTeam.city}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0' }}>{gameData.homeTeam.name}</span>
                      {homeMomentum && (
                        <svg viewBox="0 0 24 24" fill={flameColor} style={{ width: '16px', height: '16px', flexShrink: 0, filter: flameGlow !== 'none' ? `drop-shadow(${flameGlow})` : undefined, transition: 'all 0.5s ease' }}>
                          <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                        </svg>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>{gameData.homeTeam.record}</span>
                      {gameData.homeTeam.elo != null && <span style={{ fontSize: '13px', color: '#64748b' }}>ELO {Math.round(gameData.homeTeam.elo)}</span>}
                    </div>
                  </Link>
                </TeamHoverCard>
                <div style={{ fontSize: '30px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: '52px', textAlign: 'right' }} className={homeFlash ? 'score-updated' : ''}>
                  {renderModalScore('home', dHomeScore, dAwayScore)}
                </div>
              </div>

              {/* Home timeouts */}
              {!asPage && gameData.status === 'Active' && gameData.homeTimeouts != null && hasTimeouts && (
                <div style={{ display: 'flex', gap: '5px', paddingLeft: '50px', paddingBottom: '8px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: i < gameData.homeTimeouts! ? '#f59e0b' : '#334155',
                      transition: 'background-color 0.3s',
                    }} />
                  ))}
                </div>
              )}

              {/* Away team — RallyButton and score sit outside the
                  TeamHoverCard wrapper, same pattern as Home. */}
              <div style={{ display: asPage ? 'none' : 'flex', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                <TeamHoverCard teamId={gameData.awayTeam.id}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    outline: gameData.possession === gameData.awayTeam.abbr && gameData.status === 'Active' ? '2px solid #fff' : 'none',
                    outlineOffset: '2px'
                  }}>
                    <img
                      src={`/avatars/${gameData.awayTeam.id}.png`}
                      alt={gameData.awayTeam.name}
                      crossOrigin="anonymous"
                      style={{ width: '40px', height: '40px', display: 'block' }}
                    />
                  </div>
                  <Link to={`/team/${gameData.awayTeam.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gameData.awayTeam.city}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0' }}>{gameData.awayTeam.name}</span>
                      {awayMomentum && (
                        <svg viewBox="0 0 24 24" fill={flameColor} style={{ width: '16px', height: '16px', flexShrink: 0, filter: flameGlow !== 'none' ? `drop-shadow(${flameGlow})` : undefined, transition: 'all 0.5s ease' }}>
                          <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                        </svg>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>{gameData.awayTeam.record}</span>
                      {gameData.awayTeam.elo != null && <span style={{ fontSize: '13px', color: '#64748b' }}>ELO {Math.round(gameData.awayTeam.elo)}</span>}
                    </div>
                  </Link>
                </TeamHoverCard>
                <div style={{ fontSize: '30px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: '52px', textAlign: 'right' }} className={awayFlash ? 'score-updated' : ''}>
                  {renderModalScore('away', dAwayScore, dHomeScore)}
                </div>
              </div>

              {/* Away timeouts */}
              {!asPage && gameData.status === 'Active' && gameData.awayTimeouts != null && hasTimeouts && (
                <div style={{ display: 'flex', gap: '5px', paddingLeft: '50px', paddingTop: '8px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: i < gameData.awayTimeouts! ? '#f59e0b' : '#334155',
                      transition: 'background-color 0.3s',
                    }} />
                  ))}
                </div>
              )}

              {/* Frame-by-frame line (match play) — points each team scored in each frame;
                  the frame winner's cell is green (a halved frame is amber). */}
              {gameData.frames?.active ? (() => {
                const fr = gameData.frames!
                const N = fr.framesPerGame
                const done = fr.frameResults ?? []
                const frameData = (i: number) => {   // i = 1..N
                  if (i <= done.length) return { home: done[i - 1].home, away: done[i - 1].away, winner: done[i - 1].winner as string | null }
                  if (i === done.length + 1 && i <= N) return { home: fr.frameHome, away: fr.frameAway, winner: null as string | null }  // in progress
                  return null  // future frame
                }
                const cellColor = (side: 'home' | 'away', winner: string | null) => {
                  if (winner == null) return '#cbd5e1'          // in-progress frame
                  if (winner === 'tie') return '#f59e0b'         // halved
                  return winner === side ? '#22c55e' : '#64748b' // won / lost
                }
                const rowFor = (side: 'home' | 'away', abbr: string) => (
                  <tr>
                    <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em' }}>{abbr}</td>
                    {Array.from({ length: N }).map((_, k) => {
                      const d = frameData(k + 1)
                      if (!d) return <td key={k} style={{ textAlign: 'center', padding: '4px 8px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>-</td>
                      return <td key={k} style={{ textAlign: 'center', padding: '4px 8px', color: cellColor(side, d.winner), fontWeight: d.winner === side ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>{side === 'home' ? d.home : d.away}</td>
                    })}
                  </tr>
                )
                return (
                  <div style={{ borderTop: '1px solid #334155', marginTop: '12px', paddingTop: '8px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '3px 0', color: '#475569', fontWeight: '500', width: '48px' }}></th>
                          {Array.from({ length: N }).map((_, k) => (
                            <th key={k} style={{ textAlign: 'center', padding: '3px 8px', color: (k + 1) === fr.currentFrame ? '#94a3b8' : '#64748b', fontWeight: '500' }}>{k + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rowFor('away', gameData.awayTeam.abbr)}
                        {rowFor('home', gameData.homeTeam.abbr)}
                      </tbody>
                    </table>
                    {/* A frames tie decided on points is shown by highlighting the winning
                        team's point total in the scoreboard above — no note here. */}
                  </div>
                )
              })() : null}

              {/* Innings line score (baseball-style) — replaces the quarter breakdown for
                  innings games. Away bats the top of each inning, home the bottom. */}
              {gameData.innings?.active && gameData.innings.lineScore ? (() => {
                const ls = gameData.innings.lineScore!
                const curInn = gameData.innings!.inning
                const curHalf = gameData.innings!.half
                const cell = (v: number) => (
                  <td key={Math.random()} style={{ textAlign: 'center', padding: '4px 8px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{v}</td>
                )
                const blank = (k: number) => (
                  <td key={k} style={{ textAlign: 'center', padding: '4px 8px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>-</td>
                )
                const row = (side: 'home' | 'away', abbr: string) => (
                  <tr>
                    <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em' }}>{abbr}</td>
                    {ls.innings.map((innNum, i) => {
                      // A team's inning cell is blank until it has batted: away bats the
                      // top first (reached once we're at/after that inning), home bats the
                      // bottom (reached only once we're past it, or in its bottom half).
                      const reached = side === 'away'
                        ? innNum <= curInn
                        : (innNum < curInn || (innNum === curInn && curHalf === 'bottom'))
                      return reached ? cell(ls[side][i] ?? 0) : blank(innNum)
                    })}
                  </tr>
                )
                return (
                  <div style={{ borderTop: '1px solid #334155', marginTop: '12px', paddingTop: '8px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '3px 0', color: '#475569', fontWeight: '500', width: '48px' }}></th>
                          {ls.innings.map(n => (
                            <th key={n} style={{ textAlign: 'center', padding: '3px 8px', color: '#64748b', fontWeight: '500' }}>{n}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {row('away', gameData.awayTeam.abbr)}
                        {row('home', gameData.homeTeam.abbr)}
                      </tbody>
                    </table>
                  </div>
                )
              })() : (dQuarterScores && !gameData.innings?.active && !gameData.frames?.active) ? (
                <div style={{ borderTop: '1px solid #334155', marginTop: '12px', paddingTop: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '3px 0', color: '#475569', fontWeight: '500', width: '48px' }}></th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q1</th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q2</th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q3</th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q4</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em' }}>{gameData.homeTeam.abbr}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.home.q1)}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.home.q2)}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.home.q3)}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.home.q4)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em' }}>{gameData.awayTeam.abbr}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.away.q1)}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.away.q2)}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.away.q3)}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{formatScore(dQuarterScores.away.q4)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Rally buttons — one per team, side-by-side below the
                  scoreboard. Each is a "Cheer for <Team>" CTA that
                  charges floobits and bumps that team's confidence.
                  On the route these sit at the top of the Bleachers rail, with
                  the rest of the fan voice, rather than under the scores. */}
              {!asPage && gameData.status === 'Active' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid #334155',
                }}>
                  <RallyButton game={gameData as any} teamId={Number(gameData.homeTeam.id)} teamColor={gameData.homeTeam.color} />
                  <RallyButton game={gameData as any} teamId={Number(gameData.awayTeam.id)} teamColor={awayDisplayColor} />
                </div>
              )}
            </div>

            {/* Game status + down/distance */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #334155', textAlign: 'center' }}>
              {/* Row 1: clock / final */}
              <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600', marginBottom: '3px',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            justifyContent: 'center', width: '100%' }}>
                {replayActive ? (
                  <span>{`${dQuarter > 4 ? 'OT' : `Q${dQuarter}`}  •  ${dClock}`}</span>
                ) : gameData.status === 'Final' ? (
                  <span>Final{gameData.isOvertime ? ' (OT)' : ''}</span>
                ) : gameData.status === 'Active' ? (
                  <>
                    {gameData.innings?.active ? (
                      // innings: no clock — show inning, half, and tries
                      <span>{`${gameData.innings.half === 'bottom' ? 'BOT' : 'TOP'} ${gameData.innings.inning}  •  Try ${gameData.innings.tries + 1}`}</span>
                    ) : gameData.frames?.active ? (
                      // frames: 10-min frames don't line up with quarters — show the frame
                      // + its clock (down/distance on its own row below). Level frames +
                      // level points go to standard points-decided OT: show the OT clock,
                      // not a frozen "Frame 6 / 10:00" (elapsed caps at regulation in OT).
                      gameData.frames.overtime ? (
                        <span>{`OT  •  ${gameData.timeRemaining}`}</span>
                      ) : (
                        <span>{`Frame ${gameData.frames.currentFrame}  •  ${gameData.frames.frameClock ?? gameData.timeRemaining}`}</span>
                      )
                    ) : gameData.playLimit?.active ? (
                      // play_limit: no clock — show plays remaining in the period
                      <span>{`${gameData.quarter > 4 ? 'OT' : `Q${gameData.quarter}`}  •  ${gameData.playLimit.playsRemaining} ${gameData.playLimit.playsRemaining === 1 ? 'play' : 'plays'} left`}</span>
                    ) : gameData.chessClock?.active ? (
                      // chess_clock: the synthetic clock still tracks quarter progress, so
                      // show quarter + time remaining like a normal game (down/distance on
                      // its own row below; the two offense budgets below that).
                      <span>{`${gameData.quarter > 4 ? 'OT' : `Q${gameData.quarter}`}  •  ${gameData.timeRemaining}`}</span>
                    ) : (
                      <>
                        <span>{`${gameData.quarter > 4 ? 'OT' : `Q${gameData.quarter}`}  •  ${gameData.timeRemaining}`}</span>
                        {(() => {
                          // Mirror the per-play icon: derive current clock state
                          // from the most recent real play. plays are newest-first.
                          const latest = gameData.plays?.find((p: any) => !p.event && p.playResult != null)
                          if (!latest) return null
                          // Hide when the latest play scored — same noise gate as
                          // the per-play row.
                          if (latest.scoreChange) return null
                          return <ClockStateIcon stopped={!!latest.clockStopped} />
                        })()}
                      </>
                    )}
                  </>
                ) : (
                  <span>{gameData.status}</span>
                )}
              </div>
              {/* Row 2: down & distance (active games + replay) */}
              {(gameData.status === 'Active' || replayActive) && (() => {
                const down = dDown
                const distance = dDistance
                const yardLine = dYardLine
                const yardsToEndzone = dYardsToEndzone
                if (!down || !yardLine) return null
                const downSuffix = ordinal(down)
                const showGoal = yardsToEndzone != null && distance != null && yardsToEndzone < distance
                return (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {showGoal ? `${downSuffix} & Goal` : `${downSuffix} & ${distance}`}
                    <span style={{ color: '#475569', margin: '0 6px' }}>•</span>
                    {yardLine}
                  </div>
                )
              })()}
              {/* Drive Clock — the possession shot clock (only when the rule is on) */}
              {gameData.status === 'Active' && !replayActive && gameData.driveClock && (() => {
                const dc = gameData.driveClock!
                const s = Math.max(0, dc.remaining)
                const val = dc.unit === 'plays'
                  ? `${s} ${s === 1 ? 'play' : 'plays'} left`
                  : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
                const color = dc.low ? '#f59e0b' : '#94a3b8'
                return (
                  <div style={{ fontSize: '11px', color, fontWeight: 700, marginTop: '3px',
                                letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Drive Clock {val}
                  </div>
                )
              })()}
              {/* Game format: first-to-X target (win condition) */}
              {gameFormat === 'target' && gameData.status !== 'Scheduled' && (() => {
                const leader = Math.max(gameData.homeScore ?? 0, gameData.awayScore ?? 0)
                const toGo = Math.max(0, targetScore - leader)
                return (
                  <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '3px',
                                letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    First to {targetScore}{gameData.status === 'Active' && toGo > 0 ? ` · ${formatScore(toGo)} to go` : ''}
                  </div>
                )
              })()}
              {/* Game format: bust (darts — land EXACTLY on X; each team's "to go") */}
              {gameFormat === 'bust' && gameData.status !== 'Scheduled' && (() => {
                const hGo = Math.max(0, targetScore - (gameData.homeScore ?? 0))
                const aGo = Math.max(0, targetScore - (gameData.awayScore ?? 0))
                return (
                  <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '3px',
                                letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Darts · land on {targetScore}
                    {gameData.status === 'Active' && (
                      <span style={{ color: '#94a3b8' }}> ({gameData.homeTeam?.abbr} needs {hGo} · {gameData.awayTeam?.abbr} needs {aGo})</span>
                    )}
                  </div>
                )
              })()}
              {/* Game format: play_limit (fixed plays per quarter, no clock) */}
              {gameFormat === 'play_limit' && gameData.playLimit?.active && (
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '3px',
                              letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {gameData.playLimit.playsPerQuarter} plays a quarter
                </div>
              )}
              {/* Game format: frames (match play) — the match is frames won, not points */}
              {/* Game format: chess_clock — each team's remaining offense-time budget */}
              {gameFormat === 'chess_clock' && gameData.chessClock?.active && gameData.status !== 'Scheduled' && (() => {
                const cc = gameData.chessClock!
                // Offense-budget health: green (plenty) -> yellow (getting low) -> red
                // (running out / locked out).
                const LOW_SECS = 60    // under a minute of budget -> red
                const HIGH_SECS = 300  // over 5 min of budget -> green
                const clk = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
                const side = (abbr: string, secs: number, locked: boolean) => {
                  const color = locked || secs <= LOW_SECS ? '#ef4444'     // red
                    : secs <= HIGH_SECS ? '#f59e0b'                        // yellow
                    : '#22c55e'                                            // green
                  return (
                    <span style={{ color, fontWeight: 700, fontSize: '14px' }}>
                      {abbr} {locked ? 'OUT' : clk(secs)}
                    </span>
                  )
                }
                return (
                  <div style={{ fontSize: '11px', marginTop: '3px', letterSpacing: '0.04em',
                                textTransform: 'uppercase', display: 'flex', gap: '8px',
                                alignItems: 'baseline', justifyContent: 'center' }}>
                    <span style={{ color: '#94a3b8' }}>Offense clock</span>
                    {side(gameData.homeTeam?.abbr || 'HOME', cc.homeBudget, cc.homeLockedOut)}
                    <span style={{ color: '#475569' }}>•</span>
                    {side(gameData.awayTeam?.abbr || 'AWAY', cc.awayBudget, cc.awayLockedOut)}
                  </div>
                )
              })()}
            </div>

            {/* "Field Position" header + replay/catch-up controls on one line,
                so the transport never adds a row of its own. Kept here (not in
                the field-viz IIFE) and gated with a single condition — moving it
                or using (A || B) && (...) trips an eslint-plugin-react-hooks
                false-positive in this file. */}
            {gameData.status !== 'Scheduled' && (
              <div style={{ padding: '2px 16px 6px', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '26px' }}>
                <ReplayControlBar
                  active={replayActive}
                  playing={replayPlaying}
                  index={replayIndex}
                  count={replayCount}
                  speed={replaySpeed}
                  isLive={gameData.status === 'Active'}
                  accentColor={gameData.homeTeam.color}
                  onStart={startReplay}
                  onExit={exitReplay}
                  onStep={replayStep}
                  onScrub={replayScrub}
                  onToggle={toggleReplayPlay}
                  onCycleSpeed={cycleReplaySpeed}
                />
              </div>
            )}

            {/* Field Position Visualization */}
            {gameData.status !== 'Scheduled' && (() => {
              const FW = 600, FH = 220
              const EZW = FW / 12 // end zone = 10/120 of total width ≈ 50 SVG units

              // Fixed layout: home end zone = LEFT, away end zone = RIGHT
              const homeTeam = gameData.homeTeam
              const awayTeam = { ...gameData.awayTeam, color: awayDisplayColor }
              const isHomePoss = dPossession === homeTeam.abbr
              const possTeam = isHomePoss ? homeTeam : awayTeam

              // x coord: yards from left (0–120) → SVG x (0–FW)
              const toX = (yfl: number) => (yfl / 120) * FW

              // Last real play. XP kicks broadcast as their own play right
              // after a TD — left as-is, they'd snap the ball to the 15-yard
              // line and wipe the TD trajectory before the user can see it.
              // Walk past XP kicks so the field stays on the TD play (the
              // dramatic moment) until the next real possession starts.
              // 2-Pt tries are kept — they're real run/pass plays worth
              // seeing.
              const realPlays = (displayPlays || []).filter((p: any) =>
                !p.event && p.playResult != null && !p.isSidelineCutaway
              )
              const isXpKick = (p: any) => String(p?.playType || '').toUpperCase() === 'EXTRAPOINT'
              const lastPlay = realPlays.find((p: any) => !isXpKick(p)) ?? realPlays[0]
              const yardsGained = lastPlay?.yardsGained ?? 0
              // playType = play category: Run, Pass, FieldGoal, Punt, Kneel, Spike
              const playType = (lastPlay?.playType ?? '').toUpperCase()
              // Contested Scoring beat 1: the ball REACHED the end zone but the TD is
              // not banked until the contest resolves, so isTouchdown is still false
              // on this play. For drawing purposes the ball got there, so it anchors
              // like a touchdown — otherwise the trajectory stopped short of the goal
              // line on a play the feed calls a provisional score.
              const isProvisional = !!(lastPlay as any)?.isProvisionalScore
                || lastPlay?.playResult === 'Provisional Score'
              const isTD = !!lastPlay?.isTouchdown || isProvisional
              const isTurnover = !!lastPlay?.isTurnover
              // Sideline Goals hoop shot — the last play was a throw at a hoop.
              const isHoopShot = String(lastPlay?.playResult ?? '').includes('Sideline Goal')
              const hoopMade = lastPlay?.playResult === 'Sideline Goal Good'
              // Post-TD conversion — the 2-pt try or any higher Conversion-Ladder rung.
              // conversionPoints is set for every rung (2/3/4/5); the playResult check
              // covers replayed rows that predate that field.
              const convResult = String(lastPlay?.playResult ?? '')
              const isConversion = (lastPlay as any)?.conversionPoints != null
                || convResult.includes('Conversion') || convResult.includes('-Pt')
              const conversionMade = isConversion && !convResult.includes('No Good')

              // Which direction did the last play go?
              // Home team plays go right (+1), away team plays go left (-1)
              const lastPlayDir = lastPlay?.offensiveTeam === homeTeam.abbr ? 1 : -1

              // Absolute ball position using yardsToEndzone + possession direction:
              //   Home attacks RIGHT → ballAbsYfl = 110 - yardsToEndzone
              //   Away attacks LEFT  → ballAbsYfl = 10  + yardsToEndzone
              // TD override: when the last play scored a touchdown, game
              // state has already advanced to the extra-point / kickoff
              // spot, so yardsToEndzone reports that spot (~15) instead
              // of 0. Override the visual ball position to the endzone
              // the scoring team was attacking so the trajectory ends
              // where the TD actually happened.
              let ballAbsYfl: number | null
              if (isTD && lastPlay) {
                ballAbsYfl = lastPlayDir === 1 ? 110 : 10
              } else {
                ballAbsYfl = dBallYardsToEndzone != null
                  ? (isHomePoss ? 110 - dBallYardsToEndzone : 10 + dBallYardsToEndzone)
                  : null
              }
              const ballX = ballAbsYfl != null ? toX(ballAbsYfl) : null
              const midY = FH / 2

              // Only show trajectory when the same team that ran the last play still has possession.
              // After a possession change event, ball position updates to new team but trajectory
              // from the old play would be meaningless.
              const sameTeamHasBall = !lastPlay || lastPlay.offensiveTeam === dPossession

              // Start of last play: move backwards from current ball in play direction
              // Normally the ball sits at the END of the play, so the start is the ball
              // walked back by the yards gained. A TOUCHDOWN breaks that: under Contested
              // Scoring the TD is credited on the CONTEST beat, which gains no yards of
              // its own (the yardage belonged to the provisional play before it), so
              // every scoring play reports yardsGained 0. Walking back from the end zone
              // by 0 collapsed the trajectory onto the goal line. Anchor a score on the
              // play's OWN line of scrimmage instead — exact, and independent of whether
              // yardsGained survived the contest.
              const losYteOfPlay = lastPlay ? deriveYardsToEndzone(lastPlay) : null
              const startAbsYfl = (() => {
                if (ballAbsYfl == null || lastPlay == null) return null
                if (isTD && losYteOfPlay != null) {
                  return lastPlayDir === 1 ? 110 - losYteOfPlay : 10 + losYteOfPlay
                }
                return ballAbsYfl - yardsGained * lastPlayDir
              })()
              const startX = startAbsYfl != null ? toX(startAbsYfl) : null

              // First down marker: the line to gain, measured from the line of
              // scrimmage (NOT the post-play ball spot). Anchoring on the LOS
              // (dYardsToEndzone) keeps the marker fixed across a series instead
              // of drifting with the ball each play — in replay the ball anchor
              // is the play's end spot, so using it here moved the line every
              // play. dYardsToEndzone + dDistance are the live values when not
              // replaying, so this is identical to before for live games.
              const fdDir = isHomePoss ? 1 : -1
              const losAbsYfl = dYardsToEndzone != null
                ? (isHomePoss ? 110 - dYardsToEndzone : 10 + dYardsToEndzone)
                : null
              const fdAbsYfl = losAbsYfl != null && dDistance != null
                ? losAbsYfl + dDistance * fdDir
                : null
              const firstDownX = fdAbsYfl != null ? toX(fdAbsYfl) : null

              // Build play path + style. For passes, playPath = arc through
              // the air, yacPath = straight line after the catch.
              let playPath: string | null = null
              let yacPath: string | null = null
              let playStroke = '#60a5fa'
              let playDash = 'none'
              let playEndX: number | null = null
              // Punt legs, drawn in addition to the kick arc.
              let puntReturnFromX: number | null = null
              let puntReturnToX: number | null = null
              let puntTouchbackFromX: number | null = null
              let puntTouchbackToX: number | null = null

              if (isHoopShot && ballX != null) {
                // Hoop shot — arc from the ball up to the target hoop (midfield or the
                // attacking end-zone pair), on the top sideline. Green make / grey miss.
                const pair = (lastPlay as any)?.hoopPair
                const hoopX = pair === 'endzone' ? (lastPlayDir === 1 ? toX(110) : toX(10)) : toX(60)
                const hoopY = 12
                const midPX = (ballX + hoopX) / 2
                const peakY = hoopY - 24
                playPath = `M${ballX},${midY} Q${midPX},${peakY} ${hoopX},${hoopY}`
                playStroke = hoopMade ? '#22c55e' : '#94a3b8'   // green make / grey incompletion
                playDash = '6,3'
                playEndX = hoopX
              } else if (playType === 'PUNT' && lastPlay) {
                // Punt: the ARC is the kick, drawn from the punt's own line of
                // scrimmage to where the ball actually came down; the RETURN is a
                // separate straight leg back from the landing spot. Previously this
                // drew ONE arc to the post-return spot, which is neither where the
                // ball landed nor how it got there.
                //
                // puntLanding / the return are measured from the RECEIVING team's own
                // goal line, which is the same frame as the punting team's
                // yards-to-endzone — so the abs conversion is identical to a LOS.
                const toAbs = (yte: number) => (lastPlayDir === 1 ? 110 - yte : 10 + yte)
                const losYte = deriveYardsToEndzone(lastPlay)
                const puntLanding = (lastPlay as any)?.puntLanding as number | null | undefined
                const isTouchback = Boolean((lastPlay as any)?.puntTouchback)
                const retYards = Number((lastPlay as any)?.returnYards ?? 0)
                const startX = losYte != null ? toX(toAbs(losYte)) : ballX

                if (startX != null) {
                  // A touchback carries the ball THROUGH the end zone, so the arc
                  // runs to the back of it rather than stopping at a landing spot.
                  const endZoneX = lastPlayDir === 1 ? toX(112) : toX(8)
                  const landX = isTouchback
                    ? endZoneX
                    : (puntLanding != null ? toX(toAbs(puntLanding)) : ballX)

                  if (landX != null) {
                    const midPX = (startX + landX) / 2
                    const arcH = Math.min(Math.abs(landX - startX) * 0.35, 45)
                    const peakY = midY - Math.min(arcH * 1.6, 60)
                    playPath = `M${startX},${midY} Q${midPX},${peakY} ${landX},${midY}`
                    playStroke = '#a78bfa'
                    playDash = '8,4'
                    playEndX = landX

                    if (isTouchback) {
                      // Ball placed at the 20 — draw the spot-back as its own leg so
                      // it reads as a placement, not part of the kick.
                      puntTouchbackFromX = landX
                      puntTouchbackToX = toX(toAbs(20))
                    } else if (retYards > 0 && puntLanding != null) {
                      // The return advances AWAY from the receiving team's own goal,
                      // so the spot increases.
                      puntReturnFromX = landX
                      puntReturnToX = toX(toAbs(puntLanding + retYards))
                    }
                  }
                }
              } else if (playType === 'FIELDGOAL' && lastPlay) {
                // A kick gains no yards, so it never hits the yardage branch
                // below. Anchor on the kick's own line of scrimmage (from its
                // yardLine, since live game state has already advanced past it)
                // and arc high toward the goal posts on the defending end line —
                // green if good, gray if missed.
                const fgGood = lastPlay.playResult === 'Field Goal is Good'
                const losYte = deriveYardsToEndzone(lastPlay)
                const losAbs = losYte != null
                  ? (lastPlayDir === 1 ? 110 - losYte : 10 + losYte)
                  : ballAbsYfl
                const fgStartX = losAbs != null ? toX(losAbs) : ballX
                const fgEndX = lastPlayDir === 1 ? FW - 4 : 4
                if (fgStartX != null) {
                  const midPX = (fgStartX + fgEndX) / 2
                  playPath = `M${fgStartX},${midY} Q${midPX},${midY - 75} ${fgEndX},${midY}`
                  playStroke = fgGood ? '#4ade80' : '#ef4444'  // miss = turnover
                  playDash = '5,4'
                  playEndX = fgEndX
                }
              } else if (isConversion && lastPlay) {
                // A conversion is snapped from its rung's distance (2-pt from the 2, up
                // to the 5-pt rung from the 15) and game state is NOT advanced past that
                // snap — yardsToEndzone still reports the line of scrimmage when this
                // renders. The generic branch below assumes the ball sits at the END of
                // the play and derives the start as ball-minus-yards-gained, which drew
                // the try a full rung-distance BEHIND its actual LOS. Barely visible on a
                // 2-pt, obvious on the 5-pt from the 15. Anchor on the play's own LOS and
                // run forward to the goal line on a make, or to where it died on a miss.
                const losYte = deriveYardsToEndzone(lastPlay)
                const losAbs = losYte != null
                  ? (lastPlayDir === 1 ? 110 - losYte : 10 + losYte)
                  : ballAbsYfl
                const convStartX = losAbs != null ? toX(losAbs) : ballX
                const endAbs = conversionMade
                  ? (lastPlayDir === 1 ? 110 : 10)
                  : (losAbs != null ? losAbs + yardsGained * lastPlayDir : null)
                const convEndX = endAbs != null ? toX(endAbs) : convStartX
                if (convStartX != null && convEndX != null) {
                  const midPX = (convStartX + convEndX) / 2
                  const arcH = Math.min(Math.abs(convEndX - convStartX) * 0.35, 45)
                  playPath = `M${convStartX},${midY} Q${midPX},${midY - arcH} ${convEndX},${midY}`
                  playStroke = conversionMade ? '#22c55e' : '#f59e0b'
                  playDash = '7,3'
                  playEndX = convEndX
                }
              } else if (ballX != null && startX != null && Math.abs(yardsGained) >= 1) {
                const midPX = (startX + ballX) / 2
                const arcH = Math.min(Math.abs(ballX - startX) * 0.35, 45)
                playEndX = ballX

                if (playType === 'RUN' || playType === 'KNEEL' || playType === 'SPIKE') {
                  playPath = `M${startX},${midY} L${ballX},${midY}`
                  playStroke = isTurnover ? '#f87171' : '#4ade80'
                } else {
                  // PASS / default — arc through the air from the QB drop
                  // to the catch point, then a straight line for YAC.
                  const passInsights = (lastPlay as any)?.insights?.pass
                  const airYards = Number(passInsights?.airYards) || 0
                  const yacYards = Number(passInsights?.yac) || 0
                  playStroke = isTurnover ? '#f87171' : '#60a5fa'
                  playDash = '7,3'
                  if (startAbsYfl != null && airYards > 0) {
                    // Catch point in field coords
                    const catchAbsYfl = startAbsYfl + airYards * lastPlayDir
                    const catchX = toX(catchAbsYfl)
                    const airArcSpan = Math.abs(catchX - startX)
                    const airMidX = (startX + catchX) / 2
                    const airPeakY = midY - Math.min(airArcSpan * 0.35, 45)
                    playPath = `M${startX},${midY} Q${airMidX},${airPeakY} ${catchX},${midY}`
                    if (yacYards !== 0 && Math.abs(ballX - catchX) >= 1) {
                      yacPath = `M${catchX},${midY} L${ballX},${midY}`
                    }
                  } else {
                    // Incomplete / sack / unknown air yards — fall back to a
                    // single arc covering the whole play span.
                    const peakY = midY - arcH
                    playPath = `M${startX},${midY} Q${midPX},${peakY} ${ballX},${midY}`
                  }
                }
                if (isTD) playStroke = '#fbbf24'
              }

              // The possession-change guard suppresses a stale run/pass
              // trajectory, but a kick's arc is the play itself and stays
              // meaningful even though possession flips after it.
              if (!sameTeamHasBall && playType !== 'PUNT' && playType !== 'FIELDGOAL' && !isHoopShot) playPath = null

              // Arrowhead points toward the end of the play
              const arrowDir = playEndX != null && ballX != null ? (playEndX >= ballX ? 1 : -1) : lastPlayDir

              // Yard lines at 10-yd intervals across the 120-yd field
              const yardLinePositions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]
              // The 5-yd lines that fall between the numbered 10s (real field has
              // a line every 5 yards; only the 10s are numbered).
              const fiveYardLinePositions = [15, 25, 35, 45, 55, 65, 75, 85, 95, 105]
              // NFL-style yard numbers (count from each end)
              const yardNums: [number, string][] = [
                [20, '10'], [30, '20'], [40, '30'], [50, '40'], [60, '50'],
                [70, '40'], [80, '30'], [90, '20'], [100, '10']
              ]

              const playResult = lastPlay?.playResult ?? null
              // The backend appends anomaly glitch line(s) to the play text;
              // strip them here so the under-field blurb shows only the play
              // itself. Glitch lines stay exclusive to the play feed (which
              // renders them with their own styling).
              const rawDescription = lastPlay?.description ?? lastPlay?.text ?? null
              const lastGlitch = (lastPlay as any)?.glitchText
              const playDescription = rawDescription && lastGlitch && rawDescription.includes(lastGlitch)
                ? rawDescription.replace(`\n${lastGlitch}`, '').replace(lastGlitch, '').trim()
                : rawDescription

              // Big-play reaction overlay. Keyed by play so the CSS animation
              // re-fires each time a new qualifying play lands (live) or the
              // cursor steps onto one (replay). Scores and turnovers take
              // precedence; otherwise a "big" flash fires on a 20+ yard run/pass
              // OR any play the feed flags as a big WPA swing (isBigPlay).
              const isBigGain = (playType === 'RUN' || playType === 'PASS') && yardsGained >= 20
              const isMadeFg = playType === 'FIELDGOAL' && lastPlay?.playResult === 'Field Goal is Good'
              // An awakened power firing takes precedence on the field — a brilliant gold wash + the
              // power name, signalling "a power was used" (the score still updates regardless).
              const awakenedFire = (lastPlay as any)?.awakenedFire
              const bigReaction = awakenedFire
                ? { label: awakenedFire.powerName || 'AWAKENED', color: '#fde68a', kind: 'awakened' }
                : isTD
                ? { label: 'TOUCHDOWN', color: '#fbbf24', kind: 'td' }
                : isTurnover
                  ? { label: 'TURNOVER', color: '#ef4444', kind: 'turnover' }
                  : isMadeFg
                    ? { label: 'FIELD GOAL', color: '#4ade80', kind: 'fg' }
                    : (isBigGain || lastPlay?.isBigPlay)
                      ? { label: '', color: '#38bdf8', kind: 'big' }
                      : null
              const reactionKey = `${lastPlay?.playNumber ?? 0}-${bigReaction?.kind ?? 'none'}`

              return (
                <div style={{ padding: '0 16px 16px' }}>
                  {/* "Field Position" label + replay controls live on the row
                      above (consolidated), so no header here. */}
                  {/* ⚠️ `width: 100%` on a 600×220 viewBox means the field is as
                      tall as its container is wide, divided by 2.7. In the modal
                      the container is a 40% panel; on the route it is the whole
                      left column, so without a ceiling the pitch grows with the
                      monitor. 762 is the width it was drawn at (the design's
                      794px column less its 16px padding). */}
                  <svg
                    viewBox={`0 0 ${FW} ${FH}`}
                    style={{
                      width: '100%', height: 'auto', display: 'block', borderRadius: '4px',
                      ...(asPage ? { maxWidth: '762px', margin: '0 auto' } : {}),
                    }}
                  >
                    {/* Home end zone (LEFT) */}
                    <rect x={0} y={0} width={EZW} height={FH} fill={homeTeam.color} opacity={0.4} />
                    {/* Away end zone (RIGHT) */}
                    <rect x={FW - EZW} y={0} width={EZW} height={FH} fill={awayTeam.color} opacity={0.4} />

                    {/* Playing field */}
                    <rect x={EZW} y={0} width={FW - 2 * EZW} height={FH} fill="#1e4620" />

                    {/* End zone border lines */}
                    <line x1={toX(10)} y1={0} x2={toX(10)} y2={FH} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                    <line x1={toX(110)} y1={0} x2={toX(110)} y2={FH} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />

                    {/* 5-yard lines (between the numbered 10s) — fainter so the
                        numbered 10-yard lines stay the primary references. */}
                    {fiveYardLinePositions.map(yd => (
                      <line key={`f-${yd}`}
                        x1={toX(yd)} y1={0} x2={toX(yd)} y2={FH}
                        stroke="rgba(255,255,255,0.10)" strokeWidth={0.6}
                      />
                    ))}

                    {/* Yard lines (every 10) */}
                    {yardLinePositions.map(yd => (
                      <line key={yd}
                        x1={toX(yd)} y1={0} x2={toX(yd)} y2={FH}
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={yd === 60 ? 1.5 : 0.75}
                      />
                    ))}

                    {/* Hash marks */}
                    {yardLinePositions.map(yd => (
                      <g key={`h-${yd}`}>
                        <line x1={toX(yd) - 5} y1={FH * 0.32} x2={toX(yd) + 5} y2={FH * 0.32} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                        <line x1={toX(yd) - 5} y1={FH * 0.68} x2={toX(yd) + 5} y2={FH * 0.68} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                      </g>
                    ))}

                    {/* Yard numbers */}
                    {yardNums.map(([ydPos, label]) => (
                      <text key={ydPos} x={toX(ydPos)} y={FH * 0.82}
                        textAnchor="middle" fontSize={17} fill="rgba(255,255,255,0.3)" fontFamily="pressStart, monospace">
                        {label}
                      </text>
                    ))}

                    {/* End zone team names — vertical (parallel to the yard
                        lines), reading into the field from each end (home left
                        reads bottom-to-top, away right reads top-to-bottom). */}
                    <text x={EZW / 2} y={midY} transform={`rotate(-90 ${EZW / 2} ${midY})`}
                      textAnchor="middle" dominantBaseline="central" fontSize={21} fontWeight={800}
                      letterSpacing={1.5} fill={homeTeam.color} opacity={0.9} fontFamily="pressStart, monospace">
                      {(homeTeam.name || homeTeam.abbr).toUpperCase()}
                    </text>
                    <text x={FW - EZW / 2} y={midY} transform={`rotate(90 ${FW - EZW / 2} ${midY})`}
                      textAnchor="middle" dominantBaseline="central" fontSize={21} fontWeight={800}
                      letterSpacing={1.5} fill={awayTeam.color} opacity={0.9} fontFamily="pressStart, monospace">
                      {(awayTeam.name || awayTeam.abbr).toUpperCase()}
                    </text>

                    {/* Sideline Goals — the hoop pairs. Two per attacking direction:
                        a midfield pair (~the 50) and a pair flanking the attacking end
                        zone. Yellow = not attempted this drive, green = made, red =
                        missed. The non-attacking end's hoops are dimmed (not in play). */}
                    {gameData.sidelineGoals?.active && (() => {
                      // Live: the current-drive state from the backend. In REPLAY that state
                      // reflects the LATEST drive, not the replayed moment — so derive the pair
                      // state + attacking direction from the cursor's own drive (the contiguous
                      // run of same-offense plays up to the cursor). Without this the goals were
                      // hidden entirely in replay.
                      let sg = gameData.sidelineGoals!
                      if (replayActive && lastPlay) {
                        let mid: 'open' | 'made' | 'missed' = 'open'
                        let ez: 'open' | 'made' | 'missed' = 'open'
                        for (const p of realPlays) {
                          if (p.offensiveTeam !== lastPlay.offensiveTeam) break   // reached the prior drive
                          const pr = String(p.playResult ?? '')
                          if (pr.includes('Sideline Goal')) {
                            const res: 'made' | 'missed' = pr === 'Sideline Goal Good' ? 'made' : 'missed'
                            if ((p as any).hoopPair === 'endzone') { if (ez === 'open') ez = res }
                            else if (mid === 'open') mid = res
                          }
                        }
                        sg = { active: true, midfield: mid, endzone: ez, attackingHome: lastPlayDir === 1 }
                      }
                      const col = (s: string) => s === 'made' ? '#22c55e' : s === 'missed' ? '#ef4444' : '#FFD700'
                      const yTop = 12, yBot = FH - 12
                      const midX = toX(60)
                      const attackX = sg.attackingHome ? toX(110) : toX(10)
                      const otherX = sg.attackingHome ? toX(10) : toX(110)
                      const hoops = [
                        { x: midX, y: yTop, c: col(sg.midfield), o: 0.95 },
                        { x: midX, y: yBot, c: col(sg.midfield), o: 0.95 },
                        { x: attackX, y: yTop, c: col(sg.endzone), o: 0.95 },
                        { x: attackX, y: yBot, c: col(sg.endzone), o: 0.95 },
                        { x: otherX, y: yTop, c: '#FFD700', o: 0.22 },
                        { x: otherX, y: yBot, c: '#FFD700', o: 0.22 },
                      ]
                      return (
                        <g>
                          {hoops.map((h, i) => (
                            <circle key={`hoop-${i}`} cx={h.x} cy={h.y} r={6.5}
                              fill="none" stroke={h.c} strokeWidth={2.5} opacity={h.o} />
                          ))}
                        </g>
                      )
                    })()}

                    {/* First down marker */}
                    {firstDownX != null && firstDownX > EZW && firstDownX < FW - EZW && (
                      <line x1={firstDownX} y1={6} x2={firstDownX} y2={FH - 6}
                        stroke="#FFD700" strokeWidth={1.5} opacity={0.7} strokeDasharray="3,2" />
                    )}

                    {/* Last play path (passes: arc = air yards) */}
                    {playPath && (
                      <path d={playPath} fill="none"
                        stroke={playStroke} strokeWidth={2.5}
                        strokeDasharray={playDash}
                        strokeLinecap="round"
                        opacity={0.8}
                      />
                    )}

                    {/* YAC segment on passes — straight line after the catch */}
                    {yacPath && (
                      <path d={yacPath} fill="none"
                        stroke={playStroke} strokeWidth={2.5}
                        strokeLinecap="round"
                        opacity={0.8}
                      />
                    )}

                    {/* Punt return — a solid leg back from the landing spot, so the
                        kick and the run-back read as two different things. */}
                    {puntReturnFromX != null && puntReturnToX != null && (
                      <>
                        <path d={`M${puntReturnFromX},${midY} L${puntReturnToX},${midY}`}
                          fill="none" stroke="#38bdf8" strokeWidth={3}
                          strokeLinecap="round" opacity={0.95}
                        />
                        {/* landing spot marker */}
                        <circle cx={puntReturnFromX} cy={midY} r={3.5}
                          fill="#a78bfa" opacity={0.95} />
                        <polygon
                          points={`${puntReturnToX},${midY - 5} ${puntReturnToX + (puntReturnToX >= puntReturnFromX ? 8 : -8)},${midY} ${puntReturnToX},${midY + 5}`}
                          fill="#38bdf8" opacity={0.95}
                        />
                      </>
                    )}

                    {/* Touchback — the ball carried through the end zone, then gets
                        spotted at the 20. Dashed amber so it reads as a placement
                        rather than as yardage anyone gained. */}
                    {puntTouchbackFromX != null && puntTouchbackToX != null && (
                      <>
                        <path d={`M${puntTouchbackFromX},${midY} L${puntTouchbackToX},${midY}`}
                          fill="none" stroke="#fbbf24" strokeWidth={2}
                          strokeDasharray="3,3" strokeLinecap="round" opacity={0.85}
                        />
                        <circle cx={puntTouchbackToX} cy={midY} r={4}
                          fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.95} />
                        <text x={puntTouchbackToX} y={midY - 10} textAnchor="middle"
                          fontSize={9} fill="#fbbf24" opacity={0.95}>TB</text>
                      </>
                    )}

                    {/* Arrowhead at end of play */}
                    {playEndX != null && playPath && Math.abs(yardsGained) >= 1 && (
                      <polygon
                        points={`${playEndX},${midY - 6} ${playEndX + arrowDir * 9},${midY} ${playEndX},${midY + 6}`}
                        fill={playStroke}
                        opacity={0.85}
                      />
                    )}

                    {/* Ball marker + possession indicator */}
                    {ballX != null && (
                      <g>
                        <circle cx={ballX} cy={midY} r={11} fill={possTeam.color} opacity={0.3} />
                        <ellipse cx={ballX} cy={midY} rx={8} ry={5}
                          fill="#7B4F2E" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                        <line x1={ballX - 3} y1={midY} x2={ballX + 3} y2={midY}
                          stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
                        {/* Who has the ball: team logo above, white arrow toward their endzone */}
                        {dPossession && (
                          <>
                            <circle cx={ballX} cy={midY - 22} r={11} fill="#0f172a" opacity={0.85}
                              stroke={possTeam.color} strokeWidth={1.5} />
                            <image href={`/avatars/${possTeam.id}.png`}
                              x={ballX - 9} y={midY - 31} width={18} height={18} />
                            <polygon
                              points={fdDir === 1
                                ? `${ballX + 14},${midY} ${ballX + 7},${midY - 5} ${ballX + 7},${midY + 5}`
                                : `${ballX - 14},${midY} ${ballX - 7},${midY - 5} ${ballX - 7},${midY + 5}`}
                              fill="#f8fafc" stroke="rgba(0,0,0,0.55)" strokeWidth={0.5} opacity={0.95} />
                          </>
                        )}
                      </g>
                    )}

                    {/* Big-play reaction. Every kind gets a full-field color
                        flash; TD/turnover also get a text banner. Big gains are
                        flash-only (a double pulse) — no text. */}
                    {bigReaction && (
                      <rect key={`flash-${reactionKey}`}
                        className={bigReaction.kind === 'awakened' ? 'fieldReactionFlash--awaken' : bigReaction.kind === 'big' ? 'fieldReactionFlash--pulse' : 'fieldReactionFlash'}
                        x={0} y={0} width={FW} height={FH} fill={bigReaction.color} pointerEvents="none" />
                    )}
                    {bigReaction && bigReaction.kind !== 'big' && (
                      <g key={`banner-${reactionKey}`}
                        className={`fieldReactionBanner${bigReaction.kind === 'turnover' ? ' fieldReactionBanner--shake' : ''}`}
                        pointerEvents="none">
                        <text x={FW / 2} y={midY + 7} textAnchor="middle"
                          fontSize={20}
                          fill={bigReaction.color} stroke="rgba(0,0,0,0.7)" strokeWidth={1}
                          paintOrder="stroke" fontFamily="pressStart, monospace">
                          {bigReaction.label}
                        </text>
                      </g>
                    )}
                  </svg>

                  {/* Last play info — fixed height so WP chart doesn't shift */}
                  <div style={{ marginTop: '8px', minHeight: '44px' }}>
                    {(playResult || playDescription) && (
                      <>
                        {playDescription && (
                          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: 0, lineHeight: '1.4', marginBottom: playResult ? '4px' : 0, fontFamily: 'pressStart, monospace' }}>
                            {playDescription}
                          </p>
                        )}
                        {playResult && isFieldBadgeResult(String(playResult)) && (() => {
                          const badgeColor = getResultColor(String(playResult), effectiveLastDown) ?? '#64748b'
                          // Conversions badge by rung: "N-Pt Good/No Good" (driven by conversionPoints).
                          const convPts = (lastPlay as any)?.conversionPoints
                          const fieldBadgeLabel = convPts != null
                            ? `${convPts}-Pt ${String(playResult).includes('No Good') ? 'No Good' : 'Good'}`
                            : playResult
                          return (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                              <span style={{
                                fontSize: '10px',
                                color: badgeColor,
                                backgroundColor: `${badgeColor}30`,
                                padding: '1px 7px',
                                borderRadius: '3px',
                                fontWeight: '700',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                fontFamily: 'pressStart, monospace',
                              }}>
                                {fieldBadgeLabel}
                              </span>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Win Probability chart */}
            {gameData.homeWinProbability !== undefined && (() => {
              const homeColor = gameData.homeTeam.color
              const awayColor = awayDisplayColor
              const homeSecondary = gameData.homeTeam.secondaryColor
              const awaySecondary = gameData.awayTeam.secondaryColor
              const W = 800, H = 140
              const numSections = Math.max(1, wpAxis.numSections)
              const toX = (pos: number) => (pos / numSections) * W
              const dividerTimes = wpAxis.dividers
              const quarterLabels = wpAxis.labels
              const bigDivider = wpAxis.bigDivider
              return (
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Win Probability
                  </div>
                  <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                    <span style={{ position: 'absolute', top: '5px', left: '6px', fontSize: '11px', fontWeight: '700', color: homeSecondary, background: homeColor, padding: '1px 5px', borderRadius: '3px', pointerEvents: 'none', zIndex: 1 }}>
                      {gameData.homeTeam.abbr} {gameData.homeWinProbability.toFixed(1)}%
                    </span>
                    <span style={{ position: 'absolute', bottom: '5px', left: '6px', fontSize: '11px', fontWeight: '700', color: awayColor === awaySecondary ? gameData.awayTeam.color : awaySecondary, background: awayColor, padding: '1px 5px', borderRadius: '3px', pointerEvents: 'none', zIndex: 1 }}>
                      {gameData.awayTeam.abbr} {gameData.awayWinProbability?.toFixed(1)}%
                    </span>
                    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '140px', display: 'block' }}>
                      <rect x={0} y={0} width={W} height={H / 2} fill={homeColor} fillOpacity={0.15} />
                      <rect x={0} y={H / 2} width={W} height={H / 2} fill={awayColor} fillOpacity={0.15} />
                      {dividerTimes.map((t, i) => (
                        <line key={i} x1={toX(t)} y1={0} x2={toX(t)} y2={H} stroke="#1e293b" strokeWidth={t === bigDivider ? 3.5 : 2.5} />
                      ))}
                      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="6,4" />
                      {wpSegments.map((seg, i) => (
                        <polyline key={`shadow-${i}`} points={seg.pts} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
                      ))}
                      {wpSegments.map((seg, i) => (
                        <polyline key={i} points={seg.pts} fill="none" stroke={seg.color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
                      ))}
                    </svg>
                  </div>
                  <div style={{ position: 'relative', height: '16px', marginTop: '3px' }}>
                    {quarterLabels.map((label, i) => (
                      <span key={label} style={{ position: 'absolute', left: `${((i + 0.5) / numSections) * 100}%`, transform: 'translateX(-50%)', fontSize: '10px', color: '#475569' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* The right REGION of the route: the tabs panel, and — only while the
              Plays view is up — the Bleachers beside it. Switching to Box Score
              or Player Stats hands the rail's width to the table, which is the
              view that actually wants it. `display: contents` in the modal so
              this wrapper adds nothing there. */}
          <div style={asPage ? {
            flex: stacked ? 'none' : 1,
            display: 'flex',
            flexDirection: stacked ? 'column' : 'row',
            alignItems: 'stretch',
            gap: '16px',
            minWidth: 0,
          } : { display: 'contents' }}>

          {/* Tabs + scrollable content. */}
          <div style={{
            flex: stacked ? 'none' : 1,
            display: 'flex', flexDirection: 'column',
            overflow: stacked ? 'visible' : 'hidden',
            minWidth: 0,
            ...(asPage ? { background: '#131e2f', border: '1px solid #1e293b' } : {}),
            // The feed scrolls WITHIN its column so the page stays about one
            // screen — the whole reason for putting it beside the field. Left
            // unbounded it would grow to the length of the play list and the
            // page would scroll exactly as far as before.
            ...(asPage && !stacked ? { maxHeight: 'calc(100vh - 250px)' } : {}),
          }}>

            {/* Tab bar — hidden for Scheduled games. On the route it is the
                page's segmented control: one object, shared with the stats page
                and the standings view switcher. */}
            {gameData.status !== 'Scheduled' && (
              <div style={asPage ? {
                padding: '12px 16px', background: '#0f172a',
                borderBottom: '1px solid #334155', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '11px',
              } : { padding: '10px 16px', borderBottom: '1px solid #334155', flexShrink: 0, display: 'flex', gap: '4px' }}>
                {asPage ? (
                  <div style={{ display: 'flex', background: '#0f172a', border: '1px solid #1e293b' }}>
                    {(['plays', 'box', 'stats'] as const).map((tab, i) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: '8px 13px',
                          border: 'none',
                          borderLeft: i > 0 ? '1px solid #1e293b' : 'none',
                          cursor: 'pointer',
                          fontFamily: "'pressStart', ui-monospace, monospace",
                          fontSize: '11px', lineHeight: 1, letterSpacing: '0.08em',
                          fontWeight: activeTab === tab ? 800 : 500,
                          backgroundColor: activeTab === tab ? '#cbd5e1' : 'transparent',
                          color: activeTab === tab ? '#0b1220' : '#94a3b8',
                        }}
                      >
                        {tab === 'plays' ? 'PLAYS' : tab === 'box' ? 'BOX SCORE' : 'PLAYER STATS'}
                      </button>
                    ))}
                  </div>
                ) : (['plays', 'box', 'stats'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: activeTab === tab ? '#1e293b' : 'transparent',
                      color: activeTab === tab ? '#e2e8f0' : '#64748b',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tab === 'plays' ? 'Plays' : tab === 'box' ? 'Box Score' : 'Stats'}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content — fills all remaining height */}
            <div style={{ flex: stacked ? 'none' : 1, overflowY: stacked ? 'visible' : 'auto', padding: '16px' }}>

              {/* Matchup preview for Scheduled games */}
              {gameData.status === 'Scheduled' && (() => {
                const mp = (gameData as any).matchupPreview
                if (!mp) return <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>Matchup data available after Week 1</div>
                const h = mp.home
                const a = mp.away
                const homeAbbr = gameData.homeTeam.abbr
                const awayAbbr = gameData.awayTeam.abbr
                const homeColor = gameData.homeTeam.color
                const awayColor = awayDisplayColor
                const homeId = gameData.homeTeam.id
                const awayId = gameData.awayTeam.id
                const homeName = gameData.homeTeam.name
                const awayName = gameData.awayTeam.name
                const homeCity = gameData.homeTeam.city
                const awayCity = gameData.awayTeam.city

                type MatchupRow = { label: string; home: number; away: number; flip?: boolean }
                const sections: { title: string; rows: MatchupRow[] }[] = [
                  { title: 'Scoring', rows: [
                    { label: 'Points / Game', home: h.avgPts, away: a.avgPts },
                    { label: 'Points Allowed', home: h.avgPtsAlwd, away: a.avgPtsAlwd, flip: true },
                  ]},
                  { title: 'Passing', rows: [
                    { label: 'Pass Yards / Game', home: h.avgPassYards, away: a.avgPassYards },
                    { label: 'Pass Yards Allowed', home: h.avgPassYardsAlwd, away: a.avgPassYardsAlwd, flip: true },
                    { label: 'Pass TDs / Game', home: h.avgPassTds, away: a.avgPassTds },
                  ]},
                  { title: 'Rushing', rows: [
                    { label: 'Rush Yards / Game', home: h.avgRunYards, away: a.avgRunYards },
                    { label: 'Rush Yards Allowed', home: h.avgRunYardsAlwd, away: a.avgRunYardsAlwd, flip: true },
                    { label: 'Rush TDs / Game', home: h.avgRunTds, away: a.avgRunTds },
                  ]},
                  { title: 'Defense', rows: [
                    { label: 'Sacks / Game', home: h.avgSacks, away: a.avgSacks },
                    { label: 'INTs / Game', home: h.avgInts, away: a.avgInts },
                  ]},
                ]

                const matchupRow = (row: MatchupRow) => {
                  const homeWins = row.flip ? row.home < row.away : row.home > row.away
                  const awayWins = row.flip ? row.away < row.home : row.away > row.home
                  const tied = row.home === row.away
                  const cellBase: React.CSSProperties = {
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    fontVariantNumeric: 'tabular-nums',
                    padding: '12px 16px',
                    transition: 'background-color 0.2s',
                  }
                  return (
                    <div key={row.label} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 1fr',
                      alignItems: 'stretch',
                      borderTop: '1px solid #1e293b',
                    }}>
                      <div style={{
                        ...cellBase,
                        textAlign: 'right',
                        backgroundColor: tied ? 'transparent' : (homeWins ? `${homeColor}33` : 'transparent'),
                        borderRight: tied || !homeWins ? 'none' : `2px solid ${homeColor}`,
                      }}>{row.home.toFixed(1)}</div>
                      <div style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        padding: '12px 18px',
                        alignSelf: 'center',
                      }}>{row.label}</div>
                      <div style={{
                        ...cellBase,
                        textAlign: 'left',
                        backgroundColor: tied ? 'transparent' : (awayWins ? `${awayColor}33` : 'transparent'),
                        borderLeft: tied || !awayWins ? 'none' : `2px solid ${awayColor}`,
                      }}>{row.away.toFixed(1)}</div>
                    </div>
                  )
                }

                return (
                  <div>
                    {/* Team header — avatars + city/name with team-color accents */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center',
                      gap: '0 20px',
                      padding: '16px 18px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      backgroundImage: `linear-gradient(90deg, ${homeColor}1a 0%, transparent 35%, transparent 65%, ${awayColor}1a 100%)`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', minWidth: 0 }}>
                        <div style={{ textAlign: 'right', minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeCity}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeName}</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: homeColor, letterSpacing: '0.08em', marginTop: '2px' }}>{homeAbbr}</div>
                        </div>
                        <img src={`/avatars/${homeId}.png`} alt={homeName} style={{ width: '52px', height: '52px', flexShrink: 0 }} />
                      </div>
                      <div style={{
                        fontSize: '11px', fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.15em',
                        padding: '0 4px',
                      }}>vs</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start', minWidth: 0 }}>
                        <img src={`/avatars/${awayId}.png`} alt={awayName} style={{ width: '52px', height: '52px', flexShrink: 0 }} />
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayCity}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayName}</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: awayColor, letterSpacing: '0.08em', marginTop: '2px' }}>{awayAbbr}</div>
                        </div>
                      </div>
                    </div>

                    {/* Matchup preview banner */}
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748b',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      padding: '6px 0 14px',
                    }}>Season Averages</div>

                    {sections.map(section => (
                      <div key={section.title} style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        marginTop: '12px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#cbd5e1',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          backgroundColor: '#1e293b',
                          borderBottom: '1px solid #334155',
                        }}>{section.title}</div>
                        {section.rows.map(matchupRow)}
                      </div>
                    ))}
                  </div>
                )
              })()}
              {gameData.status !== 'Scheduled' && activeTab === 'plays' && (
                <>
                  {/* All / Highlights toggle */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    {(['all', 'highlights'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setShowHighlightsOnly(mode === 'highlights')}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: (mode === 'highlights') === showHighlightsOnly ? '#3b82f6' : '#1e293b',
                          color: (mode === 'highlights') === showHighlightsOnly ? '#fff' : '#64748b',
                        }}
                      >
                        {mode === 'all' ? 'All Plays' : 'Highlights'}
                      </button>
                    ))}
                  </div>

                  {(!gameData.plays || gameData.plays.length === 0) ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>
                      {gameData.status === 'Active' ? (
                        <>
                          <div style={{ marginBottom: '8px' }}>Waiting for live plays...</div>
                          <div style={{ fontSize: '12px' }}>Plays will appear here as they happen</div>
                        </>
                      ) : gameData.status === 'Scheduled' ? (
                        'Game has not started yet'
                      ) : (
                        'No play data available'
                      )}
                    </div>
                  ) : showHighlightsOnly ? (
                    (() => {
                      const highlights = (displayPlays as any[]).filter(isHighlightPlay)
                      return highlights.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>No highlights yet</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {highlights.map((play: any, index: number) => renderPlay(play, 'hl', index))}
                        </div>
                      )
                    })()
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {processedPlays.map((play: any, index: number) => renderPlay(play, 'play', index))}
                    </div>
                  )}
                </>
              )}
              {activeTab === 'box' && (() => {
                const gs = gameData.gameStats
                if (!gs) return <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>Stats not available yet</div>
                const h = gs.home.team
                const a = gs.away.team
                const homeAbbr = gameData.homeTeam.abbr
                const awayAbbr = gameData.awayTeam.abbr
                const homeColor = gameData.homeTeam.color
                const awayColor = awayDisplayColor

                // For each row, return numeric values used to determine the
                // "leader" side (lower-is-better stats flip the comparison).
                type BoxRow = { label: string; home: string | number; away: string | number; homeNum: number; awayNum: number; lowerBetter?: boolean }
                // Per-attempt efficiency stats (rounded to 1 decimal)
                const ratio = (num: number, denom: number) =>
                  denom > 0 ? +(num / denom).toFixed(1) : 0
                const hYpPlay = ratio(h.totalYards, h.totalPlays)
                const aYpPlay = ratio(a.totalYards, a.totalPlays)
                const hYpa = ratio(h.passYards, h.passAtt)
                const aYpa = ratio(a.passYards, a.passAtt)
                const hYpc = ratio(h.rushYards, h.rushCarries)
                const aYpc = ratio(a.rushYards, a.rushCarries)

                const sections: { title: string; rows: BoxRow[] }[] = [
                  {
                    title: 'Total Offense',
                    rows: [
                      { label: 'Total Yards',  home: h.totalYards, away: a.totalYards, homeNum: h.totalYards, awayNum: a.totalYards },
                      { label: 'Total Plays',  home: h.totalPlays, away: a.totalPlays, homeNum: h.totalPlays, awayNum: a.totalPlays },
                      { label: 'Yards / Play', home: hYpPlay,      away: aYpPlay,      homeNum: hYpPlay,      awayNum: aYpPlay },
                      { label: 'First Downs',  home: h.firstDowns, away: a.firstDowns, homeNum: h.firstDowns, awayNum: a.firstDowns },
                    ],
                  },
                  {
                    title: 'Passing',
                    rows: [
                      { label: 'Pass Yards',    home: h.passYards, away: a.passYards, homeNum: h.passYards, awayNum: a.passYards },
                      { label: 'Completions',   home: `${h.passComp}/${h.passAtt}`, away: `${a.passComp}/${a.passAtt}`, homeNum: h.passComp, awayNum: a.passComp },
                      { label: 'Yards / Att',   home: hYpa, away: aYpa, homeNum: hYpa, awayNum: aYpa },
                      { label: 'Pass TDs',      home: h.passTds, away: a.passTds, homeNum: h.passTds, awayNum: a.passTds },
                      { label: 'Interceptions', home: h.passInts, away: a.passInts, homeNum: h.passInts, awayNum: a.passInts, lowerBetter: true },
                      { label: 'Sacks Allowed', home: a.sacks, away: h.sacks, homeNum: a.sacks, awayNum: h.sacks, lowerBetter: true },
                    ],
                  },
                  {
                    title: 'Rushing',
                    rows: [
                      { label: 'Rush Yards',   home: h.rushYards,   away: a.rushYards,   homeNum: h.rushYards,   awayNum: a.rushYards   },
                      { label: 'Rush Carries', home: h.rushCarries, away: a.rushCarries, homeNum: h.rushCarries, awayNum: a.rushCarries },
                      { label: 'Yards / Carry', home: hYpc, away: aYpc, homeNum: hYpc, awayNum: aYpc },
                      { label: 'Rush TDs',     home: h.rushTds,     away: a.rushTds,     homeNum: h.rushTds,     awayNum: a.rushTds     },
                    ],
                  },
                  {
                    title: 'Conversions & Mistakes',
                    rows: [
                      { label: '3rd Down',  home: `${h.thirdDownConv ?? 0}/${h.thirdDownAtt ?? 0}`, away: `${a.thirdDownConv ?? 0}/${a.thirdDownAtt ?? 0}`, homeNum: h.thirdDownConv ?? 0, awayNum: a.thirdDownConv ?? 0 },
                      { label: '4th Down',  home: `${h.fourthDownConv ?? 0}/${h.fourthDownAtt ?? 0}`, away: `${a.fourthDownConv ?? 0}/${a.fourthDownAtt ?? 0}`, homeNum: h.fourthDownConv ?? 0, awayNum: a.fourthDownConv ?? 0 },
                      { label: 'Turnovers', home: h.turnovers, away: a.turnovers, homeNum: h.turnovers, awayNum: a.turnovers, lowerBetter: true },
                    ],
                  },
                ]

                // Centered HOME | LABEL | AWAY row. The leading side gets its
                // cell tinted in the team color so the winner "lights up"
                // visually; the trailing cell stays neutral.
                const compareRow = (row: BoxRow) => {
                  const homeWins = row.lowerBetter ? row.homeNum < row.awayNum : row.homeNum > row.awayNum
                  const awayWins = row.lowerBetter ? row.awayNum < row.homeNum : row.awayNum > row.homeNum
                  const tied = row.homeNum === row.awayNum
                  const cellBase: React.CSSProperties = {
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    fontVariantNumeric: 'tabular-nums',
                    padding: '12px 16px',
                    transition: 'background-color 0.2s',
                  }
                  return (
                    <div key={row.label} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 1fr',
                      alignItems: 'stretch',
                      borderTop: '1px solid #1e293b',
                    }}>
                      <div style={{
                        ...cellBase,
                        textAlign: 'right',
                        backgroundColor: tied
                          ? 'transparent'
                          : (homeWins ? `${homeColor}33` : 'transparent'),
                        borderRight: tied || !homeWins ? 'none' : `2px solid ${homeColor}`,
                      }}>{row.home}</div>
                      <div style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        padding: '12px 18px',
                        alignSelf: 'center',
                      }}>{row.label}</div>
                      <div style={{
                        ...cellBase,
                        textAlign: 'left',
                        backgroundColor: tied
                          ? 'transparent'
                          : (awayWins ? `${awayColor}33` : 'transparent'),
                        borderLeft: tied || !awayWins ? 'none' : `2px solid ${awayColor}`,
                      }}>{row.away}</div>
                    </div>
                  )
                }

                const homeId = gameData.homeTeam.id
                const awayId = gameData.awayTeam.id
                const homeName = gameData.homeTeam.name
                const awayName = gameData.awayTeam.name
                const homeCity = gameData.homeTeam.city
                const awayCity = gameData.awayTeam.city

                return (
                  <div>
                    {/* Team header — avatars + city/name with team-color accents */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center',
                      gap: '0 20px',
                      padding: '16px 18px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      backgroundImage: `linear-gradient(90deg, ${homeColor}1a 0%, transparent 35%, transparent 65%, ${awayColor}1a 100%)`,
                    }}>
                      {/* Home side */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', minWidth: 0 }}>
                        <div style={{ textAlign: 'right', minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeCity}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeName}</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: homeColor, letterSpacing: '0.08em', marginTop: '2px' }}>{homeAbbr}</div>
                        </div>
                        <img
                          src={`/avatars/${homeId}.png`}
                          alt={homeName}
                          style={{ width: '52px', height: '52px', flexShrink: 0 }}
                        />
                      </div>
                      {/* Center divider */}
                      <div style={{
                        fontSize: '11px', fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.15em',
                        padding: '0 4px',
                      }}>vs</div>
                      {/* Away side */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start', minWidth: 0 }}>
                        <img
                          src={`/avatars/${awayId}.png`}
                          alt={awayName}
                          style={{ width: '52px', height: '52px', flexShrink: 0 }}
                        />
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayCity}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayName}</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: awayColor, letterSpacing: '0.08em', marginTop: '2px' }}>{awayAbbr}</div>
                        </div>
                      </div>
                    </div>

                    {sections.map((section) => (
                      <div key={section.title} style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        marginTop: '12px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#cbd5e1',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          backgroundColor: '#1e293b',
                          borderBottom: '1px solid #334155',
                        }}>{section.title}</div>
                        {section.rows.map((row) => compareRow(row))}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {activeTab === 'stats' && (() => {
                const gs = gameData.gameStats
                if (!gs) return <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>Stats not available yet</div>
                const homeAbbr = gameData.homeTeam.abbr
                const awayAbbr = gameData.awayTeam.abbr
                const homeColor = gameData.homeTeam.color
                const awayColor = awayDisplayColor
                const hp = gs.home.players
                const ap = gs.away.players

                // Mental breakdown type for box-score row expansion. The
                // "disposition" stage replaces what used to be split between
                // "form state" and "matchup context" — they're now one
                // combined team-wide modifier with a single narrative label.
                type MentalBreakdown = {
                  baseline: number; final: number; totalDelta: number;
                  fatigue: number; disposition: number; cap: number;
                }

                // Renders a player name cell with position badge + star rating.
                // The expandable mental-modifier breakdown lives on the row,
                // not on the name cell — see `sectionCard` row rendering.
                const playerNameCell = (
                  p: {
                    id: number; name: string;
                    position?: string | null; defensivePosition?: string | null;
                    ratingStars?: number; playerRating?: number;
                    mentalBreakdown?: MentalBreakdown;
                    chargeStatus?: { ready: boolean; power?: string };
                  },
                  useDefPos?: boolean,
                ) => {
                  const posLabel = useDefPos && p.defensivePosition ? p.defensivePosition : p.position
                  // An awakened player in this game carries chargeStatus. Gold name-glow when their
                  // meter is full this play (live; clears on discharge); otherwise blue — the same
                  // "awakened" marker as the stat leaders. Non-awakened players have no chargeStatus.
                  const isCharged = !!p.chargeStatus?.ready
                  const isAwakened = !!p.chargeStatus && !isCharged
                  const nameColor = isCharged ? '#fbbf24' : isAwakened ? '#60a5fa' : '#e2e8f0'
                  const nameGlow = isCharged
                    ? '0 0 11px rgba(251,191,36,0.95), 0 0 24px rgba(251,191,36,0.6), 0 0 36px rgba(251,191,36,0.32)'
                    : isAwakened ? '0 0 10px rgba(96,165,250,0.95), 0 0 22px rgba(96,165,250,0.6), 0 0 34px rgba(96,165,250,0.32)' : undefined
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {posLabel && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '3px', flexShrink: 0, minWidth: '32px', textAlign: 'center' }}>
                          {posLabel}
                        </span>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '1px' }}>
                        <PlayerHoverCard playerId={p.id} playerName={p.name}>
                          <span title={isCharged ? 'Charged' : isAwakened ? 'Awakened' : undefined} style={{ fontSize: '14px', color: nameColor, fontWeight: isCharged ? 700 : isAwakened ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', ...(nameGlow ? { textShadow: nameGlow } : {}) }}>
                            {p.name}
                          </span>
                        </PlayerHoverCard>
                        {p.ratingStars != null && <Stars stars={p.ratingStars} size={11} />}
                      </div>
                    </div>
                  )
                }

                // Maps a confidence/determination value (-5..+5) to a label.
                // Surfaced as before-and-after pairs so users see both the
                // pre-game state AND the in-game drift, which is the
                // largest invisible driver of "my star had a bad game".
                const modLabel = (v: number) => {
                  if (v >= 3)  return { label: 'Soaring',  color: '#22c55e' }
                  if (v >= 1)  return { label: 'Elevated', color: '#86efac' }
                  if (v > -1)  return { label: 'Steady',   color: '#94a3b8' }
                  if (v > -3)  return { label: 'Dimmed',   color: '#f59e0b' }
                  return         { label: 'Sunken',   color: '#ef4444' }
                }

                // Renders the mental-modifier breakdown panel that drops down
                // beneath an expanded player row.
                const renderBreakdownPanel = (
                  mb: MentalBreakdown | undefined,
                  cnf?: number,
                  det?: number,
                  dispositionLabel?: string,
                  cnfNow?: number,
                  detNow?: number,
                  cnfDrift?: number,
                  detDrift?: number,
                  thisFP?: number,
                  seasonAvgFP?: number,
                  seasonGP?: number,
                  pressureHandling?: number,
                  teamPressureModifier?: number,
                ) => {
                  const stage = (label: string, value: number, sublabel?: string) => {
                    if (value === 0 && !sublabel) return null
                    const color = value > 0 ? '#86efac' : value < 0 ? '#fca5a5' : '#94a3b8'
                    const sign = value > 0 ? '+' : ''
                    return (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                          <span style={{ color: '#cbd5e1' }}>{label}</span>
                          <span style={{ color, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                            {value !== 0 ? `${sign}${value}` : '±0'}
                          </span>
                        </div>
                        {sublabel && (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{sublabel}</span>
                        )}
                      </div>
                    )
                  }
                  const totalColor = mb ? (mb.totalDelta > 0 ? '#86efac' : mb.totalDelta < 0 ? '#fca5a5' : '#94a3b8') : '#94a3b8'
                  const totalSign = mb && mb.totalDelta > 0 ? '+' : ''
                  const hasAnyStage = !!mb && (
                    mb.fatigue !== 0 || mb.disposition !== 0 || mb.cap !== 0
                  )
                  const hasMindset = cnf != null || det != null

                  // Render confidence/det as a before-and-after pair with
                  // a drift number. The drift is the punchline — it's how
                  // much the player's mood moved during the game, and
                  // it's amplified ~25× per play in _mentalDrift so even
                  // -1.5 means ~-2.2 effective rating points on every
                  // gate. That's typically a bigger driver of a bad game
                  // than the pre-game multiplier stack.
                  const tierPill = (v: number) => {
                    const { label: tier, color } = modLabel(v)
                    return (
                      <span style={{
                        fontSize: '10px', fontWeight: 600,
                        color,
                        backgroundColor: `${color}1a`,
                        border: `1px solid ${color}55`,
                        padding: '1px 7px', borderRadius: '3px',
                        letterSpacing: '0.03em',
                      }}>{tier}</span>
                    )
                  }
                  const mindsetRow = (label: string, base?: number, now?: number, drift?: number) => {
                    if (base == null && now == null) return null
                    // Show pre → now transition only when drift is large
                    // enough to matter (~0.8+ rating points/play once
                    // amplified through _mentalDrift). Below that, render
                    // a single tier badge — the tier name carries the
                    // signal without a duplicate value.
                    const hasShift = drift != null && Math.abs(drift) >= 0.5
                    const display = hasShift && now != null ? now : (base ?? now ?? 0)
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                        <span style={{ color: '#cbd5e1' }}>{label}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hasShift && base != null && (
                            <>
                              {tierPill(base)}
                              <span style={{ color: '#475569', fontSize: '11px' }}>→</span>
                            </>
                          )}
                          {tierPill(display)}
                        </span>
                      </div>
                    )
                  }

                  // Pressure status — pressureHandling tier + team stakes
                  // multiplier. Together these tell users how exposed
                  // this player is to clutch-moment over/underperformance.
                  const pressureHandlingTier = (v: number) => {
                    if (v >= 6)  return { label: 'Ice',     color: '#22c55e' }
                    if (v >= 2)  return { label: 'Cool',    color: '#86efac' }
                    if (v >= -1) return { label: 'Even',    color: '#94a3b8' }
                    if (v >= -5) return { label: 'Wobbly',  color: '#f59e0b' }
                    return         { label: 'Choker',  color: '#ef4444' }
                  }
                  const teamPressureTier = (v: number) => {
                    if (v >= 2.4)  return { label: 'Championship', color: '#ef4444' }
                    if (v >= 1.8)  return { label: 'Must-Win',     color: '#f59e0b' }
                    if (v >= 1.3)  return { label: 'High Stakes',  color: '#f59e0b' }
                    if (v >= 1.1)  return { label: 'Elevated',     color: '#94a3b8' }
                    if (v >= 0.85) return { label: 'Normal',       color: '#94a3b8' }
                    return           { label: 'Low Stakes',    color: '#64748b' }
                  }
                  const hasPressure = pressureHandling != null || teamPressureModifier != null

                  // Generic status row — label on left, tier badge on
                  // right. Drives personality/mental/pressure sections.
                  const badgeRow = (
                    label: string,
                    tier: { label: string; color: string },
                  ) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                      <span style={{ color: '#cbd5e1' }}>{label}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 600,
                        color: tier.color,
                        backgroundColor: `${tier.color}1a`,
                        border: `1px solid ${tier.color}55`,
                        padding: '1px 7px', borderRadius: '3px',
                        letterSpacing: '0.03em',
                      }}>{tier.label}</span>
                    </div>
                  )
                  return (
                    <div style={{
                      padding: '12px 14px',
                      backgroundColor: '#0b1424',
                      borderTop: '1px solid #1e293b',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                      {mb && (
                        <>
                          <div style={{
                            fontSize: '11px', color: '#94a3b8',
                            fontWeight: 700, letterSpacing: '0.06em',
                          }}>
                            PRE-GAME RATING
                          </div>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '12px', padding: '6px 8px', borderRadius: '3px',
                            backgroundColor: '#0f172a', border: '1px solid #1e293b',
                            maxWidth: '320px',
                          }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Effective rating</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontVariantNumeric: 'tabular-nums' }}>
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{mb.baseline}</span>
                              <span style={{ fontSize: '11px', color: '#475569' }}>→</span>
                              <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 700 }}>{mb.final}</span>
                              <span style={{
                                fontSize: '10px', fontWeight: 700,
                                color: totalColor,
                                backgroundColor: `${totalColor}1a`,
                                border: `1px solid ${totalColor}55`,
                                padding: '1px 6px', borderRadius: '3px',
                              }}>
                                {totalSign}{mb.totalDelta}
                              </span>
                            </span>
                          </div>
                          {hasAnyStage ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px' }}>
                              {stage('Fatigue', mb.fatigue)}
                              {stage('Team disposition', mb.disposition, dispositionLabel)}
                              {stage('Soft cap', mb.cap)}
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              No rating modifiers active.
                            </div>
                          )}
                        </>
                      )}
                      {/* Order by explanatory power for a player's
                          performance: live mindset (most volatile,
                          biggest in-game amplifier), then pressure,
                          personality, finally mental attributes. */}
                      {hasMindset && (
                        <>
                          <div style={{
                            fontSize: '11px', color: '#94a3b8',
                            fontWeight: 700, letterSpacing: '0.06em',
                            marginTop: '4px',
                          }}>
                            CURRENT STATE
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px' }}>
                            {cnf != null && mindsetRow('Confidence', cnf, cnfNow, cnfDrift)}
                            {det != null && mindsetRow('Determination', det, detNow, detDrift)}
                          </div>
                        </>
                      )}
                      {hasPressure && (
                        <>
                          <div style={{
                            fontSize: '11px', color: '#94a3b8',
                            fontWeight: 700, letterSpacing: '0.06em',
                            marginTop: '4px',
                          }}>
                            PRESSURE
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px' }}>
                            {pressureHandling != null && badgeRow(
                              'Pressure handling',
                              pressureHandlingTier(pressureHandling),
                            )}
                            {teamPressureModifier != null && badgeRow(
                              'Team stakes',
                              teamPressureTier(teamPressureModifier),
                            )}
                          </div>
                        </>
                      )}
                      {/* PERSONALITY + MENTAL sections moved to the
                          player hover card + profile page. Those attrs
                          are static — they belong on the player's
                          profile, not in a per-game breakdown. */}
                    </div>
                  )
                }

                // Section card — full-width panel with section title, then column
                // headers, then home/away player groups separated by team-color
                // bars. Rows are click-to-expand: each row toggles a panel that
                // breaks out the pre-game mental modifiers (fatigue / form /
                // context / cap) for that player.
                type StatRow = {
                  cells: React.ReactNode[]
                  mb?: MentalBreakdown
                  pid?: number
                  cnf?: number
                  det?: number
                  cnfNow?: number
                  detNow?: number
                  cnfDrift?: number
                  detDrift?: number
                  dispositionLabel?: string
                  thisFP?: number
                  seasonAvgFP?: number
                  seasonGP?: number
                  pressureHandling?: number
                  teamPressureModifier?: number
                }
                const sectionCard = (
                  label: string,
                  headerCols: string[],
                  homeRows: StatRow[],
                  awayRows: StatRow[],
                  template: string,
                ) => {
                  const teamGroup = (abbr: string, color: string, rows: StatRow[]) => (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 14px',
                        backgroundColor: `${color}14`,
                        borderTop: '1px solid #1e293b',
                        borderLeft: `3px solid ${color}`,
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color, letterSpacing: '0.06em' }}>{abbr}</span>
                      </div>
                      {rows.length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: '12px', color: '#475569', borderTop: '1px solid #1e293b' }}>—</div>
                      ) : rows.map((row, ri) => {
                        const key = row.pid != null ? `${label}-${abbr}-${row.pid}` : `${label}-${abbr}-${ri}`
                        const canExpand = !!row.mb || row.cnf != null || row.det != null
                          || row.pressureHandling != null || row.teamPressureModifier != null
                        const isExpanded = canExpand && expandedStatKey === key
                        const onToggle = () => {
                          if (!canExpand) return
                          setExpandedStatKey(isExpanded ? null : key)
                        }
                        return (
                          <React.Fragment key={key}>
                            <div
                              onClick={onToggle}
                              className={canExpand ? 'stat-row-expandable' : undefined}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: template,
                                columnGap: isTightStats ? '4px' : '8px',
                                padding: isTightStats ? '8px 10px' : '10px 14px',
                                borderTop: '1px solid #1e293b',
                                fontSize: isTightStats ? '13px' : '14px',
                                color: '#e2e8f0',
                                fontVariantNumeric: 'tabular-nums',
                                alignItems: 'center',
                                cursor: canExpand ? 'pointer' : 'default',
                                backgroundColor: isExpanded ? '#11203a' : 'transparent',
                              }}
                            >
                              {row.cells.map((c, i) => {
                                if (i === 0) {
                                  return (
                                    <div key={i} style={{
                                      display: 'flex', alignItems: 'center',
                                      minWidth: 0, overflow: 'hidden',
                                    }}>
                                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>{c}</div>
                                      {canExpand && (
                                        <span style={{
                                          color: '#94a3b8',
                                          fontSize: '14px',
                                          fontWeight: 700,
                                          transition: 'transform 0.15s, color 0.15s',
                                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          paddingLeft: '8px',
                                          flexShrink: 0,
                                          lineHeight: 1,
                                        }}>▾</span>
                                      )}
                                    </div>
                                  )
                                }
                                return (
                                  <div key={i} style={{
                                    textAlign: 'center',
                                    minWidth: 0,
                                  }}>{c}</div>
                                )
                              })}
                            </div>
                            {isExpanded && renderBreakdownPanel(
                              row.mb, row.cnf, row.det, row.dispositionLabel,
                              row.cnfNow, row.detNow, row.cnfDrift, row.detDrift,
                              row.thisFP, row.seasonAvgFP, row.seasonGP,
                              row.pressureHandling, row.teamPressureModifier,
                            )}
                          </React.Fragment>
                        )
                      })}
                    </>
                  )
                  return (
                    <div style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      marginBottom: '14px',
                    }}>
                      <div style={{
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#cbd5e1',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        backgroundColor: '#1e293b',
                        borderBottom: '1px solid #334155',
                      }}>{label}</div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: template,
                        columnGap: isTightStats ? '4px' : '8px',
                        padding: isTightStats ? '6px 10px' : '8px 14px',
                        fontSize: isTightStats ? '11px' : '12px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderTop: '1px solid #1e293b',
                      }}>
                        {headerCols.map((c, i) => (
                          <div key={i} style={{ textAlign: i === 0 ? 'left' : 'center' }}>{c}</div>
                        ))}
                      </div>
                      {teamGroup(homeAbbr, homeColor, homeRows)}
                      {teamGroup(awayAbbr, awayColor, awayRows)}
                    </div>
                  )
                }

                // Templates: full-width grids — names get plenty of room.
                // Unified column widths so the stat sections line up
                // across positions instead of each having its own grid.
                // Tight layout (mobile portrait + landscape phones + small
                // tablets) gets fewer columns + narrower cells so the
                // player name doesn't get crushed against the stats.
                const SC = isTightStats ? '40px' : '48px'   // standard stat column
                const SCW = isTightStats ? '48px' : '56px'  // wide compound stat column
                const T_PASS = isTightStats
                  ? `1fr ${SCW} ${SC} ${SC} ${SC}`            // C/A YDS TD FP
                  : `1fr ${SCW} ${SC} ${SC} ${SC} ${SC} ${SC}` // C/A YDS LNG TD INT FP
                const T_RUSH = isTightStats
                  ? `1fr ${SC} ${SC} ${SC} ${SC}`              // CAR YDS TD FP
                  : `1fr ${SC} ${SC} ${SC} ${SC} ${SC} ${SC}`  // CAR YDS LNG TD FUM FP
                const T_RCV = isTightStats
                  ? `1fr ${SC} ${SC} ${SC} ${SC}`              // REC YDS TD FP
                  : `1fr ${SC} ${SC} ${SC} ${SC} ${SC} ${SC}`  // REC YDS YPR YAC TD FP
                const T_K = isTightStats
                  ? `1fr ${SCW} ${SC} ${SC}`                   // FG/ATT YDS FP
                  : `1fr ${SCW} ${SC} ${SC} ${SC}`             // FG/ATT YDS LNG FP
                const T_DEF = isTightStats
                  ? `1fr ${SC} ${SC} ${SC}`                    // TKL SCK INT
                  : `1fr ${SC} ${SC} ${SC} ${SC} ${SC} ${SC}`  // TKL SCK INT TFL FF PBU

                const passingHeaders = isTightStats
                  ? ['Player', 'C/A', 'YDS', 'TD', 'FP']
                  : ['Player', 'C/A', 'YDS', 'LNG', 'TD', 'INT', 'FP']
                const rushingHeaders = isTightStats
                  ? ['Player', 'CAR', 'YDS', 'TD', 'FP']
                  : ['Player', 'CAR', 'YDS', 'LNG', 'TD', 'FUM', 'FP']
                const receivingHeaders = isTightStats
                  ? ['Player', 'REC', 'YDS', 'TD', 'FP']
                  : ['Player', 'REC', 'YDS', 'YPR', 'YAC', 'TD', 'FP']
                const kickingHeaders = isTightStats
                  ? ['Player', 'FG', 'YDS', 'FP']
                  : ['Player', 'FG', 'YDS', 'LNG', 'FP']
                const defenseHeaders = isTightStats
                  ? ['Player', 'TKL', 'SCK', 'INT']
                  : ['Player', 'TKL', 'SCK', 'INT', 'TFL', 'FF', 'PBU']

                const wireMind = (p: any) => ({
                  cnf: p.confidenceModifier, det: p.determinationModifier,
                  cnfNow: p.confidenceInGame, detNow: p.determinationInGame,
                  cnfDrift: p.confidenceDrift, detDrift: p.determinationDrift,
                  thisFP: p.fantasyPoints, seasonAvgFP: p.seasonAvgFP, seasonGP: p.seasonGP,
                  dispositionLabel: p.dispositionLabel,
                  pressureHandling: p.pressureHandling,
                  teamPressureModifier: p.teamPressureModifier,
                })
                const passRow = (p: any): StatRow | null => p ? {
                  cells: isTightStats
                    ? [playerNameCell(p), `${p.comp}/${p.att}`, p.yards, p.tds, p.fantasyPoints]
                    : [playerNameCell(p), `${p.comp}/${p.att}`, p.yards, p.longest, p.tds, p.ints ?? 0, p.fantasyPoints],
                  mb: p.mentalBreakdown, pid: p.id, ...wireMind(p),
                } : null
                const rushRow = (p: any): StatRow | null => p ? {
                  cells: isTightStats
                    ? [playerNameCell(p), p.carries, p.yards, p.tds, p.fantasyPoints]
                    : [playerNameCell(p), p.carries, p.yards, p.longest, p.tds, p.fumblesLost ?? 0, p.fantasyPoints],
                  mb: p.mentalBreakdown, pid: p.id, ...wireMind(p),
                } : null
                const rcvRow = (p: any): StatRow | null => p ? {
                  cells: isTightStats
                    ? [playerNameCell(p), p.receptions, p.yards, p.tds, p.fantasyPoints]
                    : [playerNameCell(p), p.receptions, p.yards, p.ypr, p.yac, p.tds, p.fantasyPoints],
                  mb: p.mentalBreakdown, pid: p.id, ...wireMind(p),
                } : null
                const kRow = (p: any): StatRow | null => p ? {
                  cells: isTightStats
                    ? [playerNameCell(p), `${p.fgs}/${p.fgAtt}`, p.fgYards ?? 0, p.fantasyPoints]
                    : [playerNameCell(p), `${p.fgs}/${p.fgAtt}`, p.fgYards ?? 0, p.longest, p.fantasyPoints],
                  mb: p.mentalBreakdown, pid: p.id, ...wireMind(p),
                } : null
                const defRow = (p: any): StatRow => ({
                  cells: isTightStats
                    ? [playerNameCell(p, true), p.defense.tackles, p.defense.sacks, p.defense.ints]
                    : [
                        playerNameCell(p, true), p.defense.tackles, p.defense.sacks, p.defense.ints,
                        p.defense.tfl, p.defense.forcedFumbles, p.defense.passBreakups,
                      ],
                  mb: p.mentalBreakdown, pid: p.id, ...wireMind(p),
                })

                const compactRows = (arr: (StatRow | null)[]) => arr.filter(Boolean) as StatRow[]

                // A QB who scrambled shows up in the rushing section too. The qb
                // object flattens passing, so merge in its nested rushing block.
                const qbRushRow = (p: any): StatRow | null =>
                  (p && p.rushing && p.rushing.carries > 0) ? rushRow({ ...p, ...p.rushing }) : null
                // An RB that caught checkdowns/screens shows up in receiving too. The rb
                // object flattens rushing, so merge in its nested receiving block.
                const rbRcvRow = (p: any): StatRow | null =>
                  (p && p.receiving && p.receiving.receptions > 0) ? rcvRow({ ...p, ...p.receiving }) : null
                const homePassRows = compactRows([passRow(hp.qb)])
                const awayPassRows = compactRows([passRow(ap.qb)])
                const homeRushRows = compactRows([rushRow(hp.rb), qbRushRow(hp.qb)])
                const awayRushRows = compactRows([rushRow(ap.rb), qbRushRow(ap.qb)])
                const homeRcvRows = compactRows([rcvRow(hp.wr1), rcvRow(hp.wr2), rcvRow(hp.te), rbRcvRow(hp.rb)])
                const awayRcvRows = compactRows([rcvRow(ap.wr1), rcvRow(ap.wr2), rcvRow(ap.te), rbRcvRow(ap.rb)])
                const homeKRows = compactRows([kRow(hp.k)])
                const awayKRows = compactRows([kRow(ap.k)])

                const defPlayers = (players: any) =>
                  Object.values(players).filter(
                    (p: any) => p?.defense && Object.values(p.defense).some((v: any) => (v as number) > 0)
                  )
                const homeDefPlayers = defPlayers(hp) as any[]
                const awayDefPlayers = defPlayers(ap) as any[]
                const homeDefRows = homeDefPlayers.map(defRow)
                const awayDefRows = awayDefPlayers.map(defRow)

                return (
                  <div>
                    {sectionCard('Passing', passingHeaders, homePassRows, awayPassRows, T_PASS)}
                    {sectionCard('Rushing', rushingHeaders, homeRushRows, awayRushRows, T_RUSH)}
                    {sectionCard('Receiving', receivingHeaders, homeRcvRows, awayRcvRows, T_RCV)}
                    {sectionCard('Kicking', kickingHeaders, homeKRows, awayKRows, T_K)}
                    {(homeDefRows.length > 0 || awayDefRows.length > 0) &&
                      sectionCard('Defense', defenseHeaders, homeDefRows, awayDefRows, T_DEF)}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* The Bleachers, beside the play feed. Plays only — the other two
              views are reading a table, and the rail's width is better spent
              there than on a feed you are not watching. */}
          {asPage && railContent && activeTab === 'plays' && (
            <div style={{
              width: stacked ? '100%' : '372px',
              flexShrink: 0,
              minWidth: 0,
            }}>{railContent}</div>
          )}

          </div>

        </div>
      </div>
    </div>
  )
}
