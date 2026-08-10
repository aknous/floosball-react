import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest, PulsingDot } from '@/Views/GameBoard/boardPieces'
import { leadingSide } from '@/Views/GameBoard/gameFormat'
import { downAndDistance } from '@/Views/GameBoard/lastPlaySummary'
import { readableTeamColor } from '@/utils/colors'

/**
 * What is happening right now, across the top of the front page.
 *
 * ⚠️ This replaces a static welcome message and four nav links that duplicated the
 * sidebar exactly (owner). The rail read as sparse because nothing in it was live or
 * unavailable elsewhere — the front page had a news feed, a leader table and the
 * reader's own numbers, and no view at all of the games actually in progress.
 *
 * Every tile is a link into that game's page, so the most alive thing in the product
 * stops being two clicks away.
 */

/**
 * Where the game IS, in whatever unit the format counts in.
 *
 * ⚠️ Not `Q{quarter}`. Frames count frames and innings count innings, and both were
 * reading as "Q1" here for the whole game — the tile was the last surface still
 * assuming quarters.
 */
function periodOf(game: CurrentGame): string {
  if (game.innings?.active) {
    return `${game.innings.half === 'bottom' ? 'BOT' : 'TOP'} ${game.innings.inning}`
  }
  if (game.frames?.active && !game.frames.overtime) {
    return `F${game.frames.currentFrame} ${game.frames.frameClock ?? ''}`.trim()
  }
  const q = Number(game.quarter) || 0
  return `${q > 4 ? 'OT' : `Q${q}`} ${game.timeRemaining}`.trim()
}

const Tile: React.FC<{ game: CurrentGame; onOpen: (id: number) => void }> = ({ game, onOpen }) => {
  const away = game.awayTeam
  const home = game.homeTeam
  const live = game.status === 'Active'
  const isFinal = game.status === 'Final'
  // Who is ahead is a FORMAT question — in frames it is frames won, not points.
  const leader = leadingSide(game)
  const frames = game.frames?.active ? game.frames : null

  const state = isFinal ? 'FINAL'
    : game.isHalftime ? 'HALF'
      : live ? periodOf(game)
        : 'SOON'

  /**
   * ⚠️ The right of each row used to be empty — a 164px tile carrying a crest, three
   * letters and a score, with about half its width doing nothing. What goes there is
   * the club's RECORD, which is the one thing that makes a score mean something at a
   * glance and is on the payload already. While a frames match is on, frames won
   * displaces it: the record is context, and frames won is the actual score.
   */
  const side = (team: typeof away, score: number, ahead: boolean, framesWon: number | null) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
      <Crest teamId={team?.id} size={16} />
      <span style={{
        ...font(ahead ? 800 : 600, 12, 1, '0.02em'),
        color: ahead ? readableTeamColor(team?.color || '#94a3b8') : TEXT.muted,
        ...TABULAR, whiteSpace: 'nowrap',
      }}>{team?.abbr}</span>
      <span style={{ flex: 1, minWidth: '10px' }} />
      {framesWon != null ? (
        <span style={{
          ...font(ahead ? 800 : 600, 12, 1), ...TABULAR,
          color: ahead ? ACCENT.live : TEXT.dim, whiteSpace: 'nowrap',
        }}>{framesWon}<span style={{ ...font(500, 9), color: TEXT.faint }}> FR</span></span>
      ) : team?.record ? (
        <span style={{ ...font(500, 10), color: TEXT.dim, ...TABULAR, whiteSpace: 'nowrap' }}>
          {team.record}
        </span>
      ) : null}
      <span style={{
        ...font(ahead ? 800 : 500, 14, 1), ...TABULAR,
        color: ahead ? TEXT.primary : TEXT.muted,
        minWidth: '22px', textAlign: 'right',
      }}>{score}</span>
    </span>
  )

  return (
    <button
      onClick={() => onOpen(game.id)}
      className="plate"
      style={{
        display: 'flex', flexDirection: 'column', gap: '7px', flexShrink: 0,
        background: BG.card, border: `1px solid ${BORDER.hairline}`,
        padding: '10px 13px', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
        minWidth: '186px',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {live && !game.isHalftime && <PulsingDot size={5} />}
        <span style={{
          ...font(700, 10, 1, '0.1em'), ...TABULAR,
          color: isFinal ? TEXT.muted : ACCENT.live,
        }}>{state}</span>
        <span style={{ flex: 1, minWidth: '8px' }} />
        {/* The situation, on the line that already says when. A scheduled game has no
            down to report and a final has no situation left, so both stay bare. */}
        {live && !game.isHalftime && (
          <span style={{ ...font(500, 10, 1), color: TEXT.faint, ...TABULAR, whiteSpace: 'nowrap' }}>
            {downAndDistance(game) ?? game.yardLine ?? ''}
          </span>
        )}
      </span>
      {side(away, game.awayScore ?? 0, leader !== 'home', frames ? frames.framesWonAway ?? 0 : null)}
      {side(home, game.homeScore ?? 0, leader !== 'away', frames ? frames.framesWonHome ?? 0 : null)}
    </button>
  )
}

const LiveTicker: React.FC<{
  games: CurrentGame[]
  weekLabel: string
  onOpen: (id: number) => void
}> = ({ games, weekLabel, onOpen }) => {
  // Live first, then whatever has not kicked off, then finals — the order a reader
  // scans for. Within each state the slate's own order is left alone.
  const rank = (g: CurrentGame) => (g.status === 'Active' ? 0 : g.status === 'Scheduled' ? 1 : 2)
  const ordered = [...games].sort((a, b) => rank(a) - rank(b))
  const liveCount = games.filter(g => g.status === 'Active').length
  const finalCount = games.filter(g => g.status === 'Final').length

  const summary = games.length === 0 ? 'NO GAMES SCHEDULED'
    : liveCount > 0 ? `${liveCount} LIVE`
      : finalCount === games.length ? `ALL ${games.length} FINAL`
        : `${games.length} TO COME`

  return (
    <div style={{
      background: BG.panel, border: `1px solid ${BORDER.hairline}`,
      fontFamily: FONT, minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 16px', borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <span style={{ ...font(800, 13, 1, '-0.02em'), color: TEXT.primary }}>{weekLabel}</span>
        <span style={{ width: '1px', height: '13px', background: BORDER.raised }} />
        <span style={{
          ...font(700, 10, 1, '0.1em'),
          color: liveCount > 0 ? ACCENT.live : TEXT.muted,
        }}>{summary}</span>
      </div>

      {games.length === 0 ? (
        <div style={{ padding: '22px 16px', ...font(400, 12), color: TEXT.muted }}>
          The next slate will appear here.
        </div>
      ) : (
        // ⚠️ Horizontal SCROLL rather than a wrap or a marquee. A wrap makes the rail
        // grow taller as the slate does, which is the opposite of what a rail is for;
        // a marquee moves the thing a reader is trying to click.
        <div style={{
          display: 'flex', gap: '9px', padding: '12px 16px',
          overflowX: 'auto', overflowY: 'hidden',
        }}>
          {ordered.map(game => <Tile key={game.id} game={game} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

export default LiveTicker
