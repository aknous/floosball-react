import { ACCENT, TEXT } from '@/Components/Shell/tokens'
import { statRampColor } from '@/utils/ratingColors'
import { W, type Column } from './statsShell'
import type { StatsPlayerRow, StatsTeamRow } from './statsTypes'

/**
 * Column sets. The shell never changes; only these do.
 *
 * ⚠️ Some columns the design asked for are NOT here, because the sim does not
 * record them and the handoff's own rule is to hide a column rather than ship a
 * table full of zeros:
 *
 *   receivers  AIR, SEP   — air yards and separation are computed per play and
 *                           discarded after broadcast; only the QB's air-yards
 *                           sum is banked to a season.
 *   defenders  FR, TD     — fumble recoveries and defensive touchdowns are not
 *                           in the per-player defensive blob.
 *   teams      1ST/G, 3RD%, PEN, TOP
 *                         — first downs, third-down conversions, penalties and
 *                           time of possession are not persisted per game.
 *
 * Everything else the handoff listed is real.
 */

const dash = '—'

const n = (v: any, digits = 0): string => {
  if (v == null || v === '') return dash
  const value = Number(v)
  if (!Number.isFinite(value)) return dash
  return digits > 0 ? value.toFixed(digits) : Math.round(value).toLocaleString()
}

const pct = (v: any): string => (v == null ? dash : `${Number(v).toFixed(1)}`)

/** Signed, and the only place a raw stat takes a colour. */
const signed = (v: any): string => {
  if (v == null) return dash
  const value = Number(v)
  return value > 0 ? `+${n(value)}` : n(value)
}
const signedTint = (v: any): string =>
  v == null || Number(v) === 0 ? TEXT.secondary : Number(v) > 0 ? ACCENT.live : ACCENT.negative

// ── Shared player columns ────────────────────────────────────────────────────

/**
 * ⚠️ GP is GONE from the season scope (owner) — every active player has played every
 * game, so the column was a wall of the same number. SEASONS survives on the career
 * scope, where it genuinely varies and is the denominator a reader wants.
 *
 * Returns null on the season scope; callers filter it out.
 */
const games = (careerScope: boolean): Column<StatsPlayerRow> | null => (careerScope
  ? {
    key: 'seasons', label: 'SEASONS', width: W.rate,
    cell: r => n(r.seasonsPlayed), sort: r => r.seasonsPlayed ?? 0,
  }
  : null)

const perf: Column<StatsPlayerRow> = {
  key: 'perf', label: 'PERF', width: W.rate,
  cell: r => n(r.impact.performanceRating),
  sort: r => r.impact.performanceRating ?? -1,
  tint: r => (r.impact.performanceRating != null ? statRampColor(r.impact.performanceRating) : undefined),
}

const defRating: Column<StatsPlayerRow> = {
  key: 'defrtg', label: 'DEF RTG', width: 62,
  cell: r => n(r.impact.defensiveRating),
  sort: r => r.impact.defensiveRating ?? -1,
  tint: r => (r.impact.defensiveRating != null ? statRampColor(r.impact.defensiveRating) : undefined),
}

/**
 * Win probability added, IN WINS.
 *
 * ⚠️ The stored figure is in PERCENTAGE POINTS — `floosball_game._resolvePlayWpa`
 * takes the swing as `newHomeWp - previousHomeWp` off a 0-100 win probability and
 * sums it over the season. So a season total arrives in the hundreds (measured on
 * prod: the season-12 leader at 679.2), which reads as a meaningless number: no
 * football WPA scale anywhere is quoted in percentage points.
 *
 * 100 points of accumulated swing is one full win's worth of leverage, so the
 * column divides by that and says so in its label. 679.2 becomes +6.8 wins, which
 * squares with the measured positional impact of a quarterback (+1.70 wins for a
 * ±12% rating swing).
 *
 * ⚠️ DISPLAY ONLY. The raw value stays raw everywhere else — `MVP_WPA_WEIGHT` and
 * the z-scores behind `mvpScore` consume it directly, and rescaling at the source
 * would silently move the MVP ballot.
 */
const WPA_POINTS_PER_WIN = 100

