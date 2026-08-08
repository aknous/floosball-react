import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { finalLeaders } from './finalLeaders'
import { periodColumns, FormatClock, FormatScore, leadingSide } from './gameFormat'
import type { ScoringModel } from '@/utils/displayScore'
import {
  Crest, MomentumFlame, InterestChip, PulsingDot, SectionLabel, SwingTrend, SplitBar,
  ScrollingLine, CHIP_COLOR, type ChipKind,
} from './boardPieces'

/**
 * LARGE density: two across, full detail. ~586px wide, ~300px tall, so 16 games scroll
 * by design.
 *
 * ⚠️ The quarter/TOT header cluster and the team rows' value cluster MUST share their
 * gaps and widths exactly (cluster gap 14, quarter cells 21 with gap 9, 1px divider,
 * total 48). They drifted apart in review and the labels stopped sitting over their
 * values. They are defined once below and spread into both.
 */

const CLUSTER = { display: 'flex', alignItems: 'center', gap: '14px' } as const
const QUARTERS = { display: 'flex', gap: '9px' } as const
const QUARTER_CELL = { width: '21px', textAlign: 'center' as const, ...TABULAR }
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
  // Once a game is final the win probability is 100/0, which would make the favoured side
  // the winner by definition. Read the favourite off the SCORE there so the trend line and
  // its label agree with the result.
  const homeFavoured = isFinal ? leader !== 'away' : homeWp >= awayWp
  const favouredAbbr = homeFavoured ? home?.abbr : away?.abbr
  const favouredText = homeFavoured ? homeText : awayText
  // The trend line takes the CORRECTED colour, not the raw one. It is a 1.5px stroke on a
  // dark card — functionally text, not a fill — and a dark team primary (Anchorage's slate)
  // drew a line that was invisible.
  const favouredFill = favouredText

  // Recent win probability for the favoured side, straight off the plays already in
  // memory. Home WP is stored per play, so the away line is its mirror.
  const wpHistory = (game.plays || [])
    .filter((p: any) => typeof p?.homeWinProbability === 'number')
    .slice(-24)
    .map((p: any) => (homeFavoured ? p.homeWinProbability : 100 - p.homeWinProbability))

  const swing = wpHistory.length >= 2
    ? Math.round(wpHistory[wpHistory.length - 1] - wpHistory[0])
    : 0

  const lastPlay = (() => {
    const plays = game.plays || []
    for (let i = plays.length - 1; i >= 0; i--) {
      const text = (plays[i] as any)?.description
      if (typeof text === 'string' && text.trim()) return text.trim()
    }
    return null
  })()

  // Who turned up, for a game that is over. Empty while a game is live or if nobody
  // cleared the minimums, in which case the row says so rather than printing filler.
  const leaders = isFinal
    ? finalLeaders(game.gameStats)
    : []

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
              {columns.periods.map((period, i) => (
                <span key={period.label} style={{
                  ...QUARTER_CELL,
                  ...font(period.played ? 600 : 400, 15),
                  color: !period.played ? TEXT.dim
                    : game.quarter === i + 1 && live ? TEXT.strong : TEXT.secondary,
                }}>{side === 'home' ? period.homeValue : period.awayValue}</span>
              ))}
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
        {pinned && <span style={{ ...font(700, 11, 1, '0.1em'), color: ACCENT.ownTeam }}>PINNED</span>}
        {live && <PulsingDot size={6} />}
        {isFinal ? (
          <span style={{ ...font(700, 12, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>FINAL</span>
        ) : live ? (
          game.isHalftime
            ? <span style={{ ...font(700, 12, 1, '0.08em'), color: ACCENT.live, ...TABULAR }}>HALFTIME</span>
            : <FormatClock game={game} size="large" />
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
                <span key={period.label} style={{ ...QUARTER_CELL, ...font(600, 11), color: TEXT.muted }}>
                  {period.label}
                </span>
              ))}
            </div>
          )}
          {columns && <span style={{ width: '1px', height: '16px', background: BORDER.hairline }} />}
          <span style={{ ...TOTAL_CELL, ...font(600, 11, 1, '0.08em'), color: TEXT.muted }}>
            {columns?.label ?? 'TOT'}
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
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ ...font(awayWp > homeWp ? 800 : 600, 14), color: awayText, ...TABULAR, whiteSpace: 'nowrap' }}>
                {away?.abbr} {awayWp}%
              </span>
              <SplitBar awayPct={awayWp} awayColor={awayFill} homeColor={homeFill} height={6} />
              <span style={{ ...font(homeWp > awayWp ? 800 : 600, 14), color: homeText, ...TABULAR, whiteSpace: 'nowrap' }}>
                {homeWp}% {home?.abbr}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SectionLabel>SWING</SectionLabel>
              <span style={{ ...font(700, 13), color: favouredText, ...TABULAR, whiteSpace: 'nowrap' }}>
                {swing >= 0 ? '▲' : '▼'} {Math.abs(swing)} {favouredAbbr}
              </span>
              <SwingTrend points={wpHistory} color={favouredFill} />
            </div>
          </>
        )}
      </div>

      <div style={{ paddingTop: '13px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <SectionLabel>LAST PLAY</SectionLabel>
        <ScrollingLine
          text={lastPlay || (live ? 'Waiting on the snap' : '—')}
          style={{ ...font(400, 14), color: TEXT.secondary, flex: 1 }}
        />
      </div>
    </div>
  )
}

export default BoardCardLarge
