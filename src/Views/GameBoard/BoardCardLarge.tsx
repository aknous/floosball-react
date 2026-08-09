import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { lastPlaySummary, downAndDistance } from './lastPlaySummary'
import { periodColumns, FormatClock, FormatScore, leadingSide } from './gameFormat'
import type { ScoringModel } from '@/utils/displayScore'
import {
  Crest, MomentumFlame, InterestChip, SectionLabel, SplitBar,
  CHIP_COLOR, inRedZone, RED_ZONE, type ChipKind,
} from './boardPieces'

/** Footer containers: a panel, its cells, and the rule between them. Defined once so
 *  the two panels cannot drift apart in padding or height. */
const PANEL: React.CSSProperties = {
  background: BG.panel,
  border: `1px solid ${BORDER.hairline}`,
  padding: '0 11px',
  minHeight: '34px',
  boxSizing: 'border-box',
}
const CELL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 9px',
}
const RULE: React.CSSProperties = {
  width: '1px',
  alignSelf: 'stretch',
  margin: '8px 0',
  background: BORDER.hairline,
  flexShrink: 0,
}

/**
 * LARGE density: two across, full detail. ~586px wide, ~300px tall, so 16 games scroll
 * by design.
 *
 * ⚠️ The quarter/TOT header cluster and the team rows' value cluster MUST share their
 * gaps and widths exactly. They drifted apart in review and the labels stopped sitting
 * over their values, so they are defined once below and spread into both — change a
 * width or a gap here and BOTH move together.
 */

const CLUSTER = { display: 'flex', alignItems: 'center', gap: '14px' } as const
const QUARTERS = { display: 'flex', gap: '10px' } as const
const QUARTER_CELL = { width: '26px', textAlign: 'center' as const, ...TABULAR }
const TOTAL_CELL = { width: '48px', textAlign: 'right' as const, ...TABULAR }

type Props = {
  game: CurrentGame
  chip: ChipKind | null
  pinned: boolean
  pinnedAccent: string
  scoringModel: ScoringModel
  onOpen: (id: number) => void
}

