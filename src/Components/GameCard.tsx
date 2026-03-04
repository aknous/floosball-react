import React, { useRef, useState, useEffect } from 'react'
import TeamHoverCard from './TeamHoverCard'

interface Team {
  id: string
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string
  tertiaryColor: string
  record: string
}

interface GameCardProps {
  gameId: number
  homeTeam: Team
  awayTeam: Team
  homeTeamPoss?: boolean
  awayTeamPoss?: boolean
  homeScore?: number
  awayScore?: number
  quarter?: number
  timeRemaining?: string
  status?: 'Scheduled' | 'Active' | 'Final'
  homeWinProbability?: number
  awayWinProbability?: number
  isUpsetAlert?: boolean
  isFeatured?: boolean
  isFav?: boolean
  favTeamColor?: string
  onClick: (gameId: number) => void
}

export const GameCard: React.FC<GameCardProps> = ({ gameId, homeTeam, awayTeam, homeTeamPoss, awayTeamPoss, homeScore, awayScore, quarter, timeRemaining, status, homeWinProbability, awayWinProbability, isUpsetAlert, isFeatured, isFav, favTeamColor, onClick }) => {
  const isComplete = status === 'Final'
  const isLive = status === 'Active' && (quarter ?? 0) > 0
  const isFinal = isComplete

  const prevHomeScore = useRef(homeScore)
  const prevAwayScore = useRef(awayScore)
  const [homeFlash, setHomeFlash] = useState(false)
  const [awayFlash, setAwayFlash] = useState(false)

  useEffect(() => {
    if (prevHomeScore.current !== undefined && homeScore !== undefined && homeScore !== prevHomeScore.current) {
      setHomeFlash(false)
      requestAnimationFrame(() => setHomeFlash(true))
      const t = setTimeout(() => setHomeFlash(false), 700)
      prevHomeScore.current = homeScore
      return () => clearTimeout(t)
    }
    prevHomeScore.current = homeScore
  }, [homeScore])

  useEffect(() => {
    if (prevAwayScore.current !== undefined && awayScore !== undefined && awayScore !== prevAwayScore.current) {
      setAwayFlash(false)
      requestAnimationFrame(() => setAwayFlash(true))
      const t = setTimeout(() => setAwayFlash(false), 700)
      prevAwayScore.current = awayScore
      return () => clearTimeout(t)
    }
    prevAwayScore.current = awayScore
  }, [awayScore])

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1e293b',
    border: isUpsetAlert ? '2px solid #f97316' : isFeatured ? '2px solid #a78bfa' : isLive ? '2px solid #64748b' : '1px solid #334155',
    boxShadow: isFav ? `inset 0 0 0 2px ${favTeamColor || '#3b82f6'}cc` : undefined,
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    textAlign: 'left'
  }

  const teamRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 0'
  }

  const teamNameStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '16px',
    fontWeight: '500',
    minWidth: 0
  }

  const scoreStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '700',
    minWidth: '40px',
    textAlign: 'right'
  }

  const statusStyle: React.CSSProperties = {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #475569',
    fontSize: '14px',
    color: '#cbd5e1',
    textAlign: 'center'
  }

  return (
    <button onClick={() => onClick(gameId)} style={cardStyle}>
      
      {/* Home Team */}
      <TeamHoverCard teamId={homeTeam.id}>
        <div style={teamRowStyle}>
          <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              outline: homeTeamPoss && !isFinal ? '3px solid #fff' : 'none',
              outlineOffset: homeTeamPoss && !isFinal ? '2px' : '0',
              flexShrink: 0
            }}>
            <img
              src={`http://localhost:8000/api/teams/${homeTeam.id}/avatar?size=32&v=2`}
              alt={homeTeam.name}
              crossOrigin="anonymous"
              style={{ width: '32px', height: '32px', display: 'block' }}
            />
          </div>
          <div style={teamNameStyle}>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '2px' }}>{homeTeam.city}</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {homeTeam.name} <span style={{ fontSize: '13px', color: '#94a3b8' }}>({homeTeam.record})</span>
            </div>
          </div>
          <div style={scoreStyle} className={homeFlash ? 'score-updated' : ''}>
            {isLive || isFinal ? homeScore : '—'}
          </div>
        </div>
      </TeamHoverCard>

      {/* Away Team */}
      <TeamHoverCard teamId={awayTeam.id}>
        <div style={teamRowStyle}>
          <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              outline: awayTeamPoss && !isFinal ? '3px solid #fff' : 'none',
              outlineOffset: awayTeamPoss && !isFinal ? '2px' : '0',
              flexShrink: 0
            }}>
            <img
              src={`http://localhost:8000/api/teams/${awayTeam.id}/avatar?size=32&v=2`}
              alt={awayTeam.name}
              crossOrigin="anonymous"
              style={{ width: '32px', height: '32px', display: 'block' }}
            />
          </div>
          <div style={teamNameStyle}>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '2px' }}>{awayTeam.city}</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {awayTeam.name} <span style={{ fontSize: '13px', color: '#94a3b8' }}>({awayTeam.record})</span>
            </div>
          </div>
          <div style={scoreStyle} className={awayFlash ? 'score-updated' : ''}>
            {isLive || isFinal ? awayScore : '—'}
          </div>
        </div>
      </TeamHoverCard>

      {/* Win Probability Bar */}
      {(homeWinProbability !== undefined && awayWinProbability !== undefined) && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #475569' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>{homeWinProbability.toFixed(1)}%</span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>WIN PROB</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>{awayWinProbability.toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#475569' }}>
            <div style={{ width: `${homeWinProbability}%`, backgroundColor: homeTeam.color, transition: 'width 0.5s ease' }} />
            <div style={{ width: `${awayWinProbability}%`, backgroundColor: awayTeam.color, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div style={statusStyle}>
        {isFinal ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
            <span>Final {(quarter ?? 0) > 4 ? '(OT)' : ''}</span>
            {isUpsetAlert && (
              <div style={{ backgroundColor: '#f97316', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                UPSET
              </div>
            )}
            {isFeatured && !isUpsetAlert && (
              <div style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                FEATURED
              </div>
            )}
          </div>
        ) : isLive ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{(quarter ?? 0) > 4 ? 'OT' : `Q${quarter ?? 1}`}</span>
            <span>•</span>
            <span>{timeRemaining ?? '15:00'}</span>
            {isUpsetAlert && (
              <div style={{ backgroundColor: '#f97316', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                UPSET ALERT
              </div>
            )}
            {isFeatured && !isUpsetAlert && (
              <div style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                FEATURED
              </div>
            )}
          </div>
        ) : (
          <span>Upcoming</span>
        )}
      </div>
      
    </button>
  )
}
