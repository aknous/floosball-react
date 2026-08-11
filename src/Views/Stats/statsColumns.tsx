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
/**
 * A signed figure, to `digits` decimal places.
 *
 * ⚠️ IT TAKES `digits` BECAUSE IT USED NOT TO, and that quietly discarded every
 * decimal its callers formatted. `n()` rounds to a whole number unless told otherwise,
 * so a cell that carefully produced "2.06" had it re-parsed and rounded straight back
 * to "+2". The WPA wins column had been shipping whole wins the entire time while its
 * own code said `.toFixed(1)`.
 *
 * Rounds BEFORE testing the sign, so a value that displays as zero is not handed a
 * "+" or a "-" it does not deserve.
 */
const signed = (v: any, digits = 0): string => {
  if (v == null) return dash
  const value = Number(v)
  if (!Number.isFinite(value)) return dash
  const rounded = Number(value.toFixed(digits))
  return rounded > 0 ? `+${n(rounded, digits)}` : n(rounded, digits)
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
    key: 'seasons', label: 'SEASONS', help: 'Seasons played in the league', width: W.rate,
    cell: r => n(r.seasonsPlayed), sort: r => r.seasonsPlayed ?? 0,
  }
  : null)

/**
 * What the player IS, next to PERF's what-they-DID.
 *
 * ⚠️ A COLUMN, not just the stars in the lead cell (owner: the table had no way to sort
 * by rating). Lead cells carry identity and take no sort, so the rating was visible on
 * every row and orderable on none — and "who are the best players here" is the first
 * question a stats table gets asked. The stars stay where they are; this is the number
 * behind them.
 *
 * Same 60-100 scale and the same ramp as PERF, deliberately: sitting them together is
 * what turns two numbers into a reading — a high rating over a low PERF is a player not
 * producing what they should.
 */
const rating: Column<StatsPlayerRow> = {
  key: 'rtg', label: 'RTG', help: 'Player Rating', width: W.rate,
  cell: r => n(r.playerRating),
  sort: r => r.playerRating ?? -1,
  tint: r => (r.playerRating != null ? statRampColor(r.playerRating) : undefined),
}

/**
 * aDOT — how far downfield this passer aims, on average.
 *
 * ⚠️ `airYardsSum` IS A SUM, and this column was printing it raw under a label that has
 * always meant an average: a season read 1,788 where the answer is 6.25. Reported as
 * "the numbers are in the thousands".
 *
 * Divided by THROWS, matching how the sim derives aDOT for cards
 * (`cardEffects.ladderStatLine`). Throws and attempts differ by a handful a season — a
 * scramble un-charges the attempt booked at the top of the branch — so `att` is the
 * fallback for a row banked before the counter existed, not the preference.
 */
const aDot = (r: StatsPlayerRow): number | null => {
  const air = r.passing.airYardsSum
  const throws = r.passing.throws ?? r.passing.att
  if (air == null || !throws) return null
  return Number(air) / Number(throws)
}

const perf: Column<StatsPlayerRow> = {
  key: 'perf', label: 'PERF', help: 'Performance Rating', width: W.rate,
  cell: r => n(r.impact.performanceRating),
  sort: r => r.impact.performanceRating ?? -1,
  tint: r => (r.impact.performanceRating != null ? statRampColor(r.impact.performanceRating) : undefined),
}

