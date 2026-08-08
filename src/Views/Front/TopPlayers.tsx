import React from 'react'
import { Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import PlayerAvatar from '@/Components/PlayerAvatar'
import { BG, BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'
import { Stars } from '@/Components/Stars'
import { SectionHeader, RelationTag } from './frontPieces'

export interface LeaderRow {
  id: number
  name: string
  position: string
  teamAbbr: string
  teamId: number | null
  teamColor: string
  ratingStars: number
  statLabel: string
  statValue: string
}

/**
 * Who currently leads each stat category — one row per leaderboard, best player first.
 *
 * It is a board of LEADERS, not a single ranking: every row is the top of a different
 * category, so the eight or ten rows span passing, running, catching, kicking and fantasy
 * rather than being eight quarterbacks stacked by yards.
 *
 * The RELATIONSHIP TAGS are the point of it being here rather than only on the stats
 * page — YOURS when the player is on the user's favourite team, FANTASY when they are on
 * their fantasy roster. Without them this is the stats page in miniature; with them it is
 * a reason to look.
 */
const TopPlayers: React.FC<{
  rows: LeaderRow[]
  favouriteTeamId: number | null
  fantasyPlayerIds: Set<number>
}> = ({ rows, favouriteTeamId, fantasyPlayerIds }) => {
  if (rows.length === 0) return null

  return (
    <div style={{ marginTop: '26px' }}>
      <SectionHeader title="TOP PLAYERS" link={{ to: '/players', label: 'ALL STATS →' }} />
      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
        {rows.map((row, i) => {
          const yours = favouriteTeamId != null && row.teamId === favouriteTeamId
          const fantasy = fantasyPlayerIds.has(row.id)
          return (
            <div
              key={row.id}
              className="row"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px',
                borderBottom: i < rows.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
              }}
            >
              <span style={{ ...font(700, 12), color: TEXT.muted, width: '16px', flexShrink: 0, ...TABULAR }}>
                {i + 1}
              </span>
              <PlayerAvatar name={row.name} teamId={row.teamId} size={22} />
              <PlayerHoverCard playerId={row.id} playerName={row.name}>
                <Link
                  to={`/players/${row.id}`}
                  style={{ ...font(800, 13), color: TEXT.strong, whiteSpace: 'nowrap', textDecoration: 'none' }}
                >{row.name}</Link>
              </PlayerHoverCard>
              {/* Stars sit BESIDE the name, not out at the far right — a rating belongs to
                  the player, and the shared component colours it by band (gold/green/blue/
                  grey/red) instead of the flat amber this used to draw. */}
              <Stars stars={row.ratingStars} size={11} />
              {yours && <RelationTag label="YOURS" color={readableTeamColor(row.teamColor)} />}
              {fantasy && <RelationTag label="FANTASY" color={ACCENT.success} />}
              <span style={{ ...font(500, 11, 1, '0.06em'), color: TEXT.muted, whiteSpace: 'nowrap' }}>
                {row.position} · {row.teamAbbr}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{
                ...font(700, 10, 1, '0.1em'), color: TEXT.secondary,
                width: '96px', textAlign: 'right', flexShrink: 0,
              }}>{row.statLabel}</span>
              <span style={{
                ...font(800, 16), color: TEXT.primary, ...TABULAR,
                width: '62px', textAlign: 'right', flexShrink: 0,
              }}>{row.statValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TopPlayers
