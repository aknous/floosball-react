import React, { useMemo, useState, useEffect } from 'react'
import { useGames } from '@/contexts/GamesContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type { CurrentGame } from '@/hooks/useCurrentGames'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface HighlightFeedProps {
  onPlayClick?: (gameId: number) => void
}

type TeamInfo = CurrentGame['homeTeam']

interface PlayHighlight {
  type: 'play'
  gameId: number
  sortKey: number
  play: any
  featuredTeam: TeamInfo
  homeTeam: TeamInfo
  awayTeam: TeamInfo
}

interface GameEndHighlight {
  type: 'game_end'
  gameId: number
  sortKey: number
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  homeScore: number
  awayScore: number
}

interface GameStartHighlight {
  type: 'game_start'
  gameId: number
  sortKey: number
  homeTeam: TeamInfo
  awayTeam: TeamInfo
}

interface LeagueNewsHighlight {
  type: 'league_news'
  id: string
  sortKey: number
  text: string
}

type HighlightItem = PlayHighlight | GameEndHighlight | GameStartHighlight | LeagueNewsHighlight

const getBadge = (play: any): { label: string; color: string } | null => {
  if (play.isTouchdown) return { label: 'TD', color: '#22c55e' }
  if (play.isTurnover) return { label: 'TURNOVER', color: '#ef4444' }
  if (play.scoreChange) {
    if (play.playType === 'FieldGoal') return { label: 'FG', color: '#22c55e' }
    return { label: 'SCORE', color: '#22c55e' }
  }
  if (play.isClutchPlay) return { label: 'CLUTCH', color: '#06b6d4' }
  if (play.isChokePlay) return { label: 'CHOKE', color: '#ef4444' }
  if (play.isMomentumShift) return { label: 'MOMENTUM', color: '#f97316' }
  return null
}

