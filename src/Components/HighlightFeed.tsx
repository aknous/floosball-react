import React, { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGames } from '@/contexts/GamesContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { personalityAccent } from '@/utils/personality'

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

interface OffDayHighlight {
  type: 'off_day'
  id: string
  sortKey: number
  playerId: number
  playerName: string
  teamId: number | null
  teamAbbr: string | null
  personality: string
  text: string
}

type HighlightItem = PlayHighlight | GameEndHighlight | GameStartHighlight | LeagueNewsHighlight | OffDayHighlight

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
  const { user, fantasyPlayerIds, followedPlayerIds } = useAuth()
  const favoriteTeamId = user?.favoriteTeamId ?? null
  const [newsItems, setNewsItems] = useState<LeagueNewsHighlight[]>([])
  const [offDayItems, setOffDayItems] = useState<OffDayHighlight[]>([])

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

  useEffect(() => {
    if (!event) return
    const evtName = (event as any).event
    if (evtName === 'player_off_day') {
      const e = event as any
      setOffDayItems(prev => [{
        type: 'off_day' as const,
        id: `offday-${Date.now()}-${Math.random()}`,
        sortKey: Date.now(),
        playerId: e.playerId,
        playerName: e.playerName,
        teamId: e.teamId ?? null,
        teamAbbr: e.teamAbbr ?? null,
        personality: e.personality,
        text: e.text,
      }, ...prev].slice(0, 12))
    } else if (evtName === 'game_start' || evtName === 'week_start') {
      // New round / week starting — clear off-day chatter from the previous
      // idle window so the feed is fresh for the upcoming games.
      setOffDayItems([])
    }
  }, [event])

  // Backfill the off-day feed on mount from the backend ring buffer so the
  // feed isn't empty after a browser refresh.
  useEffect(() => {
    fetch(`${API_BASE}/recent-off-day`)
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !Array.isArray(j.data)) return
        const seeded: OffDayHighlight[] = j.data.map((e: any, i: number) => ({
          type: 'off_day' as const,
          id: `offday-seed-${i}-${e.timestamp || Date.now()}`,
          // Sort the seeded ones BEFORE any new live events: use timestamp
          // when present, else a small monotonic offset from now.
          sortKey: e.timestamp ? new Date(e.timestamp).getTime() : Date.now() - i * 1000,
          playerId: e.playerId,
          playerName: e.playerName,
          teamId: e.teamId ?? null,
          teamAbbr: e.teamAbbr ?? null,
          personality: e.personality,
          text: e.text,
        }))
        setOffDayItems(seeded)
      })
      .catch(() => {})
  }, [])

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

      // Game-end card — sortKey is when the game ended (epoch ms) so it sits
      // naturally with other timestamped items in the feed. Pinning it to the
      // top forever made off-day chatter from the next idle window stack
      // underneath stale final scores.
      if (status === 'Final') {
        const endedAt = (game as any)._endedAt
        items.push({
          type: 'game_end',
          gameId,
          // Falls back to "an hour ago" for Final games that came in via REST
          // without an _endedAt stamp — keeps them in the feed but doesn't
          // dominate over anything live.
          sortKey: endedAt ?? (Date.now() - 60 * 60 * 1000),
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
        })
      }

      plays.forEach((play: any) => {
        if (!play.playNumber) return

        // Sideline cutaways are intentionally excluded from the global highlights
        // feed (too chatty across many simultaneous games). They still appear in
        // the per-game modal where they belong as flavor.
        if (play.isSidelineCutaway) return

        // PAT attempts now fire as their own play with scoreChange=true on a
        // successful kick. The TD that preceded them is already a highlight,
        // so featuring the XP separately would double-list the same scoring
        // moment. Ditto 2-pt — its preceding TD is the highlight.
        const pr = String(play.playResult ?? '')
        if (pr === 'XP Good' || pr === 'XP No Good'
            || pr === 'Touchdown, 2-Pt Good' || pr === 'Touchdown, 2-Pt No Good') return

        if (!(play.isTouchdown || play.isTurnover || play.scoreChange)) return

        // For turnovers (without TD), feature the defensive team — they benefited
        const isTurnoverOnly = play.isTurnover && !play.isTouchdown
        const featuredAbbr = isTurnoverOnly ? play.defensiveTeam : play.offensiveTeam
        const featuredTeam = featuredAbbr === homeTeam.abbr ? homeTeam : awayTeam

        items.push({
          type: 'play',
          gameId,
          // Sort plays by _receivedAt (epoch ms) so they interleave correctly
          // with off-day items (also epoch ms). Falls back to playNumber for
          // plays that somehow lack a stamp (shouldn't happen in practice).
          sortKey: play._receivedAt ?? play.playNumber,
          play,
          featuredTeam,
          homeTeam,
          awayTeam,
        })
      })
    })

    // Off-day chatter is filtered to players the user actually cares about:
    // favorite team's roster + fantasy lineup + explicit follows. New users
    // with none of these set up see no off-day items until they pick a team,
    // draft a roster, or follow someone — the feed shouldn't be filled with
    // strangers' moods.
    const relevantOffDay = offDayItems.filter(item => {
      if (favoriteTeamId != null && item.teamId === favoriteTeamId) return true
      if (item.playerId != null && fantasyPlayerIds.has(item.playerId)) return true
      if (item.playerId != null && followedPlayerIds.has(item.playerId)) return true
      return false
    })

    return [...items, ...newsItems, ...relevantOffDay].sort((a, b) => b.sortKey - a.sortKey)
  }, [games, newsItems, offDayItems, favoriteTeamId, fantasyPlayerIds, followedPlayerIds])

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
        if (item.type === 'off_day') {
          const accent = personalityAccent(item.personality)
          return (
            <React.Fragment key={item.id}>
              {separator}
              <Link
                to={`/players/${item.playerId}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  backgroundColor: `${accent}10`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  borderLeft: `2px solid ${accent}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {item.teamId != null && (
                    <img src={`/avatars/${item.teamId}.png`} alt={item.teamAbbr || ''} style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '0.02em' }}>
                    {item.playerName}
                  </span>
                  {item.teamAbbr && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                      · {item.teamAbbr}
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: '13px',
                  color: '#cbd5e1',
                  fontStyle: 'italic',
                  margin: 0,
                  lineHeight: '1.45',
                }}>
                  {item.text}
                </p>
              </Link>
            </React.Fragment>
          )
        }

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
                backgroundColor: `${featuredTeam.color}15`,
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

            {/* Personality reaction (vibe or variant + optional quirk) */}
            {play.personalityEvent && (() => {
              const accent = personalityAccent(play.personalityEvent.personality)
              return (
                <p style={{
                  fontSize: '13px',
                  color: '#e2e8f0',
                  fontStyle: 'italic',
                  margin: '0 0 4px 22px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: `${accent}12`,
                  borderLeft: `2px solid ${accent}`,
                  lineHeight: '1.45',
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
