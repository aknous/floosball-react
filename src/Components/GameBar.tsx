import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useGames } from '@/contexts/GamesContext'
import { GameModalNew } from '@/Components/GameModalNew'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const GameBar: React.FC = () => {
  const location = useLocation()
  const { games, refetch } = useGames()
  const { user } = useAuth()
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)

  useEffect(() => { refetch() }, [])

  // Hide on dashboard
  if (location.pathname === '/dashboard' || location.pathname === '/') return null

  const favTeamId = user?.favoriteTeamId ?? null
  const gameList = Array.from(games.values()).sort((a, b) => {
    const aIsFav = favTeamId !== null && (Number(a.homeTeam.id) === favTeamId || Number(a.awayTeam.id) === favTeamId)
    const bIsFav = favTeamId !== null && (Number(b.homeTeam.id) === favTeamId || Number(b.awayTeam.id) === favTeamId)
    if (aIsFav && !bIsFav) return -1
    if (!aIsFav && bIsFav) return 1
    return 0
  })
  if (gameList.length === 0) return null

  return (
    <>
      <div style={{
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        overflowX: 'auto',
        overflowY: 'hidden',
        whiteSpace: 'nowrap',
        padding: '6px 12px',
        display: 'flex',
        gap: '8px',
        scrollbarWidth: 'none',
      }}>
        {gameList.map(game => {
          const isFinal = game.status === 'Final'
          const isActive = game.status === 'Active'
          const homeColor = game.homeTeam.color || '#64748b'
          const awayColor = game.awayTeam.color || '#64748b'
          const isFavGame = favTeamId !== null && (Number(game.homeTeam.id) === favTeamId || Number(game.awayTeam.id) === favTeamId)
          const favColor = isFavGame
            ? (Number(game.homeTeam.id) === favTeamId ? game.homeTeam.color : game.awayTeam.color) || '#3b82f6'
            : null

          const statusText = isFinal
            ? (game.quarter && game.quarter > 4 ? 'Final/OT' : 'Final')
            : isActive
              ? (game.quarter === 5 ? 'OT' : game.isHalftime ? 'Half' : `Q${game.quarter}`)
              : 'Soon'

          return (
            <button
              key={game.id}
              onClick={() => setSelectedGameId(game.id)}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                backgroundColor: isFavGame ? '#253348' : '#1e293b',
                border: `1px solid ${isActive ? '#334155' : '#1e293b'}`,
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                flexShrink: 0,
                minWidth: '140px',
                textAlign: 'left',
                gap: '2px',
              }}
            >
              {/* Away team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <img
                  src={`${API_BASE}/teams/${game.awayTeam.id}/avatar?size=16&v=2`}
                  alt=""
                  style={{ width: '16px', height: '16px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '12px', fontWeight: '600', color: awayColor, flex: 1 }}>
                  {game.awayTeam.abbr}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {isActive || isFinal ? game.awayScore : '—'}
                </span>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: game.awayTeamPoss && isActive ? '#ffffff' : 'transparent',
                }} />
              </div>

              {/* Home team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <img
                  src={`${API_BASE}/teams/${game.homeTeam.id}/avatar?size=16&v=2`}
                  alt=""
                  style={{ width: '16px', height: '16px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '12px', fontWeight: '600', color: homeColor, flex: 1 }}>
                  {game.homeTeam.abbr}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {isActive || isFinal ? game.homeScore : '—'}
                </span>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: game.homeTeamPoss && isActive ? '#ffffff' : 'transparent',
                }} />
              </div>

              {/* Status */}
              <div style={{
                fontSize: '10px', color: isActive ? '#22c55e' : '#475569',
                borderTop: '1px solid #334155', marginTop: '2px', paddingTop: '2px',
                fontWeight: isActive ? '600' : '400',
              }}>
                {statusText}
              </div>
            </button>
          )
        })}
      </div>

      {selectedGameId !== null && (
        <GameModalNew gameId={selectedGameId} onClose={() => setSelectedGameId(null)} />
      )}
    </>
  )
}

export default GameBar
