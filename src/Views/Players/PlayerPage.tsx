import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Stars } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/contexts/AuthContext'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { readableTeamColor } from '@/utils/colors'
import { statRampColor } from '@/utils/ratingColors'
import RatingProgression, { RatingPoint } from './RatingProgression'
import {
  PANEL, PanelHeader, PanelTab, Plate, SegmentedControl, CareerTable, TrophyCase,
  AttrBar, BackArrow, BoltIcon, SwordGlyph, ShieldGlyph,
  num, pct, sumOver,
  type StatColumn, type TrophyEntry,
} from './playerPieces'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const MOOD_COLORS: Record<string, string> = {
  electric: '#22c55e',
  confident: '#4ade80',
  steady: TEXT.muted,
  frustrated: '#f97316',
  miserable: '#ef4444',
}

const POSITION_FULL: Record<string, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', K: 'Kicker',
}

/** Everyone plays both ways: QB→S, RB→LB, WR→CB, TE→DE. */
const DEF_POSITION_FULL: Record<string, string> = {
  S: 'Safety', LB: 'Linebacker', CB: 'Cornerback', DE: 'Defensive End',
}

const DEF_ATTR_NAMES: Record<string, string> = {
  coverage: 'Coverage', tackling: 'Tackling', playReading: 'Play Reading',
  passRush: 'Pass Rush', runDefense: 'Run Defense', blitzing: 'Blitzing',
}

const TIER_COLOR: Record<string, string> = {
  Elite: '#fbbf24', Strong: '#22c55e', Average: TEXT.muted, Quiet: TEXT.dim,
}

/** The stat a position is ranked by in the breadcrumb, and how to say it. */
const STANDING_CATEGORY: Record<string, { category: string; label: string; plural: string }> = {
  QB: { category: 'passing_yards',   label: 'passing yards',   plural: 'Quarterbacks' },
  RB: { category: 'rushing_yards',   label: 'rushing yards',   plural: 'Running backs' },
  WR: { category: 'receiving_yards', label: 'receiving yards', plural: 'Wide receivers' },
  TE: { category: 'receiving_yards', label: 'receiving yards', plural: 'Tight ends' },
  K:  { category: 'fg_made',         label: 'field goals',     plural: 'Kickers' },
}

