import React from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { readableTeamColor } from '@/utils/colors'
import { multiplierToPoints, eloToWinPct } from '@/Components/PickEm/PickRow'
import type { PickEmGame } from '@/types/pickem'
import type { TeamStanding } from '@/Views/Standings/standingsTypes'

/**
 * One matchup, with enough about both clubs to actually decide.
 *
 * ⚠️ The old row gave a reader two abbreviations, two records and a multiplier, which
 * is not enough to make a choice with — you either knew the league already or you
 * clicked the favourite. Everything added here answers "why would I take this side":
 * recent form, the streak, point differential, where they sit in their division.
 *
 * None of it needs a backend change. `/api/standings` already computes all of it for
 * the standings board (`standings_view.buildFormAndMovement`), so the page joins that
 * payload by team id rather than widening the pick-em serializer — which would have
 * meant a schema conversation and a deploy for data that is already being served.
 *
 * ⚠️ The MULTIPLIER stays the loudest thing on the row. Underdogs pay up to 3x and
 * obvious favourites floor at 0.4x, so what a side is worth IS the decision most of
 * the time, and the supporting data is there to tell you whether the price is fair.
 */

/** Oldest first, newest last — matching the standings board's own ordering. */
const FormPips: React.FC<{ last5?: ('W' | 'L' | 'T')[] }> = ({ last5 }) => {
  if (!last5 || last5.length === 0) return null
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
      {last5.map((r, i) => (
        <span key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
          background: r === 'W' ? ACCENT.live : r === 'L' ? ACCENT.negative : TEXT.faint,
        }} />
      ))}
    </span>
  )
}

const Stat: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ ...font(500, 11), color: color ?? TEXT.muted, ...TABULAR, whiteSpace: 'nowrap' }}>
    {children}
  </span>
)

const TeamSide: React.FC<{
  team: PickEmGame['homeTeam']
  standing?: TeamStanding
  /** Home clubs are marked, because home advantage is real and invisible otherwise. */
  isHome: boolean
  isFavourite: boolean
  multiplier: number
  points: number
  picked: boolean
  staged: boolean
  disabled: boolean
  onPick: () => void
}> = ({ team, standing, isHome, isFavourite, multiplier, points, picked, staged, disabled, onPick }) => {
  const accent = readableTeamColor(team.color || '#94a3b8')
  const diff = standing?.scoreDiff

  return (
    <button
      onClick={disabled ? undefined : onPick}
      className={disabled ? undefined : 'plate'}
      style={{
        display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
        padding: '10px 13px', textAlign: 'left', fontFamily: FONT,
        background: picked ? BG.cardOwn : 'transparent',
        border: 'none',
        // A staged pick is not yet saved, so it reads as an outline rather than a fill.
        borderLeft: `3px solid ${picked ? (staged ? ACCENT.warning : accent) : 'transparent'}`,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !picked ? 0.55 : 1,
      }}
    >
      <Crest teamId={team.id} size={26} />

      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '7px', minWidth: 0 }}>
          <span style={{
            ...font(picked ? 800 : 700, 14, 1, '-0.01em'),
            color: picked ? TEXT.primary : TEXT.body,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team.name}</span>
          {isHome && (
            <span style={{ ...font(700, 9, 1, '0.1em'), color: TEXT.muted }}>HOME</span>
          )}
          {isFavourite && (
            <span style={{ ...font(700, 9, 1, '0.1em'), color: ACCENT.info }}>FAV</span>
          )}
        </span>

        {/* The evidence line. Every cell is omitted rather than zero-filled when the
            standings payload has not arrived, so a slow fetch reads as a shorter row
            instead of a row full of zeroes that look like real form. */}
        <span style={{
          display: 'flex', alignItems: 'center', gap: '9px', marginTop: '4px', flexWrap: 'wrap',
        }}>
          <Stat>{standing ? `${standing.wins}-${standing.losses}` : team.record}</Stat>
          {standing?.streak && (
            <Stat color={standing.streak.startsWith('W') ? ACCENT.live : ACCENT.negative}>
              {standing.streak}
            </Stat>
          )}
          <FormPips last5={standing?.last5} />
          {/* ⚠️ ROUNDED. `scoreDiff` is a float — the innings and frames formats score in
              fractions — and "+54.8" reads as a precision the number does not have when
              it is standing in for "how much better have they been". */}
          {diff != null && Math.round(diff) !== 0 && (
            <Stat color={diff > 0 ? ACCENT.live : ACCENT.negative}>
              {diff > 0 ? '+' : ''}{Math.round(diff)}
            </Stat>
          )}
          {standing?.division && (
            <Stat>{standing.division} {standing.divisionRecord}</Stat>
          )}
        </span>
      </span>

      {/* What this side pays. */}
      <span style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{
          display: 'block', ...font(800, 15, 1), ...TABULAR,
          color: multiplier >= 1.5 ? ACCENT.live : multiplier < 0.8 ? TEXT.muted : TEXT.body,
        }}>{multiplier.toFixed(1)}x</span>
        <span style={{ display: 'block', ...font(500, 10), color: TEXT.muted, marginTop: '3px' }}>
          {points} pts
        </span>
      </span>
    </button>
  )
}

