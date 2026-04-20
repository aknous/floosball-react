import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGames } from '@/contexts/GamesContext'
import { GameModalNew } from '@/Components/GameModalNew'
import { useAuth } from '@/contexts/AuthContext'

const GameBar: React.FC = () => {
  const location = useLocation()
  const { games, refetch } = useGames()
  const { user } = useAuth()
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(30)

  useEffect(() => { refetch() }, [])

  // Calculate scroll duration based on content width
  useEffect(() => {
    if (!trackRef.current) return
    const w = trackRef.current.scrollWidth / 2
    setDuration(Math.max(30, w / 25))
  }, [games])

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

  const renderGame = (game: any, keyPrefix: string) => {
    const isFinal = game.status === 'Final'
    const isActive = game.status === 'Active'
    const homeColor = game.homeTeam.color || '#64748b'
    const awayColor = game.awayTeam.color || '#64748b'
    const isFavGame = favTeamId !== null && (Number(game.homeTeam.id) === favTeamId || Number(game.awayTeam.id) === favTeamId)

    const statusText = isFinal
      ? (game.quarter && game.quarter > 4 ? 'F/OT' : 'F')
      : isActive
        ? (game.quarter === 5 ? 'OT' : game.isHalftime ? 'Half' : `Q${game.quarter}`)
        : 'Soon'

    const awayScore = isActive || isFinal ? game.awayScore : '—'
    const homeScore = isActive || isFinal ? game.homeScore : '—'

    return (
      <button
        key={`${keyPrefix}-${game.id}`}
        onClick={() => setSelectedGameId(game.id)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isFavGame ? '#253348' : '#1e293b',
          border: `1px solid ${isActive ? '#334155' : '#1e293b'}`,
          borderRadius: '6px',
          padding: '5px 10px',
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
      >
        <img src={`/avatars/${game.awayTeam.id}.png`} alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: awayColor }}>{game.awayTeam.abbr}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', minWidth: '18px', textAlign: 'right' }}>{awayScore}</span>
        {game.awayTeamPoss && isActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />}

        <span style={{ fontSize: '11px', color: '#475569' }}>-</span>

        {game.homeTeamPoss && isActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />}
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', minWidth: '18px', textAlign: 'left' }}>{homeScore}</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: homeColor }}>{game.homeTeam.abbr}</span>
        <img src={`/avatars/${game.homeTeam.id}.png`} alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />

        <span style={{ width: '1px', height: '14px', backgroundColor: '#334155', flexShrink: 0, marginLeft: '4px' }} />
        <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '400', color: isActive ? '#22c55e' : '#64748b', marginLeft: '4px' }}>{statusText}</span>
      </button>
    )
  }

  // Small slates (playoffs, short weeks) don't need the scrolling ticker —
  // there's room to show every game at once, and scrolling a half-full track
  // looks awkward. Center the list in place below the threshold.
  const SCROLL_THRESHOLD = 12
  const shouldScroll = gameList.length >= SCROLL_THRESHOLD

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          overflow: 'hidden',
          padding: '4px 0',
          display: shouldScroll ? 'block' : 'flex',
          justifyContent: shouldScroll ? undefined : 'center',
        }}
      >
        {shouldScroll ? (
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              gap: '10px',
              width: 'fit-content',
              animationName: 'ticker-scroll',
              animationDuration: `${duration}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {gameList.map(g => renderGame(g, 'a'))}
            <span style={{ width: '40px', flexShrink: 0 }} />
            {gameList.map(g => renderGame(g, 'b'))}
            <span style={{ width: '40px', flexShrink: 0 }} />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '100%',
            }}
          >
            {gameList.map(g => renderGame(g, 'static'))}
          </div>
        )}
      </div>

      {selectedGameId !== null && (
        <GameModalNew gameId={selectedGameId} onClose={() => setSelectedGameId(null)} />
      )}
    </>
  )
}

export default GameBar
