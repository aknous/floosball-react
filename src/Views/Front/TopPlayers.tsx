import React from 'react'
import { Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import PlayerAvatar from '@/Components/PlayerAvatar'
import { BG, BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
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
 * The FANTASY tag is the reason this belongs on a personal landing page rather than only
 * on the stats page. A YOURS tag was here too and came out (owner): being on your
 * favourite club is true of a quarter of the league and says nothing about the player,
 * where having drafted them is a choice you actually made.
 *
 * It is a board of LEADERS, not a single ranking: every row is the top of a different
 * category, so the eight or ten rows span passing, running, catching, kicking and fantasy
 * rather than being eight quarterbacks stacked by yards.
 * */
const TopPlayers: React.FC<{
  rows: LeaderRow[]
  /** The categories the board tracks, so empty rows can still be labelled. */
  categoryLabels: string[]
  fantasyPlayerIds: Set<number>
}> = ({ rows, categoryLabels, fantasyPlayerIds }) => {
  // A brand-new league has no leader in any category yet. The panel still renders, one
  // blank row per leaderboard, rather than vanishing (owner) — an absent module reads as
  // broken, where a labelled empty row reads as "nobody has done this yet". The rows are
  // the same height either way, so the page does not jump when the first result lands.
  const placeholders = categoryLabels.slice(rows.length)

  return (
    <div style={{ marginTop: '26px' }}>
      <SectionHeader title="TOP PLAYERS" link={{ to: '/players', label: 'ALL STATS →' }} />
      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
        {rows.map((row, i) => {
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
              <Stars stars={row.ratingStars} size={15} tracking={1.5} />
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

        {placeholders.map((label, i) => (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px',
              minHeight: '44px', boxSizing: 'border-box',
              borderBottom: i < placeholders.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
            }}
          >
            <span style={{ ...font(700, 12), color: TEXT.faint, width: '16px', flexShrink: 0, ...TABULAR }}>
              {rows.length + i + 1}
            </span>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              border: `1px dashed ${BORDER.raised}`, boxSizing: 'border-box', flexShrink: 0,
            }} />
            <span style={{ ...font(400, 12), color: TEXT.dim }}>No leader yet</span>
            <span style={{ flex: 1 }} />
            <span style={{
              ...font(700, 10, 1, '0.1em'), color: TEXT.dim,
              width: '96px', textAlign: 'right', flexShrink: 0,
            }}>{label}</span>
            <span style={{
              ...font(800, 16), color: TEXT.dim, ...TABULAR,
              width: '62px', textAlign: 'right', flexShrink: 0,
            }}>—</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopPlayers
