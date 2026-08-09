import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { finalLeaders, finalTeamStats } from './finalLeaders'
import { lastPlaySummary } from './lastPlaySummary'
import { periodColumns, FormatClock, FormatScore, leadingSide } from './gameFormat'
import type { ScoringModel } from '@/utils/displayScore'
import {
  Crest, MomentumFlame, InterestChip, PulsingDot, SectionLabel, SplitBar,
  ScrollingLine, CHIP_COLOR, RedZoneChip, inRedZone, RED_ZONE, type ChipKind,
} from './boardPieces'

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
  // A score leaves the down and the spot holding pre-score values until the
  // next drive starts, so the row shows only the clock through that gap.
  const situationLive = !lastPlay?.afterScore

  // Who turned up, for a game that is over. Empty while a game is live or if nobody
  // cleared the minimums, in which case the row says so rather than printing filler.
  const leaders = isFinal
    ? finalLeaders(game.gameStats)
    : []

  // How the two clubs compared, for the row a live game spends on its last play.
  const teamStats = isFinal ? finalTeamStats(game.gameStats) : []

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
        {live && <PulsingDot size={6} />}
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

      <div style={{ paddingTop: '14px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {/* ⚠️ A FINAL game gets neither the gauge nor the swing. Its win probability has
            resolved to 100% / 0%, and the margin is already legible from the two scores
            sitting directly above — so both rows spend space restating what the card has
            said. What a reader wants off a final is who turned up, so it becomes a leader
            line instead. */}
        {isFinal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <SectionLabel>LEADERS</SectionLabel>
            {leaders.length === 0 ? (
              <span style={{ ...font(400, 13), color: TEXT.muted }}>No standout performances</span>
            ) : (
              <ScrollingLine
                text={leaders.map(l => `${l.name} ${l.line}`).join('   ·   ')}
                style={{ ...font(400, 13), color: TEXT.secondary, flex: 1 }}
              />
            )}
          </div>
        ) : (
          // Just the gauge (owner): the swing trend line came out. Both sides carry their
          // own percentage, so the bar is read against two labelled numbers rather than
          // one favoured side and a sparkline.
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ ...font(awayWp > homeWp ? 800 : 600, 14), color: awayText, ...TABULAR, whiteSpace: 'nowrap' }}>
              {away?.abbr} {awayWp}%
            </span>
            <SplitBar awayPct={awayWp} awayColor={awayFill} homeColor={homeFill} height={6} />
            <span style={{ ...font(homeWp > awayWp ? 800 : 600, 14), color: homeText, ...TABULAR, whiteSpace: 'nowrap' }}>
              {homeWp}% {home?.abbr}
            </span>
          </div>
        )}
      </div>

      {/* A final does not need a last play (owner): the last snap of a finished
          game is a kneel or a punt about as often as it is anything, and this is
          prime space on the card. It carries how the two clubs compared instead.
          The winning number in each pair is bolder — that is what makes the row
          readable at a glance rather than eight digits to subtract. */}
      {isFinal && teamStats.length > 0 ? (
        <div style={{
          paddingTop: '13px', borderTop: `1px solid ${BORDER.hairline}`,
          display: 'flex', alignItems: 'stretch', gap: '18px', minWidth: 0,
        }}>
          {teamStats.map(stat => (
            <div key={stat.label} style={{
              display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, flex: 1,
            }}>
              <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted, whiteSpace: 'nowrap' }}>
                {stat.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', ...TABULAR }}>
                <span style={{
                  ...font(stat.betterSide === 'away' ? 800 : 500, 14),
                  color: stat.betterSide === 'away' ? TEXT.primary : TEXT.muted,
                }}>{stat.away}</span>
                <span style={{ ...font(400, 11), color: TEXT.muted }}>/</span>
                <span style={{
                  ...font(stat.betterSide === 'home' ? 800 : 500, 14),
                  color: stat.betterSide === 'home' ? TEXT.primary : TEXT.muted,
                }}>{stat.home}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ paddingTop: '13px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <SectionLabel>LAST PLAY</SectionLabel>
          {lastPlay ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', minWidth: 0 }}>
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
                  ...font(800, 15), ...TABULAR, whiteSpace: 'nowrap',
                  color: lastPlay.yards < 0 ? ACCENT.negative : TEXT.primary,
                }}>
                  {lastPlay.unsigned || lastPlay.yards <= 0 ? lastPlay.yards : `+${lastPlay.yards}`}
                  <span style={{ ...font(500, 11), color: TEXT.muted }}> YD</span>
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
            <span style={{ ...font(400, 14), color: TEXT.muted }}>
              {live ? 'Waiting on the snap' : '—'}
            </span>
          )}

          {/* Where the game stands NOW, at the far end of the same row (owner).
              The last play says what just happened; this says what is about to.
              Deliberately paired rather than given its own row — read together
              they are one thought, and the row had the space sitting empty. */}
          {/* Not at halftime: nobody is on the clock, so the down and the spot are
              last drive's, and the row would state a situation that is over. */}
          {live && !game.isHalftime && (
            <>
              <span style={{ flex: 1 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* FormatClock, not a hand-rolled quarter + time: an innings game
                    or a chess-clock game does not have either. */}
                <FormatClock game={game} size="large" />
                {situationLive && <span style={{ ...font(400, 11), color: TEXT.muted }}>·</span>}
                {situationLive && game.downText && (
                  <span style={{ ...font(700, 13), color: TEXT.secondary, ...TABULAR, whiteSpace: 'nowrap' }}>
                    {game.downText}
                  </span>
                )}
                {situationLive && game.downText && game.yardLine && (
                  <span style={{ ...font(400, 11), color: TEXT.muted }}>·</span>
                )}
                {situationLive && game.yardLine && (
                  <span style={{
                    ...font(600, 13), ...TABULAR, whiteSpace: 'nowrap',
                    // Matched to the chip beside it so the spot and the flag read
                    // as one signal rather than two.
                    color: redZone ? RED_ZONE : TEXT.muted,
                  }}>{game.yardLine}</span>
                )}
                {/* No abbr here: the spot immediately to the left already names
                    the side of the field, and the possession ring names who has
                    it. On the small card there is no such context, so it does. */}
                {situationLive && redZone && <RedZoneChip size="large" />}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default BoardCardLarge
