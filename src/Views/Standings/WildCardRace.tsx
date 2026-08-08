import React from 'react'
import { Link } from 'react-router-dom'
import HoverTooltip from '@/Components/HoverTooltip'
import TeamHoverCard from '@/Components/TeamHoverCard'
import { BG, BORDER, TEXT, ACCENT, PLAYOFF, TABULAR, font } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { SeedBadge, record } from './standingsPieces'
import type { LeagueStandings, TeamStanding } from './standingsTypes'

/**
 * View 3 — how close is the race.
 *
 * Deliberately NOT another ranked table. An earlier version was, and it just duplicated
 * the league view. This is a games-back axis: one column per distinct gap, clubs stacked
 * in the column they sit at. The SHAPE is the point — a pile of five cards at the cut
 * says "unresolved" faster than any table can.
 */

const tickLabel = (gamesBack: number): string => {
  if (gamesBack === 0) return 'AT THE CUT'
  const n = Math.abs(gamesBack)
  const value = Number.isInteger(n) ? String(n) : n.toFixed(1)
  return gamesBack < 0 ? `${value} up` : `${value} back`
}

const TrackCard: React.FC<{ team: TeamStanding; isYours: boolean }> = ({ team, isYours }) => {
  const holdsSpot = team.seed != null
  const style: React.CSSProperties = isYours
    ? { background: 'rgba(197,17,98,0.12)', border: `1px solid ${team.color}` }
    : team.eliminated
      ? { background: BG.card, border: `1px solid ${BORDER.eliminated}`, opacity: 0.7 }
      : holdsSpot
        ? { background: 'rgba(91,135,184,0.16)', border: `1px solid ${PLAYOFF.wildcardRing}` }
        : { background: BG.card, border: `1px solid ${BORDER.aliveOutsideCut}` }

  const abbrColor = isYours
    ? readableTeamColor(team.color)
    : team.eliminated
      ? ACCENT.negative
      : holdsSpot ? PLAYOFF.wildcardText : TEXT.secondary

  return (
    <TeamHoverCard teamId={team.id}>
      <Link
        to={`/team/${team.id}`}
        style={{
          boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 9px', textDecoration: 'none',
          ...style,
        }}
      >
        <Crest teamId={team.id} size={20} />
        <span style={{ ...font(700, 12), color: abbrColor }}>{team.abbr}</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...font(700, 12), color: TEXT.strong, ...TABULAR }}>
          {record(team.wins, team.losses)}
        </span>
      </Link>
    </TeamHoverCard>
  )
}

const LeagueRace: React.FC<{
  league: LeagueStandings
  favouriteTeamId: number | null
}> = ({ league, favouriteTeamId }) => {
  const winners = league.standings.filter(t => t.seedKind === 'division')
  const chasing = league.standings.filter(t => t.seedKind !== 'division')

  // One column per distinct games-back value actually present, ordered from most-ahead to
  // furthest-behind. Building the axis from the data rather than a fixed range keeps it
  // tight in a close race and lets it stretch in a runaway one.
  const distances = Array.from(new Set(chasing.map(t => t.gamesBack))).sort((a, b) => a - b)
  const columns = distances.map(distance => ({
    distance,
    teams: chasing.filter(t => t.gamesBack === distance),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
        <h2 style={{ ...font(800, 19, 1, '-0.025em'), color: TEXT.primary, margin: 0 }}>{league.name}</h2>
        <span style={{ flex: 1, height: '1px', background: BORDER.hairline }} />
        <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted }}>LEAGUE RECORD BREAKS TIES</span>
      </div>

      <span style={{ ...font(600, 10, 1, '0.12em'), color: TEXT.muted }}>
        LOCKED IN — DIVISION WINNERS, SEEDED 1 TO 4
      </span>
      <div style={{ display: 'flex', gap: '12px' }}>
        {winners.map(team => (
          <div
            key={team.id}
            className="row"
            style={{
              boxSizing: 'border-box',
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: '11px',
              background: BG.card,
              border: `1px solid ${BORDER.hairline}`,
              borderTop: `2px solid ${team.seed === 1 ? PLAYOFF.topSeedRing : PLAYOFF.divisionRing}`,
              padding: '11px 13px',
            }}
          >
            <SeedBadge team={team} />
            <Crest teamId={team.id} size={26} />
            <span style={{ minWidth: 0 }}>
              <span style={{
                display: 'block', ...font(700, 14, 1, '-0.015em'), color: TEXT.strong,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{team.name}</span>
              <span style={{ display: 'block', ...font(500, 10), color: TEXT.muted, marginTop: '3px', ...TABULAR }}>
                {team.division} · {record(team.wins, team.losses)} · {team.divisionWins}-{team.divisionLosses} div
              </span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <span style={{ ...font(600, 10, 1, '0.12em'), color: TEXT.muted }}>
            FOUR WILD CARDS — {chasing.length} TEAMS, PLACED BY GAMES BACK
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{
              boxSizing: 'border-box', width: '12px', height: '12px', borderRadius: '50%',
              background: PLAYOFF.wildcardFill, border: `1px solid ${PLAYOFF.wildcardRing}`,
            }} />
            <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted }}>HOLDS A SPOT</span>
          </span>
          <span style={{ width: '1px', height: '14px', background: PLAYOFF.cutline }} />
          <span style={{ ...font(600, 10, 1, '0.08em'), color: PLAYOFF.cutlineText }}>THE CUT</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0,1fr))`,
          gap: '10px',
          alignItems: 'start',
        }}>
          {columns.map(({ distance, teams }) => {
            const atCut = distance === 0
            const ahead = distance < 0
            return (
              <div key={distance} style={{ minWidth: 0 }}>
                <div style={{
                  ...font(700, 10, 1, '0.08em'),
                  color: atCut ? PLAYOFF.cutlineText : ahead ? '#83c294' : TEXT.muted,
                  borderBottom: `2px solid ${atCut ? PLAYOFF.cutline : ahead ? '#4b7d5c' : BORDER.hairline}`,
                  paddingBottom: '7px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>{tickLabel(distance)}</div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '7px',
                  paddingTop: '10px',
                  background: atCut
                    ? 'linear-gradient(180deg, rgba(200,150,63,0.09), rgba(200,150,63,0))'
                    : 'transparent',
                }}>
                  {teams.length === 0 ? (
                    // Not dimmer than a real card — a fainter dot reads as a rendering gap
                    // rather than as "nobody is standing here".
                    <HoverTooltip text="No team at this distance">
                      <span style={{
                        display: 'block', textAlign: 'center', padding: '7px 0',
                        ...font(500, 11), color: TEXT.muted,
                      }}>·</span>
                    </HoverTooltip>
                  ) : teams.map(team => (
                    <TrackCard
                      key={team.id}
                      team={team}
                      isYours={favouriteTeamId != null && team.id === favouriteTeamId}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const WildCardRace: React.FC<{
  leagues: LeagueStandings[]
  favouriteTeamId: number | null
}> = ({ leagues, favouriteTeamId }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
    {leagues.map(league => (
      <LeagueRace key={league.name} league={league} favouriteTeamId={favouriteTeamId} />
    ))}
  </div>
)

export default WildCardRace
