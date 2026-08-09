import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GiLaurelsTrophy, GiTrophy } from 'react-icons/gi'

import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGames } from '@/contexts/GamesContext'
import { Stars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import TeamNavStrip from '@/Components/TeamNavStrip'
import { GameModalNew } from '@/Components/GameModalNew'
import CareerStageBadge from '@/Components/CareerStageBadge'
import HoverTooltip from '@/Components/HoverTooltip'
import { CoachProfileTags } from '@/Components/CoachProfile'
import { getContrastTextColor, readableOnDark } from '@/utils/colors'
import PlayerRating from '@/Components/Sentiment/PlayerRating'
import TeamFeed from '@/Components/Sentiment/TeamFeed'
import FrontOfficeBand from './FrontOfficeBand'
import SectionRail, { RailSection } from './SectionRail'
import { quipAt } from '@/Views/FrontOffice/FacilitiesSection'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * TEAM PAGE — "season rail".
 *
 * The page answers three questions in the first screen, in order: who are they
 * (hero band in the team's own colours), are they any good (trophy case, then
 * one scan-line of four facts — ratings, coach, locker room, next game), and
 * who's on the field (six roster plates, with The Bleachers alongside).
 * The record itself — every season and every week — runs full width below.
 *
 * Three structural decisions carry the layout:
 *
 * The roster is SIX rows, not six cards. Six is small enough that each player
 * can own a full-width plate, and rows are what let offense rating, defensive
 * rating and fan rating line up in columns you can read down. Cards put every
 * player's numbers in a different place on screen.
 *
 * The Bleachers sits BESIDE the roster, not under a schedule in a rail. It's
 * the only panel here fans write to, and it was the last thing on the page.
 *
 * Season history and the schedule pair off full width at the bottom, each in
 * two internal columns, so all 16 seasons and all 28 weeks are visible at once
 * — no scrollbars and nothing behind an overflow. That's what the width down
 * there is for.
 *
 * Radius is 0 everywhere except fan pips and W/L chips, and there are no
 * shadows: depth comes from the #131e2f-on-#0b1220 surface step and the
 * borders. That's what keeps a page this dense from reading as a pile of cards.
 */

const PAGE_MAX = '1500px'
// The rail was 340 to the handoff spec, but the roster plates only need about
// 900px before the ratings bars stop growing usefully — the rest was slack. The
// Bleachers is the one panel here that benefits from every pixel it gets.
const RAIL = 420
const PAGE_PAD = 28

/** Below this the two body columns stack and the facts grid goes 2×2. */
const STACK_WIDTH = 1180
/** Below this the roster plates reflow to three rows. */
const PLATE_WRAP_WIDTH = 760

const POSITION_LABEL: Record<string, string> = {
  qb: 'QB', rb: 'RB', wr1: 'WR', wr2: 'WR', te: 'TE', k: 'K',
}
const ROSTER_SLOTS = ['qb', 'rb', 'wr1', 'wr2', 'te', 'k']

/** Regular season is 28 weeks; the schedule payload is 0-indexed. */
const REGULAR_SEASON_WEEKS = 28

// Frames won can be fractional (½ for a halved frame): render "2", "2½", "½".
const fmtFramesWon = (v: number): string => { const w = Math.floor(v); return (v - w >= 0.5) ? `${w > 0 ? w : ''}½` : `${w}` }

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  ratingStars: number
  offensiveRating?: number
  defensiveRating?: number
  termRemaining?: number
  serviceTime?: string
  fatigue?: number
  // Floosball players go both ways: QB→S, RB→LB, WR→CB, TE→DE. Kickers don't
  // play defense, so this is null for them.
  defensivePosition?: string | null
}

interface Coach {
  name: string
  seasonsCoached: number
  profile?: any
}

interface LockerRoom {
  resolve: number
  resolveLabel: string
  fortitude: number
  fortitudeTier: string
  fortitudeLabel: string
  vulnerability: number
  vulnerabilityLabel: string
}

interface ScheduleGame {
  gameId: number
  isHome: boolean
  week: number
  opponent: { id: number; name: string; city: string; abbr: string }
  teamScore: number
  oppScore: number
  // Format-aware result score: frames won for frames matches, else the point
  // totals. Frames matches are decided by FRAMES WON, so the point total would
  // misreport the result.
  displayTeamScore?: number
  displayOppScore?: number
  scoreLabel?: 'frames' | null
  status: string
  result: 'W' | 'L' | null
}

interface HistoryRow {
  season: number
  elo: number
  wins: number
  losses: number
  winPerc: number
  madePlayoffs?: boolean
  leagueChamp?: boolean
  floosbowlChamp?: boolean
  topSeed?: boolean
}

interface TeamData {
  id: number
  name: string
  city: string
  abbr: string
  league: string
  color: string
  secondaryColor?: string
  wins: number
  losses: number
  elo: number
  streak?: number
  offenseRating?: number
  defenseRunCoverageRating?: number
  defensePassCoverageRating?: number
  lockerRoom?: LockerRoom
  leagueChampionships?: string[]
  floosbowlChampionships?: string[]
  roster: Record<string, RosterPlayer | null>
  schedule: ScheduleGame[]
  history: HistoryRow[]
  coach: Coach | null
  fundingTier?: string
  floosbowlChampion?: boolean
  clinchedPlayoffs?: boolean
  clinchedTopSeed?: boolean
  eliminated?: boolean
}

// ── Shared helpers ──────────────────────────────────────────────────────────

/** Team colours are DATA, so any overlay tinted with one has to be built at
 *  runtime rather than written as a literal rgba(). */