export const MatchupCard: React.FC<{
  game: PickEmGame
  standings: Map<number, TeamStanding>
  /** True while this pick is staged locally and not yet submitted. */
  staged: boolean
  onPick: (teamId: number) => void
}> = ({ game, standings, staged, onPick }) => {
  const home = game.homeTeam
  const away = game.awayTeam
  const homeStanding = standings.get(Number(home.id))
  const awayStanding = standings.get(Number(away.id))

  const wp = eloToWinPct(home.elo, away.elo)
  const homeFav = home.elo > away.elo
  const homeMult = game.underdogInfo?.homeMultiplier ?? 1
  const awayMult = game.underdogInfo?.awayMultiplier ?? 1
  const timing = game.currentMultiplier || 1

  const settled = !!game.result
  const correct = settled && game.userPick != null
    && Number(game.userPick) === Number(game.result?.winnerId)

  return (
    <div style={{
      background: BG.card, border: `1px solid ${BORDER.hairline}`,
      fontFamily: FONT, minWidth: 0,
    }}>
      {/* The header carries the ODDS, which is the one number that frames both sides
          at once — a 78/22 split says more about the matchup than either club's row. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '7px 13px', borderBottom: `1px solid ${BORDER.subtle}`,
      }}>
        <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>
          {wp.away}% / {wp.home}%
        </span>
        <span style={{ ...font(400, 10), color: TEXT.faint }}>by rating</span>
        <span style={{ flex: 1 }} />
        {settled ? (
          <span style={{
            ...font(700, 10, 1, '0.08em'),
            color: game.userPick == null ? TEXT.muted : correct ? ACCENT.live : ACCENT.negative,
          }}>
            {game.userPick == null ? 'NO PICK'
              : correct ? `CORRECT  +${game.result?.pointsEarned ?? 0}` : 'MISSED'}
          </span>
        ) : !game.pickable ? (
          <span style={{ ...font(700, 10, 1, '0.08em'), color: TEXT.muted }}>LOCKED</span>
        ) : (
          <span style={{ ...font(600, 10, 1, '0.06em'), color: TEXT.muted, ...TABULAR }}>
            {timing.toFixed(2)}x timing
          </span>
        )}
      </div>

      <TeamSide
        team={away} standing={awayStanding} isHome={false}
        isFavourite={!homeFav} multiplier={awayMult}
        points={multiplierToPoints(timing, awayMult)}
        picked={Number(game.userPick) === Number(away.id)}
        staged={staged}
        disabled={!game.pickable}
        onPick={() => onPick(Number(away.id))}
      />
      <div style={{ height: '1px', background: BORDER.subtle }} />
      <TeamSide
        team={home} standing={homeStanding} isHome
        isFavourite={homeFav} multiplier={homeMult}
        points={multiplierToPoints(timing, homeMult)}
        picked={Number(game.userPick) === Number(home.id)}
        staged={staged}
        disabled={!game.pickable}
        onPick={() => onPick(Number(home.id))}
      />
    </div>
  )
}

export default MatchupCard