const BoardCardLarge: React.FC<Props> = ({ game, chip, pinned, pinnedAccent, scoringModel, onOpen }) => {
  const live = game.status === 'Active'
  const isFinal = game.status === 'Final'
  const home = game.homeTeam
  const away = game.awayTeam

  const homeScore = game.homeScore ?? 0
  const awayScore = game.awayScore ?? 0
  // Who is ahead is a FORMAT question — in frames it is frames won, not points.
  const leader = leadingSide(game)
  const homeAhead = leader !== 'away'
  const awayAhead = leader !== 'home'

  // Fills use the raw colour; only text gets corrected.
  const awayFill = effectiveAwayColor(home?.color, away?.color, away?.secondaryColor)
  const homeFill = home?.color || '#64748b'
  const awayText = readableTeamColor(awayFill)
  const homeText = readableTeamColor(homeFill)

  const homeWp = Math.round(game.homeWinProbability ?? 50)
  const awayWp = 100 - homeWp

  // The last play as structure, not prose — see lastPlaySummary for why.
  const lastPlay = lastPlaySummary(game)

  const redZone = inRedZone(game)
  // Derived, NOT game.downText — that field is REST-only and freezes.
  const downText = downAndDistance(game)
  // A score leaves the down and the spot holding pre-score values until the
  // next drive starts, so the row shows only the clock through that gap.
  const situationLive = !lastPlay?.afterScore



  const accent = pinned ? pinnedAccent : chip ? CHIP_COLOR[chip] : BORDER.hairline
  const possessionTeam = game.homeTeamPoss ? 'home' : game.awayTeamPoss ? 'away' : null
  const momentumMagnitude = Math.abs(game.momentum ?? 0)

  // The period columns this format actually has: quarters for most, the innings line
  // score for innings, none at all for frames.
  const columns = periodColumns(game)

  const teamRow = (
    side: 'away' | 'home',
    team: typeof home,
    score: number,
    ahead: boolean,
  ) => {
    const hasMomentum = live && momentumMagnitude > 0 && game.momentumTeam === team?.abbr
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Crest teamId={team?.id} size={36} possession={live && possessionTeam === side} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...font(500, 13), color: TEXT.muted, whiteSpace: 'nowrap' }}>{team?.city}</span>
            <span style={{ ...font(500, 12), color: TEXT.muted, ...TABULAR }}>{team?.record}</span>
            {hasMomentum && <MomentumFlame magnitude={momentumMagnitude} size={14} />}
          </div>
          <div style={{
            ...font(ahead ? 800 : 600, 21, 1, '-0.02em'),
            color: ahead ? TEXT.primary : TEXT.muted,
            marginTop: '3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team?.name}</div>
        </div>
        <div style={CLUSTER}>
          {columns && (
            <div style={QUARTERS}>
              {columns.periods.map((period, i) => {
                // In frames the side that TOOK the frame is what matters, not the points —
                // so the winner is lit and the loser reads as background, which is the
                // opposite emphasis to a quarter score.
                const tookIt = side === 'home' ? period.homeWon : period.awayWon
                const isFrames = period.homeWon !== undefined
                return (
                  <span key={period.label} style={{
                    ...QUARTER_CELL,
                    ...font(isFrames ? (tookIt ? 800 : 400) : period.played ? 600 : 400, 18),
                    color: !period.played ? TEXT.dim
                      : isFrames ? (tookIt ? ACCENT.live : TEXT.dim)
                        : game.quarter === i + 1 && live ? TEXT.strong : TEXT.secondary,
                  }}>{side === 'home' ? period.homeValue : period.awayValue}</span>
                )
              })}
            </div>
          )}
          {columns && <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />}
          <span style={{ ...TOTAL_CELL, display: 'inline-flex', justifyContent: 'flex-end' }}>
            <FormatScore
              game={game}
              side={side}
              scoringModel={scoringModel}
              size={34}
              color={ahead ? TEXT.primary : TEXT.muted}
            />
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="plate"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(game.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(game.id) } }}
      style={{
        boxSizing: 'border-box',
        background: pinned ? BG.cardOwn : BG.card,
        border: `1px solid ${pinned ? BORDER.raised : BORDER.hairline}`,
        borderTop: `2px solid ${accent}`,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        cursor: 'pointer',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '20px' }}>
        {/* ⚠️ The running clock is NOT here — it moved down to the situation row
            (owner), where the quarter, the down, the spot and the red zone read
            as one line. Duplicating it in both places is the same number twice.
            The states that are not a running clock stay: they are the card's
            status, and they have no situation row to live in (a final replaces
            that row with team stats, and halftime suppresses it). */}
        {isFinal ? (
          <span style={{ ...font(700, 12, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>FINAL</span>
        ) : live ? (
          game.isHalftime
            ? <span style={{ ...font(700, 12, 1, '0.08em'), color: ACCENT.live, ...TABULAR }}>HALFTIME</span>
            : null
        ) : (
          <span style={{ ...font(700, 12, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>SCHEDULED</span>
        )}
        {chip && <InterestChip kind={chip} size="large" />}
        {/* No format badge here (owner). The board's rules strip already names the active
            format once, at the top — repeating it on all sixteen cards is noise, and the
            column headers below already show what changed. */}
        <span style={{ flex: 1 }} />
        <div style={CLUSTER}>
          {columns && (
            <div style={QUARTERS}>
              {columns.periods.map(period => (
                <span key={period.label} style={{ ...QUARTER_CELL, ...font(600, 12), color: TEXT.muted }}>
                  {period.label}
                </span>
              ))}
            </div>
          )}
          {columns && <span style={{ width: '1px', height: '16px', background: BORDER.hairline }} />}
          <span style={{ ...TOTAL_CELL, ...font(600, 11, 1, '0.08em'), color: TEXT.muted }}>
            {columns ? columns.label : 'TOT'}
          </span>
        </div>
      </div>

      {teamRow('away', away, awayScore, awayAhead)}
      {teamRow('home', home, homeScore, homeAhead)}

      {/* ⚠️ A FINAL card stops at the score (owner). Everything below the team
          rows is a LIVE readout — the win-probability gauge resolves to 100/0
          the moment a game ends, and the leader line and team-stat table that
          replaced it were reinstating a footer the reader did not ask for.
          Finals live in their own section now, so they are uniformly compact
          and read as a results list rather than sixteen half-empty cards. */}
      {!isFinal && (
        <div style={{ paddingTop: '14px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {/* Just the gauge (owner): the swing trend line came out. Both sides carry
              their own percentage, so the bar is read against two labelled numbers
              rather than one favoured side and a sparkline. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ ...font(awayWp > homeWp ? 800 : 600, 14), color: awayText, ...TABULAR, whiteSpace: 'nowrap' }}>
              {away?.abbr} {awayWp}%
            </span>
            <SplitBar awayPct={awayWp} awayColor={awayFill} homeColor={homeFill} height={6} />
            <span style={{ ...font(homeWp > awayWp ? 800 : 600, 14), color: homeText, ...TABULAR, whiteSpace: 'nowrap' }}>
              {homeWp}% {home?.abbr}
            </span>
          </div>
        </div>
      )}

      {/* ⚠️ Two CONTAINERS, not one run of text (owner). The last play and the
          current situation are separate thoughts that happened to share a row,
          and floating them either side of a flex spacer read as one disorganised
          sentence. Each gets a panel; inside the right-hand one the fields are
          divided by rules rather than middots, which is the same idiom as the
          quarter cluster at the top of the card and makes it read as one
          instrument instead of three loose numbers. */}
      {!isFinal && (
        <div style={{
          paddingTop: '13px', borderTop: `1px solid ${BORDER.hairline}`,
          display: 'flex', alignItems: 'stretch', gap: '10px', minWidth: 0,
        }}>
          <div style={{
            ...PANEL, flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <SectionLabel>LAST PLAY</SectionLabel>
            {lastPlay ? (
              /* ⚠️ CENTER, not baseline. The row mixes 10-15px type with a
                 bordered tag whose baseline sits inside its own padding, so on a
                 baseline row the chip and the numbers never agreed. Every span
                 below also pins lineHeight to 1 — an unset line box is ~1.2x the
                 font size and differs per span, which shifts the centre of each
                 item by a different amount. */
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                {lastPlay.teamAbbr && (
                  <span style={{
                    ...font(700, 12, 1, '0.04em'),
                    color: lastPlay.teamAbbr === away?.abbr ? awayText : homeText,
                    ...TABULAR,
                  }}>{lastPlay.teamAbbr}</span>
                )}
                <span style={{ ...font(700, 14, 1, '0.02em'), color: TEXT.secondary, whiteSpace: 'nowrap' }}>
                  {lastPlay.action}
                </span>
                {lastPlay.yards != null && (
                  <span style={{
                    ...font(800, 15, 1), ...TABULAR, whiteSpace: 'nowrap',
                    color: lastPlay.yards < 0 ? ACCENT.negative : TEXT.primary,
                  }}>
                    {lastPlay.unsigned || lastPlay.yards <= 0 ? lastPlay.yards : `+${lastPlay.yards}`}
                    <span style={{ ...font(500, 11, 1), color: TEXT.muted }}> YD</span>
                  </span>
                )}
                {lastPlay.tag && (
                  <span style={{
                    ...font(700, 10, 1, '0.08em'), color: lastPlay.tagColor,
                    border: `1px solid ${lastPlay.tagColor}59`, padding: '3px 6px',
                    whiteSpace: 'nowrap',
                  }}>{lastPlay.tag}</span>
                )}
              </div>
            ) : (
              <span style={{ ...font(400, 14, 1), color: TEXT.muted }}>
                {live ? 'Waiting on the snap' : '—'}
              </span>
            )}
          </div>

          {/* Where the game stands NOW. The last play says what just happened;
              this says what is about to. Suppressed at halftime, where nobody is
              on the clock and the down and spot belong to a drive that is over. */}
          {live && !game.isHalftime && (
            <div style={{
              ...PANEL, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 0,
              ...(redZone && situationLive
                ? { borderColor: `${RED_ZONE}4d`, background: 'rgba(248,113,113,0.06)' }
                : {}),
            }}>
              {/* FormatClock, not a hand-rolled quarter + time: an innings game
                  or a chess-clock game does not have either. */}
              <span style={CELL}><FormatClock game={game} size="large" /></span>
              {situationLive && downText && (
                <>
                  <span style={RULE} />
                  <span style={{
                    ...CELL, ...font(700, 13, 1), color: TEXT.secondary,
                    ...TABULAR, whiteSpace: 'nowrap',
                  }}>{downText}</span>
                </>
              )}
              {situationLive && game.yardLine && (
                <>
                  <span style={RULE} />
                  <span style={{
                    ...CELL, ...font(600, 13, 1), ...TABULAR, whiteSpace: 'nowrap',
                    color: redZone ? RED_ZONE : TEXT.muted,
                  }}>{game.yardLine}</span>
                </>
              )}
              {/* ⚠️ No RED ZONE cell (owner): the panel's own tint already says it,
                  and spelling it out beside a red container is the same fact
                  twice. The small card still needs its chip — it has no panel to
                  tint and no spot to colour. */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BoardCardLarge
