import React from 'react'
import HoverTooltip from '@/Components/HoverTooltip'
import { BG, BORDER, TEXT, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import {
  SeedBadge, TeamCell, Last5, GamesBack, Differential, pct, record,
  COLUMN_HEADER, ownRowStyle,
} from './standingsPieces'
import type { LeagueStandings, TeamStanding } from './standingsTypes'

/**
 * View 1 — who leads each division.
 *
 * Two columns, one league each, four division blocks per league.
 *
 * There is deliberately NO ± column here. Rank movement inside a four-team table is
 * noise; it lives only in the league view where there are sixteen rows to move through.
 */

const GRID = '21px minmax(0,1fr) 50px 44px 40px 34px 42px 52px'

const DivisionBlock: React.FC<{
  name: string
  teams: TeamStanding[]
  favouriteTeamId: number | null
}> = ({ name, teams, favouriteTeamId }) => {
  const leader = teams[0]
  return (
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '10px 14px', background: BG.panel,
        borderBottom: `1px solid ${BORDER.raised}`,
      }}>
        <span style={{ ...font(800, 13, 1, '0.06em'), color: TEXT.strong }}>{name}</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...font(600, 10), color: TEXT.muted }}>LEADS</span>
        <Crest teamId={leader?.id} size={18} />
        <span style={{ ...font(700, 11), color: TEXT.secondary }}>{leader?.abbr}</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: GRID, gap: '9px',
        padding: '7px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
        alignItems: 'center',
      }}>
        <span style={COLUMN_HEADER}>#</span>
        <span style={COLUMN_HEADER}>TEAM</span>
        <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>W–L</span>
        <HoverTooltip text="Record inside this division. It settles a division tie, because these four clubs played the same slate.">
          <span style={{ ...COLUMN_HEADER, textAlign: 'right', display: 'block' }}>DIV</span>
        </HoverTooltip>
        <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>PCT</span>
        <HoverTooltip text="Games behind the last playoff spot in this league. A plus means ahead of the cut.">
          <span style={{ ...COLUMN_HEADER, textAlign: 'right', display: 'block' }}>GB</span>
        </HoverTooltip>
        <HoverTooltip text="Points scored minus points allowed.">
          <span style={{ ...COLUMN_HEADER, textAlign: 'right', display: 'block' }}>DIFF</span>
        </HoverTooltip>
        <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>LAST 5</span>
      </div>

      {teams.map((team, i) => {
        const isYours = favouriteTeamId != null && team.id === favouriteTeamId
        return (
          <div
            key={team.id}
            className="row"
            style={{
              boxSizing: 'border-box',
              display: 'grid', gridTemplateColumns: GRID, gap: '9px',
              padding: '7px 14px', minHeight: '46px', alignItems: 'center',
              borderBottom: i < teams.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
              opacity: team.eliminated ? 0.62 : 1,
              ...(isYours ? ownRowStyle(team) : {}),
            }}
          >
            <SeedBadge team={team} />
            <TeamCell team={team} crestSize={22} isYours={isYours} />
            <span style={{ ...font(700, 14), color: TEXT.strong, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {record(team.wins, team.losses)}
            </span>
            <span style={{ ...font(600, 13), color: TEXT.secondary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {team.divisionWins}-{team.divisionLosses}
            </span>
            <span style={{ ...font(500, 13), color: TEXT.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {pct(team.winPerc)}
            </span>
            <span style={{ textAlign: 'right' }}><GamesBack value={team.gamesBack} /></span>
            <span style={{ textAlign: 'right' }}><Differential value={team.scoreDiff} /></span>
            <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Last5 results={team.last5} /></span>
          </div>
        )
      })}
    </div>
  )
}

const ByDivision: React.FC<{
  leagues: LeagueStandings[]
  favouriteTeamId: number | null
}> = ({ leagues, favouriteTeamId }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '26px' }}>
    {leagues.map(league => {
      const byId = new Map(league.standings.map(t => [t.id, t]))
      return (
        <div key={league.name} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <h2 style={{ ...font(800, 17, 1, '-0.025em'), color: TEXT.primary, margin: 0 }}>{league.name}</h2>
            <span style={{ flex: 1, height: '1px', background: BORDER.hairline }} />
            <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted }}>DIV RECORD BREAKS TIES</span>
          </div>
          {league.divisions.map(div => (
            <DivisionBlock
              key={div.name}
              name={div.name}
              teams={div.teamIds.map(id => byId.get(id)).filter((t): t is TeamStanding => !!t)}
              favouriteTeamId={favouriteTeamId}
            />
          ))}
        </div>
      )
    })}
  </div>
)

export default ByDivision