const defRating: Column<StatsPlayerRow> = {
  key: 'defrtg', label: 'DEF RTG', help: 'Defensive Rating', width: 62,
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
 * column divides by that and says so in its label. 679.2 becomes +6.79 wins, which
 * squares with the measured positional impact of a quarterback (+1.70 wins for a
 * ±12% rating swing).
 *
 * ⚠️ TWO decimals (owner). Dividing by 100 costs two orders of magnitude, so a single
 * decimal binned everyone into tenths of a win and left most of the table looking
 * tied. The precision is real rather than invented: the server stores this rounded to
 * 2dp in POINTS, which is 0.0001 of a win, so two decimals here sits well inside what
 * was actually measured.
 *
 * ⚠️ DISPLAY ONLY. The raw value stays raw everywhere else — `MVP_WPA_WEIGHT` and
 * the z-scores behind `mvpScore` consume it directly, and rescaling at the source
 * would silently move the MVP ballot.
 */
const WPA_POINTS_PER_WIN = 100

const wpa: Column<StatsPlayerRow> = {
  key: 'wpa', label: 'WPA WINS', help: 'Wins Added', width: W.wideRate,
  cell: r => (r.impact.wpa == null ? dash
    : signed(r.impact.wpa / WPA_POINTS_PER_WIN, 2)),
  // Sorted on the raw figure: dividing by a constant cannot change the order, and
  // sorting the rounded display value would tie rows that are not actually tied.
  sort: r => r.impact.wpa ?? 0,
  tint: r => signedTint(r.impact.wpa),
}

/**
 * Per-game division, and the rule for what may take it.
 *
 * ⚠️ ONLY COUNTING STATS DIVIDE. A rate is already per something (YPC, CMP%, YPR, and
 * AIR — average air yards per throw); a maximum is not a total (LNG is the single
 * longest, and a longest-per-game is not a quantity); a rating is a percentile.
 * Dividing any of those yields a number that looks like a stat and means nothing. The
 * distinction lives here because this file is the only place that knows which is which.
 *
 * WPA stays a season figure as well: that column already converts points of swing into
 * WINS, and a per-game slice of it is hundredths of a win for everybody.
 */
const perGameOf = (perGame: boolean) => (value: any, row: StatsPlayerRow) => {
  if (value == null) return null
  if (!perGame) return Number(value)
  const games = row.gamesPlayed || 0
  // No games played is not an average of zero, it is no average — `n()` prints a dash.
  return games > 0 ? Number(value) / games : null
}

/** A counting stat needs a decimal once it is an average. */
const countDigits = (perGame: boolean) => (perGame ? 1 : 0)
const perGameLabel = (label: string, perGame: boolean) => (perGame ? `${label}/G` : label)

const pointsColumn = (perGame: boolean): Column<StatsPlayerRow> => {
  const per = perGameOf(perGame)
  return {
    key: 'pts',
    label: perGame ? 'FP/G' : 'PTS',
    help: perGame ? 'Fantasy Points Per Game' : 'Fantasy Points',
    width: W.volume,
    cell: r => n(per(r.fantasyPoints, r), 1),
    sort: r => per(r.fantasyPoints, r) ?? 0,
  }
}

/** A mixed-position table cannot share a box score, so ALL gets a stat line. */
const statLineColumn = (perGame: boolean): Column<StatsPlayerRow> => {
  const per = perGameOf(perGame)
  const d = countDigits(perGame)
  return {
    key: 'line',
    label: perGame ? 'STAT LINE / G' : 'STAT LINE',
    help: 'The headline numbers for this position',
    width: 0,
    flexible: true,
    cell: r => {
      const p = r.passing, ru = r.rushing, rc = r.receiving, k = r.kicking
      const v = (x: any) => n(per(x, r), d)
      if (r.position === 'QB') {
        const base = `${v(p.comp)}/${v(p.att)} \u00b7 ${v(p.yards)} yd \u00b7 ${v(p.tds)} TD`
        return p.ints ? `${base} \u00b7 ${v(p.ints)} INT` : base
      }
      if (r.position === 'RB') return `${v(ru.carries)} car \u00b7 ${v(ru.yards)} yd \u00b7 ${v(ru.tds)} TD`
      // LNG is a maximum, so it stays whole in both modes.
      if (r.position === 'K') return `${v(k.fgs)}/${v(k.fgAtt)} FG \u00b7 ${n(k.longest)} yd`
      return `${v(rc.receptions)}/${v(rc.targets)} rec \u00b7 ${v(rc.yards)} yd \u00b7 ${v(rc.tds)} TD`
    },
  }
}

/** Filters out the null `games` column, which the season scope no longer has. */
export function playerColumns(position: string, careerScope: boolean,
                              perGame = false): Column<StatsPlayerRow>[] {
  return _playerColumns(position, careerScope, perGame)
    .filter(Boolean) as Column<StatsPlayerRow>[]
}

function _playerColumns(position: string, careerScope: boolean,
                        perGame: boolean): (Column<StatsPlayerRow> | null)[] {
  const gp = games(careerScope)
  const per = perGameOf(perGame)
  const d = countDigits(perGame)
  const L = (label: string) => perGameLabel(label, perGame)
  const points = pointsColumn(perGame)

  /** A counting stat: divides per game, and gains a decimal when it does. */
  const count = (key: string, label: string, help: string, width: number,
                 get: (r: StatsPlayerRow) => any): Column<StatsPlayerRow> => ({
    key, label: L(label), help, width,
    cell: r => n(per(get(r), r), d),
    sort: r => per(get(r), r) ?? 0,
  })

  if (['S', 'LB', 'CB', 'DE'].includes(position)) {
    return [
      gp,
      count('tkl', 'TKL', 'Tackles', 48, r => r.defense.tackles),
      count('tfl', 'TFL', 'Tackles for loss, made behind the line of scrimmage', W.count, r => r.defense.tfl),
      count('sack', 'SACK', 'Sacks', 48, r => r.defense.sacks),
      count('int', 'INT', 'Interceptions', W.count, r => r.defense.ints),
      count('pd', 'PD', 'Passes defended, broken up without intercepting', W.count, r => r.defense.passBreakups),
      count('ff', 'FF', 'Forced fumbles', W.count, r => r.defense.forcedFumbles),
      rating,
      defRating,
      wpa,
    ]
  }

  switch (position) {
    case 'QB':
      return [
        gp,
        count('cmp', 'CMP', 'Completions', 50, r => r.passing.comp),
        count('att', 'ATT', 'Pass attempts', 50, r => r.passing.att),
        { key: 'cmppct', label: 'CMP%', help: 'Completion percentage', width: W.rate, cell: r => pct(r.passing.compPerc), sort: r => r.passing.compPerc ?? 0 },
        count('pyds', 'YDS', 'Passing yards', W.volume, r => r.passing.yards),
        count('ptd', 'TD', 'Passing touchdowns', W.count, r => r.passing.tds),
        count('pint', 'INT', 'Interceptions thrown', W.count, r => r.passing.ints),
        count('sacked', 'SACK', 'Times sacked', 48, r => r.passing.sacked),
        { key: 'air', label: 'AIR', help: 'Average Air Yards Per Throw', width: W.rate, cell: r => n(aDot(r), 1), sort: r => aDot(r) ?? -1 },
        rating, perf, wpa, points,
      ]
    case 'RB':
      return [
        gp,
        count('car', 'CAR', 'Carries', 48, r => r.rushing.carries),
        count('ryds', 'YDS', 'Yards', W.volume, r => r.rushing.yards),
        { key: 'ypc', label: 'YPC', help: 'Yards per carry', width: W.rate, cell: r => n(r.rushing.ypc, 1), sort: r => r.rushing.ypc ?? 0 },
        count('rtd', 'TD', 'Touchdowns', W.count, r => r.rushing.tds),
        count('fum', 'FUM', 'Fumbles', W.count, r => r.rushing.fumblesLost),
        count('rec', 'REC', 'Receptions', W.count, r => r.receiving.receptions),
        count('recyds', 'RECYDS', 'Receiving yards', 62, r => r.receiving.yards),
        rating, perf, wpa, points,
      ]
    case 'K':
      return [
        gp,
        count('fgm', 'FGM', 'Field goals made', 48, r => r.kicking.fgs),
        count('fga', 'FGA', 'Field goals attempted', 48, r => r.kicking.fgAtt),
        { key: 'fgpct', label: 'FG%', help: 'Field goal percentage', width: W.rate, cell: r => pct(r.kicking.fgPerc), sort: r => r.kicking.fgPerc ?? 0 },
        { key: 'klng', label: 'LNG', help: 'Longest field goal made', width: W.count, cell: r => n(r.kicking.longest), sort: r => r.kicking.longest ?? 0 },
        count('xpm', 'XPM', 'Extra points made', W.count, r => r.kicking.xps),
        count('xpa', 'XPA', 'Extra points attempted', W.count, r => r.kicking.xpAtt),
        rating, perf, points,
      ]
    case 'WR':
    case 'TE':
      return [
        gp,
        count('rec', 'REC', 'Receptions', W.count, r => r.receiving.receptions),
        count('tgt', 'TGT', 'Times targeted', W.count, r => r.receiving.targets),
        { key: 'rcvpct', label: 'RCV%', help: 'Catch rate, receptions as a share of targets', width: W.rate, cell: r => pct(r.receiving.rcvPerc), sort: r => r.receiving.rcvPerc ?? 0 },
        count('ryds', 'YDS', 'Yards', W.volume, r => r.receiving.yards),
        { key: 'ypr', label: 'YPR', help: 'Yards per reception', width: W.rate, cell: r => n(r.receiving.ypr, 1), sort: r => r.receiving.ypr ?? 0 },
        count('yac', 'YAC', 'Yards after the catch', W.rate, r => r.receiving.yac),
        count('drp', 'DRP', 'Drops', W.count, r => r.receiving.drops),
        { key: 'lng', label: 'LNG', help: 'Longest reception', width: W.count, cell: r => n(r.receiving.longest), sort: r => r.receiving.longest ?? 0 },
        count('rtd', 'TD', 'Touchdowns', W.count, r => r.receiving.tds),
        rating, perf, wpa, points,
      ]
    default:
      return [gp, rating, perf, wpa, points, statLineColumn(perGame)]
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
      { key: 'pa', label: 'PA', help: 'Points allowed', width: 48, cell: r => n(r.defense.pointsAgainst), sort: r => r.defense.pointsAgainst, lowerIsBetter: true },
      { key: 'pag', label: perGame ? 'PA/G' : 'PA', width: W.rate, cell: r => n(r.defense.pointsAllowed, 1), sort: r => r.defense.pointsAllowed, lowerIsBetter: true },
      { key: 'ydsg', label: perGame ? 'YDS/G' : 'YDS', width: W.volume, cell: r => n(r.defense.yardsAllowed, 1), sort: r => r.defense.yardsAllowed, lowerIsBetter: true },
      { key: 'passg', label: perGame ? 'PASS/G' : 'PASS', width: W.volume, cell: r => n(r.defense.passYardsAllowed, 1), sort: r => r.defense.passYardsAllowed, lowerIsBetter: true },
      { key: 'rushg', label: perGame ? 'RUSH/G' : 'RUSH', width: W.volume, cell: r => n(r.defense.rushYardsAllowed, 1), sort: r => r.defense.rushYardsAllowed, lowerIsBetter: true },
      { key: 'sack', label: 'SACK', help: 'Sacks', width: 48, cell: r => n(r.defense.sacks), sort: r => r.defense.sacks },
      { key: 'int', label: 'INT', help: 'Interceptions', width: W.count, cell: r => n(r.defense.ints), sort: r => r.defense.ints },
      { key: 'fr', label: 'FR', help: 'Fumbles recovered', width: W.count, cell: r => n(r.defense.fumbleRecoveries), sort: r => r.defense.fumbleRecoveries },
      { key: 'take', label: 'TAKE', help: 'Takeaways, interceptions plus fumble recoveries', width: W.rate, cell: r => n(r.defense.takeaways), sort: r => r.defense.takeaways },
      {
        key: 'margin', label: 'MARGIN', help: 'Turnover margin, takeaways minus giveaways', width: 62,
        cell: r => signed(r.defense.turnoverMargin), sort: r => r.defense.turnoverMargin,
        tint: r => signedTint(r.defense.turnoverMargin),
      },
    ]
  }
  return [
    { key: 'pf', label: 'PF', help: 'Points scored', width: 48, cell: r => n(r.offense.pointsFor), sort: r => r.offense.pointsFor },
    { key: 'ppg', label: perGame ? 'PPG' : 'PTS', width: W.rate, cell: r => n(r.offense.points, 1), sort: r => r.offense.points },
    { key: 'ydsg', label: perGame ? 'YDS/G' : 'YDS', width: W.volume, cell: r => n(r.offense.totalYards, 1), sort: r => r.offense.totalYards },
    { key: 'passg', label: perGame ? 'PASS/G' : 'PASS', width: W.volume, cell: r => n(r.offense.passYards, 1), sort: r => r.offense.passYards },
    { key: 'rushg', label: perGame ? 'RUSH/G' : 'RUSH', width: W.volume, cell: r => n(r.offense.rushYards, 1), sort: r => r.offense.rushYards },
    { key: 'td', label: perGame ? 'TD/G' : 'TD', width: W.rate, cell: r => n(r.offense.touchdowns, perGame ? 1 : 0), sort: r => r.offense.touchdowns },
    { key: 'fg', label: perGame ? 'FG/G' : 'FG', width: W.rate, cell: r => n(r.offense.fieldGoals, perGame ? 1 : 0), sort: r => r.offense.fieldGoals },
    { key: 'to', label: 'TO', help: 'Turnovers given away', width: W.count, cell: r => n(r.offense.turnovers), sort: r => r.offense.turnovers, lowerIsBetter: true },
    { key: 'sk', label: 'SK ALW', help: 'Sacks allowed by this offence', width: 62, cell: r => n(r.offense.sacksAllowed), sort: r => r.offense.sacksAllowed, lowerIsBetter: true },
    {
      key: 'diff', label: 'DIFF', help: 'Point differential, points scored minus points allowed', width: W.rate,
      cell: r => signed(r.differential), sort: r => r.differential,
      tint: r => signedTint(r.differential),
    },
  ]
}

export const TEAM_DEFAULT_SORT = { offense: 'ydsg', defense: 'ydsg' } as const
