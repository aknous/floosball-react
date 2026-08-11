import React from 'react'
import { Link } from 'react-router-dom'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { getContrastTextColor } from '@/utils/colors'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { formatScore } from '@/utils/formatScore'
import { SectionHeader } from './frontPieces'
import type { TeamStanding } from '@/Views/Standings/standingsTypes'

export interface RecentResult {
  opponentId: number
  opponentAbbr: string
  home: boolean
  won: boolean
  teamScore: number
  opponentScore: number
}

const ordinal = (n: number): string => {
  const words = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
    'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth']
  return words[n] || `${n}th`
}

/**
 * The rail's team card: three stacked blocks, flush against each other.
 *
 * This was a full-width band at one point in review and was pulled back to the rail. It
 * is a status readout, not a feature — the team page is where the detail lives.
 *
 * The live-game plate is replaced by the next fixture when the team is not playing, so
 * the card keeps its height and the rail below it does not jump on kickoff.
 */
const YourTeamCard: React.FC<{
  team: TeamStanding
  leagueName: string
  liveGame: CurrentGame | null
  nextFixture: { opponentId: number; opponentAbbr: string; home: boolean } | null
  recent: RecentResult[]
  onOpenGame: (id: number) => void
}> = ({ team, leagueName, liveGame, nextFixture, recent, onOpenGame }) => {
  const wins = recent.filter(r => r.won).length
  const losses = recent.length - wins
  /**
   * Points for minus points against over the shown run.
   *
   * ⚠️ CLEANED, NOT RAW. Scores are floats now (a touchdown worth 6.4, and the per-game
   * chaos rulesets during a Criticality), so summing them lands on binary-representation
   * artifacts — this printed `-6.599999999999998` on the front page. `formatScore` exists
   * for exactly that and was simply never applied here.
   *
   * The SIGN is taken from the cleaned figure too, so a differential that displays as
   * zero is not handed a + or a - it does not deserve.
   */
  const differentialText = formatScore(
    recent.reduce((sum, r) => sum + (r.teamScore - r.opponentScore), 0))
  const differential = Number(differentialText)

  const opponent = liveGame
    ? (String(liveGame.homeTeam?.id) === String(team.id) ? liveGame.awayTeam : liveGame.homeTeam)
    : null
  const isHome = liveGame ? String(liveGame.homeTeam?.id) === String(team.id) : false
  const ourScore = liveGame ? (isHome ? liveGame.homeScore : liveGame.awayScore) ?? 0 : 0
  const theirScore = liveGame ? (isHome ? liveGame.awayScore : liveGame.homeScore) ?? 0 : 0

  // Text sitting ON the club's color. Black or white by luminance, with the
  // secondary line at 80% of whichever was chosen.
  const onTeamColor = getContrastTextColor(team.color)
  const onTeamColorMuted = onTeamColor === '#000000' ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.85)'

  return (
    <div>
      <SectionHeader title="YOUR TEAM" link={{ to: `/team/${team.id}`, label: 'TEAM PAGE →' }} rail />

      <Link to={`/team/${team.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          background: team.color,
          borderBottom: `3px solid ${team.secondaryColor || team.color}`,
          padding: '13px 15px',
          display: 'flex', alignItems: 'center', gap: '11px',
        }}>
          <Crest teamId={team.id} size={34} />
          <div style={{ minWidth: 0 }}>
            {/* ⚠️ The plate is the club's own color, so the text on it cannot be
                a constant. White washes out on a light primary — Cleveland,
                Minnesota, Detroit — and this card is the one panel a fan sees
                every visit. `getContrastTextColor` picks black or white off the
                background's luminance; the secondary line rides the same choice
                at reduced alpha rather than assuming a white base. */}
            <div style={{ ...font(800, 18, 1, '-0.02em'), color: onTeamColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {team.city} {team.name}
            </div>
            <div style={{ ...font(700, 10, 1, '0.1em'), color: onTeamColorMuted, marginTop: '6px' }}>
              {team.wins}-{team.losses} · {ordinal(team.rankLastWeek && team.seed == null ? team.rankLastWeek : team.seed ?? 0).toUpperCase()} IN THE {leagueName.split(' ')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </Link>

      {liveGame ? (
        <button
          className="plate"
          onClick={() => onOpenGame(liveGame.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.32)',
            padding: '13px 15px', marginTop: '2px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <div style={{ ...font(700, 10, 1, '0.14em'), color: ACCENT.info }}>
            LIVE · Q{liveGame.quarter} {liveGame.timeRemaining} · {isHome ? 'HOME' : 'AWAY'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '11px' }}>
            <Crest teamId={opponent?.id} size={30} />
            <span style={{ flex: 1, minWidth: 0, ...font(700, 14), color: TEXT.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {opponent?.city} {opponent?.name}
            </span>
            <span style={{ ...font(800, 26), color: TEXT.primary, ...TABULAR, flexShrink: 0 }}>
              {ourScore}–{theirScore}
            </span>
          </div>
        </button>
      ) : nextFixture ? (
        <div style={{
          background: BG.panel, border: `1px solid ${BORDER.hairline}`, borderTop: 'none',
          padding: '13px 15px', marginTop: '2px',
        }}>
          <div style={{ ...font(700, 10, 1, '0.14em'), color: TEXT.muted }}>NEXT UP</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '11px' }}>
            <Crest teamId={nextFixture.opponentId} size={30} />
            <span style={{ ...font(700, 14), color: TEXT.strong }}>
              {nextFixture.home ? 'vs' : '@'} {nextFixture.opponentAbbr}
            </span>
          </div>
        </div>
      ) : null}

      <div style={{
        background: BG.card, border: `1px solid ${BORDER.hairline}`, borderTop: 'none',
        padding: '11px 15px 5px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          paddingBottom: '9px', borderBottom: `1px solid ${BORDER.hairline}`,
        }}>
          <span style={{ ...font(700, 10, 1, '0.14em'), color: TEXT.muted }}>LAST {recent.length}</span>
          <span style={{ ...font(400, 10), color: TEXT.secondary, ...TABULAR }}>{wins}-{losses}</span>
          <span style={{ flex: 1 }} />
          {/* ⚠️ Labelled, because it was not. A bare signed number at the end of a row
              that already holds a record was being read as a guess — reported as "I'm
              guessing it's score differential". It is: points for minus points against
              over the games shown. */}
          <span style={{ ...font(700, 10, 1, '0.14em'), color: TEXT.muted }}>DIFF</span>
          <span style={{
            ...font(700, 10), ...TABULAR,
            color: differential >= 0 ? ACCENT.live : ACCENT.negative,
          }}>{differential > 0 ? `+${differentialText}` : differentialText}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', columnGap: '14px' }}>
          {recent.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 0',
                borderBottom: i < recent.length - 2 ? `1px solid ${BORDER.subtle}` : 'none',
              }}
            >
              <span style={{ ...font(400, 10), color: TEXT.muted, width: '12px', flexShrink: 0 }}>
                {r.home ? 'vs' : '@'}
              </span>
              <Crest teamId={r.opponentId} size={15} />
              <span style={{ ...font(400, 10, 1, '0.06em'), color: TEXT.secondary, flexShrink: 0 }}>
                {r.opponentAbbr}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{
                ...font(700, 11), ...TABULAR, flexShrink: 0,
                color: r.won ? ACCENT.live : ACCENT.negative,
              }}>{r.won ? 'W' : 'L'} {formatScore(r.teamScore)}-{formatScore(r.opponentScore)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default YourTeamCard
