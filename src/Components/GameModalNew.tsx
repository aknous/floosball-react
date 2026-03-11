import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGames } from '@/contexts/GamesContext'
import { XIcon } from '@heroicons/react/solid'
import PlayerHoverCard from './PlayerHoverCard'
import TeamHoverCard from './TeamHoverCard'
import { Stars } from './Stars'
import { useIsMobile } from '@/hooks/useIsMobile'

interface GameModalNewProps {
  onClose: () => void
  gameId: number
}

/** Returns a consistent badge background color for any PlayResult string. */
/** Returns true for play results that warrant a badge in the field graphic (scores + turnovers). */
function isFieldBadgeResult(playResult: string): boolean {
  return playResult.includes('Touchdown') || playResult.includes('2-Pt')
    || playResult === 'Field Goal is Good' || playResult === 'Safety'
    || playResult === 'Fumble' || playResult === 'Interception'
    || playResult === 'Turnover On Downs' || playResult === 'Punt'
}

function getResultColor(playResult: string): string | null {
  if (!playResult) return null
  if (playResult === '2nd Down' || playResult === '3rd Down') return null
  if (playResult === '1st Down') return '#3b82f6'
  if (playResult.includes('Touchdown')) return '#22c55e'
  if (playResult === 'Field Goal is Good' || playResult === 'Safety') return '#22c55e'
  if (playResult.includes('2-Pt') && !playResult.includes('No Good')) return '#22c55e'
  if (playResult === 'Fumble' || playResult === 'Interception' || playResult === 'Turnover On Downs') return '#ef4444'
  if (playResult === '4th Down' || playResult.includes('2-Pt No Good') || playResult === 'XP No Good') return '#f59e0b'
  if (playResult === 'Punt' || playResult === 'Field Goal is No Good') return '#94a3b8'
  return '#64748b'
}