const ordinal = (n: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`
}

interface PlayerAttributes {
  att1?: string; att1Value?: number; att1stars?: number
  att2?: string; att2Value?: number; att2stars?: number
  att3?: string; att3Value?: number; att3stars?: number
  playmakingStars?: number; playmakingValue?: number
  xFactorStars?: number; xFactorValue?: number
  seasonPerformanceRatingStars?: number; seasonPerformanceRating?: number
  fatigue?: number
  defensiveAttributes?: Record<string, { value: number; stars: number }>
  mood?: string
  moodTier?: string
  /** Has this player ever awakened. The profile shows a badge and nothing more. */
  isAwakened?: boolean
  // Retained on the type because other surfaces read them; this page does not.
  attitudeValue?: number
  attitudeLabel?: string
  attitudeTier?: string
  attitude?: number
  resilience?: number
  selfBelief?: number
  pressureHandling?: number
  discipline?: number
  focus?: number
  instinct?: number
  creativity?: number
  demeanor?: string
  demeanorDrift?: unknown
  personality?: unknown
  // Flavour, assigned once at creation.
  hometown?: string
  favorite_category?: string
  favorite_item?: string
  motto?: string
}

interface PlayerData {
  id: number
  name: string
  position: string
  team: string | null
  teamCity: string | null
  teamColor: string | null
  teamSecondaryColor: string | null
  teamId: number | null
  teamAbbr: string | null
  isProspect?: boolean
  draftingTeamId?: number | null
  draftingTeamName?: string | null
  draftingTeamCity?: string | null
  draftingTeamColor?: string | null
  draftClass?: number | null
  seasonsPlayed: number
  ratingStars: number
  playerRating: number
  offensiveRating?: number
  offensiveRatingStars?: number
  defensiveRating?: number
  defensiveRatingStars?: number
  defensivePosition?: string | null
  rank: string
  number: number
  championships: any[]
  mvpAwards?: any[]
  allProSeasons?: any[]
  isHof?: boolean
  hofSeason?: number | null
  recordsHeld?: string[]
  seasonImpact?: {
    offenseTier?: string | null; defenseTier?: string | null
    offenseScore?: number | null; defenseValue?: number | null
  } | null
  attributes: PlayerAttributes
  stats: any[]
  allTimeStats: any
}

// ── Jersey ───────────────────────────────────────────────────────────────────
// Ported verbatim from the previous page: same 200×185 viewBox, same angled
// sleeve paths, stripes, highlight, collar, nameplate and number.

const PlayerJersey: React.FC<{ color: string; secondary: string | null; number: number; name: string }> = ({
  color, secondary, number, name,
}) => {
  const lastName = name.includes(' ') ? name.split(' ').slice(-1)[0] : name
  const displayName = lastName.toUpperCase().slice(0, 11)
  const displayNum = number > 0 ? String(number) : ''
  const numFontSize = displayNum.length > 1 ? 68 : 84
  const accentColor = secondary || 'rgba(255,255,255,0.75)'

  return (
    <svg viewBox="0 0 200 185" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <filter id="jersey-drop" x="-15%" y="-10%" width="130%" height="125%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <clipPath id="lsleeve"><path d="M 36,15 L 0,40 L 16,68 L 52,56 Z" /></clipPath>
        <clipPath id="rsleeve"><path d="M 164,15 L 200,40 L 184,68 L 148,56 Z" /></clipPath>
      </defs>

      <path
        d="M 80,24 L 36,15 L 0,40 L 16,68 L 52,56 L 46,178 L 154,178 L 148,56 L 184,68 L 200,40 L 164,15 L 120,24 Q 100,52 80,24 Z"
        fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" filter="url(#jersey-drop)"
      />

      <g clipPath="url(#lsleeve)">
        <rect x="-5" y="37" width="70" height="9" fill={accentColor} />
        <rect x="-5" y="50" width="70" height="9" fill={accentColor} />
      </g>
      <g clipPath="url(#rsleeve)">
        <rect x="135" y="37" width="70" height="9" fill={accentColor} />
        <rect x="135" y="50" width="70" height="9" fill={accentColor} />
      </g>

      <path d="M 36,15 L 0,40 L 16,68 L 52,56 L 48,28 Z" fill="rgba(0,0,0,0.10)" />
      <path d="M 164,15 L 200,40 L 184,68 L 148,56 L 152,28 Z" fill="rgba(0,0,0,0.10)" />
      <path d="M 80,24 Q 100,52 120,24 L 148,56 L 154,178 L 46,178 L 52,56 Z" fill="rgba(255,255,255,0.05)" />
      <path d="M 80,24 Q 100,52 120,24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" />

      <text
        x="100" y="68" textAnchor="middle"
        fontSize={displayName.length > 9 ? 10 : 13} fontWeight="700"
        fontFamily="Arial, sans-serif" fill={accentColor}
        stroke="rgba(0,0,0,0.55)" strokeWidth="2.5" paintOrder="stroke" letterSpacing="1.5"
      >{displayName}</text>

      {displayNum && (
        <text
          x="100" y="148" textAnchor="middle"
          fontSize={numFontSize} fontWeight="900"
          fontFamily="'Arial Black', Arial, sans-serif" fill={accentColor}
          stroke="rgba(0,0,0,0.5)" strokeWidth="4" paintOrder="stroke"
        >{displayNum}</text>
      )}
    </svg>
  )
}

// ── Career table column sets ─────────────────────────────────────────────────
// One definition per segment. The career row totals from the career blob where
// it carries the field and sums the seasons where it does not.

const perfColumn = (key: 'performanceRating' | 'defensivePerformanceRating', label: string): StatColumn => ({
  key, label, width: key === 'performanceRating' ? 52 : 62, ramp: true,
  cell: row => num(row[key]),
  // A career average over the seasons that have a reading. Percentiles are
  // taken against the pool of their own season, so they are only ever
  // comparable within one; averaging is the honest summary, not a total.
  total: (_career, rows) => {
    const rated = rows.map(r => r[key]).filter((v: any) => v != null && v > 0)
    return rated.length ? num(rated.reduce((a: number, b: number) => a + b, 0) / rated.length) : '—'
  },
})

const pointsColumn: StatColumn = {
  key: 'pts', label: 'PTS', width: 62,
  cell: row => num(row.fantasyPoints, 1),
  total: (career, rows) => num(career?.fantasyPoints ?? sumOver(rows, r => r.fantasyPoints), 1),
}

const gamesColumn: StatColumn = {
  key: 'gp', label: 'GP', width: 44,
  cell: row => num(row.gp),
  total: (_career, rows) => num(sumOver(rows, r => r.gp)),
}

const OFFENSE_COLUMNS: Record<string, StatColumn[]> = {
  QB: [
    gamesColumn,
    { key: 'comp', label: 'COMP', width: 50, cell: r => num(r.passing?.comp), total: c => num(c?.passing?.comp) },
    { key: 'att',  label: 'ATT',  width: 50, cell: r => num(r.passing?.att),  total: c => num(c?.passing?.att) },
    { key: 'cmp%', label: 'COMP%', width: 56, cell: r => pct(r.passing?.compPerc), total: c => pct(c?.passing?.compPerc) },
    { key: 'yds',  label: 'YDS',  width: 62, strong: true, cell: r => num(r.passing?.yards), total: c => num(c?.passing?.yards) },
    { key: 'ypc',  label: 'YPA',  width: 50, cell: r => num(r.passing?.ypc, 1), total: c => num(c?.passing?.ypc, 1) },
    { key: 'td',   label: 'TD',   width: 44, cell: r => num(r.passing?.tds),  total: c => num(c?.passing?.tds) },
    { key: 'int',  label: 'INT',  width: 44, cell: r => num(r.passing?.ints), total: c => num(c?.passing?.ints) },
    perfColumn('performanceRating', 'PERF'),
    pointsColumn,
  ],
  RB: [
    gamesColumn,
    { key: 'car',  label: 'CAR',  width: 48, cell: r => num(r.rushing?.carries), total: c => num(c?.rushing?.carries) },
    { key: 'yds',  label: 'YDS',  width: 62, strong: true, cell: r => num(r.rushing?.yards), total: c => num(c?.rushing?.yards) },
    { key: 'ypc',  label: 'YPC',  width: 50, cell: r => num(r.rushing?.ypc, 1), total: c => num(c?.rushing?.ypc, 1) },
    { key: 'td',   label: 'TD',   width: 44, cell: r => num(r.rushing?.tds), total: c => num(c?.rushing?.tds) },
    { key: 'fum',  label: 'FUM',  width: 44, cell: r => num(r.rushing?.fumblesLost), total: c => num(c?.rushing?.fumblesLost) },
    { key: 'rec',  label: 'REC',  width: 44, cell: r => num(r.receiving?.receptions), total: c => num(c?.receiving?.receptions) },
    { key: 'ryds', label: 'RYDS', width: 56, cell: r => num(r.receiving?.yards), total: c => num(c?.receiving?.yards) },
    perfColumn('performanceRating', 'PERF'),
    pointsColumn,
  ],
  WR: [
    gamesColumn,
    { key: 'rec',  label: 'REC',  width: 44, cell: r => num(r.receiving?.receptions), total: c => num(c?.receiving?.receptions) },
    { key: 'tgt',  label: 'TGT',  width: 44, cell: r => num(r.receiving?.targets), total: c => num(c?.receiving?.targets) },
    { key: 'rcv%', label: 'RCV%', width: 52, cell: r => pct(r.receiving?.rcvPerc), total: c => pct(c?.receiving?.rcvPerc) },
    { key: 'yds',  label: 'YDS',  width: 62, strong: true, cell: r => num(r.receiving?.yards), total: c => num(c?.receiving?.yards) },
    { key: 'ypr',  label: 'YPR',  width: 52, cell: r => num(r.receiving?.ypr, 1), total: c => num(c?.receiving?.ypr, 1) },
    { key: 'td',   label: 'TD',   width: 44, cell: r => num(r.receiving?.tds), total: c => num(c?.receiving?.tds) },
    perfColumn('performanceRating', 'PERF'),
    pointsColumn,
  ],
  K: [
    gamesColumn,
    { key: 'fgm',  label: 'FGM',  width: 48, strong: true, cell: r => num(r.kicking?.fgs), total: c => num(c?.kicking?.fgs) },
    { key: 'fga',  label: 'FGA',  width: 48, cell: r => num(r.kicking?.fgAtt), total: c => num(c?.kicking?.fgAtt) },
    { key: 'fg%',  label: 'FG%',  width: 56, cell: r => pct(r.kicking?.fgPerc), total: c => pct(c?.kicking?.fgPerc) },
    perfColumn('performanceRating', 'PERF'),
    pointsColumn,
  ],
}
OFFENSE_COLUMNS.TE = OFFENSE_COLUMNS.WR

const DEFENSE_COLUMNS: StatColumn[] = [
  gamesColumn,
  { key: 'tkl', label: 'TKL', width: 48, strong: true, cell: r => num(r.defense?.tackles), total: c => num(c?.defense?.tackles) },
  { key: 'tfl', label: 'TFL', width: 44, cell: r => num(r.defense?.tfl), total: c => num(c?.defense?.tfl) },
  { key: 'sck', label: 'SCK', width: 44, cell: r => num(r.defense?.sacks), total: c => num(c?.defense?.sacks) },
  { key: 'int', label: 'INT', width: 44, cell: r => num(r.defense?.ints), total: c => num(c?.defense?.ints) },
  { key: 'pbu', label: 'PBU', width: 44, cell: r => num(r.defense?.passBreakups), total: c => num(c?.defense?.passBreakups) },
  { key: 'ff',  label: 'FF',  width: 44, cell: r => num(r.defense?.forcedFumbles), total: c => num(c?.defense?.forcedFumbles) },
  perfColumn('defensivePerformanceRating', 'DEF RTG'),
]

// ── Page ─────────────────────────────────────────────────────────────────────

/**
 * Who he is, then how good he is, then the numbers.
 *
 * A fixed identity rail on the left and one content column on the right. The
 * previous page ran three columns at the same weight with the attributes hidden
 * inside a tab and the career table below the fold.
 *
 * Deliberately not here: the mental-profile panel, fatigue and demeanor drift,
 * the personality archetype and quirk chips, the fan rating (that belongs to the
 * team page), any comparative context, and a game log. The one rank the page
 * mentions is the breadcrumb in the context bar, which is navigation.
 */
const PlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, followedPlayerIds, followPlayer, unfollowPlayer } = useAuth()

  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([])
  const [ratingCeiling, setRatingCeiling] = useState<number | null>(null)
  const [ratingExpected, setRatingExpected] = useState<number | null>(null)
  const [quotes, setQuotes] = useState<Array<{ text: string; event?: string; personality?: string; timestamp?: string }>>([])
  const [standing, setStanding] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [attrTab, setAttrTab] = useState<'attributes' | 'progression'>('attributes')
  const [statsSide, setStatsSide] = useState<'offense' | 'defense'>('offense')

  const narrow = useIsMobile(1100)
  const veryNarrow = useIsMobile(760)
  const playerId = id ? parseInt(id, 10) : null
  const isFollowing = playerId != null && followedPlayerIds.has(playerId)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setStanding(null)
    Promise.all([
      fetch(`${API_BASE}/players/${id}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/players/${id}/rating-history`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/players/${id}/quotes`).then(r => r.json()).catch(() => null),
    ]).then(([playerRes, historyRes, quotesRes]) => {
      if (playerRes?.success && playerRes.data) setPlayer(playerRes.data)
      if (historyRes?.success && historyRes.data?.history) setRatingHistory(historyRes.data.history)
      if (historyRes?.success) {
        setRatingCeiling(historyRes.data?.ceiling ?? null)
        setRatingExpected(historyRes.data?.expected ?? null)
      }
      if (quotesRes?.success && Array.isArray(quotesRes.data)) setQuotes(quotesRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  // The breadcrumb's standing. Best-effort and entirely optional — the line
  // falls back to naming the position group when the board is unavailable or
  // the player is not on it.
  const standingSpec = player && !player.isProspect ? STANDING_CATEGORY[player.position] : null
  useEffect(() => {
    if (!standingSpec || !playerId) return
    let cancelled = false
    fetch(`${API_BASE}/stats/leaders?category=${standingSpec.category}&position=${player!.position}&limit=300`)
      .then(r => r.json())
      .then(res => {
        if (cancelled || !res?.success) return
        const rows = res.data?.leaders ?? res.data ?? []
        const mine = Array.isArray(rows) ? rows.find((row: any) => row.id === playerId) : null
        if (mine?.rank) setStanding(mine.rank)
      })
      .catch(() => { /* the breadcrumb degrades to the group name */ })
    return () => { cancelled = true }
  }, [standingSpec, playerId, player])

  const att = player?.attributes
  const offAttrs = useMemo(() => {
    const out: { label: string; value: number }[] = []
    if (!att) return out
    if (att.att1 && att.att1Value != null) out.push({ label: att.att1, value: att.att1Value })
    if (att.att2 && att.att2Value != null) out.push({ label: att.att2, value: att.att2Value })
    if (att.att3 && att.att3Value != null) out.push({ label: att.att3, value: att.att3Value })
    if (att.playmakingValue != null) out.push({ label: 'Playmaking', value: att.playmakingValue })
    if (att.xFactorValue != null) out.push({ label: 'X-Factor', value: att.xFactorValue })
    return out
  }, [att])

  const defAttrs = useMemo(() => {
    const out: { label: string; value: number }[] = []
    if (!att?.defensiveAttributes || !player?.defensivePosition) return out
    Object.entries(att.defensiveAttributes).forEach(([key, entry]) => {
      out.push({ label: DEF_ATTR_NAMES[key] ?? key, value: entry.value })
    })
    return out
  }, [att, player])

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', ...font(400, 13), color: TEXT.muted, fontFamily: FONT }}>
        Loading…
      </div>
    )
  }
  if (!player) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', ...font(400, 13), color: TEXT.muted, fontFamily: FONT }}>
        Player not found.
      </div>
    )
  }

  const teamColor = player.teamColor || TEXT.dim
  const teamLinkColor = readableTeamColor(teamColor)
  const isRetired = player.rank === 'Retired'
  const seasonsLabel = `${player.seasonsPlayed} season${player.seasonsPlayed === 1 ? '' : 's'}`

  const hasDefenseSide = player.position !== 'K' && !!player.defensivePosition
  const side = hasDefenseSide ? statsSide : 'offense'
  const offenseLabel = (player.position === 'QB' ? 'PASSING'
    : player.position === 'RB' ? 'RUSHING'
    : player.position === 'K' ? 'KICKING'
    : 'RECEIVING')

  // ── Trophy case ────────────────────────────────────────────────────────────
  const seasonOf = (entry: any): string => `S${entry && typeof entry === 'object' ? entry.Season : entry}`
  const trophies: TrophyEntry[] = []
  if ((player.mvpAwards?.length ?? 0) > 0) {
    trophies.push({ kind: 'mvp', caption: 'MVP', seasons: player.mvpAwards!.map(seasonOf).join(' ') })
  }
  if ((player.championships?.length ?? 0) > 0) {
    trophies.push({ kind: 'champion', caption: 'CHAMPION', seasons: player.championships.map(seasonOf).join(' ') })
  }
  if ((player.allProSeasons?.length ?? 0) > 0) {
    trophies.push({ kind: 'allpro', caption: 'ALL-PRO', seasons: player.allProSeasons!.map(seasonOf).join(' ') })
  }
  const records = player.recordsHeld ?? []
  if (records.length > 0) {
    trophies.push({ kind: 'record', caption: 'RECORD', seasons: records.length > 1 ? `×${records.length}` : '' })
  }
  const recordsNote = records.length === 0 ? null
    : records.length === 1 ? `Holds the ${records[0]} league record.`
    : `Holds ${records.length} league records: ${records.join(', ')}.`

  // ── Panels ─────────────────────────────────────────────────────────────────

  const identityPanel = (
    <div style={{ ...PANEL, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '182px', flexShrink: 0 }}>
        <PlayerJersey
          color={teamColor}
          secondary={player.teamSecondaryColor}
          number={player.number}
          name={player.name}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', textAlign: 'center' }}>
        <span style={{ ...font(500, 11, 1, '0.06em'), color: TEXT.muted }}>
          {POSITION_FULL[player.position] ?? player.position}
          {player.defensivePosition && ` · ${DEF_POSITION_FULL[player.defensivePosition] ?? player.defensivePosition}`}
        </span>
        <span style={{ ...font(800, 26, 1.1, '-0.03em'), color: TEXT.primary }}>{player.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Stars stars={player.ratingStars} size={15} tracking={2} />
          <span style={{ ...font(500, 12), color: TEXT.muted, fontStyle: 'italic' }}>
            {player.isProspect ? 'Prospect' : player.rank}
          </span>
        </span>
        {player.isHof && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(251,191,36,0.45)',
            padding: '4px 9px',
          }}>
            <span style={{ ...font(700, 10, 1, '0.06em'), color: '#fde68a' }}>
              HALL OF FAME{player.hofSeason ? ` · CLASS OF S${player.hofSeason}` : ''}
            </span>
          </span>
        )}
        {player.teamId ? (
          <Link to={`/team/${player.teamId}`} style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', textDecoration: 'none',
          }}>
            <Crest teamId={player.teamId} size={26} />
            <span style={{ ...font(700, 15), color: teamLinkColor }}>
              {player.teamCity} {player.team}
            </span>
          </Link>
        ) : player.isProspect && player.draftingTeamId ? (
          <Link to={`/team/${player.draftingTeamId}`} style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', textDecoration: 'none',
          }}>
            <Crest teamId={player.draftingTeamId} size={26} />
            <span style={{ ...font(700, 15), color: readableTeamColor(player.draftingTeamColor || TEXT.dim) }}>
              {player.draftingTeamCity} {player.draftingTeamName}
            </span>
          </Link>
        ) : (
          <span style={{ ...font(600, 13), color: TEXT.muted, marginTop: '2px' }}>
            {isRetired ? 'Retired' : 'Free Agent'}
          </span>
        )}
      </div>
    </div>
  )

  const flavourRows: [string, string][] = []
  if (att?.hometown) flavourRows.push(['Hometown', att.hometown])
  if (att?.favorite_item) flavourRows.push(['Favorite', att.favorite_item])

  // Mood and the awakened badge both belong to a playing career, so a retired
  // player's character panel is only the flavour and the motto.
  const showMood = !isRetired && !!att?.mood
  const showAwakened = !isRetired && !!att?.isAwakened
  const hasCharacter = showMood || showAwakened || flavourRows.length > 0 || !!att?.motto

  const characterPanel = hasCharacter && (
    <div style={PANEL}>
      <PanelHeader title="CHARACTER" />
      <div style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {showMood && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ ...font(400, 11), color: TEXT.muted, width: '66px', flexShrink: 0 }}>Mood</span>
            <span style={{ ...font(800, 15), color: MOOD_COLORS[att!.moodTier || 'steady'] || TEXT.muted }}>
              {att!.mood}
            </span>
          </div>
        )}
        {showAwakened && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pulse" style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(251,191,36,0.45)',
              padding: '5px 9px',
            }}>
              <BoltIcon />
              <span style={{ ...font(700, 12), color: '#fde68a' }}>Awakened</span>
            </span>
          </div>
        )}
        {(flavourRows.length > 0 || att?.motto) && (showMood || showAwakened) && (
          <span style={{ height: '1px', background: BORDER.hairline }} />
        )}
        {flavourRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {flavourRows.map(([label, value]) => (
              <span key={label} style={{ display: 'flex', gap: '10px' }}>
                <span style={{ ...font(400, 11), color: TEXT.muted, width: '66px', flexShrink: 0 }}>{label}</span>
                <span style={{ ...font(500, 11, 1.4), color: TEXT.secondary, minWidth: 0 }}>{value}</span>
              </span>
            ))}
          </div>
        )}
        {att?.motto && (
          <span style={{
            ...font(400, 12, 1.5), color: TEXT.secondary, fontStyle: 'italic',
            borderLeft: `2px solid ${BORDER.raised}`, paddingLeft: '10px',
          }}>“{att.motto}”</span>
        )}
      </div>
    </div>
  )

  const momentsPanel = quotes.length > 0 && (
    <div style={PANEL}>
      <PanelHeader title="RECENT MOMENTS" />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {quotes.slice(0, 3).map((quote, i) => {
          // A milestone reads purple, an in-game line blue.
          const milestone = !!quote.event && !quote.event.toLowerCase().includes('game')
          const accent = milestone ? ACCENT.featured : ACCENT.info
          const fill = milestone ? 'rgba(167,139,250,0.09)' : 'rgba(56,189,248,0.09)'
          return (
            <div key={quote.timestamp || i} style={{ background: fill, borderLeft: `2px solid ${accent}`, padding: '8px 10px' }}>
              <span style={{ ...font(400, 12, 1.5), color: TEXT.secondary, fontStyle: 'italic', overflowWrap: 'break-word' }}>
                {quote.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const ratingPlate = (
    label: string,
    value: number | undefined,
    stars: number | undefined,
    context: React.ReactNode,
    icon?: React.ReactNode,
  ) => (
    <div style={{ ...PANEL, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', ...font(700, 9, 1, '0.14em'), color: TEXT.muted }}>
        {icon}{label}
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ ...font(800, 40, 1, '-0.03em'), color: TEXT.primary, ...TABULAR }}>{value ?? '—'}</span>
        {stars != null && <Stars stars={stars} size={13} tracking={2} />}
      </span>
      <span style={{ ...font(500, 11, 1.4), color: TEXT.muted }}>{context}</span>
    </div>
  )

  const seasonDelta = ratingHistory.length > 1
    ? player.playerRating - ratingHistory[ratingHistory.length - 2].rating
    : null

  const impactContext = (tier: string | null | undefined) =>
    tier ? <span style={{ color: TIER_COLOR[tier] ?? TEXT.muted }}>{tier} this season</span> : 'No reading yet'

  const attrPanel = (
    <div style={PANEL}>
      <div style={{
        padding: '12px 16px', background: BG.panel,
        borderBottom: `1px solid ${BORDER.raised}`,
        display: 'flex', alignItems: 'center', gap: '18px',
      }}>
        <PanelTab label="ATTRIBUTES" active={attrTab === 'attributes'} onClick={() => setAttrTab('attributes')} />
        {ratingHistory.length > 0 && (
          <PanelTab label="PROGRESSION" active={attrTab === 'progression'} onClick={() => setAttrTab('progression')} />
        )}
      </div>
      {attrTab === 'attributes' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: defAttrs.length > 0 && !veryNarrow ? 'repeat(2, minmax(0,1fr))' : '1fr',
        }}>
          <div style={{
            padding: '15px 18px',
            borderRight: defAttrs.length > 0 && !veryNarrow ? `1px solid ${BORDER.hairline}` : undefined,
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <span style={{ ...font(700, 9, 1, '0.14em'), color: '#5b9bd5' }}>
              {(POSITION_FULL[player.position] ?? player.position).toUpperCase()}
            </span>
            {offAttrs.map(a => <AttrBar key={a.label} label={a.label} value={a.value} />)}
          </div>
          {defAttrs.length > 0 && (
            <div style={{ padding: '15px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ ...font(700, 9, 1, '0.14em'), color: ACCENT.negative }}>
                {(DEF_POSITION_FULL[player.defensivePosition!] ?? player.defensivePosition!).toUpperCase()}
              </span>
              {defAttrs.map(a => <AttrBar key={a.label} label={a.label} value={a.value} />)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '16px 18px' }}>
          <RatingProgression
            history={ratingHistory}
            teamColor={teamColor}
            ceiling={ratingCeiling}
            expected={ratingExpected}
          />
        </div>
      )}
    </div>
  )

  const rail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
      {identityPanel}
      {characterPanel}
      {trophies.length > 0 && (
        <TrophyCase entries={trophies} seasonsLabel={seasonsLabel} note={recordsNote} />
      )}
      {momentsPanel}
    </div>
  )

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      {/* Column count follows the plate count — a kicker has no defensive side, and
          a fixed three-column grid left him a visibly empty third of the row. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: veryNarrow
          ? '1fr'
          : `repeat(${player.defensivePosition ? 3 : 2}, minmax(0,1fr))`,
        gap: '12px',
      }}>
        {ratingPlate(
          'OVERALL', player.playerRating, player.ratingStars,
          seasonDelta == null || seasonDelta === 0
            ? 'Unchanged this season'
            : <span style={{ color: seasonDelta > 0 ? ACCENT.live : ACCENT.negative }}>
                {seasonDelta > 0 ? '▲' : '▼'} {Math.abs(seasonDelta)} this season
              </span>,
        )}
        {ratingPlate(
          'OFFENSE', player.offensiveRating, player.offensiveRatingStars,
          impactContext(player.seasonImpact?.offenseTier), <SwordGlyph />,
        )}
        {player.defensivePosition && ratingPlate(
          'DEFENSE', player.defensiveRating, player.defensiveRatingStars,
          impactContext(player.seasonImpact?.defenseTier), <ShieldGlyph />,
        )}
      </div>

      {(offAttrs.length > 0 || defAttrs.length > 0) && attrPanel}

      {player.isProspect ? (
        <div style={{ ...PANEL, padding: '22px 20px' }}>
          <span style={{ ...font(400, 12, 1.6), color: TEXT.muted }}>
            A prospect, drafted{player.draftClass ? ` in the Season ${player.draftClass} class` : ''}. No career
            numbers until he plays.
          </span>
        </div>
      ) : (
        <CareerTable
          title="CAREER STATS"
          columns={side === 'offense' ? (OFFENSE_COLUMNS[player.position] ?? OFFENSE_COLUMNS.WR) : DEFENSE_COLUMNS}
          rows={player.stats ?? []}
          career={player.allTimeStats}
          right={hasDefenseSide ? (
            <SegmentedControl
              options={[{ key: 'offense', label: offenseLabel }, { key: 'defense', label: 'DEFENSE' }]}
              value={side}
              onChange={key => setStatsSide(key as 'offense' | 'defense')}
            />
          ) : undefined}
        />
      )}
    </div>
  )

  return (
    <>
      {/* Context bar — where he sits, and the only rank the page states. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '13px 24px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`, fontFamily: FONT,
        flexWrap: 'wrap',
      }}>
        <Plate to="/players">
          <BackArrow />
          <span style={{ ...font(700, 11, 1, '0.06em'), color: TEXT.secondary }}>STATS</span>
        </Plate>
        <span style={{ width: '1px', height: '22px', background: BORDER.hairline }} />
        <span style={{ ...font(500, 12, 1.4), color: TEXT.muted }}>
          {standingSpec ? standingSpec.plural : 'Players'}
          {standing != null && ` · ranked ${ordinal(standing)} by ${standingSpec!.label}`}
        </span>
        <span style={{ flex: 1 }} />
        {user && playerId != null && (
          <Plate onClick={() => (isFollowing ? unfollowPlayer(playerId) : followPlayer(playerId))} active={isFollowing}>
            <span style={{ ...font(700, 11, 1, '0.06em'), color: isFollowing ? ACCENT.info : TEXT.secondary }}>
              {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
            </span>
          </Plate>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: narrow ? 'minmax(0,1fr)' : '340px minmax(0,1fr)',
        gap: '22px',
        padding: veryNarrow ? '16px 14px 28px' : '22px 24px 32px',
        alignItems: 'start',
        fontFamily: FONT,
      }}>
        {/* Narrow: identity leads, then the numbers, then the rest of the rail —
            the reading order the layout gives on a wide screen, stacked. */}
        {narrow ? (
          <>
            {identityPanel}
            {content}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              {characterPanel}
              {trophies.length > 0 && <TrophyCase entries={trophies} seasonsLabel={seasonsLabel} note={recordsNote} />}
              {momentsPanel}
            </div>
          </>
        ) : (
          <>
            {rail}
            {content}
          </>
        )}
      </div>
    </>
  )
}

export default PlayerPage
