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

// ⚠️ A phone keeps seed, club, record and games back. The rest (division record, pct,
// differential, streak, form) is detail for a table you are studying, not glancing at.
const GRID_COMPACT = '21px minmax(0,1fr) 56px 44px'

const DivisionBlock: React.FC<{
  name: string
  teams: TeamStanding[]
  favouriteTeamId: number | null
  compact?: boolean
}> = ({ name, teams, favouriteTeamId, compact = false }) => {
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
        {/* No "LEADS" label (owner). The club on the top row IS the leader — saying so
            in words is the header restating the table underneath it. The crest stays
            because it is a marker, not a sentence. */}
        <Crest teamId={leader?.id} size={18} />
        <span style={{ ...font(700, 11), color: TEXT.secondary }}>{leader?.abbr}</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: compact ? GRID_COMPACT : GRID,
        gap: compact ? '7px' : '9px',
        padding: '7px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
        alignItems: 'center',
      }}>
        <span style={COLUMN_HEADER}>#</span>
        <span style={COLUMN_HEADER}>TEAM</span>
        <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>W–L</span>
{!compact && (
        <HoverTooltip text="Record inside this division. It settles a division tie, because these four teams played the same slate.">
          <span style={{ ...COLUMN_HEADER, textAlign: 'right', display: 'block' }}>DIV</span>
        </HoverTooltip>
        )}
{!compact && (
        <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>PCT</span>
        )}
        <HoverTooltip text="Games behind the last playoff spot in this league. A plus means ahead of the cut.">
          <span style={{ ...COLUMN_HEADER, textAlign: 'right', display: 'block' }}>GB</span>
        </HoverTooltip>
{!compact && (
        <HoverTooltip text="Points scored minus points allowed.">
          <span style={{ ...COLUMN_HEADER, textAlign: 'right', display: 'block' }}>DIFF</span>
        </HoverTooltip>
        )}
{!compact && (
        <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>LAST 5</span>
        )}
      </div>

      {teams.map((team, i) => {
        const isYours = favouriteTeamId != null && team.id === favouriteTeamId
        return (
          <div
            key={team.id}
            className="row"
            style={{
              boxSizing: 'border-box',
              display: 'grid', gridTemplateColumns: compact ? GRID_COMPACT : GRID,
        gap: compact ? '7px' : '9px',
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
{!compact && (
            <span style={{ ...font(600, 13), color: TEXT.secondary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {team.divisionWins}-{team.divisionLosses}
            </span>
            )}
{!compact && (
            <span style={{ ...font(500, 13), color: TEXT.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {pct(team.winPerc)}
            </span>
            )}
            <span style={{ textAlign: 'right' }}><GamesBack value={team.gamesBack} /></span>
{!compact && (
            <span style={{ textAlign: 'right' }}><Differential value={team.scoreDiff} /></span>
            )}
{!compact && (
            <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Last5 results={team.last5} /></span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const ByDivision: React.FC<{
  leagues: LeagueStandings[]
  favouriteTeamId: number | null
  compact?: boolean
}> = ({ leagues, favouriteTeamId, compact = false }) => (
  <div style={{
    display: 'grid',
    // ⚠️ One league per row on a phone. Two 195px columns cannot hold a club name.
    gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0,1fr))',
    gap: compact ? '18px' : '26px',
  }}>
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
              compact={compact}
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