const wpa: Column<StatsPlayerRow> = {
  key: 'wpa', label: 'WPA WINS', width: W.wideRate,
  cell: r => (r.impact.wpa == null ? dash
    : signed((r.impact.wpa / WPA_POINTS_PER_WIN).toFixed(1))),
  // Sorted on the raw figure: dividing by a constant cannot change the order, and
  // sorting the rounded display value would tie rows that are not actually tied.
  sort: r => r.impact.wpa ?? 0,
  tint: r => signedTint(r.impact.wpa),
}

const points: Column<StatsPlayerRow> = {
  key: 'pts', label: 'PTS', width: W.volume,
  cell: r => n(r.fantasyPoints, 1), sort: r => r.fantasyPoints,
}

/** A mixed-position table cannot share a box score, so ALL gets a stat line. */
const statLine: Column<StatsPlayerRow> = {
  key: 'line', label: 'STAT LINE', width: 0, flexible: true,
  cell: r => {
    const p = r.passing, ru = r.rushing, rc = r.receiving, k = r.kicking
    if (r.position === 'QB') {
      const base = `${n(p.comp)}/${n(p.att)} · ${n(p.yards)} yd · ${n(p.tds)} TD`
      return p.ints ? `${base} · ${n(p.ints)} INT` : base
    }
    if (r.position === 'RB') return `${n(ru.carries)} car · ${n(ru.yards)} yd · ${n(ru.tds)} TD`
    if (r.position === 'K') return `${n(k.fgs)}/${n(k.fgAtt)} FG · ${n(k.longest)} yd`
    return `${n(rc.receptions)}/${n(rc.targets)} rec · ${n(rc.yards)} yd · ${n(rc.tds)} TD`
  },
}

/** Filters out the null `games` column, which the season scope no longer has. */
export function playerColumns(position: string, careerScope: boolean): Column<StatsPlayerRow>[] {
  return _playerColumns(position, careerScope).filter(Boolean) as Column<StatsPlayerRow>[]
}