function rgba(hex: string, alpha: number): string {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return `rgba(148,163,184,${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── The house gauge ─────────────────────────────────────────────────────────
// Same bar the player page and the player hover card draw, so a rating reads
// identically wherever you meet it: #334155 track, 2px radius, fill straight
// off the 0-100 value, three colour bands at 85 and 72.
//
// The 0-100 mapping is deliberate. An earlier version of this page normalised
// to a 60-100 window on the grounds that ratings never go below 60 — the
// player page tried exactly that and reverted it, because it drew an 80 as a
// half-full bar and left anything under 60 (common for a non-primary
// defender) completely empty. The bar has to agree with the number printed
// next to it.
const GAUGE_TRACK = '#334155'

function barWidth(rating: number): number {
  return Math.max(0, Math.min(100, rating))
}

function gaugeColor(rating: number): string {
  if (rating >= 85) return '#22c55e'
  if (rating >= 72) return '#f59e0b'
  return '#ef4444'
}

/** Career status in one word — what a fan actually reads. Detail lives on the
 *  player page. */
function careerStatus(p: RosterPlayer): string {
  const svc = (p.serviceTime || '').toLowerCase()
  if (svc.includes('rookie')) return 'Rookie'
  if (svc.includes('veteran3') || svc.includes('veteran4')) return 'Veteran'
  if (svc.includes('veteran')) return 'Established'
  return 'Active'
}

const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
  'Seventh', 'Eighth', 'Ninth', 'Tenth']

/** "Third season in charge" reads as tenure; "3" reads as a stat. */
function tenurePhrase(seasons: number): string {
  const n = Math.max(1, seasons)
  return `${ORDINALS[n] || `${n}th`} season in charge`
}

function titleCase(raw: string): string {
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ── Trophies ────────────────────────────────────────────────────────────────
// Two honours, two tiers, and the case has to say which is which without a
// hover. Gold and the laurel trophy for the Floos Bowl — the app's
// championship mark everywhere else it appears (Hall of Fame, player pages,
// awards), so a different one here would read as a different honour. Silver
// and a plain cup for a league title: unmistakably a trophy, unmistakably the
// lesser one.
const TROPHY_TONE = {
  bowl: {
    Icon: GiLaurelsTrophy,
    icon: '#fbbf24',
    text: '#fde68a',
    bg: 'rgba(245,158,11,0.14)',
    border: 'rgba(245,158,11,0.45)',
  },
  league: {
    Icon: GiTrophy,
    icon: '#cbd5e1',
    text: '#e2e8f0',
    bg: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.40)',
  },
} as const

// ── Stadium ─────────────────────────────────────────────────────────────────
// OFF until stadiums are real on the backend. Everything below still works and
// the cell still renders when this is flipped back on; it's hidden rather than
// deleted because the only thing missing is the two backend fields listed in
// the note under this one.
const SHOW_STADIUM: boolean = false

// MOCK. The stadium LEVEL is real — it's the `stadium` facility, 1-5, driving
// home_morale — and the size below is derived from it, which is what makes the
// cell respond to the facilities a fanbase has actually funded.
//
// The NAME and the CAPACITY are invented here, because the backend has no
// concept of either: there is no stadium_name, capacity or attendance field
// anywhere in the models, config.json or the facilities payload. To make this
// real the backend needs, on the team record:
//
//   stadium_name       str   — persisted, per team, ideally namable by fans
//   stadium_capacity   int   — or keep deriving it from the facility level
//
// The description is NOT mocked: it's the facilities quip for the level.
//
// Until then names are generated DETERMINISTICALLY from the team id, so a
// given team always shows the same ground rather than reshuffling per render.

const STADIUM_SUFFIX = ['Field', 'Park', 'Grounds', 'Coliseum', 'Yards', 'Commons', 'Dome', 'Bowl']

/** Level → roughly what that many funded upgrades buys you. */
const STADIUM_CAPACITY = [14000, 19000, 34000, 51000, 68000, 87000]
const STADIUM_SIZE = ['Sandlot', 'Intimate', 'Modest', 'Mid-Size', 'Major', 'Monumental']
// The description comes from the FACILITIES quips, not a second set written
// here. Those already ladder per level ("Bleachers, a hot dog cart, and big
// dreams"), they're the copy a fan reads when funding the thing, and two
// parallel descriptions of one stadium would drift apart the moment either
// was edited.

interface Stadium {
  name: string
  level: number
  capacity: number
  size: string
  blurb: string
}

function mockStadium(team: { id: number; city: string }, level: number): Stadium {
  const lv = Math.max(0, Math.min(5, level))
  return {
    name: `${team.city} ${STADIUM_SUFFIX[team.id % STADIUM_SUFFIX.length]}`,
    level: lv,
    capacity: STADIUM_CAPACITY[lv],
    size: STADIUM_SIZE[lv],
    blurb: quipAt('stadium', lv),
  }
}

/** Regular season is 28 weeks, 0-indexed, so anything past it is a playoff
 *  round. "W29" tells a fan nothing; the round name is the whole point. */
function weekLabel(week: number): string {
  const PLAYOFF = ['R1', 'R2', 'Champ', 'Bowl']
  return week >= REGULAR_SEASON_WEEKS
    ? (PLAYOFF[week - REGULAR_SEASON_WEEKS] ?? 'PO')
    : `W${week + 1}`
}

/** The same week spelled out. Playoff games DO land in team.schedule (the
 *  season manager appends each round), so Next up carries them through
 *  January — and "R2" is not what you want to read there. */
function weekTitle(week: number): string {
  const PLAYOFF = ['Playoffs Round 1', 'Playoffs Round 2', 'League Championship', 'Floos Bowl']
  return week >= REGULAR_SEASON_WEEKS
    ? (PLAYOFF[week - REGULAR_SEASON_WEEKS] ?? 'Playoffs')
    : `Week ${week + 1}`
}

/** How a season ENDED. The payload carries flags rather than a result string,
 *  and they say more than a W-L line does.
 *
 *  `inProgress` is load-bearing: a season still being played has none of these
 *  flags set yet, so every team's current row fell through to "Missed
 *  playoffs" — declaring all 24 of them out before a game had been decided. */
function seasonFinish(h: HistoryRow, inProgress = false): { label: string; color: string; weight: number } {
  if (h.floosbowlChamp) return { label: 'Floos Bowl', color: '#f59e0b', weight: 700 }
  if (h.leagueChamp) return { label: 'League champions', color: '#a78bfa', weight: 700 }
  if (h.topSeed) return { label: 'Top seed', color: '#38bdf8', weight: 500 }
  if (h.madePlayoffs) return { label: 'Playoffs', color: '#4ade80', weight: 500 }
  if (inProgress) return { label: 'In progress', color: '#cbd5e1', weight: 500 }
  return { label: 'Missed playoffs', color: '#94a3b8', weight: 500 }
}

const FOCUS_RING = (secondary: string): React.CSSProperties => ({
  // Applied through a CSS custom property so the :focus-visible rule in
  // index.css can use the team's own colour.
  ['--tp-focus' as any]: secondary,
})

// ── Small presentational pieces ─────────────────────────────────────────────

/** Sentence case: labels earn their quiet from weight and tracking, not from
 *  shouting. (Uppercase is reserved for the facts-grid cells and table heads,
 *  which are field labels rather than section titles.) */
const SectionHead: React.FC<{
  label: string
  note?: string
  style?: React.CSSProperties
}> = ({ label, note, style }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', gap: '12px',
    marginBottom: '12px', ...style,
  }}>
    <span style={{
      fontSize: '13px', letterSpacing: '0.08em', fontWeight: 800, color: '#f1f5f9',
      whiteSpace: 'nowrap',
    }}>{label}</span>
    {note && <span style={{ fontSize: '12px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{note}</span>}
    <span style={{ flex: 1, height: '2px', backgroundColor: '#1e293b' }} />
  </div>
)

/** Facts-row cell headings. These were 10px #94a3b8 — at the very floor of both
 *  the size and the contrast rules at once, which is what made them hard to
 *  read. 10px is for metadata; a heading is not metadata. */
/** Facts-row cell geometry. With five cells that reflow to a 2-wide grid, the
 *  edges and dividers can't be hand-written per cell any more: which cell is
 *  flush with the page and which needs a left rule both depend on how many
 *  columns the row currently has. Outer cells lose their outer padding so the
 *  row reads edge to edge with the rest of the page. */
function factCell(index: number, cols: number, span = 1): React.CSSProperties {
  const col = index % cols
  const first = col === 0
  const last = span > 1 || col === cols - 1
  return {
    padding: `14px ${last ? 0 : 20}px 14px ${first ? 0 : 20}px`,
    borderLeft: first ? undefined : '1px solid #1e293b',
    borderTop: index >= cols ? '1px solid #1e293b' : undefined,
    ...(span > 1 ? { gridColumn: `span ${span}` } : {}),
  }
}

const CellLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
    color: '#cbd5e1', textTransform: 'uppercase',
  }}>{children}</div>
)

/** The house gauge, in the two forms the app already uses.
 *
 *  'stacked' is the player page's `attrRow`: label left, value right, bar full
 *  width beneath. That's the default and what the facts grid runs.
 *
 *  'inline' is the compact form (the hover card's sub-bars are the same idea):
 *  label, track and number on one line. The roster plates need it because six
 *  players have to line up into columns you can read straight down — stacking
 *  there would put every player's numbers at a different height.
 *
 *  Both draw the SAME bar: #334155 track, 2px radius, fill off the raw 0-100
 *  value, house colour bands. `animate` runs the fill out from zero on first
 *  paint; nothing else on the page moves. */
const Gauge: React.FC<{
  label: string
  rating: number
  variant?: 'stacked' | 'inline'
  /** Fixed label column width — inline only, and what keeps the plates aligned. */
  labelWidth?: number
  numberWidth?: number
  height?: number
  animate?: boolean
  // 6px, the house "overall bar" weight. 4px is the standard, but on a page
  // where the gauges ARE the content they read as hairlines at that size.
}> = ({ label, rating, variant = 'stacked', labelWidth = 76, numberWidth = 24, height = 6, animate = true }) => {
  const color = gaugeColor(rating)
  const value = Math.round(rating)

  const track = (
    <span style={{
      display: 'block', flex: variant === 'inline' ? 1 : undefined,
      height: `${height}px`, backgroundColor: GAUGE_TRACK,
      borderRadius: '2px', overflow: 'hidden', minWidth: 0,
    }}>
      <span
        className={animate ? 'tp-fill' : undefined}
        style={{
          display: 'block', height: '100%',
          width: `${barWidth(rating)}%`,
          backgroundColor: color, borderRadius: '2px',
        }}
      />
    </span>
  )

  if (variant === 'inline') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
          color: '#cbd5e1', width: `${labelWidth}px`, flexShrink: 0,
        }}>{label}</span>
        {track}
        <span style={{
          fontSize: '13px', fontWeight: 700, color,
          fontVariantNumeric: 'tabular-nums',
          width: `${numberWidth}px`, textAlign: 'right', flexShrink: 0,
        }}>{value}</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: '3px',
      }}>
        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{label}</span>
        <span style={{
          fontSize: '16px', fontWeight: 700, color: '#e2e8f0',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
      </div>
      {track}
    </div>
  )
}

/** The three locker-room composites are small scalars on THREE DIFFERENT
 *  scales, and reading them as 0..1 pinned every team under half a bar — the
 *  panel showed three near-empty tracks whichever team you opened.
 *
 *  Each gets its own domain. These are MEASURED across the whole league, not taken
 *  from the ranges quoted in computeLockerRoom's docstring: those describe the
 *  roster average, and the real league spread is several times wider (fortitude
 *  runs about −1.0 to +1.1, not −0.2 to +0.4). Calibrated to the docstring, a
 *  third of the league pegged at a full bar instead.
 *
 *  Checked against a live league: mean fill ~55% with nothing clipping at
 *  either end, so the bar actually separates one team from the next. */
const MOOD_DOMAIN: Record<string, [number, number]> = {
  Resolve: [-0.20, 0.55],
  Fortitude: [-1.10, 1.15],
  Vulnerability: [-0.40, 0.56],
}

/** Indicative-only: these are composites with no meaning as a displayed
 *  number, so they get a bar and no figure. */
const MoodBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const [lo, hi] = MOOD_DOMAIN[label] ?? [0, 1]
  const pct = Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: '#cbd5e1', width: '80px', flexShrink: 0 }}>{label}</span>
      {/* Same track as every other bar on the site, even though what fills it
          isn't a 0-100 rating. */}
      <span style={{
        flex: 1, height: '4px', backgroundColor: GAUGE_TRACK,
        borderRadius: '2px', overflow: 'hidden', minWidth: 0,
      }}>
        <span style={{
          display: 'block', height: '100%', backgroundColor: color, borderRadius: '2px',
          // A floor of 2% so a genuinely rock-bottom reading still shows a mark
          // rather than looking like missing data.
          width: `${Math.max(2, pct)}%`,
        }} />
      </span>
    </div>
  )
}

// ── Roster plate ────────────────────────────────────────────────────────────

const RosterPlate: React.FC<{
  slot: string
  player: RosterPlayer | null
  teamColor: string
  canRate: boolean
  onRated: () => void
  /** Where they sit on their career arc — developing / prime / aging /
   *  twilight / retiring. Service time says how long they've been here;
   *  this says whether they're still getting better. */
  stage?: string
  /** Three rows instead of one, below PLATE_WRAP_WIDTH. */
  narrow: boolean
}> = ({ slot, player, teamColor, canRate, onRated, stage, narrow }) => {
  const label = POSITION_LABEL[slot] || slot.toUpperCase()

  const badge = (
    <span style={{
      width: '42px', flexShrink: 0, textAlign: 'center',
      fontSize: '15px', fontWeight: 800, padding: '5px 0',
      // A quarter of the league's colours are light enough that white ink on
      // them is unreadable — let the contrast helper pick.
      backgroundColor: player ? teamColor : '#334155',
      color: player ? getContrastTextColor(teamColor) : '#cbd5e1',
    }}>{label}</span>
  )

  if (!player) {
    return (
      <div className="tp-plate tp-plate-empty">
        {badge}
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Vacant</span>
      </div>
    )
  }

  const offense = player.offensiveRating ?? player.rating
  const defense = player.defensiveRating
  const term = player.termRemaining

  return (
    <div className="tp-plate" style={narrow ? { flexWrap: 'wrap', gap: '10px 12px' } : undefined}>
      {badge}

      <div style={{
        width: narrow ? 'auto' : '196px',
        flex: narrow ? 1 : undefined,
        flexShrink: narrow ? 1 : 0,
        minWidth: 0,
      }}>
        <PlayerHoverCard playerId={player.id} playerName={player.name}>
          <Link to={`/players/${player.id}`} className="tp-link" style={{
            display: 'block', textDecoration: 'none',
            fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em',
            color: '#f8fafc',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{player.name}</Link>
        </PlayerHoverCard>
        <div style={{ marginTop: '3px' }}>
          <Stars stars={player.ratingStars} size={16} tracking={1} />
        </div>
      </div>

      <div style={{ width: '124px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{careerStatus(player)}</div>
        {term != null && (
          <div style={{
            fontSize: '11px', marginTop: '2px',
            // A walk-year contract is the one thing on this line a fan should
            // notice without being told.
            color: term === 1 ? '#f59e0b' : '#cbd5e1',
          }}>{term}yr remaining</div>
        )}
        {stage && (
          <div style={{ marginTop: '4px' }}>
            <CareerStageBadge stage={stage} full />
          </div>
        )}
      </div>

      {/* Two-way ratings. Kickers get the offense row only — they have no
          defensive assignment, and inventing a bar for one would be a lie. */}
      <div style={{
        flex: narrow ? '1 1 100%' : 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: '5px',
      }}>
        <Gauge label="OFFENSE" rating={offense} variant="inline" height={5} />
        {defense != null && player.defensivePosition && (
          <Gauge label={`${player.defensivePosition} DEF`} rating={defense} variant="inline" height={5} />
        )}
      </div>

      <div style={{
        width: narrow ? '100%' : '134px', flexShrink: 0,
        ...(narrow
          ? { borderTop: '1px solid #1e293b', paddingTop: '10px' }
          : { borderLeft: '1px solid #1e293b', paddingLeft: '14px' }),
      }}>
        <div style={{
          fontSize: '10px', letterSpacing: '0.08em', fontWeight: 700, color: '#cbd5e1',
        }}>FAN RATING</div>
        <div style={{ marginTop: '4px' }}>
          {/* The same 1–5 control the fanbase uses. Signed out, or looking at
              somebody else's team, the pips show where the fanbase has landed
              rather than sitting empty. */}
          <PlayerRating
            playerId={player.id}
            canRate={canRate}
            onChange={onRated}
            averageFill
            pipSize={13}
            countSuffix=" fans"
            layout="column"
          />
        </div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { seasonState } = useFloosball()
  const { games } = useGames()

  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [width, setWidth] = useState(window.innerWidth)
  const [openGameId, setOpenGameId] = useState<number | null>(null)
  const [stages, setStages] = useState<Record<number, string>>({})
  const [stadiumLevel, setStadiumLevel] = useState(1)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const stacked = width < STACK_WIDTH
  const narrowPlates = width < PLATE_WRAP_WIDTH
  const pad = stacked ? 16 : PAGE_PAD

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/teams/${id}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json?.data) setTeam(json.data)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Career arc per player. It rides the retirement-watch endpoint rather than
  // the team payload — same computeCareerStage source the Front Office roster
  // reads, so the two can't disagree about who's past it.
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/teams/${id}/retirement-watch`)
      .then(r => r.json())
      .then(body => { if (!cancelled && body?.data?.stages) setStages(body.data.stages) })
      .catch(() => { /* a badge must never take the page down */ })
    return () => { cancelled = true }
  }, [id])

  // The one REAL thing behind the stadium cell: how far the fanbase has funded
  // the stadium facility. Everything else in that cell is derived from it.
  useEffect(() => {
    if (!SHOW_STADIUM) return
    let cancelled = false
    fetch(`${API_BASE}/teams/${id}/facilities`)
      .then(r => r.json())
      .then(body => {
        if (cancelled) return
        const s = (body?.data?.facilities || []).find((f: any) => f.key === 'stadium')
        if (s?.level != null) setStadiumLevel(s.level)
      })
      .catch(() => { /* falls back to level 1 */ })
    return () => { cancelled = true }
  }, [id])

  const isMyTeam = !!user?.favoriteTeamId && String(user.favoriteTeamId) === String(id)
  const onRated = useCallback(() => setTick(t => t + 1), [])

  // Memoised, not `team?.schedule || []` inline: the bare fallback mints a new
  // array every render, which silently defeats every memo downstream of it.
  const schedule = useMemo(() => team?.schedule || [], [team])
  const history = useMemo(() => team?.history || [], [team])

  /** The live-or-next game: first row without a result. */
  const nextIdx = useMemo(
    () => schedule.findIndex(g => g.status !== 'Final' && !g.result),
    [schedule],
  )

  /** Live scores ride the season WS feed through GamesContext, so a game in
   *  progress keeps ticking without refetching the whole team. */
  const liveOverlay = useCallback((g: ScheduleGame) => {
    const live = games.get(g.gameId)
    if (!live) return g
    const isHome = g.isHome
    return {
      ...g,
      teamScore: isHome ? live.homeScore : live.awayScore,
      oppScore: isHome ? live.awayScore : live.homeScore,
      status: live.status,
    }
  }, [games])

  const trophies = useMemo(() => {
    if (!team) return []
    // Floos Bowl first — it outranks a league title, so it leads the case.
    const bowl = (team.floosbowlChampionships || [])
      .map(s => ({ season: s, label: 'Floos Bowl Champions', kind: 'bowl' as const }))
    const league = (team.leagueChampionships || [])
      .map(s => ({ season: s, label: `${team.league} Champions`, kind: 'league' as const }))
    return [...bowl, ...league]
  }, [team])

  /** Signed streak from the backend: +2 = won two straight. */
  const streakLine = useMemo(() => {
    const s = team?.streak ?? 0
    if (!s) return null
    return {
      text: `${s > 0 ? 'Won' : 'Lost'} ${Math.abs(s)} straight`,
      color: s > 0 ? '#4ade80' : '#f87171',
    }
  }, [team])

  /** Newest first, split evenly: 16 seasons → 16–9 left, 8–1 right. */
  const [historyLeft, historyRight] = useMemo(() => {
    const half = Math.ceil(history.length / 2)
    return [history.slice(0, half), history.slice(half)]
  }, [history])

  /** The schedule now runs in two columns of 14 below the fold rather than a
   *  scrolling rail, so the whole season is visible at once — no scroll
   *  position to restore and nothing hidden behind an overflow. */
  const [scheduleLeft, scheduleRight] = useMemo(() => {
    const half = Math.ceil(schedule.length / 2)
    return [schedule.slice(0, half), schedule.slice(half)]
  }, [schedule])

  // Memoised: the rail keys effects off this array, so a fresh one each render
  // would tear down and rebuild the observer continuously.
  const railSections: RailSection[] = useMemo(() => [
    { id: 'tp-overview', label: 'Overview' },
    { id: 'tp-squad', label: 'Squad' },
    { id: 'tp-record', label: 'Record' },
    ...(isMyTeam ? [{ id: 'tp-frontoffice', label: 'Front office' }] : []),
  ], [isMyTeam])

  // The strip stays up even while the team is loading or missing, so you can
  // always navigate on to another team rather than hitting a dead end.
  if (loading || !team) {
    return (
      <div style={{ backgroundColor: '#0b1220', minHeight: '100vh' }}>
        <TeamNavStrip currentTeamId={team?.id ?? (id ? parseInt(id, 10) : 0)} />
        <div style={{ padding: '60px', textAlign: 'center', color: '#cbd5e1', fontSize: '14px' }}>
          {loading ? 'Loading…' : 'Team not found.'}
        </div>
      </div>
    )
  }

  const accent = team.color || '#334155'
  const secondary = team.secondaryColor || accent
  const locker = team.lockerRoom
  const nextGame = nextIdx >= 0 ? liveOverlay(schedule[nextIdx]) : null

  // The season currently being played, or null between seasons. Once the Bowl
  // is done the flags are real and the row shows a genuine finish, so this has
  // to go null the moment the season completes rather than track the season
  // number alone.
  const liveSeason = seasonState.seasonNumber && !seasonState.seasonComplete
    ? seasonState.seasonNumber
    : null

  const heroName = stacked ? (width < 520 ? 32 : 40) : 58
  // Facts cells fold to two columns on a narrow window. Without the stadium
  // it's four, which is also why Next up no longer needs to span: four cells
  // fill two rows of two exactly.
  const factCols = stacked ? 2 : (SHOW_STADIUM ? 5 : 4)
  const nextUpIndex = SHOW_STADIUM ? 4 : 3
  const stadium = mockStadium(team, stadiumLevel)

  // The page's four reads. The Front Office only exists for the team you
  // follow, so
  // the rail's length tells you something too.

  /** Fortitude is the single composite of resolve and vulnerability, so it's
   *  the honest headline word; the three bars below break it back apart.
   *  Steady sits mid on purpose — it's the league middle, not a good sign. */
  const moodColor = (() => {
    const tier = locker?.fortitudeTier
    if (tier === 'hardened' || tier === 'resilient') return '#4ade80'
    if (tier === 'brittle') return '#f87171'
    return '#f59e0b'
  })()

  const canOpen = (g: ScheduleGame) => g.status !== 'Scheduled'

  return (
    <div style={{ backgroundColor: '#0b1220', minHeight: '100vh' }} className="tp-page">

      {/* The Overview section starts at the very top of the document, nav strip
          included. Anchoring it on the hero instead put the first snap point
          ~60px down, so the smallest scroll from rest would yank the strip out
          of view — the one place snapping would have felt like a glitch. */}
      <div id="tp-overview" className="tp-section tp-section-top">
        {/* Jump straight to any other team without going back to the league list. */}
        <TeamNavStrip currentTeamId={team.id} />
      </div>

      {/* ── HERO BAND ──────────────────────────────────────────────────────
          Full-bleed, in the team's own colours. The gradient runs dark on the
          left so the name always has something to sit on, and washes to the
          secondary on the right; the ghost abbreviation is the only decoration
          on the page. */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        backgroundColor: accent,
        borderBottom: `4px solid ${secondary}`,
      }}>
        <span style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(100deg, rgba(11,18,32,0.5) 0%, rgba(11,18,32,0.06) 52%, ${rgba(secondary, 0.2)} 100%)`,
        }} />
        <span aria-hidden style={{
          position: 'absolute', right: '-6px', top: '-22px', pointerEvents: 'none',
          fontSize: stacked ? '110px' : '150px', lineHeight: 1, fontWeight: 800,
          letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.10)',
        }}>{team.abbr}</span>

        <div style={{
          position: 'relative', maxWidth: PAGE_MAX, margin: '0 auto',
          padding: `16px ${pad}px`,
          display: 'flex', alignItems: 'center', gap: stacked ? '14px' : '20px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            width: '72px', height: '72px', flexShrink: 0,
            backgroundColor: '#0b1220', border: `1px solid ${secondary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={`/avatars/${team.id}.png`} alt="" style={{ width: '52px', height: '52px' }} />
          </span>

          <div style={{ minWidth: 0 }}>
            {/* Market lives here rather than in the facts row: it's an
                identity fact like the city and the league, not a performance
                one, and it was the weakest of the four things competing for
                that scan line. */}
            <div style={{
              fontSize: '13px', letterSpacing: '0.12em', fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
            }}>
              {team.city} &middot; {team.league}
              {team.fundingTier && <> &middot; {titleCase(team.fundingTier)}</>}
            </div>
            <h1 style={{
              margin: '4px 0 0', fontSize: `${heroName}px`, lineHeight: 0.94,
              fontWeight: 800, letterSpacing: '-0.045em', color: '#ffffff',
            }}>{team.name}</h1>
          </div>

          <div style={{
            marginLeft: stacked ? 0 : 'auto', flexShrink: 0,
            display: 'flex', alignItems: 'stretch', gap: '2px',
          }}>
            <div style={{
              backgroundColor: 'rgba(11,18,32,0.55)', padding: '10px 16px', textAlign: 'right',
            }}>
              <div style={{
                fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
              }}>RECORD</div>
              <div style={{
                fontSize: '34px', lineHeight: 1, fontWeight: 800, color: '#ffffff',
                fontVariantNumeric: 'tabular-nums',
              }}>{team.wins}&ndash;{team.losses}</div>
              {streakLine && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: streakLine.color }}>
                  {streakLine.text}
                </div>
              )}
            </div>
            <div style={{
              backgroundColor: 'rgba(11,18,32,0.55)', padding: '10px 16px', textAlign: 'right',
            }}>
              <div style={{
                fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
              }}>ELO</div>
              <div style={{
                fontSize: '34px', lineHeight: 1, fontWeight: 800, color: '#ffffff',
                fontVariantNumeric: 'tabular-nums',
              }}>{Math.round(team.elo)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TROPHY CASE ────────────────────────────────────────────────────
          Above the fold, because pedigree is half of "are they good".
          Each title is a MARK, not a sentence: trophy plus the season it was
          won. A dynasty should read as a row of trophies you can count at a
          glance, which spelled-out labels made impossible — what the title was
          lives on the hover. Nothing to show, no empty case. */}
      {trophies.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(245,158,11,0.06)',
          borderBottom: '1px solid rgba(245,158,11,0.22)',
        }}>
          <div style={{
            maxWidth: PAGE_MAX, margin: '0 auto', padding: `8px ${pad}px`,
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em',
              color: '#0b1220', backgroundColor: '#f59e0b', padding: '3px 9px',
              marginRight: '6px',
            }}>Trophy case</span>
            {trophies.map(t => {
              const tone = TROPHY_TONE[t.kind]
              const Icon = tone.Icon
              return (
                <HoverTooltip key={`${t.season}-${t.label}`} text={`${t.season} · ${t.label}`} color={tone.icon}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    backgroundColor: tone.bg,
                    border: `1px solid ${tone.border}`,
                    padding: '3px 8px 3px 6px',
                  }}>
                    <Icon size={15} color={tone.icon} style={{ flexShrink: 0 }} />
                    <span style={{
                      fontSize: '13px', fontWeight: 700, color: tone.text,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{t.season.replace(/^Season\s*/i, 'S')}</span>
                  </span>
                </HoverTooltip>
              )
            })}
          </div>
        </div>
      )}

      {/* ── FACTS GRID ─────────────────────────────────────────────────────
          One scan line, five cells: how good they are, who runs them, how
          they're holding up, where they play, and what's next. Outer cells sit
          flush with the column so the row reads edge to edge — see factCell,
          which works out the edges and dividers from the current column count
          rather than each cell hard-coding its own. */}
      <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: `0 ${pad}px` }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${factCols}, minmax(0,1fr))`,
          borderBottom: '1px solid #1e293b',
        }}>
          <div style={factCell(0, factCols)}>
            <CellLabel>Team ratings</CellLabel>
            <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Gauge label="Offense" rating={team.offenseRating ?? 0} />
              <Gauge label="Run Defense" rating={team.defenseRunCoverageRating ?? 0} />
              <Gauge label="Pass Defense" rating={team.defensePassCoverageRating ?? 0} />
            </div>
          </div>

          <div style={factCell(1, factCols)}>
            <CellLabel>Head coach</CellLabel>
            {team.coach ? (
              <>
                <div style={{
                  fontSize: '17px', fontWeight: 700, color: '#f8fafc',
                  marginTop: '3px', letterSpacing: '-0.01em',
                }}>{team.coach.name}</div>
                <div style={{ marginTop: '7px' }}>
                  <CoachProfileTags profile={team.coach.profile} />
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                  {tenurePhrase(team.coach.seasonsCoached)}
                </div>
                {/* The same 1-5 the players get. A GM is judged on the same
                    scale by the same fans, so it's the same control. */}
                <div style={{ marginTop: '8px' }}>
                  <PlayerRating
                    playerId={team.id}
                    subject="gm"
                    canRate={isMyTeam}
                    onChange={onRated}
                    averageFill
                    pipSize={15}
                    countSuffix=" fans"
                    layout="column"
                  />
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '3px' }}>Vacant</div>
            )}
          </div>

          <div style={factCell(2, factCols)}>
            <CellLabel>Locker room</CellLabel>
            {locker ? (
              <>
                <div style={{
                  fontSize: '23px', lineHeight: 1.15, fontWeight: 800, color: moodColor,
                }}>{locker.fortitudeLabel}</div>
                <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <MoodBar label="Resolve" value={locker.resolve} color="#4ade80" />
                  <MoodBar label="Fortitude" value={locker.fortitude} color="#4ade80" />
                  <MoodBar label="Vulnerability" value={locker.vulnerability} color="#38bdf8" />
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '3px' }}>No read yet</div>
            )}
          </div>

          {/* Stadium. The LEVEL is real (the funded `stadium` facility); the
              name, capacity and blurb are mocked — see mockStadium. Off until
              the backend has stadiums; SHOW_STADIUM brings it back. */}
          {SHOW_STADIUM && (
          <div style={factCell(3, factCols)}>
            <CellLabel>Stadium</CellLabel>
            <div style={{
              fontSize: '17px', fontWeight: 700, color: '#f8fafc',
              marginTop: '3px', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{stadium.name}</div>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px',
            }}>
              {/* The team's own colour, lifted until it actually reads on the
                  near-black page. Several secondaries are navy or maroon and
                  sank straight into the background at their raw value. */}
              <span style={{
                fontSize: '12px', fontWeight: 700, color: readableOnDark(secondary),
              }}>{stadium.size}</span>
              <span style={{
                fontSize: '12px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums',
              }}>{stadium.capacity.toLocaleString()} seats</span>
            </div>
            <div style={{
              fontSize: '12px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45,
            }}>{stadium.blurb}</div>
          </div>
          )}

          {/* Next up takes the market's place. It's the most time-sensitive
              thing on the page, so it belongs on the first scan line rather
              than partway down a rail.

              `font: inherit` is load-bearing: a <button> does NOT inherit
              font-family or size from the page, so without it this cell's text
              rendered in the browser default and sat a couple of pixels off
              the three headings beside it. */}
          <button
            type="button"
            className="tp-fact-cell"
            disabled={!nextGame || !canOpen(nextGame)}
            onClick={() => nextGame && canOpen(nextGame) && setOpenGameId(nextGame.gameId)}
            style={{
              ...FOCUS_RING(secondary),
              font: 'inherit', textAlign: 'left', width: '100%',
              // A <button> centres its own content vertically, and `display:
              // block` does not stop it — that is what floated this cell off
              // the headings beside it. An explicit flex container with
              // flex-start overrides the browser's anonymous centring.
              display: 'flex', flexDirection: 'column',
              alignItems: 'stretch', justifyContent: 'flex-start',
              border: 'none', borderRadius: 0,
              backgroundColor: 'transparent',
              cursor: nextGame && canOpen(nextGame) ? 'pointer' : 'default',
              // Last cell. With the stadium showing it's the fifth, which
              // leaves it alone on the final row when folded to two columns —
              // so it spans rather than sitting as a half-width orphan. With
              // four cells the fold is even and no span is needed.
              ...factCell(nextUpIndex, factCols, stacked && SHOW_STADIUM ? 2 : 1),
            }}
          >
            <CellLabel>Next up</CellLabel>
            {nextGame ? (
              <>
                <div style={{
                  fontSize: '11px', letterSpacing: '0.08em', fontWeight: 700,
                  color: '#38bdf8', marginTop: '7px',
                }}>
                  {weekTitle(nextGame.week)}
                  {' · '}
                  {nextGame.status === 'Active' ? 'Live' : nextGame.status === 'Final' ? 'Final' : nextGame.isHome ? 'Home' : 'Away'}
                  {nextGame.status !== 'Scheduled' && (nextGame.isHome ? ' · Home' : ' · Away')}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', marginTop: '7px',
                }}>
                  <img src={`/avatars/${nextGame.opponent.id}.png`} alt=""
                       style={{ width: '34px', height: '34px', flexShrink: 0 }} />
                  {/* The name WRAPS rather than ellipsing. With a one-line
                      name most opponents were cut off mid-city. Two short
                      lines cost a few pixels of height and lose nothing. */}
                  <span style={{
                    fontSize: '16px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2,
                    minWidth: 0, overflowWrap: 'anywhere',
                  }}>{nextGame.opponent.city} {nextGame.opponent.name}</span>
                </div>

                {/* The score is a SCOREBOARD, not a bare pair of numbers. Sat
                    at the end of the name row, "Baltimore Ravens 16-6" read as
                    the opponent's record. Naming both sides and separating
                    them is what makes it a score. */}
                {nextGame.status !== 'Scheduled' && (
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '9px',
                  }}>
                    {[
                      { abbr: team.abbr, score: nextGame.teamScore },
                      { abbr: nextGame.opponent.abbr, score: nextGame.oppScore },
                    ].map(side => (
                      <span key={side.abbr} style={{
                        display: 'flex', alignItems: 'baseline', gap: '6px',
                      }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                          color: '#94a3b8',
                        }}>{side.abbr}</span>
                        <span style={{
                          fontSize: '22px', fontWeight: 800, lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                          // The side in front is the brighter one, so the
                          // scoreline says who's winning without a label.
                          color: side.score >= Math.max(nextGame.teamScore, nextGame.oppScore)
                            ? '#f8fafc' : '#94a3b8',
                        }}>{side.score}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* No next game means one of three quite different things, and
                 "Season over" was wrong for two of them. A team knocked out in
                 round 2 is not in the same position as the one holding the
                 trophy. */
              <div style={{ marginTop: '7px' }}>
                <div style={{
                  fontSize: '23px', lineHeight: 1.15, fontWeight: 800,
                  color: team.floosbowlChampion ? '#f59e0b'
                    : team.eliminated ? '#cbd5e1' : '#cbd5e1',
                }}>
                  {team.floosbowlChampion ? 'Champions'
                    : team.eliminated ? 'Eliminated' : 'Season over'}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '5px' }}>
                  {team.floosbowlChampion ? 'Floos Bowl winners'
                    : team.eliminated ? 'Out of the running'
                    : 'No games scheduled'}
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────
          Roster and The Bleachers side by side. The feed used to sit third in
          a rail under the schedule, which buried the one part of the page fans
          actually write to — here it runs the full height of the roster and is
          the second thing you see. */}
      <div id="tp-squad" className="tp-section" style={{
        maxWidth: PAGE_MAX, margin: '0 auto', padding: `24px ${pad}px 0`,
        display: 'grid',
        gridTemplateColumns: stacked ? 'minmax(0,1fr)' : `minmax(0,1fr) minmax(0,${RAIL}px)`,
        gap: '32px', alignItems: 'start',
      }}>

        <div style={{ minWidth: 0 }}>
          <SectionHead label="Roster" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {ROSTER_SLOTS.map((slot, i) => {
              const p = team.roster?.[slot] ?? null
              return (
                <div key={slot} className="tp-slot" style={{ animationDelay: `${i * 40}ms` }}>
                  <RosterPlate
                    slot={slot}
                    player={p}
                    teamColor={accent}
                    canRate={isMyTeam}
                    onRated={onRated}
                    stage={p ? stages[p.id] : undefined}
                    narrow={narrowPlates}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <SectionHead label="The Bleachers" note="Say your piece" style={{ marginBottom: '10px' }} />
          {/* Tall enough to fill the roster's height rather than stopping a
              third of the way down it. */}
          <TeamFeed
            teamId={team.id}
            refreshKey={tick}
            canPost={isMyTeam}
            bare
            composer="dropdown"
            railTone
            maxHeight={stacked ? 280 : 430}
          />
        </div>
      </div>

      {/* ── THE RECORD ─────────────────────────────────────────────────────
          Season history and the full schedule, side by side across the whole
          page. Both run in two internal columns so all 16 seasons and all 28
          weeks are visible at once — no scrollbars, nothing behind an
          overflow. That's what the width down here is for. */}
      <div id="tp-record" className="tp-section" style={{
        maxWidth: PAGE_MAX, margin: '0 auto', padding: `30px ${pad}px 0`,
        display: 'grid',
        gridTemplateColumns: stacked ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))',
        gap: '36px', alignItems: 'start',
      }}>

        <div style={{ minWidth: 0 }}>
          <SectionHead label="Season history" style={{ marginBottom: '10px' }} />
          {history.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#cbd5e1' }}>First season.</div>
          ) : (
            <div style={{
              display: 'grid',
              // One column for a team with barely any history — two half-empty
              // tables side by side would look like a rendering fault.
              gridTemplateColumns: historyRight.length === 0 || narrowPlates
                ? 'minmax(0,1fr)'
                : 'repeat(2, minmax(0,1fr))',
              gap: '28px', alignItems: 'start',
            }}>
              {(historyRight.length === 0 || narrowPlates
                ? [history]
                : [historyLeft, historyRight]
              ).map((rows, i) => <HistoryTable key={i} rows={rows} liveSeason={liveSeason} />)}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <SectionHead
            label="Schedule"
            note={seasonState.seasonNumber ? `Season ${seasonState.seasonNumber}` : undefined}
            style={{ marginBottom: '10px' }}
          />
          {schedule.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#cbd5e1' }}>No games yet.</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: narrowPlates ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))',
              gap: '28px', alignItems: 'start',
            }}>
              {(narrowPlates ? [schedule] : [scheduleLeft, scheduleRight]).map((chunk, c) => (
                <div key={c} style={{ minWidth: 0 }}>
                  {chunk.map(raw => {
                    const g = liveOverlay(raw)
                    const played = g.result === 'W' || g.result === 'L'
                    const isNext = nextGame != null && g.gameId === nextGame.gameId
                    const scoreColor = isNext ? '#38bdf8'
                      : g.result === 'W' ? '#4ade80'
                      : g.result === 'L' ? '#f87171'
                      : '#94a3b8'
                    return (
                      <button
                        key={g.gameId}
                        type="button"
                        className="tp-sched-row"
                        disabled={!canOpen(g)}
                        onClick={() => canOpen(g) && setOpenGameId(g.gameId)}
                        style={{
                          ...FOCUS_RING(secondary),
                          width: '100%', textAlign: 'left',
                          display: 'grid',
                          gridTemplateColumns: '30px 22px 16px minmax(0,1fr) auto',
                          gap: '8px', alignItems: 'center',
                          padding: '6px 8px', border: 'none', borderRadius: 0,
                          borderBottom: '1px solid #16202f',
                          backgroundColor: isNext ? 'rgba(56,189,248,0.10)' : 'transparent',
                          cursor: canOpen(g) ? 'pointer' : 'default',
                        }}
                      >
                        <span style={{
                          fontSize: '12px', fontVariantNumeric: 'tabular-nums',
                          color: isNext ? '#38bdf8' : '#cbd5e1',
                        }}>{weekLabel(g.week)}</span>
                        <img src={`/avatars/${g.opponent.id}.png`} alt=""
                             style={{
                               width: '20px', height: '20px',
                               // Unplayed opponents go grey rather than the row
                               // going translucent: dimming the whole row put
                               // the text under the legibility floor.
                               filter: played ? 'none' : 'grayscale(1)',
                             }} />
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{g.isHome ? 'vs' : '@'}</span>
                        <span style={{
                          minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', fontSize: '13px',
                          color: played ? '#cbd5e1' : '#94a3b8',
                        }}>{g.opponent.city} {g.opponent.name}</span>
                        <span style={{
                          fontSize: '13px', fontWeight: 700, color: scoreColor,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {played || g.status === 'Active'
                            // A frames match is decided by FRAMES WON, so the
                            // point total would misreport the result. W/L is
                            // already frames-aware via `result`.
                            ? (g.scoreLabel === 'frames'
                                ? `${fmtFramesWon(g.displayTeamScore ?? g.teamScore)}\u2013${fmtFramesWon(g.displayOppScore ?? g.oppScore)}`
                                : `${g.teamScore}\u2013${g.oppScore}`)
                            : '\u2014'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FRONT OFFICE ───────────────────────────────────────────────────
          The seam between the public page and your own controls, drawn on
          purpose as a full-bleed band rather than left as a heading. Gated to
          the one team you follow — `/front-office` redirects here, so this is
          where those controls live. */}
      {isMyTeam && (
        <FrontOfficeBand pad={pad} pageMax={PAGE_MAX} stacked={stacked} accent={accent} />
      )}

      <div style={{ height: '48px' }} />

      {/* Light section nav + the snap that makes a scroll feel like turning a
          page rather than falling through one long column. */}
      <SectionRail sections={railSections} accent={readableOnDark(secondary)} enabled={!stacked} />

      {openGameId != null && (
        <GameModalNew gameId={openGameId} onClose={() => setOpenGameId(null)} />
      )}
    </div>
  )
}

// ── Season history table ────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#cbd5e1',
  borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = {
  padding: '7px 10px', borderBottom: '1px solid #16202f', fontSize: '13px',
}

/** ELO in isolation means little; coloured against the 1500 baseline it reads
 *  as "were they actually good that year" next to the record. */
function eloColor(elo: number): string {
  if (elo >= 1650) return '#4ade80'
  if (elo >= 1500) return '#cbd5e1'
  return '#f87171'
}

const HistoryTable: React.FC<{
  rows: HistoryRow[]
  /** The season still being played, if there is one. Its row can't have a
   *  finish yet. */
  liveSeason?: number | null
}> = ({ rows, liveSeason }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th style={{ ...TH, textAlign: 'left', padding: '0 0 7px', width: '38px' }}>SEASON</th>
        <th style={{ ...TH, textAlign: 'right', padding: '0 10px 7px', width: '52px' }}>RECORD</th>
        <th style={{ ...TH, textAlign: 'right', padding: '0 10px 7px', width: '52px' }}>ELO</th>
        <th style={{ ...TH, textAlign: 'right', padding: '0 0 7px 10px' }}>FINISH</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(h => {
        const finish = seasonFinish(h, liveSeason != null && h.season === liveSeason)
        return (
          <tr key={h.season}>
            <td style={{
              ...TD, paddingLeft: 0, textAlign: 'left', fontWeight: 700,
              color: '#e2e8f0', fontVariantNumeric: 'tabular-nums',
            }}>S{h.season}</td>
            <td style={{
              ...TD, textAlign: 'right', color: '#e2e8f0',
              fontVariantNumeric: 'tabular-nums',
            }}>{h.wins}&ndash;{h.losses}</td>
            <td style={{
              ...TD, textAlign: 'right', color: eloColor(h.elo),
              fontVariantNumeric: 'tabular-nums',
            }}>{Math.round(h.elo)}</td>
            <td style={{
              ...TD, paddingRight: 0, textAlign: 'right',
              color: finish.color, fontWeight: finish.weight,
            }}>{finish.label}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)
