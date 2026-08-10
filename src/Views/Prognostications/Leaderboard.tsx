import React, { useState } from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'

export interface BoardEntry {
  rank: number
  userId: number
  username: string
  correctCount: number
  totalPicks: number
  totalPoints: number
  accuracy: number
  clairvoyantWeeks?: number
  allAuto?: boolean
}

/**
 * Who is winning, this week and this season.
 *
 * ⚠️ Lost in the page rebuild — the old `PickEmPanel` carried it as a third tab, and
 * the new page shipped without one. Picking against nobody is solitaire.
 *
 * It sits in the rail rather than taking the width, because it answers a different
 * question from the slate: the slate is "who do I take", this is "how am I doing
 * against everyone else". The reader's own row is pinned into view when they are
 * outside the top of the board, so the panel always answers that second question
 * even in a big league.
 */
const ROWS = 8

const RANK_COLOR: Record<number, string> = {
  1: ACCENT.warning,
  2: TEXT.secondary,
  3: '#cd7f32',
}

const Row: React.FC<{ entry: BoardEntry; isMe: boolean; showPicks: boolean }> = ({
  entry, isMe, showPicks,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '7px 15px',
    background: isMe ? 'rgba(56,189,248,0.10)' : 'transparent',
    borderLeft: `2px solid ${isMe ? ACCENT.info : 'transparent'}`,
  }}>
    <span style={{
      ...font(700, 11), color: RANK_COLOR[entry.rank] ?? TEXT.muted,
      width: '20px', flexShrink: 0, ...TABULAR,
    }}>{entry.rank}</span>
    <span style={{
      ...font(isMe ? 700 : 500, 12), color: isMe ? TEXT.primary : TEXT.body,
      flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{entry.username}</span>
    {/* ⚠️ An all-auto week is marked. Auto-picks take the pre-game rate and never
        overwrite a manual pick, so a board topped by someone who set a mode and walked
        away should say so rather than read as a week of good calls. */}
    {entry.allAuto && (
      <span style={{ ...font(700, 8, 1, '0.1em'), color: TEXT.muted, flexShrink: 0 }}>AUTO</span>
    )}
    {showPicks && (
      <span style={{ ...font(400, 10), color: TEXT.muted, ...TABULAR, flexShrink: 0 }}>
        {entry.correctCount}/{entry.totalPicks}
      </span>
    )}
    <span style={{
      ...font(700, 12), color: ACCENT.warning, ...TABULAR,
      width: '46px', textAlign: 'right', flexShrink: 0,
    }}>{entry.totalPoints.toLocaleString()}</span>
  </div>
)

export const Leaderboard: React.FC<{
  season: BoardEntry[]
  week: BoardEntry[]
  weekNumber: number | null
  myUserId?: number
}> = ({ season, week, weekNumber, myUserId }) => {
  const [scope, setScope] = useState<'season' | 'week'>('season')
  const entries = scope === 'season' ? season : week

  if (!season.length && !week.length) return null

  const top = entries.slice(0, ROWS)
  // The reader's own row, appended when they are below the fold — otherwise the
  // board is a list of strangers.
  const mine = myUserId != null ? entries.find(e => e.userId === myUserId) : undefined
  const mineBelow = mine && !top.some(e => e.userId === mine.userId) ? mine : null

  const tab = (key: 'season' | 'week', label: string) => (
    <button
      key={key}
      onClick={() => setScope(key)}
      style={{
        ...font(scope === key ? 700 : 500, 10, 1, '0.08em'),
        color: scope === key ? TEXT.primary : TEXT.muted,
        background: scope === key ? BG.card : 'transparent',
        border: 'none', padding: '5px 9px', cursor: 'pointer', fontFamily: FONT,
      }}
    >{label}</button>
  )

  return (
    <div style={{
      background: BG.panel, border: `1px solid ${BORDER.hairline}`,
      marginTop: '14px', fontFamily: FONT,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 15px', borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <span style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.secondary }}>LEADERBOARD</span>
        <span style={{ flex: 1 }} />
        {tab('season', 'SEASON')}
        {tab('week', weekNumber ? `WK ${weekNumber}` : 'WEEK')}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '18px 15px', ...font(400, 11), color: TEXT.muted }}>
          Nothing scored yet.
        </div>
      ) : (
        <div style={{ padding: '4px 0' }}>
          {top.map(e => (
            <Row key={e.userId} entry={e} isMe={e.userId === myUserId} showPicks={scope === 'week'} />
          ))}
          {mineBelow && (
            <>
              <div style={{ height: '1px', background: BORDER.hairline, margin: '4px 15px' }} />
              <Row entry={mineBelow} isMe showPicks={scope === 'week'} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
