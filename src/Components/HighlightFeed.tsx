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
        if (!(play.isTouchdown || play.isTurnover || play.scoreChange || play.isBigPlay)) return

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {highlights.map((item) => {
        if (item.type === 'league_news') {
          const isChamp = item.text.includes('champions!')
          const isTopSeed = item.text.includes('top seed') || item.text.includes('#1 seed')
          const isClinch = item.text.includes('clinched')
          const borderColor = isChamp ? '#f59e0b' : isTopSeed ? '#a78bfa' : isClinch ? '#22c55e' : '#ef4444'
          const label = isChamp ? 'CHAMPION' : isTopSeed ? 'TOP SEED' : isClinch ? 'CLINCHED' : 'ELIMINATED'
          const labelColor = isChamp ? '#f59e0b' : isTopSeed ? '#a78bfa' : isClinch ? '#22c55e' : '#ef4444'
          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '6px',
                padding: '10px 12px',
                borderLeft: `3px solid ${borderColor}`,
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: labelColor, letterSpacing: '0.08em' }}>
                  {label}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: '1.4' }}>
                {item.text}
              </p>
            </div>
          )
        }

        if (item.type === 'game_end') {
          const { homeTeam, awayTeam, homeScore, awayScore, gameId } = item
          const homeWon = homeScore > awayScore
          const awayWon = awayScore > homeScore
          return (
            <div
              key={`end-${gameId}`}
              onClick={() => onPlayClick(gameId)}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '6px',
                padding: '10px 12px',
                cursor: 'pointer',
                borderLeft: '3px solid #475569',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', letterSpacing: '0.08em' }}>FINAL</span>
                <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 6px', backgroundColor: '#1e293b', borderRadius: '4px', color: '#94a3b8' }}>
                  GAME OVER
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src={`${API_BASE}/teams/${homeTeam.id}/avatar?size=20&v=2`} alt={homeTeam.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: homeWon ? '700' : '400', color: homeWon ? '#e2e8f0' : '#64748b' }}>
                    {homeTeam.abbr}
                  </span>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                  {homeScore} – {awayScore}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: awayWon ? '700' : '400', color: awayWon ? '#e2e8f0' : '#64748b' }}>
                    {awayTeam.abbr}
                  </span>
                  <img src={`${API_BASE}/teams/${awayTeam.id}/avatar?size=20&v=2`} alt={awayTeam.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                </div>
              </div>
            </div>
          )
        }

        // Game-start card
        if (item.type === 'game_start') {
          const { homeTeam, awayTeam, gameId } = item
          return (
            <div
              key={`start-${gameId}`}
              onClick={() => onPlayClick(gameId)}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '6px',
                padding: '10px 12px',
                cursor: 'pointer',
                borderLeft: '3px solid #334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em' }}>KICKOFF</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src={`${API_BASE}/teams/${homeTeam.id}/avatar?size=20&v=2`} alt={homeTeam.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{homeTeam.abbr}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>vs</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{awayTeam.abbr}</span>
                  <img src={`${API_BASE}/teams/${awayTeam.id}/avatar?size=20&v=2`} alt={awayTeam.abbr} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                </div>
              </div>
            </div>
          )
        }

        // Play highlight
        const { play, featuredTeam, homeTeam, awayTeam, gameId } = item
        const badge = getBadge(play)
        const hasScore = play.homeTeamScore != null && play.awayTeamScore != null

        return (
          <div
            key={`play-${gameId}-${play.playNumber}`}
            onClick={() => onPlayClick(gameId)}
            style={{
              backgroundColor: play.isBigPlay ? '#1a1300' : '#0f172a',
              borderRadius: '6px',
              padding: '10px 12px',
              cursor: 'pointer',
              borderLeft: `3px solid ${featuredTeam.color}`,
            }}
          >
            {/* Header: team dot + abbr + time | badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={`${API_BASE}/teams/${featuredTeam.id}/avatar?size=16&v=2`} alt={featuredTeam.abbr} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.04em' }}>
                  {featuredTeam.abbr}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Q{play.quarter} {play.timeRemaining}
                </span>
                {play.isBigPlay && (
                  <span style={{ fontSize: '11px', color: '#d97706' }} title="Big WP swing">⚡</span>
                )}
              </div>
              {badge && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 7px',
                  borderRadius: '3px',
                  border: `1px solid ${badge.color}55`,
                  backgroundColor: `${badge.color}18`,
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
            <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 4px 22px', lineHeight: '1.4' }}>
              {play.description}
            </p>

            {/* Score after the play */}
            {hasScore && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '22px' }}>
                {homeTeam.abbr} {play.homeTeamScore} · {awayTeam.abbr} {play.awayTeamScore}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