export const HighlightFeed: React.FC<HighlightFeedProps> = ({ onPlayClick = () => {} }) => {
  const { games } = useGames()
  const { event } = useSeasonWebSocket()
  const [newsItems, setNewsItems] = useState<LeagueNewsHighlight[]>([])

  useEffect(() => {
    if (!event || event.event !== 'league_news') return
    const text = (event as any).text as string
    setNewsItems(prev => [{
      type: 'league_news',
      id: `news-${Date.now()}-${Math.random()}`,
      sortKey: Date.now(),
      text,
    }, ...prev])
  }, [event])

  const highlights = useMemo<HighlightItem[]>(() => {
    const items: HighlightItem[] = []

    games.forEach((game, gameId) => {
      const { homeTeam, awayTeam, plays = [], status, homeScore, awayScore } = game

      // Game-start card — sits at the bottom (sortKey: 0, before any plays)
      if (status === 'Active' || status === 'Final') {
        items.push({
          type: 'game_start',
          gameId,
          sortKey: 0,
          homeTeam,
          awayTeam,
        })
      }

      // Game-end card — floats to the top of the feed
      if (status === 'Final') {
        items.push({
          type: 'game_end',
          gameId,
          sortKey: Number.MAX_SAFE_INTEGER,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
        })
      }

      plays.forEach((play: any) => {
        if (!play.playNumber) return
        if (!(play.isTouchdown || play.isTurnover || play.scoreChange || play.isBigPlay || play.isClutchPlay || play.isChokePlay || play.isMomentumShift)) return

        // For turnovers (without TD), feature the defensive team — they benefited
        const isTurnoverOnly = play.isTurnover && !play.isTouchdown
        const featuredAbbr = isTurnoverOnly ? play.defensiveTeam : play.offensiveTeam
        const featuredTeam = featuredAbbr === homeTeam.abbr ? homeTeam : awayTeam

        items.push({
          type: 'play',
          gameId,
          sortKey: play.playNumber,
          play,
          featuredTeam,
          homeTeam,
          awayTeam,
        })
      })
    })

    return [...items, ...newsItems].sort((a, b) => b.sortKey - a.sortKey)
  }, [games, newsItems])

  if (highlights.length === 0) {
    return (
      <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
        Waiting for highlights...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {highlights.map((item, idx) => {
        const separator = idx > 0 ? (
          <div key={`sep-${idx}`} style={{ height: '1px', backgroundColor: '#2a3a4e', margin: '0 12px' }} />
        ) : null
        if (item.type === 'league_news') {
          const isChamp = item.text.includes('champions!')
          const isTopSeed = item.text.includes('top seed') || item.text.includes('#1 seed')
          const isClinch = item.text.includes('clinched')
          const isMvp = item.text.includes('MVP:')
          const isAllPro = item.text.includes('All-Pro')
          const borderColor = isChamp ? '#f59e0b' : isMvp ? '#f59e0b' : isAllPro ? '#a78bfa' : isTopSeed ? '#a78bfa' : isClinch ? '#22c55e' : '#ef4444'
          const label = isChamp ? 'CHAMPION' : isMvp ? 'MVP' : isAllPro ? 'ALL-PRO' : isTopSeed ? 'TOP SEED' : isClinch ? 'CLINCHED' : 'ELIMINATED'
          const labelColor = borderColor
          return (
            <React.Fragment key={item.id}>
              {separator}
              <div
                style={{
                  backgroundColor: `${borderColor}18`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: labelColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: labelColor, letterSpacing: '0.08em' }}>
                    {label}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, lineHeight: '1.4' }}>
                  {item.text}
                </p>
              </div>
            </React.Fragment>
          )
        }

        if (item.type === 'game_end') {
          const { homeTeam, awayTeam, homeScore, awayScore, gameId } = item
          const homeWon = homeScore > awayScore
          const awayWon = awayScore > homeScore
          const winnerColor = homeWon ? homeTeam.color : awayTeam.color
          return (
            <React.Fragment key={`end-${gameId}`}>
              {separator}
              <div
                onClick={() => onPlayClick(gameId)}
                style={{
                  backgroundColor: `${winnerColor}18`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${winnerColor}40`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em' }}>FINAL</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={`/avatars/${homeTeam.id}.png`} alt={homeTeam.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: homeWon ? '700' : '400', color: homeWon ? '#e2e8f0' : '#94a3b8' }}>
                      {homeTeam.abbr}
                    </span>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                    {homeScore} – {awayScore}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: awayWon ? '700' : '400', color: awayWon ? '#e2e8f0' : '#94a3b8' }}>
                      {awayTeam.abbr}
                    </span>
                    <img src={`/avatars/${awayTeam.id}.png`} alt={awayTeam.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  </div>
                </div>
              </div>
            </React.Fragment>
          )
        }

        // Game-start card
        if (item.type === 'game_start') {
          const { homeTeam, awayTeam, gameId } = item
          return (
            <React.Fragment key={`start-${gameId}`}>
              {separator}
              <div
                onClick={() => onPlayClick(gameId)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <img src={`/avatars/${homeTeam.id}.png`} alt={homeTeam.abbr} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{homeTeam.abbr}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.08em' }}>KICKOFF</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{awayTeam.abbr}</span>
                  <img src={`/avatars/${awayTeam.id}.png`} alt={awayTeam.abbr} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                </div>
              </div>
            </React.Fragment>
          )
        }

        // Play highlight
        const { play, featuredTeam, homeTeam, awayTeam, gameId } = item
        const badge = getBadge(play)
        const hasScore = play.homeTeamScore != null && play.awayTeamScore != null

        return (
          <React.Fragment key={`play-${gameId}-${play.playNumber}`}>
            {separator}
            <div
              onClick={() => onPlayClick(gameId)}
              style={{
                backgroundColor: play.isBigPlay ? '#1a1300' : `${featuredTeam.color}15`,
                borderRadius: '6px',
                padding: '10px 12px',
                cursor: 'pointer',
              }}
            >
            {/* Header: team dot + abbr + time | badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={`/avatars/${featuredTeam.id}.png`} alt={featuredTeam.abbr} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.04em' }}>
                  {featuredTeam.abbr}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {play.quarter > 4 ? 'OT' : `Q${play.quarter}`} {play.timeRemaining}
                </span>
                {play.isBigPlay && (
                  <svg viewBox="0 0 24 24" fill="#d97706" style={{ width: '12px', height: '12px', flexShrink: 0 }} title="Big WP swing">
                    <path d="M3.75 13.5 14.25 2.25 12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                  </svg>
                )}
              </div>
              {badge && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 7px',
                  borderRadius: '3px',
                  backgroundColor: `${badge.color}30`,
                  color: badge.color,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {badge.label}
                </span>
              )}
            </div>

            {/* Play description */}
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 4px 22px', lineHeight: '1.4' }}>
              {play.description}
            </p>

            {/* Personality event (Layer 1/2/3 reaction) */}
            {play.personalityEvent && (() => {
              const layer = play.personalityEvent.layer
              const accent = layer === 'crowd' ? '#a78bfa' : layer === 'quirk' ? '#f472b6' : '#38bdf8'
              return (
                <p style={{
                  fontSize: '11px',
                  color: '#e2e8f0',
                  fontStyle: 'italic',
                  margin: '0 0 4px 22px',
                  padding: '3px 6px',
                  borderRadius: '3px',
                  backgroundColor: `${accent}12`,
                  borderLeft: `2px solid ${accent}`,
                  lineHeight: '1.4',
                }}>
                  {play.personalityEvent.text}
                </p>
              )
            })()}

            {/* Score after the play */}
            {hasScore && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '22px' }}>
                {homeTeam.abbr} {play.homeTeamScore} · {awayTeam.abbr} {play.awayTeamScore}
              </div>
            )}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