function _playerColumns(position: string, careerScope: boolean): (Column<StatsPlayerRow> | null)[] {
  const gp = games(careerScope)

  if (['S', 'LB', 'CB', 'DE'].includes(position)) {
    return [
      gp,
      { key: 'tkl', label: 'TKL', width: 48, cell: r => n(r.defense.tackles), sort: r => r.defense.tackles ?? 0 },
      { key: 'tfl', label: 'TFL', width: W.count, cell: r => n(r.defense.tfl), sort: r => r.defense.tfl ?? 0 },
      { key: 'sack', label: 'SACK', width: 48, cell: r => n(r.defense.sacks), sort: r => r.defense.sacks ?? 0 },
      { key: 'int', label: 'INT', width: W.count, cell: r => n(r.defense.ints), sort: r => r.defense.ints ?? 0 },
      { key: 'pd', label: 'PD', width: W.count, cell: r => n(r.defense.passBreakups), sort: r => r.defense.passBreakups ?? 0 },
      { key: 'ff', label: 'FF', width: W.count, cell: r => n(r.defense.forcedFumbles), sort: r => r.defense.forcedFumbles ?? 0 },
      defRating,
      wpa,
    ]
  }

  switch (position) {
    case 'QB':
      return [
        gp,
        { key: 'cmp', label: 'CMP', width: 50, cell: r => n(r.passing.comp), sort: r => r.passing.comp ?? 0 },
        { key: 'att', label: 'ATT', width: 50, cell: r => n(r.passing.att), sort: r => r.passing.att ?? 0 },
        { key: 'cmppct', label: 'CMP%', width: W.rate, cell: r => pct(r.passing.compPerc), sort: r => r.passing.compPerc ?? 0 },
        { key: 'pyds', label: 'YDS', width: W.volume, cell: r => n(r.passing.yards), sort: r => r.passing.yards ?? 0 },
        { key: 'ptd', label: 'TD', width: W.count, cell: r => n(r.passing.tds), sort: r => r.passing.tds ?? 0 },
        { key: 'pint', label: 'INT', width: W.count, cell: r => n(r.passing.ints), sort: r => r.passing.ints ?? 0 },
        { key: 'sacked', label: 'SACK', width: 48, cell: r => n(r.passing.sacked), sort: r => r.passing.sacked ?? 0 },
        { key: 'air', label: 'AIR', width: W.rate, cell: r => n(r.passing.airYardsSum), sort: r => r.passing.airYardsSum ?? 0 },
        perf, wpa, points,
      ]
    case 'RB':
      return [
        gp,
        { key: 'car', label: 'CAR', width: 48, cell: r => n(r.rushing.carries), sort: r => r.rushing.carries ?? 0 },
        { key: 'ryds', label: 'YDS', width: W.volume, cell: r => n(r.rushing.yards), sort: r => r.rushing.yards ?? 0 },
        { key: 'ypc', label: 'YPC', width: W.rate, cell: r => n(r.rushing.ypc, 1), sort: r => r.rushing.ypc ?? 0 },
        { key: 'rtd', label: 'TD', width: W.count, cell: r => n(r.rushing.tds), sort: r => r.rushing.tds ?? 0 },
        { key: 'fum', label: 'FUM', width: W.count, cell: r => n(r.rushing.fumblesLost), sort: r => r.rushing.fumblesLost ?? 0 },
        { key: 'rec', label: 'REC', width: W.count, cell: r => n(r.receiving.receptions), sort: r => r.receiving.receptions ?? 0 },
        { key: 'recyds', label: 'RECYDS', width: 62, cell: r => n(r.receiving.yards), sort: r => r.receiving.yards ?? 0 },
        perf, wpa, points,
      ]
    case 'K':
      return [
        gp,
        { key: 'fgm', label: 'FGM', width: 48, cell: r => n(r.kicking.fgs), sort: r => r.kicking.fgs ?? 0 },
        { key: 'fga', label: 'FGA', width: 48, cell: r => n(r.kicking.fgAtt), sort: r => r.kicking.fgAtt ?? 0 },
        { key: 'fgpct', label: 'FG%', width: W.rate, cell: r => pct(r.kicking.fgPerc), sort: r => r.kicking.fgPerc ?? 0 },
        { key: 'klng', label: 'LNG', width: W.count, cell: r => n(r.kicking.longest), sort: r => r.kicking.longest ?? 0 },
        { key: 'xpm', label: 'XPM', width: W.count, cell: r => n(r.kicking.xps), sort: r => r.kicking.xps ?? 0 },
        { key: 'xpa', label: 'XPA', width: W.count, cell: r => n(r.kicking.xpAtt), sort: r => r.kicking.xpAtt ?? 0 },
        perf, points,
      ]
    case 'WR':
    case 'TE':
      return [
        gp,
        { key: 'rec', label: 'REC', width: W.count, cell: r => n(r.receiving.receptions), sort: r => r.receiving.receptions ?? 0 },
        { key: 'tgt', label: 'TGT', width: W.count, cell: r => n(r.receiving.targets), sort: r => r.receiving.targets ?? 0 },
        { key: 'rcvpct', label: 'RCV%', width: W.rate, cell: r => pct(r.receiving.rcvPerc), sort: r => r.receiving.rcvPerc ?? 0 },
        { key: 'ryds', label: 'YDS', width: W.volume, cell: r => n(r.receiving.yards), sort: r => r.receiving.yards ?? 0 },
        { key: 'ypr', label: 'YPR', width: W.rate, cell: r => n(r.receiving.ypr, 1), sort: r => r.receiving.ypr ?? 0 },
        { key: 'yac', label: 'YAC', width: W.rate, cell: r => n(r.receiving.yac), sort: r => r.receiving.yac ?? 0 },
        { key: 'drp', label: 'DRP', width: W.count, cell: r => n(r.receiving.drops), sort: r => r.receiving.drops ?? 0 },
        { key: 'lng', label: 'LNG', width: W.count, cell: r => n(r.receiving.longest), sort: r => r.receiving.longest ?? 0 },
        { key: 'rtd', label: 'TD', width: W.count, cell: r => n(r.receiving.tds), sort: r => r.receiving.tds ?? 0 },
        perf, wpa, points,
      ]
    default:
      return [gp, perf, wpa, points, statLine]
  }
}

/** The column a position sorts by until the reader says otherwise. */
export const DEFAULT_SORT: Record<string, string> = {
  ALL: 'pts', QB: 'pyds', RB: 'ryds', WR: 'ryds', TE: 'ryds', K: 'fgm',
  S: 'tkl', LB: 'tkl', CB: 'int', DE: 'sack',
}

