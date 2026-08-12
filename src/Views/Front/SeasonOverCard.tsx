import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import type { SeasonRecapResponse, RecapUserLbEntry } from '@/types/recap'
import { readableTeamColor } from '@/utils/colors'

/**
 * The season, compressed to what fits in the personal rail.
 *
 * ⚠️ This takes the QuickPicks slot, which has nothing to offer in the offseason — there
 * are no fixtures to prognosticate on, so the rail's bottom third was dead for the whole
 * break. It is the RAIL, so it is the reader's own business first: where THEY finished
 * comes above the league's awards, and the league's awards are three lines, not a table.
 *
 * The full thing is one click away. This card exists to say "here is how it ended" to
 * someone who has landed on the front page and may not click at all.
 */

interface Props {
  recap: SeasonRecapResponse | null
  /** The signed-in reader, so their own finish can be pulled out of the leaderboards. */
  userId?: number | null
}

const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
  gap: '10px', padding: '7px 0',
}
const LABEL: React.CSSProperties = { ...font(700, 10, 1, '0.12em'), color: TEXT.muted, flexShrink: 0 }
const VALUE: React.CSSProperties = { ...font(700, 13, 1.2), color: TEXT.body, textAlign: 'right', minWidth: 0 }

/** One reader's finish in a board, or null when they did not appear in it. */
const findMe = (
  rows: RecapUserLbEntry[] | undefined,
  userId: number | null | undefined,
): RecapUserLbEntry | null =>
  (userId == null ? null : (rows ?? []).find(r => r.userId === userId) ?? null)

interface MyFinish { label: string; rank: number; points: number }

const ordinal = (n: number): string => {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

export const SeasonOverCard: React.FC<Props> = ({ recap, userId }) => {
  const champion = recap?.awards?.champion ?? null
  const mvp = recap?.awards?.mvp ?? null
  const hofCount = recap?.awards?.hofInductees?.length ?? 0

  // ⚠️ Only the boards the reader actually placed in. Printing "Fantasy —" for every
  // board they skipped fills the card with their own absence.
  const mine = useMemo<MyFinish[]>(() => {
    const lb = recap?.userLeaderboards
    if (!lb) return []
    const boards: [string, RecapUserLbEntry[]][] = [
      ['Fantasy', lb.fantasy],
      ['Prognostications', lb.pickem],
      ['Bracket', lb.bracket],
    ]
    return boards.reduce<MyFinish[]>((out, [label, rows]) => {
      const row = findMe(rows, userId)
      if (row) out.push({ label, rank: row.rank, points: row.totalPoints })
      return out
    }, [])
  }, [recap, userId])

  if (!recap) return null

  return (
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '16px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ ...font(700, 11, 1, '0.12em'), color: TEXT.muted }}>
          SEASON {recap.season}
        </div>
        <Link to="/offseason" style={{ ...font(700, 10, 1, '0.06em'), color: ACCENT.info, textDecoration: 'none', fontFamily: FONT }}>
          FULL RECAP
        </Link>
      </div>

      <div style={{ marginTop: '10px', borderTop: `1px solid ${BORDER.subtle}` }}>
        <div style={ROW}>
          <span style={LABEL}>CHAMPION</span>
          {/* ⚠️ Team colors are DATA and a good few are navy or maroon, which is
              unreadable as text on this surface. `readableTeamColor` lifts in HSL so the
              club stays recognizably its own color. */}
          <span style={{ ...VALUE, color: champion ? readableTeamColor(champion.color, BG.card) : TEXT.body }}>
            {champion ? champion.name : '—'}
          </span>
        </div>
        <div style={{ ...ROW, borderTop: `1px solid ${BORDER.subtle}` }}>
          <span style={LABEL}>MVP</span>
          <span style={VALUE}>{mvp ? mvp.name : '—'}</span>
        </div>
        {hofCount > 0 && (
          <div style={{ ...ROW, borderTop: `1px solid ${BORDER.subtle}` }}>
            <span style={LABEL}>HALL OF FAME</span>
            <span style={{ ...VALUE, ...TABULAR }}>
              {hofCount} inducted
            </span>
          </div>
        )}
      </div>

      {mine.length > 0 && (
        <>
          <div style={{ ...font(700, 10, 1, '0.12em'), color: TEXT.muted, margin: '16px 0 2px' }}>
            YOUR FINISH
          </div>
          <div style={{ borderTop: `1px solid ${BORDER.subtle}` }}>
            {mine.map(({ label, rank, points }) => (
              <div key={label} style={{ ...ROW, borderBottom: `1px solid ${BORDER.subtle}` }}>
                <span style={{ ...font(400, 12), color: TEXT.secondary }}>{label}</span>
                <span style={{ ...font(700, 13), color: rank <= 3 ? ACCENT.warning : TEXT.body, ...TABULAR }}>
                  {ordinal(rank)}
                  <span style={{ ...font(400, 11), color: TEXT.dim }}>{`  ${Math.round(points)}`}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default SeasonOverCard
