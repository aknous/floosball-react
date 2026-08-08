import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { Crest, MomentumFlame, InterestChip, PulsingDot, SplitBar, CHIP_COLOR, type ChipKind } from './boardPieces'

/**
 * SMALL density: four across, glanceable. ~286px wide and a uniform 179px tall, so 16
 * games land in roughly one screen.
 *
 * ⚠️ The header row carries a FIXED min-height. Grid rows stretch to their tallest cell,
 * so without it a card with no interest chip sits a few pixels shorter than its
 * neighbours and the row loses its baseline — a real defect in review.
 *
 * Deliberately carries no pick control and no last-play line. Both were removed as too
 * dense at this size; they live on the large card and in the modal.
 */

type Props = {
  game: CurrentGame
  chip: ChipKind | null
  pinned: boolean
  pinnedAccent: string
  onOpen: (id: number) => void
}

const BoardCardSmall: React.FC<Props> = ({ game, chip, pinned, pinnedAccent, onOpen }) => {
  const live = game.status === 'Active'
  const isFinal = game.status === 'Final'
  const home = game.homeTeam
  const away = game.awayTeam

  const homeScore = game.homeScore ?? 0
  const awayScore = game.awayScore ?? 0

  const awayFill = effectiveAwayColor(home?.color, away?.color, away?.secondaryColor)
  const homeFill = home?.color || '#64748b'

  const homeWp = Math.round(game.homeWinProbability ?? 50)
  const awayWp = 100 - homeWp
  // On a final, read the favourite off the SCORE — the win probability has already
  // resolved to 100/0 and would name the winner by definition.
  const homeFavoured = isFinal ? homeScore >= awayScore : homeWp >= awayWp
  const favouredAbbr = homeFavoured ? home?.abbr : away?.abbr
  const favouredPct = homeFavoured ? homeWp : awayWp
  // Both sides get the correction even though only one is drawn — the helper is applied
  // per side so a future change that shows both cannot reintroduce a mismatched pair.
  const favouredText = readableTeamColor(homeFavoured ? homeFill : awayFill)

  const wpHistory = (game.plays || [])
    .filter((p: any) => typeof p?.homeWinProbability === 'number')
    .slice(-24)
    .map((p: any) => (homeFavoured ? p.homeWinProbability : 100 - p.homeWinProbability))
  const swing = wpHistory.length >= 2
    ? Math.round(wpHistory[wpHistory.length - 1] - wpHistory[0])
    : 0

  const accent = pinned ? pinnedAccent : chip ? CHIP_COLOR[chip] : BORDER.hairline
  const possessionTeam = game.homeTeamPoss ? 'home' : game.awayTeamPoss ? 'away' : null
  const momentumMagnitude = Math.abs(game.momentum ?? 0)

  const clockText = isFinal
    ? 'FINAL'
    : live
      ? (game.isHalftime ? 'HALFTIME' : `Q${game.quarter} ${game.timeRemaining}`)
      : 'SCHEDULED'

  const teamRow = (side: 'away' | 'home', team: typeof home, score: number, ahead: boolean) => {
    const hasMomentum = live && momentumMagnitude > 0 && game.momentumTeam === team?.abbr
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
        <Crest teamId={team?.id} size={26} possession={live && possessionTeam === side} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...font(500, 10), color: TEXT.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team?.city}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '2px', minWidth: 0 }}>
            <span style={{
              ...font(ahead ? 700 : 500, 15, 1, '-0.015em'),
              color: ahead ? TEXT.primary : TEXT.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{team?.name}</span>
            <span style={{ ...font(500, 10), color: TEXT.muted, ...TABULAR, flexShrink: 0 }}>{team?.record}</span>
            {hasMomentum && <MomentumFlame magnitude={momentumMagnitude} size={12} />}
          </div>
        </div>
        <span style={{ ...font(800, 26), color: ahead ? TEXT.primary : TEXT.muted, ...TABULAR, flexShrink: 0 }}>
          {score}
        </span>
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
        padding: '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '18px' }}>
        {pinned && <span style={{ ...font(700, 9, 1, '0.1em'), color: ACCENT.ownTeam }}>PINNED</span>}
        {live && <PulsingDot size={5} />}
        <span style={{ ...font(700, 10, 1, '0.08em'), color: live ? ACCENT.live : TEXT.muted, ...TABULAR }}>
          {clockText}
        </span>
        <span style={{ flex: 1 }} />
        {chip && <InterestChip kind={chip} size="small" />}
      </div>

      {teamRow('away', away, awayScore, awayScore >= homeScore)}
      {teamRow('home', home, homeScore, homeScore >= awayScore)}

      {/* Same rule as the large card: a final game's gauge is 100/0, so it reports the
          margin instead of a certainty. */}
      <div style={{ paddingTop: '12px', borderTop: `1px solid ${BORDER.hairline}`, display: 'flex', alignItems: 'center', gap: '9px' }}>
        {!isFinal && <SplitBar awayPct={awayWp} awayColor={awayFill} homeColor={homeFill} height={3} />}
        {isFinal && <span style={{ flex: 1 }} />}
        <span style={{ ...font(700, 11), color: favouredText, ...TABULAR, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {isFinal
            ? (homeScore === awayScore ? 'TIED' : `${favouredAbbr} by ${Math.abs(homeScore - awayScore)}`)
            : `${favouredAbbr} ${favouredPct}%`}
        </span>
        {!isFinal && (
          <span style={{ ...font(600, 10), color: TEXT.muted, ...TABULAR, flexShrink: 0 }}>
            {swing >= 0 ? '▲' : '▼'}{Math.abs(swing)}
          </span>
        )}
      </div>
    </div>
  )
}

export default BoardCardSmall
