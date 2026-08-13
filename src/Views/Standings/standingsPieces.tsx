import React from 'react'
import { Link } from 'react-router-dom'
import TeamHoverCard from '@/Components/TeamHoverCard'
import HoverTooltip from '@/Components/HoverTooltip'
import { BG, BORDER, TEXT, ACCENT, PLAYOFF, TABULAR, font } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'
import { Crest } from '@/Views/GameBoard/boardPieces'
import type { TeamStanding } from './standingsTypes'

/**
 * A trophy, for a club that has WON ITS DIVISION.
 *
 * A mark rather than a letter (owner). The traditional x/y/z notation needs a legend to
 * mean anything, and the thing being announced here is a title — the one most of the
 * league is actually playing for, since at eight divisions 24 of 32 clubs will never win
 * a league title.
 *
 * Sized to sit on the club name's line without pushing it; `flexShrink: 0` so it survives
 * the narrow columns rather than being squeezed to nothing.
 */
export const TrophyIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13, color = PLAYOFF.topSeedText,
}) => (
  <svg
    viewBox="0 0 24 24" width={size} height={size} fill={color}
    style={{ flexShrink: 0, display: 'block' }}
    aria-hidden="true"
  >
    <path d="M18 4h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-.3a6 6 0 0 1-4.7 4.9V19h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-3.1A6 6 0 0 1 6.3 11H6a4 4 0 0 1-4-4V6a2 2 0 0 1 2-2h2V3h12v1ZM6 6H4v1a2 2 0 0 0 2 2V6Zm12 3a2 2 0 0 0 2-2V6h-2v3Z" />
  </svg>
)

/**
 * A seed badge: a tinted circle with a ring, number in the accent tone.
 *
 * NOT a solid block with knocked-out text — that was built first and the digit was
 * unreadable at 21px. `box-sizing: border-box` so the ring does not push the badge out
 * of its column.
 *
 * ⚠️ CLINCHED reads as a HEAVIER RING, not a fill. A projected seed and a secured one are
 * different claims and the board shows both all season, so the badge has to carry the
 * difference — but filling it solid is exactly the treatment that made the digit
 * unreadable, so the weight goes into the ring instead. The seed number stays legible in
 * every state.
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

  // Secured, not merely projected. The top seed is the strongest claim on the board, so
  // it gets the ring AND a halo; a clinched berth gets the ring alone.
  const clinched = team.clinchedTopSeed || team.clinchedPlayoffs
  // No em-dashes in copy a reader sees.
  const label = team.clinchedTopSeed
    ? `Top seed clinched (seed ${team.seed})`
    : team.clinchedPlayoffs
      ? `Playoff berth clinched (seed ${team.seed})`
      : `Projected seed ${team.seed}`

  return (
    <HoverTooltip text={label}>
      <span
        style={{
          ...base,
          border: `${clinched ? 2 : 1}px solid ${tone.ring}`,
          background: tone.fill,
          color: tone.text,
          boxShadow: team.clinchedTopSeed ? `0 0 0 2px ${tone.fill}` : undefined,
        }}
      >
        {team.seed}
      </span>
    </HoverTooltip>
  )
}

/**
 * Crest + city over team name.
 *
 * The user's own club is marked by the ROW — tinted background, inset rail in the team's
 * color, and the name in that color too. A "YOURS" tag on top of all that was redundant
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{
            ...font(700, 15, 1, '-0.015em'),
            color: isYours ? readableTeamColor(team.color) : TEXT.strong,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team.name}</span>
          {/* ⚠️ AFTER the name, inside the same flex row, so the name keeps the
              ellipsis and the trophy is never the thing that gets truncated. */}
          {team.clinchedDivision && (
            <HoverTooltip text={`${team.division || 'Division'} division champions`}>
              <TrophyIcon />
            </HoverTooltip>
          )}
        </span>
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
