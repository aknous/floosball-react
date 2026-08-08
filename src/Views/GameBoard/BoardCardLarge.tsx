import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import {
  Crest, MomentumFlame, InterestChip, PulsingDot, SectionLabel, SwingTrend, SplitBar,
  CHIP_COLOR, type ChipKind,
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
  onOpen: (id: number) => void
}

const formatScore = (v: number | undefined | null): string =>
  v == null ? '·' : String(v)

const BoardCardLarge: React.FC<Props> = ({ game, chip, pinned, pinnedAccent, onOpen }) => {
  const live = game.status === 'Active'
  const isFinal = game.status === 'Final'
  const home = game.homeTeam
  const away = game.awayTeam

  const homeScore = game.homeScore ?? 0
  const awayScore = game.awayScore ?? 0
  const homeAhead = homeScore >= awayScore
  const awayAhead = awayScore >= homeScore

  // Fills use the raw colour; only text gets corrected.
  const awayFill = effectiveAwayColor(home?.color, away?.color, away?.secondaryColor)
  const homeFill = home?.color || '#64748b'
  const awayText = readableTeamColor(awayFill)
  const homeText = readableTeamColor(homeFill)

  const homeWp = Math.round(game.homeWinProbability ?? 50)
  const awayWp = 100 - homeWp
  const homeFavoured = homeWp >= awayWp
  const favouredAbbr = homeFavoured ? home?.abbr : away?.abbr
  const favouredText = homeFavoured ? homeText : awayText
  const favouredFill = homeFavoured ? homeFill : awayFill

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

  const accent = pinned ? pinnedAccent : chip ? CHIP_COLOR[chip] : BORDER.hairline
  const possessionTeam = game.homeTeamPoss ? 'home' : game.awayTeamPoss ? 'away' : null
  const momentumMagnitude = Math.abs(game.momentum ?? 0)

  const clockText = isFinal
    ? 'FINAL'
    : live
      ? (game.isHalftime ? 'HALFTIME' : `Q${game.quarter} ${game.timeRemaining}`)
      : 'SCHEDULED'
  const clockColor = live ? ACCENT.live : isFinal ? TEXT.muted : TEXT.muted

  const teamRow = (
    side: 'away' | 'home',
    team: typeof home,
    score: number,
    ahead: boolean,
  ) => {
    const quarters = game.quarterScores?.[side]
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
          <div style={QUARTERS}>
            {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
              const value = quarters?.[q]
              const played = value != null && (isFinal || game.quarter > i + 1 || (game.quarter === i + 1 && live))
              return (
                <span key={q} style={{
                  ...QUARTER_CELL,
                  ...font(played ? 600 : 400, 15),
                  color: !played ? TEXT.dim : game.quarter === i + 1 && live ? TEXT.strong : TEXT.secondary,
                }}>{played ? formatScore(value) : '·'}</span>
              )
            })}
          </div>
          <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />
          <span style={{
            ...TOTAL_CELL,
            ...font(800, 34),
            color: ahead ? TEXT.primary : TEXT.muted,
          }}>{score}</span>
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
        <span style={{ ...font(700, 12, 1, '0.08em'), color: clockColor, ...TABULAR }}>{clockText}</span>
        {chip && <InterestChip kind={chip} size="large" />}
        <span style={{ flex: 1 }} />
        <div style={CLUSTER}>
          <div style={QUARTERS}>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <span key={q} style={{ ...QUARTER_CELL, ...font(600, 11), color: TEXT.muted }}>{q}</span>
            ))}
          </div>
          <span style={{ width: '1px', height: '16px', background: BORDER.hairline }} />
          <span style={{ ...TOTAL_CELL, ...font(600, 11, 1, '0.08em'), color: TEXT.muted }}>TOT</span>
        </div>
      </div>

      {teamRow('away', away, awayScore, awayAhead)}
      {teamRow('home', home, homeScore, homeAhead)}

      <div style={{ paddingTop: '14px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', flexDirection: 'column', gap: '11px' }}>
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
      </div>

      <div style={{ paddingTop: '13px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <SectionLabel>LAST PLAY</SectionLabel>
        <span style={{
          ...font(400, 14), color: TEXT.secondary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
        }}>{lastPlay || (live ? 'Waiting on the snap' : '—')}</span>
      </div>
    </div>
  )
}

export default BoardCardLarge
