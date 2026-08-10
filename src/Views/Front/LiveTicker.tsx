import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest, PulsingDot } from '@/Views/GameBoard/boardPieces'
import { leadingSide } from '@/Views/GameBoard/gameFormat'
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

const Tile: React.FC<{ game: CurrentGame; onOpen: (id: number) => void }> = ({ game, onOpen }) => {
  const away = game.awayTeam
  const home = game.homeTeam
  const live = game.status === 'Active'
  const isFinal = game.status === 'Final'
  // Who is ahead is a FORMAT question — in frames it is frames won, not points.
  const leader = leadingSide(game)

  const state = isFinal ? 'FINAL'
    : game.isHalftime ? 'HALF'
      : live ? `Q${game.quarter} ${game.timeRemaining}`
        : 'SOON'

  const side = (team: typeof away, score: number, ahead: boolean) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
      <Crest teamId={team?.id} size={16} />
      <span style={{
        ...font(ahead ? 800 : 600, 12, 1, '0.02em'),
        color: ahead ? readableTeamColor(team?.color || '#94a3b8') : TEXT.muted,
        ...TABULAR, whiteSpace: 'nowrap',
      }}>{team?.abbr}</span>
      <span style={{
        ...font(ahead ? 800 : 500, 14, 1), ...TABULAR,
        color: ahead ? TEXT.primary : TEXT.muted,
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
        minWidth: '164px',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {live && !game.isHalftime && <PulsingDot size={5} />}
        <span style={{
          ...font(700, 10, 1, '0.1em'), ...TABULAR,
          color: isFinal ? TEXT.muted : ACCENT.live,
        }}>{state}</span>
      </span>
      {side(away, game.awayScore ?? 0, leader !== 'home')}
      {side(home, game.homeScore ?? 0, leader !== 'away')}
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