// ── Teams ────────────────────────────────────────────────────────────────────

export function teamColumns(side: 'offense' | 'defense', perGame: boolean): Column<StatsTeamRow>[] {
  if (side === 'defense') {
    return [
      { key: 'pa', label: 'PA', width: 48, cell: r => n(r.defense.pointsAgainst), sort: r => r.defense.pointsAgainst, lowerIsBetter: true },
      { key: 'pag', label: perGame ? 'PA/G' : 'PA', width: W.rate, cell: r => n(r.defense.pointsAllowed, 1), sort: r => r.defense.pointsAllowed, lowerIsBetter: true },
      { key: 'ydsg', label: perGame ? 'YDS/G' : 'YDS', width: W.volume, cell: r => n(r.defense.yardsAllowed, 1), sort: r => r.defense.yardsAllowed, lowerIsBetter: true },
      { key: 'passg', label: perGame ? 'PASS/G' : 'PASS', width: W.volume, cell: r => n(r.defense.passYardsAllowed, 1), sort: r => r.defense.passYardsAllowed, lowerIsBetter: true },
      { key: 'rushg', label: perGame ? 'RUSH/G' : 'RUSH', width: W.volume, cell: r => n(r.defense.rushYardsAllowed, 1), sort: r => r.defense.rushYardsAllowed, lowerIsBetter: true },
      { key: 'sack', label: 'SACK', width: 48, cell: r => n(r.defense.sacks), sort: r => r.defense.sacks },
      { key: 'int', label: 'INT', width: W.count, cell: r => n(r.defense.ints), sort: r => r.defense.ints },
      { key: 'fr', label: 'FR', width: W.count, cell: r => n(r.defense.fumbleRecoveries), sort: r => r.defense.fumbleRecoveries },
      { key: 'take', label: 'TAKE', width: W.rate, cell: r => n(r.defense.takeaways), sort: r => r.defense.takeaways },
      {
        key: 'margin', label: 'MARGIN', width: 62,
        cell: r => signed(r.defense.turnoverMargin), sort: r => r.defense.turnoverMargin,
        tint: r => signedTint(r.defense.turnoverMargin),
      },
    ]
  }
  return [
    { key: 'pf', label: 'PF', width: 48, cell: r => n(r.offense.pointsFor), sort: r => r.offense.pointsFor },
    { key: 'ppg', label: perGame ? 'PPG' : 'PTS', width: W.rate, cell: r => n(r.offense.points, 1), sort: r => r.offense.points },
    { key: 'ydsg', label: perGame ? 'YDS/G' : 'YDS', width: W.volume, cell: r => n(r.offense.totalYards, 1), sort: r => r.offense.totalYards },
    { key: 'passg', label: perGame ? 'PASS/G' : 'PASS', width: W.volume, cell: r => n(r.offense.passYards, 1), sort: r => r.offense.passYards },
    { key: 'rushg', label: perGame ? 'RUSH/G' : 'RUSH', width: W.volume, cell: r => n(r.offense.rushYards, 1), sort: r => r.offense.rushYards },
    { key: 'td', label: perGame ? 'TD/G' : 'TD', width: W.rate, cell: r => n(r.offense.touchdowns, perGame ? 1 : 0), sort: r => r.offense.touchdowns },
    { key: 'fg', label: perGame ? 'FG/G' : 'FG', width: W.rate, cell: r => n(r.offense.fieldGoals, perGame ? 1 : 0), sort: r => r.offense.fieldGoals },
    { key: 'to', label: 'TO', width: W.count, cell: r => n(r.offense.turnovers), sort: r => r.offense.turnovers, lowerIsBetter: true },
    { key: 'sk', label: 'SK ALW', width: 62, cell: r => n(r.offense.sacksAllowed), sort: r => r.offense.sacksAllowed, lowerIsBetter: true },
    {
      key: 'diff', label: 'DIFF', width: W.rate,
      cell: r => signed(r.differential), sort: r => r.differential,
      tint: r => signedTint(r.differential),
    },
  ]
}

export const TEAM_DEFAULT_SORT = { offense: 'ydsg', defense: 'ydsg' } as const
