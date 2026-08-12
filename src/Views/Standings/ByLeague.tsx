import React from 'react'
import HoverTooltip from '@/Components/HoverTooltip'
import { BG, BORDER, TEXT, PLAYOFF, TABULAR, font } from '@/Components/Shell/tokens'
import {
  SeedBadge, TeamCell, Last5, Movement, GamesBack, Differential, Streak, pct, record,
  COLUMN_HEADER, ownRowStyle, SectionNote,
} from './standingsPieces'
import type { LeagueStandings } from './standingsTypes'

/**
 * View 2 — the full reference: where everyone sits, and on what.
 *
 * The only view where a club's division race and the league picture are visible at the
 * same time, which is why it is the default.
 *
 * TIEBREAKER EMPHASIS: DIV is brighter on division winners, LGE on wild cards. Each
 * column is lit on the rows it actually decides, so the table explains its own ordering
 * instead of just asserting it.
 */

const GRID = '21px 34px minmax(0,1fr) 84px 58px 50px 50px 48px 46px 54px 46px 52px 66px'

/**
 * ⚠️ A phone gets FOUR columns, not thirteen.
 *
 * The full table is 13 columns and roughly 600px of fixed width before the team name
 * gets any, so on a 390px screen it either overflowed sideways or crushed every column
 * into illegibility. Seed, club, record and games back answer "who is winning and who is
 * making the playoffs", which is what the board is for; the tiebreaker columns, rating,
 * differential and form are all still on the club's own page.
 */
const GRID_COMPACT = '21px minmax(0,1fr) 58px 46px'

const ByLeague: React.FC<{
  leagues: LeagueStandings[]
  favoriteTeamId: number | null
  /** Phone layout: four columns instead of thirteen. */
  compact?: boolean
}> = ({ leagues, favoriteTeamId, compact = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
    {leagues.map(league => {
      const cutIndex = league.standings.findIndex(t => t.seed != null && t.seed === league.standings.filter(x => x.seed != null).length)
      return (
        <div key={league.name} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <h2 style={{ ...font(800, 19, 1, '-0.025em'), color: TEXT.primary, margin: 0 }}>{league.name}</h2>
            <span style={{ flex: 1, height: '1px', background: BORDER.hairline }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '2px', background: PLAYOFF.cutline }} />
              <span style={{ ...font(600, 10, 1, '0.08em'), color: PLAYOFF.cutlineText }}>PLAYOFF LINE</span>
            </span>
          </div>

          <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
            <div style={{
              display: 'grid', gridTemplateColumns: compact ? GRID_COMPACT : GRID,
              gap: compact ? '8px' : '13px',
              padding: compact ? '8px 12px' : '8px 18px',
              borderBottom: `1px solid ${BORDER.hairline}`, alignItems: 'center',
            }}>
              <HoverTooltip text="Projected playoff seed if the season ended today. Seeds 1-4 are the division winners.">
                <span style={{ ...COLUMN_HEADER, display: 'block' }}>#</span>
              </HoverTooltip>
{!compact && (
              <HoverTooltip text="Change in this team's league rank by record since last week.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'center' }}>±</span>
              </HoverTooltip>
              )}
              <span style={COLUMN_HEADER}>TEAM</span>
{!compact && (
              <span style={COLUMN_HEADER}>DIVISION</span>
              )}
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>W–L</span>
{!compact && (
              <HoverTooltip text="Record inside this team's own division. It settles a division tie: those four teams played the same slate.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>DIV</span>
              </HoverTooltip>
              )}
{!compact && (
              <HoverTooltip text="Record against this league. It settles a wild card tie, where the teams come from different divisions and division record would compare different opponents.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>LGE</span>
              </HoverTooltip>
              )}
{!compact && (
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>PCT</span>
              )}
              <HoverTooltip text="Games behind the last playoff spot. A plus means ahead of the cut.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>GB</span>
              </HoverTooltip>
{!compact && (
              <HoverTooltip text="Points scored minus points allowed.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>DIFF</span>
              </HoverTooltip>
              )}
{!compact && (
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>STRK</span>
              )}
{!compact && (
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>ELO</span>
              )}
{!compact && (
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>LAST 5</span>
              )}
            </div>

            {league.standings.map((team, i) => {
              const isYours = favoriteTeamId != null && team.id === favoriteTeamId
              const isCutRow = i === cutIndex
              const divisionWinner = team.seedKind === 'division'
              const wildcard = team.seedKind === 'wildcard'
              return (
                <div
                  key={team.id}
                  className="row"
                  style={{
                    boxSizing: 'border-box',
                    display: 'grid', gridTemplateColumns: compact ? GRID_COMPACT : GRID,
                    gap: compact ? '8px' : '13px',
                    padding: compact ? '8px 12px' : '8px 18px',
                    minHeight: '52px', alignItems: 'center',
                    borderBottom: isCutRow
                      ? `2px solid ${PLAYOFF.cutline}`
                      : i < league.standings.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
                    opacity: team.eliminated ? 0.62 : 1,
                    ...(isYours ? ownRowStyle(team) : {}),
                  }}
                >
                  <SeedBadge team={team} />
{!compact && (
                  <span style={{ textAlign: 'center' }}><Movement change={team.rankChange} /></span>
                  )}
                  <TeamCell team={team} isYours={isYours} />
{!compact && (
                  <span style={{ ...font(500, 12), color: TEXT.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.division || '—'}
                  </span>
                  )}
                  <span style={{ ...font(700, 16), color: TEXT.strong, textAlign: 'right', ...TABULAR }}>
                    {record(team.wins, team.losses)}
                  </span>
{!compact && (
                  <span style={{
                    ...font(600, 14), textAlign: 'right', ...TABULAR,
                    color: divisionWinner ? TEXT.secondary : TEXT.muted,
                  }}>{team.divisionWins}-{team.divisionLosses}</span>
                  )}
{!compact && (
                  <span style={{
                    ...font(600, 14), textAlign: 'right', ...TABULAR,
                    color: wildcard ? TEXT.secondary : TEXT.muted,
                  }}>{team.leagueWins}-{team.leagueLosses}</span>
                  )}
{!compact && (
                  <span style={{ ...font(500, 14), color: TEXT.muted, textAlign: 'right', ...TABULAR }}>
                    {pct(team.winPerc)}
                  </span>
                  )}
                  <span style={{ textAlign: 'right' }}><GamesBack value={team.gamesBack} /></span>
{!compact && (
                  <span style={{ textAlign: 'right' }}><Differential value={team.scoreDiff} /></span>
                  )}
{!compact && (
                  <span style={{ textAlign: 'right' }}><Streak value={team.streak} /></span>
                  )}
{!compact && (
                  <span style={{ ...font(500, 13), color: TEXT.muted, textAlign: 'right', ...TABULAR }}>
                    {Math.round(team.elo)}
                  </span>
                  )}
{!compact && (
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Last5 results={team.last5} /></span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    })}
  </div>
)

export default ByLeague