export const GameModalNew: React.FC<GameModalNewProps> = ({ onClose, gameId }) => {
  const [activeTab, setActiveTab] = useState<'box' | 'plays' | 'stats'>('plays')
  const [showHighlightsOnly, setShowHighlightsOnly] = useState(false)
  const isMobile = useIsMobile()
  
  // Get game from central state and fetch plays
  const { games, fetchGamePlays } = useGames()
  const liveGameData = useMemo(() => games.get(gameId), [games, gameId])
  // Freeze last known data so the modal stays populated after week rollover clears the game
  const frozenRef = useRef(liveGameData)
  if (liveGameData) frozenRef.current = liveGameData
  const gameData = frozenRef.current

  // Plays with WP data, in chronological order (oldest first), for the chart
  const wpPlays = useMemo(() => {
    if (!gameData?.plays) return []
    return (gameData.plays as any[])
      .filter(p => !p.event && p.homeWinProbability != null && p.quarter && p.timeRemaining)
      .slice()
      .reverse()
  }, [gameData?.plays])

  const isHighlightPlay = (play: any) =>
    !play._type && !play.event && !play.text &&
    (play.isTouchdown || play.isTurnover || play.scoreChange || play.isBigPlay || play.isClutchPlay || play.isChokePlay || play.isMomentumShift)

  // Pre-process plays: inject drive separators between possession changes
  const processedPlays = useMemo(() => {
    if (!gameData?.plays) return []
    const plays = gameData.plays as any[]
    const result: any[] = []
    for (let i = 0; i < plays.length; i++) {
      const play = plays[i]
      result.push(play)
      const nextPlay = plays[i + 1]
      const isEvent = (p: any) => !!p.event || (!p.playResult && !!p.text) || !!p._type
      if (nextPlay &&
          play.offensiveTeam && nextPlay.offensiveTeam &&
          play.offensiveTeam !== nextPlay.offensiveTeam &&
          !isEvent(play) && !isEvent(nextPlay)) {
        result.push({ _type: 'possession_sep', _key: `sep-${i}` })
      }
    }
    return result
  }, [gameData?.plays])

  const chartPoints = useMemo(() => {
    const pts: { elapsed: number; wp: number }[] = [{ elapsed: 0, wp: 50 }]
    let prevElapsed = 0
    let otOffset = 0
    wpPlays.forEach((p: any) => {
      const [mins, secs] = p.timeRemaining.split(':').map(Number)
      const remaining = mins * 60 + secs
      let elapsed: number
      if (p.quarter <= 4) {
        elapsed = Math.max(0, (p.quarter - 1) * 900 + (900 - remaining))
      } else {
        // Quarter stays at 5 for all OT periods — detect reset when raw elapsed goes backward
        const rawOT = 3600 + otOffset + (600 - remaining)
        if (rawOT < prevElapsed) otOffset += 600
        elapsed = 3600 + otOffset + (600 - remaining)
      }
      prevElapsed = elapsed
      pts.push({ elapsed, wp: p.homeWinProbability })
    })
    return pts
  }, [wpPlays])

  const prevHomeScore = useRef(gameData?.homeScore)
  const prevAwayScore = useRef(gameData?.awayScore)
  const [homeFlash, setHomeFlash] = useState(false)
  const [awayFlash, setAwayFlash] = useState(false)

  useEffect(() => {
    if (prevHomeScore.current !== undefined && gameData?.homeScore !== undefined && gameData.homeScore !== prevHomeScore.current) {
      setHomeFlash(false)
      requestAnimationFrame(() => setHomeFlash(true))
      const t = setTimeout(() => setHomeFlash(false), 700)
      prevHomeScore.current = gameData.homeScore
      return () => clearTimeout(t)
    }
    prevHomeScore.current = gameData?.homeScore
  }, [gameData?.homeScore])

  useEffect(() => {
    if (prevAwayScore.current !== undefined && gameData?.awayScore !== undefined && gameData.awayScore !== prevAwayScore.current) {
      setAwayFlash(false)
      requestAnimationFrame(() => setAwayFlash(true))
      const t = setTimeout(() => setAwayFlash(false), 700)
      prevAwayScore.current = gameData.awayScore
      return () => clearTimeout(t)
    }
    prevAwayScore.current = gameData?.awayScore
  }, [gameData?.awayScore])

  // Fetch plays when modal opens
  useEffect(() => {
    fetchGamePlays(gameId)
  }, [gameId, fetchGamePlays])

  // Helper function to render a play or event message
  const renderPlay = (play: any, keyPrefix: string, index: number) => {
    if (!gameData) return null

    // Drive separator (between possession changes)
    if (play._type === 'possession_sep') {
      return (
        <div key={play._key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e3a5f' }} />
          <span style={{ fontSize: '10px', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
            Drive
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e3a5f' }} />
        </div>
      )
    }

    // Event message (game_start, quarter changes, halftime, etc.)
    // Handles REST API format (play.event.text) and WebSocket format (play.text with no playResult)
    const eventText = play.event?.text ?? (!play.playResult && play.text ? play.text : null)
    if (eventText) {
      return (
        <div key={`${keyPrefix}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {eventText}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
        </div>
      )
    }
    
    // Regular play rendering
    const isTwoPtPlay = String(play.playResult ?? '').includes('2-Pt')
    const yardNum = play.yardLine ? parseInt(String(play.yardLine).split(' ').pop() || '0') : 0
    const downText = isTwoPtPlay ? '2-Pt Try' :
      play.down && play.distance ?
        (yardNum <= 10 ?
          `${['1st', '2nd', '3rd', '4th'][play.down - 1]} & Goal` :
          `${['1st', '2nd', '3rd', '4th'][play.down - 1]} & ${play.distance}`)
        : null

    // Determine which team has possession for this play
    const offenseTeamId = play.offensiveTeam === gameData.homeTeam.abbr ? 
      gameData.homeTeam.id : 
      play.offensiveTeam === gameData.awayTeam.abbr ? 
        gameData.awayTeam.id : 
        null

    const isBigPlay = !!play.isBigPlay
    const isClutchPlay = !!play.isClutchPlay
    const isChokePlay = !!play.isChokePlay
    const isMomentumShift = !!play.isMomentumShift
    const homeGained = (play.homeWpa ?? 0) > 0
    const bigPlayTeamAbbr = homeGained ? gameData.homeTeam.abbr : gameData.awayTeam.abbr
    const bigPlayTeamColor = homeGained ? gameData.homeTeam.color : gameData.awayTeam.color
    const wpaValue = homeGained ? (play.homeWpa ?? 0) : (play.awayWpa ?? 0)
    const hasAccent = isBigPlay || isClutchPlay || isChokePlay || isMomentumShift

    return (
      <div key={`${keyPrefix}-${index}`} style={{
        paddingBottom: '12px',
        paddingTop: '6px',
        paddingLeft: '10px',
        paddingRight: '6px',
        borderBottom: '1px solid #334155',
        boxShadow: isBigPlay ? 'inset 3px 0 0 #f59e0b'
          : isClutchPlay ? 'inset 3px 0 0 #06b6d4'
          : isChokePlay ? 'inset 3px 0 0 #ef4444'
          : isMomentumShift ? 'inset 3px 0 0 #f97316'
          : 'none',
        backgroundColor: isBigPlay ? '#1a1300'
          : isClutchPlay ? '#001a1f'
          : isChokePlay ? '#1a0500'
          : isMomentumShift ? '#1a0f00'
          : 'transparent',
        borderRadius: hasAccent ? '4px' : '0',
        display: 'flex',
        gap: '12px'
      }}>
        {/* Team Avatar */}
        {offenseTeamId && (
          <img
            src={`http://localhost:8000/api/teams/${offenseTeamId}/avatar?size=40&v=2`}
            alt={play.offensiveTeam}
            crossOrigin="anonymous"
            style={{
              width: '40px',
              height: '40px',
              flexShrink: 0
            }}
          />
        )}

        {/* Play Content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            {/* Left: clock / situation */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>Q{play.quarter} - {play.timeRemaining}</span>
              {downText && (
                <>
                  <span>•</span>
                  <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{downText}</span>
                </>
              )}
              {play.yardLine && !isTwoPtPlay && (
                <>
                  <span>•</span>
                  <span>{play.yardLine}</span>
                </>
              )}
              {isBigPlay && (
                <span style={{ color: '#d97706', fontWeight: '600' }}>
                  ⚡ <span style={{ color: bigPlayTeamColor }}>{bigPlayTeamAbbr}</span> +{wpaValue.toFixed(1)}%
                </span>
              )}
              {isClutchPlay && (
                <span style={{ color: '#06b6d4', fontWeight: '600', fontSize: '11px' }}>
                  ◆ CLUTCH
                </span>
              )}
              {isChokePlay && (
                <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '11px' }}>
                  ▼ CHOKE
                </span>
              )}
              {isMomentumShift && !isBigPlay && !isClutchPlay && !isChokePlay && (
                <span style={{ color: '#f97316', fontWeight: '600', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <svg width="11" height="13" viewBox="0 0 12 16" fill="#f97316"><path d="M6 0C6 0 2 4 2 8c0 2.2 1.8 4 4 4s4-1.8 4-4C10 4 6 0 6 0zm0 10.5c-1.4 0-2.5-1.1-2.5-2.5 0-1.9 2.5-5.5 2.5-5.5s2.5 3.6 2.5 5.5c0 1.4-1.1 2.5-2.5 2.5z"/></svg>
                  MOMENTUM SHIFT
                </span>
              )}
            </div>
            {/* Right: result label */}
            {(() => {
              const sackColor = '#f97316'
              const resultColor = play.playResult ? getResultColor(String(play.playResult)) : null
              const badgeColor = play.isSack ? sackColor : resultColor
              const badgeLabel = play.isSack ? 'SACK' : play.playResult
              if (!badgeColor) return null
              return (
                <span style={{
                  fontSize: '10px',
                  color: badgeColor,
                  border: `1px solid ${badgeColor}55`,
                  backgroundColor: `${badgeColor}18`,
                  padding: '1px 7px',
                  borderRadius: '3px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px',
                  flexShrink: 0,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  {badgeLabel}
                </span>
              )
            })()}
          </div>
          <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: (play.scoreChange && play.homeTeamScore != null) ? '4px' : '0' }}>{play.description}</p>
          {play.scoreChange && play.homeTeamScore != null && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {gameData.homeTeam.abbr} {play.homeTeamScore} – {play.awayTeamScore} {gameData.awayTeam.abbr}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Pre-compute WP segments for chart (used in left panel)
  const wpSegments = useMemo(() => {
    if (chartPoints.length < 2) return []
    const homeColor = gameData?.homeTeam.color ?? '#fff'
    const awayColor = gameData?.awayTeam.color ?? '#888'
    const W = 800, H = 140
    const lastElapsed = chartPoints[chartPoints.length - 1].elapsed
    const numOTPeriods = lastElapsed > 3600 ? Math.ceil((lastElapsed - 3600) / 600) : 0
    const numSections = 4 + numOTPeriods
    // Equal visual width per period (each quarter = 1 section, each OT period = 1 section)
    const toSection = (e: number) => e <= 3600 ? e / 900 : 4 + (e - 3600) / 600
    const toX = (e: number) => (toSection(e) / numSections) * W
    const toY = (wp: number) => H - (wp / 100) * H
    const segments: { pts: string; color: string }[] = []
    let curColor = chartPoints[0].wp >= 50 ? homeColor : awayColor
    let curPts: [number, number][] = [[toX(chartPoints[0].elapsed), toY(chartPoints[0].wp)]]
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p1 = chartPoints[i], p2 = chartPoints[i + 1]
      const x2 = toX(p2.elapsed), y2 = toY(p2.wp)
      const col2 = p2.wp >= 50 ? homeColor : awayColor
      if (col2 !== curColor) {
        const t = (50 - p1.wp) / (p2.wp - p1.wp)
        const xc = toX(p1.elapsed) + t * (x2 - toX(p1.elapsed))
        curPts.push([xc, H / 2])
        segments.push({ pts: curPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), color: curColor })
        curColor = col2
        curPts = [[xc, H / 2], [x2, y2]]
      } else {
        curPts.push([x2, y2])
      }
    }
    segments.push({ pts: curPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), color: curColor })
    return segments
  }, [chartPoints, gameData?.homeTeam.color, gameData?.awayTeam.color])

  // Momentum indicator (matches GameCard logic)
  const isLive = gameData?.status === 'Active'
  const absMomentum = Math.abs(gameData?.momentum ?? 0)
  const homeMomentum = isLive && gameData?.momentumTeam === gameData?.homeTeam.abbr
  const awayMomentum = isLive && gameData?.momentumTeam === gameData?.awayTeam.abbr
  const flameColor = absMomentum >= 25 ? '#f97316' : absMomentum >= 15 ? '#fb923c' : '#fdba74'
  const flameGlow = absMomentum >= 25 ? '0 0 6px #f97316' : 'none'

  if (!gameData) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '48px', color: '#e2e8f0' }}>
          <div>Game not found</div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: isMobile ? '0' : '24px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0f172a',
          borderRadius: isMobile ? '0' : '12px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '1200px',
          height: isMobile ? '100dvh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #334155',
          flexShrink: 0
        }}>
          <div />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <XIcon style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
          </button>
        </div>

        {/* Body: two-column on desktop, stacked on mobile */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden', minHeight: 0 }}>

          {/* Left panel: Scoreboard + Status + WP */}
          <div style={{
            flex: isMobile ? '0 0 auto' : '0 0 40%',
            minWidth: 0,
            borderRight: isMobile ? 'none' : '1px solid #334155',
            borderBottom: isMobile ? '1px solid #334155' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflowY: isMobile ? 'visible' : 'auto'
          }}>

            {/* Scores */}
            <div style={{ padding: '16px', backgroundColor: '#1e293b' }}>

              {/* Home team */}
              <TeamHoverCard teamId={gameData.homeTeam.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    outline: gameData.possession === gameData.homeTeam.abbr && gameData.status === 'Active' ? '2px solid #fff' : 'none',
                    outlineOffset: '2px'
                  }}>
                    <img
                      src={`http://localhost:8000/api/teams/${gameData.homeTeam.id}/avatar?size=40&v=2`}
                      alt={gameData.homeTeam.name}
                      crossOrigin="anonymous"
                      style={{ width: '40px', height: '40px', display: 'block' }}
                    />
                  </div>
                  <Link to={`/team/${gameData.homeTeam.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gameData.homeTeam.city}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0' }}>{gameData.homeTeam.name}</span>
                      {homeMomentum && (
                        <svg viewBox="0 0 24 24" fill={flameColor} style={{ width: '16px', height: '16px', flexShrink: 0, filter: flameGlow !== 'none' ? `drop-shadow(${flameGlow})` : undefined, transition: 'all 0.5s ease' }}>
                          <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                        </svg>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>{gameData.homeTeam.record}</span>
                      {gameData.homeTeam.elo != null && <span style={{ fontSize: '13px', color: '#64748b' }}>ELO {Math.round(gameData.homeTeam.elo)}</span>}
                    </div>
                  </Link>
                  <div style={{ fontSize: '30px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }} className={homeFlash ? 'score-updated' : ''}>
                    {gameData.homeScore}
                  </div>
                </div>
              </TeamHoverCard>

              {/* Home timeouts */}
              {gameData.status === 'Active' && gameData.homeTimeouts != null && (
                <div style={{ display: 'flex', gap: '5px', paddingLeft: '50px', paddingBottom: '8px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: i < gameData.homeTimeouts! ? '#f59e0b' : '#334155',
                      transition: 'background-color 0.3s',
                    }} />
                  ))}
                </div>
              )}

              {/* Away team */}
              <TeamHoverCard teamId={gameData.awayTeam.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    outline: gameData.possession === gameData.awayTeam.abbr && gameData.status === 'Active' ? '2px solid #fff' : 'none',
                    outlineOffset: '2px'
                  }}>
                    <img
                      src={`http://localhost:8000/api/teams/${gameData.awayTeam.id}/avatar?size=40&v=2`}
                      alt={gameData.awayTeam.name}
                      crossOrigin="anonymous"
                      style={{ width: '40px', height: '40px', display: 'block' }}
                    />
                  </div>
                  <Link to={`/team/${gameData.awayTeam.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gameData.awayTeam.city}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0' }}>{gameData.awayTeam.name}</span>
                      {awayMomentum && (
                        <svg viewBox="0 0 24 24" fill={flameColor} style={{ width: '16px', height: '16px', flexShrink: 0, filter: flameGlow !== 'none' ? `drop-shadow(${flameGlow})` : undefined, transition: 'all 0.5s ease' }}>
                          <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                        </svg>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>{gameData.awayTeam.record}</span>
                      {gameData.awayTeam.elo != null && <span style={{ fontSize: '13px', color: '#64748b' }}>ELO {Math.round(gameData.awayTeam.elo)}</span>}
                    </div>
                  </Link>
                  <div style={{ fontSize: '30px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }} className={awayFlash ? 'score-updated' : ''}>
                    {gameData.awayScore}
                  </div>
                </div>
              </TeamHoverCard>

              {/* Away timeouts */}
              {gameData.status === 'Active' && gameData.awayTimeouts != null && (
                <div style={{ display: 'flex', gap: '5px', paddingLeft: '50px', paddingTop: '8px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: i < gameData.awayTimeouts! ? '#f59e0b' : '#334155',
                      transition: 'background-color 0.3s',
                    }} />
                  ))}
                </div>
              )}

              {/* Quarter-by-quarter breakdown */}
              {gameData.quarterScores && (
                <div style={{ borderTop: '1px solid #334155', marginTop: '12px', paddingTop: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '3px 0', color: '#475569', fontWeight: '500', width: '48px' }}></th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q1</th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q2</th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q3</th>
                        <th style={{ textAlign: 'center', padding: '3px 10px', color: '#64748b', fontWeight: '500' }}>Q4</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em' }}>{gameData.homeTeam.abbr}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.home.q1}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.home.q2}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.home.q3}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.home.q4}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em' }}>{gameData.awayTeam.abbr}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.away.q1}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.away.q2}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.away.q3}</td>
                        <td style={{ textAlign: 'center', padding: '4px 10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{gameData.quarterScores.away.q4}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Game status + down/distance */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #334155', textAlign: 'center' }}>
              {/* Row 1: clock / final */}
              <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600', marginBottom: '3px' }}>
                {gameData.status === 'Final' ? (
                  `Final${gameData.isOvertime ? ' (OT)' : ''}`
                ) : gameData.status === 'Active' ? (
                  `${gameData.quarter > 4 ? 'OT' : `Q${gameData.quarter}`}  •  ${gameData.timeRemaining}`
                ) : (
                  gameData.status
                )}
              </div>
              {/* Row 2: down & distance (active only) */}
              {gameData.status === 'Active' && (() => {
                const down = gameData.down
                const distance = gameData.yardsToFirstDown
                const yardLine = gameData.yardLine
                const yardsToEndzone = gameData.yardsToEndzone
                if (!down || !yardLine) return null
                const downSuffix = ['1st', '2nd', '3rd', '4th'][down - 1]
                const showGoal = yardsToEndzone != null && distance != null && yardsToEndzone < distance
                return (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {showGoal ? `${downSuffix} & Goal` : `${downSuffix} & ${distance}`}
                    <span style={{ color: '#475569', margin: '0 6px' }}>•</span>
                    {yardLine}
                  </div>
                )
              })()}
            </div>

            {/* Field Position Visualization */}
            {gameData.status !== 'Scheduled' && (() => {
              const FW = 600, FH = 220
              const EZW = FW / 12 // end zone = 10/120 of total width ≈ 50 SVG units

              // Fixed layout: home end zone = LEFT, away end zone = RIGHT
              const homeTeam = gameData.homeTeam
              const awayTeam = gameData.awayTeam
              const isHomePoss = gameData.possession === homeTeam.abbr
              const possTeam = isHomePoss ? homeTeam : awayTeam

              // x coord: yards from left (0–120) → SVG x (0–FW)
              const toX = (yfl: number) => (yfl / 120) * FW

              // Absolute ball position using yardsToEndzone + possession direction:
              //   Home attacks RIGHT → ballAbsYfl = 110 - yardsToEndzone
              //   Away attacks LEFT  → ballAbsYfl = 10  + yardsToEndzone
              const ballAbsYfl = gameData.yardsToEndzone != null
                ? (isHomePoss ? 110 - gameData.yardsToEndzone : 10 + gameData.yardsToEndzone)
                : null
              const ballX = ballAbsYfl != null ? toX(ballAbsYfl) : null
              const midY = FH / 2

              // Last real play
              const lastPlay = gameData.plays?.find((p: any) => !p.event && p.playResult != null)
              // Only show trajectory when the same team that ran the last play still has possession.
              // After a possession change event, ball position updates to new team but trajectory
              // from the old play would be meaningless.
              const sameTeamHasBall = !lastPlay || lastPlay.offensiveTeam === gameData.possession
              const yardsGained = lastPlay?.yardsGained ?? 0
              // playType = play category: Run, Pass, FieldGoal, Punt, Kneel, Spike
              const playType = (lastPlay?.playType ?? '').toUpperCase()
              const isTD = !!lastPlay?.isTouchdown
              const isTurnover = !!lastPlay?.isTurnover

              // Which direction did the last play go?
              // Home team plays go right (+1), away team plays go left (-1)
              const lastPlayDir = lastPlay?.offensiveTeam === homeTeam.abbr ? 1 : -1

              // Start of last play: move backwards from current ball in play direction
              const startAbsYfl = ballAbsYfl != null && lastPlay != null
                ? ballAbsYfl - yardsGained * lastPlayDir
                : null
              const startX = startAbsYfl != null ? toX(startAbsYfl) : null

              // First down marker: forward from ball in possession team's direction
              const fdDir = isHomePoss ? 1 : -1
              const fdAbsYfl = ballAbsYfl != null && gameData.yardsToFirstDown != null
                ? ballAbsYfl + gameData.yardsToFirstDown * fdDir
                : null
              const firstDownX = fdAbsYfl != null ? toX(fdAbsYfl) : null

              // Build play path + style
              let playPath: string | null = null
              let playStroke = '#60a5fa'
              let playDash = 'none'
              let playEndX: number | null = null

              if (playType === 'PUNT' && ballX != null && ballAbsYfl != null && Math.abs(yardsGained) >= 1) {
                // Punt: draw arc forward from LOS to landing spot
                const puntEndX = toX(ballAbsYfl + yardsGained * lastPlayDir)
                const midPX = (ballX + puntEndX) / 2
                const arcH = Math.min(Math.abs(puntEndX - ballX) * 0.35, 45)
                const peakY = midY - Math.min(arcH * 1.6, 60)
                playPath = `M${ballX},${midY} Q${midPX},${peakY} ${puntEndX},${midY}`
                playStroke = '#a78bfa'
                playDash = '8,4'
                playEndX = puntEndX
              } else if (ballX != null && startX != null && Math.abs(yardsGained) >= 1) {
                const midPX = (startX + ballX) / 2
                const arcH = Math.min(Math.abs(ballX - startX) * 0.35, 45)
                playEndX = ballX

                if (playType === 'RUN' || playType === 'KNEEL' || playType === 'SPIKE') {
                  playPath = `M${startX},${midY} L${ballX},${midY}`
                  playStroke = isTurnover ? '#f87171' : '#4ade80'
                } else if (playType === 'FIELDGOAL') {
                  const peakY = midY - Math.min(arcH * 1.6, 60)
                  playPath = `M${startX},${midY} Q${midPX},${peakY} ${ballX},${midY}`
                  playStroke = '#a78bfa'
                  playDash = '8,4'
                } else {
                  // PASS / default
                  const peakY = midY - arcH
                  playPath = `M${startX},${midY} Q${midPX},${peakY} ${ballX},${midY}`
                  playStroke = isTurnover ? '#f87171' : '#60a5fa'
                  playDash = '7,3'
                }
                if (isTD) playStroke = '#fbbf24'
              }

              if (!sameTeamHasBall) playPath = null

              // Arrowhead points toward the end of the play
              const arrowDir = playEndX != null && ballX != null ? (playEndX >= ballX ? 1 : -1) : lastPlayDir

              // Yard lines at 10-yd intervals across the 120-yd field
              const yardLinePositions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]
              // NFL-style yard numbers (count from each end)
              const yardNums: [number, string][] = [
                [20, '10'], [30, '20'], [40, '30'], [50, '40'], [60, '50'],
                [70, '40'], [80, '30'], [90, '20'], [100, '10']
              ]

              const playResult = lastPlay?.playResult ?? null
              const playDescription = lastPlay?.description ?? lastPlay?.text ?? null

              return (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                    Field Position
                  </div>
                  <svg viewBox={`0 0 ${FW} ${FH}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}>
                    {/* Home end zone (LEFT) */}
                    <rect x={0} y={0} width={EZW} height={FH} fill={homeTeam.color} opacity={0.4} />
                    {/* Away end zone (RIGHT) */}
                    <rect x={FW - EZW} y={0} width={EZW} height={FH} fill={awayTeam.color} opacity={0.4} />

                    {/* Playing field */}
                    <rect x={EZW} y={0} width={FW - 2 * EZW} height={FH} fill="#1e4620" />

                    {/* End zone border lines */}
                    <line x1={toX(10)} y1={0} x2={toX(10)} y2={FH} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                    <line x1={toX(110)} y1={0} x2={toX(110)} y2={FH} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />

                    {/* Yard lines */}
                    {yardLinePositions.map(yd => (
                      <line key={yd}
                        x1={toX(yd)} y1={0} x2={toX(yd)} y2={FH}
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={yd === 60 ? 1.5 : 0.75}
                      />
                    ))}

                    {/* Hash marks */}
                    {yardLinePositions.map(yd => (
                      <g key={`h-${yd}`}>
                        <line x1={toX(yd) - 5} y1={FH * 0.32} x2={toX(yd) + 5} y2={FH * 0.32} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                        <line x1={toX(yd) - 5} y1={FH * 0.68} x2={toX(yd) + 5} y2={FH * 0.68} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                      </g>
                    ))}

                    {/* Yard numbers */}
                    {yardNums.map(([ydPos, label]) => (
                      <text key={ydPos} x={toX(ydPos)} y={FH * 0.82}
                        textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.28)" fontFamily="sans-serif">
                        {label}
                      </text>
                    ))}

                    {/* End zone team labels (fixed: home=left, away=right) */}
                    <text x={EZW / 2} y={midY + 5} textAnchor="middle" fontSize={11} fontWeight="700"
                      fill={homeTeam.color} opacity={0.9} fontFamily="sans-serif">
                      {homeTeam.abbr}
                    </text>
                    <text x={FW - EZW / 2} y={midY + 5} textAnchor="middle" fontSize={11} fontWeight="700"
                      fill={awayTeam.color} opacity={0.9} fontFamily="sans-serif">
                      {awayTeam.abbr}
                    </text>

                    {/* First down marker */}
                    {firstDownX != null && firstDownX > EZW && firstDownX < FW - EZW && (
                      <line x1={firstDownX} y1={6} x2={firstDownX} y2={FH - 6}
                        stroke="#FFD700" strokeWidth={1.5} opacity={0.7} strokeDasharray="3,2" />
                    )}

                    {/* Last play path */}
                    {playPath && (
                      <path d={playPath} fill="none"
                        stroke={playStroke} strokeWidth={2.5}
                        strokeDasharray={playDash}
                        strokeLinecap="round"
                        opacity={0.8}
                      />
                    )}

                    {/* Arrowhead at end of play */}
                    {playEndX != null && playPath && Math.abs(yardsGained) >= 1 && (
                      <polygon
                        points={`${playEndX},${midY - 6} ${playEndX + arrowDir * 9},${midY} ${playEndX},${midY + 6}`}
                        fill={playStroke}
                        opacity={0.85}
                      />
                    )}

                    {/* Ball marker */}
                    {ballX != null && (
                      <g>
                        <circle cx={ballX} cy={midY} r={10} fill={possTeam.color} opacity={0.2} />
                        <ellipse cx={ballX} cy={midY} rx={8} ry={5}
                          fill="#7B4F2E" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                        <line x1={ballX - 3} y1={midY} x2={ballX + 3} y2={midY}
                          stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
                      </g>
                    )}
                  </svg>

                  {/* Last play info — fixed height so WP chart doesn't shift */}
                  <div style={{ marginTop: '8px', minHeight: '44px' }}>
                    {(playResult || playDescription) && (
                      <>
                        {playDescription && (
                          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: 0, lineHeight: '1.4', marginBottom: playResult ? '4px' : 0 }}>
                            {playDescription}
                          </p>
                        )}
                        {playResult && isFieldBadgeResult(String(playResult)) && (() => {
                          const badgeColor = getResultColor(String(playResult)) ?? '#64748b'
                          return (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                              <span style={{
                                fontSize: '10px',
                                color: badgeColor,
                                border: `1px solid ${badgeColor}55`,
                                backgroundColor: `${badgeColor}18`,
                                padding: '1px 7px',
                                borderRadius: '3px',
                                fontWeight: '700',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}>
                                {playResult}
                              </span>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Win Probability chart */}
            {gameData.homeWinProbability !== undefined && (() => {
              const homeColor = gameData.homeTeam.color
              const awayColor = gameData.awayTeam.color
              const homeSecondary = gameData.homeTeam.secondaryColor
              const awaySecondary = gameData.awayTeam.secondaryColor
              const W = 800, H = 140
              const lastElapsed = chartPoints[chartPoints.length - 1].elapsed
              const numOTPeriods = lastElapsed > 3600 ? Math.ceil((lastElapsed - 3600) / 600) : 0
              const numSections = 4 + numOTPeriods
              const toSection = (e: number) => e <= 3600 ? e / 900 : 4 + (e - 3600) / 600
              const toX = (e: number) => (toSection(e) / numSections) * W
              const dividerTimes = [900, 1800, 2700,
                ...(numOTPeriods > 0 ? [3600] : []),
                ...Array.from({ length: numOTPeriods - 1 }, (_, i) => 3600 + (i + 1) * 600)]
              const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4',
                ...Array.from({ length: numOTPeriods }, (_, i) => numOTPeriods === 1 ? 'OT' : `OT${i + 1}`)]
              return (
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Win Probability
                  </div>
                  <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                    <span style={{ position: 'absolute', top: '5px', left: '6px', fontSize: '11px', fontWeight: '700', color: homeSecondary, background: homeColor, padding: '1px 5px', borderRadius: '3px', pointerEvents: 'none', zIndex: 1 }}>
                      {gameData.homeTeam.abbr} {gameData.homeWinProbability.toFixed(1)}%
                    </span>
                    <span style={{ position: 'absolute', bottom: '5px', left: '6px', fontSize: '11px', fontWeight: '700', color: awaySecondary, background: awayColor, padding: '1px 5px', borderRadius: '3px', pointerEvents: 'none', zIndex: 1 }}>
                      {gameData.awayTeam.abbr} {gameData.awayWinProbability?.toFixed(1)}%
                    </span>
                    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '140px', display: 'block' }}>
                      <rect x={0} y={0} width={W} height={H / 2} fill={homeColor} fillOpacity={0.15} />
                      <rect x={0} y={H / 2} width={W} height={H / 2} fill={awayColor} fillOpacity={0.15} />
                      {dividerTimes.map((t, i) => (
                        <line key={i} x1={toX(t)} y1={0} x2={toX(t)} y2={H} stroke="#1e293b" strokeWidth={t === 3600 && numOTPeriods > 0 ? 3.5 : 2.5} />
                      ))}
                      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="6,4" />
                      {wpSegments.map((seg, i) => (
                        <polyline key={`shadow-${i}`} points={seg.pts} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
                      ))}
                      {wpSegments.map((seg, i) => (
                        <polyline key={i} points={seg.pts} fill="none" stroke={seg.color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
                      ))}
                    </svg>
                  </div>
                  <div style={{ position: 'relative', height: '16px', marginTop: '3px' }}>
                    {quarterLabels.map((label, i) => (
                      <span key={label} style={{ position: 'absolute', left: `${((i + 0.5) / numSections) * 100}%`, transform: 'translateX(-50%)', fontSize: '10px', color: '#475569' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Right panel: Tabs + scrollable content */}
          <div style={{ flex: isMobile ? 'none' : 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'visible' : 'hidden', minWidth: 0 }}>

            {/* Tab bar */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #334155', flexShrink: 0, display: 'flex', gap: '4px' }}>
              {(['plays', 'box', 'stats'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    backgroundColor: activeTab === tab ? '#1e293b' : 'transparent',
                    color: activeTab === tab ? '#e2e8f0' : '#64748b',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab === 'plays' ? 'Plays' : tab === 'box' ? 'Box Score' : 'Stats'}
                </button>
              ))}
            </div>

            {/* Tab content — fills all remaining height */}
            <div style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: '16px' }}>
              {activeTab === 'plays' && (
                <>
                  {/* All / Highlights toggle */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    {(['all', 'highlights'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setShowHighlightsOnly(mode === 'highlights')}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: (mode === 'highlights') === showHighlightsOnly ? '#3b82f6' : '#1e293b',
                          color: (mode === 'highlights') === showHighlightsOnly ? '#fff' : '#64748b',
                        }}
                      >
                        {mode === 'all' ? 'All Plays' : 'Highlights'}
                      </button>
                    ))}
                  </div>

                  {(!gameData.plays || gameData.plays.length === 0) ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>
                      {gameData.status === 'Active' ? (
                        <>
                          <div style={{ marginBottom: '8px' }}>Waiting for live plays...</div>
                          <div style={{ fontSize: '12px' }}>Plays will appear here as they happen</div>
                        </>
                      ) : gameData.status === 'Scheduled' ? (
                        'Game has not started yet'
                      ) : (
                        'No play data available'
                      )}
                    </div>
                  ) : showHighlightsOnly ? (
                    (() => {
                      const highlights = (gameData.plays as any[]).filter(isHighlightPlay)
                      return highlights.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>No highlights yet</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {highlights.map((play: any, index: number) => renderPlay(play, 'hl', index))}
                        </div>
                      )
                    })()
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {processedPlays.map((play: any, index: number) => renderPlay(play, 'play', index))}
                    </div>
                  )}
                </>
              )}
              {activeTab === 'box' && (() => {
                const gs = gameData.gameStats
                if (!gs) return <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>Stats not available yet</div>
                const h = gs.home.team
                const a = gs.away.team
                const homeAbbr = gameData.homeTeam.abbr
                const awayAbbr = gameData.awayTeam.abbr
                const homeColor = gameData.homeTeam.color
                const awayColor = gameData.awayTeam.color
                const rows: { label: string; home: string | number; away: string | number }[] = [
                  { label: 'Total Yards',   home: h.totalYards,  away: a.totalYards  },
                  { label: 'Total Plays',   home: h.totalPlays,  away: a.totalPlays  },
                  { label: 'First Downs',   home: h.firstDowns,  away: a.firstDowns  },
                  { label: '3rd Down',      home: `${h.thirdDownConv ?? 0}/${h.thirdDownAtt ?? 0}`,   away: `${a.thirdDownConv ?? 0}/${a.thirdDownAtt ?? 0}`   },
                  { label: '4th Down',      home: `${h.fourthDownConv ?? 0}/${h.fourthDownAtt ?? 0}`, away: `${a.fourthDownConv ?? 0}/${a.fourthDownAtt ?? 0}` },
                  { label: 'Pass Yards',    home: h.passYards,   away: a.passYards   },
                  { label: 'Completions',   home: `${h.passComp}/${h.passAtt}`, away: `${a.passComp}/${a.passAtt}` },
                  { label: 'Interceptions', home: h.passInts,    away: a.passInts    },
                  { label: 'Rush Yards',    home: h.rushYards,   away: a.rushYards   },
                  { label: 'Rush Carries',  home: h.rushCarries, away: a.rushCarries },
                  { label: 'Turnovers',     home: h.turnovers,   away: a.turnovers   },
                  { label: 'Sacks',         home: h.sacks,       away: a.sacks       },
                ]
                return (
                  <div>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 24px', marginBottom: '8px', padding: '0 4px' }}>
                      <div />
                      <div style={{ fontSize: '13px', fontWeight: '700', color: homeColor, minWidth: '48px', textAlign: 'center' }}>{homeAbbr}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: awayColor, minWidth: '48px', textAlign: 'center' }}>{awayAbbr}</div>
                    </div>
                    {rows.map((row, i) => (
                      <div key={row.label} style={{
                        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 24px',
                        padding: '8px 4px', borderTop: '1px solid #1e293b',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                      }}>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>{row.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', minWidth: '48px', textAlign: 'center' }}>{row.home}</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', minWidth: '48px', textAlign: 'center' }}>{row.away}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {activeTab === 'stats' && (() => {
                const gs = gameData.gameStats
                if (!gs) return <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>Stats not available yet</div>
                const homeAbbr = gameData.homeTeam.abbr
                const awayAbbr = gameData.awayTeam.abbr
                const homeColor = gameData.homeTeam.color
                const awayColor = gameData.awayTeam.color

                const sectionLabel = (text: string) => (
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 4px 6px' }}>{text}</div>
                )

                // Renders a player name cell with position badge + star rating
                const playerNameCell = (p: { id: number; name: string; position?: string | null; ratingStars?: number }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                      {p.position && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', backgroundColor: '#0f172a', padding: '1px 5px', borderRadius: '3px', flexShrink: 0 }}>
                          {p.position}
                        </span>
                      )}
                      <PlayerHoverCard playerId={p.id} playerName={p.name}>
                        <span style={{ fontSize: '15px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </PlayerHoverCard>
                    </div>
                    {p.ratingStars != null && (
                      <Stars stars={p.ratingStars} size={12} />
                    )}
                  </div>
                )

                // cols: header labels (first col is always player name area)
                // data: first element is the player object (for name/pos/stars), rest are stat values
                const statRow = (cols: (string | number | React.ReactNode)[], bold = false, template = '1fr 36px 36px 36px 42px') => (
                  <div style={{ display: 'grid', gridTemplateColumns: template, gap: '0 6px', padding: '8px 4px', borderTop: '1px solid #1e293b' }}>
                    {cols.map((c, i) => (
                      <div key={i} style={{ minWidth: 0, fontSize: bold ? '12px' : '15px', fontWeight: bold ? '700' : '400', color: bold ? '#64748b' : '#e2e8f0', textAlign: i === 0 ? 'left' : 'center', overflow: i === 0 ? 'hidden' : 'visible' }}>{c}</div>
                    ))}
                  </div>
                )

                const T7 = '1fr 48px 38px 36px 36px 28px 42px'  // 6 stat cols for offense sections

                const teamHeader = (abbr: string, color: string) => (
                  <div style={{ fontSize: '13px', fontWeight: '700', color, padding: '4px 4px 0' }}>{abbr}</div>
                )

                const hp = gs.home.players
                const ap = gs.away.players

                return (
                  <div>
                    {/* PASSING */}
                    {sectionLabel('Passing')}
                    {statRow(['Player', 'C/A', 'YDS', 'YPC', 'LNG', 'TD', 'FP'], true, T7)}
                    {teamHeader(homeAbbr, homeColor)}
                    {hp.qb && statRow([playerNameCell(hp.qb), `${hp.qb.comp}/${hp.qb.att}`, hp.qb.yards, hp.qb.ypc, hp.qb.longest, hp.qb.tds, hp.qb.fantasyPoints], false, T7)}
                    {teamHeader(awayAbbr, awayColor)}
                    {ap.qb && statRow([playerNameCell(ap.qb), `${ap.qb.comp}/${ap.qb.att}`, ap.qb.yards, ap.qb.ypc, ap.qb.longest, ap.qb.tds, ap.qb.fantasyPoints], false, T7)}

                    {/* RUSHING */}
                    {sectionLabel('Rushing')}
                    {statRow(['Player', 'CAR', 'YDS', 'YPC', 'LNG', 'TD', 'FP'], true, T7)}
                    {teamHeader(homeAbbr, homeColor)}
                    {hp.rb && statRow([playerNameCell(hp.rb), hp.rb.carries, hp.rb.yards, hp.rb.ypc, hp.rb.longest, hp.rb.tds, hp.rb.fantasyPoints], false, T7)}
                    {teamHeader(awayAbbr, awayColor)}
                    {ap.rb && statRow([playerNameCell(ap.rb), ap.rb.carries, ap.rb.yards, ap.rb.ypc, ap.rb.longest, ap.rb.tds, ap.rb.fantasyPoints], false, T7)}

                    {/* RECEIVING */}
                    {sectionLabel('Receiving')}
                    {statRow(['Player', 'REC', 'YDS', 'YPR', 'YAC', 'TD', 'FP'], true, T7)}
                    {teamHeader(homeAbbr, homeColor)}
                    {[hp.wr1, hp.wr2, hp.te].filter(Boolean).map((p) => p && statRow([playerNameCell(p), p.receptions, p.yards, p.ypr, p.yac, p.tds, p.fantasyPoints], false, T7))}
                    {teamHeader(awayAbbr, awayColor)}
                    {[ap.wr1, ap.wr2, ap.te].filter(Boolean).map((p) => p && statRow([playerNameCell(p), p.receptions, p.yards, p.ypr, p.yac, p.tds, p.fantasyPoints], false, T7))}

                    {/* KICKING */}
                    {sectionLabel('Kicking')}
                    {statRow(['Player', 'FG', 'ATT', 'LNG', 'FP'], true)}
                    {teamHeader(homeAbbr, homeColor)}
                    {hp.k && statRow([playerNameCell(hp.k), hp.k.fgs, hp.k.fgAtt, hp.k.longest, hp.k.fantasyPoints])}
                    {teamHeader(awayAbbr, awayColor)}
                    {ap.k && statRow([playerNameCell(ap.k), ap.k.fgs, ap.k.fgAtt, ap.k.longest, ap.k.fantasyPoints])}
                  </div>
                )
              })()}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
