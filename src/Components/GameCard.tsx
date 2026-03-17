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
  momentum?: number
  momentumTeam?: string | null
  startTime?: number
  isFav?: boolean
  favTeamColor?: string
  favTeamId?: number | null
  onClick: (gameId: number) => void
  userPick?: number | null
  pickLocked?: boolean
  pickCorrect?: boolean | null
  onPick?: (teamId: number) => void
}

export const GameCard: React.FC<GameCardProps> = ({ gameId, homeTeam, awayTeam, homeTeamPoss, awayTeamPoss, homeScore, awayScore, quarter, timeRemaining, status, homeWinProbability, awayWinProbability, isUpsetAlert, isFeatured, momentum, momentumTeam, startTime, isFav, favTeamColor, favTeamId, onClick, userPick, pickLocked, pickCorrect, onPick }) => {
  const isComplete = status === 'Final'
  const isLive = status === 'Active' && (quarter ?? 0) > 0
  const isFinal = isComplete

  const absMomentum = Math.abs(momentum ?? 0)
  const homeMomentum = isLive && momentumTeam === homeTeam.abbr
  const awayMomentum = isLive && momentumTeam === awayTeam.abbr
  const flameColor = absMomentum >= 25 ? '#f97316' : absMomentum >= 15 ? '#fb923c' : '#fdba74'
  const flameGlow = absMomentum >= 25 ? '0 0 6px #f97316' : 'none'

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
    backgroundColor: isFav ? '#253348' : '#1e293b',
    border: isUpsetAlert ? '2px solid #f97316' : isFeatured ? '2px solid #a78bfa' : isLive ? '2px solid #64748b' : '1px solid #334155',
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
    <div role="button" tabIndex={0} onClick={() => onClick(gameId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(gameId) }} style={cardStyle}>
      
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
              {homeMomentum && (
                <svg viewBox="0 0 24 24" fill={flameColor} style={{ width: '14px', height: '14px', display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', filter: flameGlow !== 'none' ? `drop-shadow(${flameGlow})` : undefined, transition: 'all 0.5s ease' }}>
                  <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                </svg>
              )}
              {isFav && favTeamId != null && String(favTeamId) === String(homeTeam.id) && (
                <svg viewBox="0 0 24 24" fill={favTeamColor || '#3b82f6'} style={{ width: '14px', height: '14px', display: 'inline-block', marginLeft: '5px', verticalAlign: 'middle' }}>
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
              )}
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
              {awayMomentum && (
                <svg viewBox="0 0 24 24" fill={flameColor} style={{ width: '14px', height: '14px', display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', filter: flameGlow !== 'none' ? `drop-shadow(${flameGlow})` : undefined, transition: 'all 0.5s ease' }}>
                  <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                </svg>
              )}
              {isFav && favTeamId != null && String(favTeamId) === String(awayTeam.id) && (
                <svg viewBox="0 0 24 24" fill={favTeamColor || '#3b82f6'} style={{ width: '14px', height: '14px', display: 'inline-block', marginLeft: '5px', verticalAlign: 'middle' }}>
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
              )}
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
          <span>
            {startTime ? (
              <>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {new Date(startTime * 1000).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </>
            ) : (
              'Upcoming'
            )}
          </span>
        )}
      </div>

      {/* Pick-Em Footer */}
      {onPick && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #475569' }}>
          {/* Pre-game: show pick buttons */}
          {!isLive && !isFinal && !pickLocked && (
            <>
              <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.05em' }}>
                PICK A WINNER
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onPick(Number(homeTeam.id)) }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: userPick === Number(homeTeam.id) ? `2px solid ${homeTeam.color}` : '1px solid #475569',
                    backgroundColor: userPick === Number(homeTeam.id) ? `${homeTeam.color}22` : 'transparent',
                    color: userPick === Number(homeTeam.id) ? '#e2e8f0' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: userPick === Number(homeTeam.id) ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {homeTeam.name}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onPick(Number(awayTeam.id)) }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: userPick === Number(awayTeam.id) ? `2px solid ${awayTeam.color}` : '1px solid #475569',
                    backgroundColor: userPick === Number(awayTeam.id) ? `${awayTeam.color}22` : 'transparent',
                    color: userPick === Number(awayTeam.id) ? '#e2e8f0' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: userPick === Number(awayTeam.id) ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {awayTeam.name}
                </button>
              </div>
            </>
          )}

          {/* Locked (games started) but not resolved yet */}
          {userPick != null && (pickLocked || isLive) && pickCorrect == null && !isFinal && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
              </svg>
              <span>
                Picked: <span style={{ color: '#cbd5e1', fontWeight: '600' }}>
                  {userPick === Number(homeTeam.id) ? homeTeam.name : awayTeam.name}
                </span>
              </span>
            </div>
          )}

          {/* Resolved: show correct/incorrect */}
          {userPick != null && pickCorrect != null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}>
              {pickCorrect ? (
                <>
                  <svg viewBox="0 0 24 24" fill="#22c55e" style={{ width: '14px', height: '14px' }}>
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                  <span style={{ color: '#22c55e', fontWeight: '600' }}>
                    Correct — {userPick === Number(homeTeam.id) ? homeTeam.name : awayTeam.name}
                  </span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="#ef4444" style={{ width: '14px', height: '14px' }}>
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                  </svg>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>
                    Incorrect — picked {userPick === Number(homeTeam.id) ? homeTeam.name : awayTeam.name}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
