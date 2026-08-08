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

const ByLeague: React.FC<{
  leagues: LeagueStandings[]
  favouriteTeamId: number | null
}> = ({ leagues, favouriteTeamId }) => (
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
              <span style={{ ...font(600, 10, 1, '0.08em'), color: PLAYOFF.cutlineText }}>CUTLINE AFTER SEED 8</span>
            </span>
          </div>

          <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
            <div style={{
              display: 'grid', gridTemplateColumns: GRID, gap: '13px',
              padding: '8px 18px', borderBottom: `1px solid ${BORDER.hairline}`, alignItems: 'center',
            }}>
              <HoverTooltip text="Projected playoff seed if the season ended today. Seeds 1-4 are the division winners.">
                <span style={{ ...COLUMN_HEADER, display: 'block' }}>#</span>
              </HoverTooltip>
              <HoverTooltip text="Change in this team's league rank by record since last week.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'center' }}>±</span>
              </HoverTooltip>
              <span style={COLUMN_HEADER}>TEAM</span>
              <span style={COLUMN_HEADER}>DIVISION</span>
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>W–L</span>
              <HoverTooltip text="Record inside this team's own division. It settles a division tie: those four teams played the same slate.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>DIV</span>
              </HoverTooltip>
              <HoverTooltip text="Record against this league. It settles a wild card tie, where the teams come from different divisions and division record would compare different opponents.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>LGE</span>
              </HoverTooltip>
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>PCT</span>
              <HoverTooltip text="Games behind the last playoff spot. A plus means ahead of the cut.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>GB</span>
              </HoverTooltip>
              <HoverTooltip text="Points scored minus points allowed.">
                <span style={{ ...COLUMN_HEADER, display: 'block', textAlign: 'right' }}>DIFF</span>
              </HoverTooltip>
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>STRK</span>
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>ELO</span>
              <span style={{ ...COLUMN_HEADER, textAlign: 'right' }}>LAST 5</span>
            </div>

            {league.standings.map((team, i) => {
              const isYours = favouriteTeamId != null && team.id === favouriteTeamId
              const isCutRow = i === cutIndex
              const divisionWinner = team.seedKind === 'division'
              const wildcard = team.seedKind === 'wildcard'
              return (
                <div
                  key={team.id}
                  className="row"
                  style={{
                    boxSizing: 'border-box',
                    display: 'grid', gridTemplateColumns: GRID, gap: '13px',
                    padding: '8px 18px', minHeight: '52px', alignItems: 'center',
                    borderBottom: isCutRow
                      ? `2px solid ${PLAYOFF.cutline}`
                      : i < league.standings.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
                    opacity: team.eliminated ? 0.62 : 1,
                    ...(isYours ? ownRowStyle(team) : {}),
                  }}
                >
                  <SeedBadge team={team} />
                  <span style={{ textAlign: 'center' }}><Movement change={team.rankChange} /></span>
                  <TeamCell team={team} isYours={isYours} />
                  <span style={{ ...font(500, 12), color: TEXT.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.division || '—'}
                  </span>
                  <span style={{ ...font(700, 16), color: TEXT.strong, textAlign: 'right', ...TABULAR }}>
                    {record(team.wins, team.losses)}
                  </span>
                  <span style={{
                    ...font(600, 14), textAlign: 'right', ...TABULAR,
                    color: divisionWinner ? TEXT.secondary : TEXT.muted,
                  }}>{team.divisionWins}-{team.divisionLosses}</span>
                  <span style={{
                    ...font(600, 14), textAlign: 'right', ...TABULAR,
                    color: wildcard ? TEXT.secondary : TEXT.muted,
                  }}>{team.leagueWins}-{team.leagueLosses}</span>
                  <span style={{ ...font(500, 14), color: TEXT.muted, textAlign: 'right', ...TABULAR }}>
                    {pct(team.winPerc)}
                  </span>
                  <span style={{ textAlign: 'right' }}><GamesBack value={team.gamesBack} /></span>
                  <span style={{ textAlign: 'right' }}><Differential value={team.scoreDiff} /></span>
                  <span style={{ textAlign: 'right' }}><Streak value={team.streak} /></span>
                  <span style={{ ...font(500, 13), color: TEXT.muted, textAlign: 'right', ...TABULAR }}>
                    {Math.round(team.elo)}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Last5 results={team.last5} /></span>
                </div>
              )
            })}
          </div>

          <SectionNote label="SEEDING">
            Seeds 1 to 4 are the four division winners. A division is won on record, then on
            division record. Seeds 5 to 8 are the wild cards. Teams from different divisions
            are separated by league record instead, because they did not play the same
            division slate. Point differential settles anything still level.
          </SectionNote>
        </div>
      )
    })}
  </div>
)

export default ByLeague
