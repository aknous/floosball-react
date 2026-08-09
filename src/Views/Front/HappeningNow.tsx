import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest, PulsingDot } from '@/Views/GameBoard/boardPieces'
import { SectionHeader } from './frontPieces'

const CELLS = 5

/**
 * The live band. Five cells across the top of the content column.
 *
 * Selection order: the user's game first if it is running, then the rest of the live
 * games by closeness, then whatever is upcoming today. When fewer than five are live the
 * band fills with upcoming ones and the status line changes colour with them — the band
 * never disappears, and when nothing is running it says so plainly rather than
 * collapsing and taking the page's top edge with it.
 */
const HappeningNow: React.FC<{
  games: CurrentGame[]
  favouriteTeamId: number | null
  favouriteColor: string | null
  onOpen: (id: number) => void
}> = ({ games, favouriteTeamId, favouriteColor, onOpen }) => {
  const favouriteKey = favouriteTeamId != null ? String(favouriteTeamId) : null
  const isYours = (g: CurrentGame) =>
    favouriteKey != null
    && (String(g.homeTeam?.id) === favouriteKey || String(g.awayTeam?.id) === favouriteKey)

  const live = games.filter(g => g.status === 'Active')
  const upcoming = games.filter(g => g.status === 'Scheduled')
  const closeness = (g: CurrentGame) => Math.abs((g.homeScore ?? 0) - (g.awayScore ?? 0))

  const yoursLive = live.filter(isYours)
  const otherLive = live.filter(g => !isYours(g)).sort((a, b) => closeness(a) - closeness(b))
  const selected = [...yoursLive, ...otherLive, ...upcoming].slice(0, CELLS)

  return (
    <div style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
      <SectionHeader
        title="HAPPENING NOW"
        badge={live.length > 0 ? { text: `${live.length} LIVE`, color: ACCENT.live, dot: true } : undefined}
        link={{ to: '/games', label: 'GAME BOARD →' }}
      />

      {selected.length === 0 ? (
        <div style={{
          background: BG.card, border: `1px solid ${BORDER.hairline}`,
          padding: '18px 15px', ...font(400, 12), color: TEXT.muted,
        }}>
          No games running. The next slate will show up here.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'stretch', background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
          {selected.map((game, i) => {
            const yours = isYours(game)
            const gameLive = game.status === 'Active'
            const homeScore = game.homeScore ?? 0
            const awayScore = game.awayScore ?? 0
            const statusColor = gameLive ? ACCENT.live : TEXT.muted
            const statusText = gameLive
              ? (game.isHalftime ? 'HALFTIME' : `Q${game.quarter} ${game.timeRemaining}`)
              : game.status === 'Final' ? 'FINAL' : 'UPCOMING'

            const teamLine = (team: CurrentGame['homeTeam'], score: number, leading: boolean) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crest teamId={team?.id} size={18} />
                <span style={{
                  flex: 1, minWidth: 0,
                  ...font(leading ? 700 : 400, 12, 1, '0.04em'),
                  color: leading ? TEXT.strong : TEXT.muted,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{team?.city}</span>
                <span style={{
                  ...font(800, 15), ...TABULAR, flexShrink: 0,
                  color: leading ? TEXT.primary : TEXT.muted,
                }}>{score}</span>
              </div>
            )

            return (
              <button
                key={game.id}
                className="row"
                onClick={() => onOpen(game.id)}
                style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', flexDirection: 'column', gap: '9px',
                  padding: '12px 15px', textAlign: 'left',
                  border: 'none',
                  borderRight: i < selected.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
                  // The user's own game is tinted with their team's primary at 10%.
                  background: yours && favouriteColor ? `${favouriteColor}1a` : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {gameLive ? <PulsingDot size={5} /> : (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: TEXT.muted, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, ...font(700, 9, 1, '0.12em'), color: statusColor, whiteSpace: 'nowrap' }}>
                    {statusText}
                  </span>
                </div>
                {teamLine(game.awayTeam, awayScore, awayScore >= homeScore)}
                {teamLine(game.homeTeam, homeScore, homeScore >= awayScore)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HappeningNow
