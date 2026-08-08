import React from 'react'
import { Link } from 'react-router-dom'
import TeamHoverCard from '@/Components/TeamHoverCard'
import { BG, BORDER, TEXT, ACCENT, PLAYOFF, TABULAR, font } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'
import { Crest } from '@/Views/GameBoard/boardPieces'
import type { TeamStanding } from './standingsTypes'

/**
 * A seed badge: a tinted circle with a ring, number in the accent tone.
 *
 * NOT a solid block with knocked-out text — that was built first and the digit was
 * unreadable at 21px. `box-sizing: border-box` so the ring does not push the badge out
 * of its column.
 */
export const SeedBadge: React.FC<{ team: TeamStanding }> = ({ team }) => {
  const base: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '21px', height: '21px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    ...font(800, 11),
    ...TABULAR,
  }

  if (team.seed == null) {
    return (
      <span style={{ ...base, color: team.eliminated ? ACCENT.negative : TEXT.muted }}>
        {team.eliminated ? '×' : '–'}
      </span>
    )
  }

  const tone = team.seed === 1
    ? { ring: PLAYOFF.topSeedRing, text: PLAYOFF.topSeedText, fill: PLAYOFF.topSeedFill }
    : team.seedKind === 'division'
      ? { ring: PLAYOFF.divisionRing, text: PLAYOFF.divisionText, fill: PLAYOFF.divisionFill }
      : { ring: PLAYOFF.wildcardRing, text: PLAYOFF.wildcardText, fill: PLAYOFF.wildcardFill }

  return (
    <span style={{ ...base, border: `1px solid ${tone.ring}`, background: tone.fill, color: tone.text }}>
      {team.seed}
    </span>
  )
}

/**
 * Crest + city over team name.
 *
 * The user's own club is marked by the ROW — tinted background, inset rail in the team's
 * colour, and the name in that colour too. A "YOURS" tag on top of all that was redundant
 * (owner).
 */
export const TeamCell: React.FC<{
  team: TeamStanding
  crestSize?: number
  isYours?: boolean
}> = ({ team, crestSize = 26, isYours = false }) => (
  <TeamHoverCard teamId={team.id}>
    <Link
      to={`/team/${team.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0 }}
    >
      <Crest teamId={team.id} size={crestSize} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', ...font(500, 11), color: TEXT.muted, whiteSpace: 'nowrap' }}>
          {team.city}
        </span>
        <span style={{
          display: 'block',
          ...font(700, 15, 1, '-0.015em'),
          color: isYours ? readableTeamColor(team.color) : TEXT.strong,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{team.name}</span>
      </span>
    </Link>
  </TeamHoverCard>
)

/**
 * Five result bars, oldest to newest. Solid fills, no borders — an earlier version drew
 * losses as a near-black fill with a maroon border and they vanished into the card.
 */
export const Last5: React.FC<{ results: ('W' | 'L' | 'T')[] }> = ({ results }) => (
  <span style={{ display: 'flex', gap: '3px' }}>
    {results.map((r, i) => (
      <span
        key={i}
        style={{
          width: '9px', height: '15px',
          background: r === 'W' ? ACCENT.live : r === 'L' ? ACCENT.negative : TEXT.muted,
        }}
      />
    ))}
  </span>
)

/** `▲3` / `▼1` / `—`. League view only — movement is meaningless in a four-team table. */
export const Movement: React.FC<{ change: number }> = ({ change }) => {
  if (!change) return <span style={{ ...font(500, 11), color: TEXT.muted }}>—</span>
  const up = change > 0
  return (
    <span style={{ ...font(600, 11), color: up ? ACCENT.live : ACCENT.negative, ...TABULAR }}>
      {up ? '▲' : '▼'}{Math.abs(change)}
    </span>
  )
}

/** Games back reads as a race: `—` on the cut, `+2` ahead, `2` chasing. */
export const GamesBack: React.FC<{ value: number }> = ({ value }) => {
  const format = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  if (value === 0) return <span style={{ ...font(600, 13), color: PLAYOFF.cutlineText, ...TABULAR }}>—</span>
  if (value < 0) return <span style={{ ...font(600, 13), color: ACCENT.live, ...TABULAR }}>+{format(-value)}</span>
  return <span style={{ ...font(600, 13), color: TEXT.muted, ...TABULAR }}>{format(value)}</span>
}

export const Differential: React.FC<{ value: number }> = ({ value }) => (
  <span style={{
    ...font(600, 13),
    color: value > 0 ? ACCENT.live : value < 0 ? ACCENT.negative : TEXT.muted,
    ...TABULAR,
  }}>{value > 0 ? `+${value}` : value}</span>
)

export const Streak: React.FC<{ value: string }> = ({ value }) => {
  if (!value) return <span style={{ ...font(600, 13), color: TEXT.muted }}>—</span>
  return (
    <span style={{
      ...font(700, 13),
      color: value.startsWith('W') ? ACCENT.live : value.startsWith('L') ? ACCENT.negative : TEXT.muted,
      ...TABULAR,
    }}>{value}</span>
  )
}

/** Percentage with the leading zero stripped, the way a standings board reads it. */
export const pct = (winPerc: string | number): string => {
  const value = typeof winPerc === 'number' ? winPerc.toFixed(3) : String(winPerc)
  return value.replace(/^0/, '')
}

export const record = (wins: number, losses: number): string => `${wins}-${losses}`

export const COLUMN_HEADER: React.CSSProperties = {
  ...font(600, 10, 1, '0.12em'),
  color: TEXT.muted,
}

/**
 * The row treatment for the user's own club: a tinted background plus an INSET shadow
 * rail. Inset rather than a border — a border shrinks the content box and knocks the row
 * out of alignment with the header above it.
 */
export const ownRowStyle = (team: TeamStanding): React.CSSProperties => ({
  background: 'rgba(197,17,98,0.10)',
  boxShadow: `inset 3px 0 0 ${team.color}`,
})

export const SectionNote: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{
    display: 'flex', gap: '14px', alignItems: 'baseline',
    background: BG.panel, border: `1px solid ${BORDER.hairline}`, padding: '10px 16px',
  }}>
    <span style={{ ...font(600, 10, 1, '0.12em'), color: TEXT.muted, flexShrink: 0 }}>{label}</span>
    <span style={{ ...font(400, 12, 1.5), color: TEXT.muted }}>{children}</span>
  </div>
)
