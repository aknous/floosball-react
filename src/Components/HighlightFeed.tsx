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
  // Cores-specific metadata. When category === 'cores', the entry is
  // attributed to a named Core (Conservator, Pyre, Aris, Halverson,
  // Stenographer) and renders with a distinct accent + attribution
  // chip instead of the generic ELIMINATED / CLINCHED label flow.
  // When category === 'anomaly_transition', it's a player-state crossing
  // (stirring / erratic / rampant / awakened) — ominous, no-context
  // single line keyed by anomalyState.
  category?: string
  core?: string
  coreDisplayName?: string
  eventType?: string
  anomalyState?: string
  playerId?: number
  playerName?: string
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

// How often the personalized off-day endpoint is polled when no games are
// live. Keep this above the per-quote duration to avoid stacking faster
// than users read them.
const OFF_DAY_POLL_MS = 60_000

export const HighlightFeed: React.FC<HighlightFeedProps> = ({ onPlayClick = () => {} }) => {
  const { games } = useGames()
  const { event } = useSeasonWebSocket()
  const { user, fantasyPlayerIds, followedPlayerIds, getToken } = useAuth()
  const favoriteTeamId = user?.favoriteTeamId ?? null
  const [newsItems, setNewsItems] = useState<LeagueNewsHighlight[]>([])
  const [offDayItems, setOffDayItems] = useState<OffDayHighlight[]>([])

  useEffect(() => {
    if (!event || event.event !== 'league_news') return
    const e = event as any
    setNewsItems(prev => [{
      type: 'league_news',
      id: `news-${Date.now()}-${Math.random()}`,
      sortKey: Date.now(),
      text: e.text,
      category: e.category,
      core: e.core,
      coreDisplayName: e.coreDisplayName,
      eventType: e.eventType,
      anomalyState: e.anomalyState,
      playerId: e.playerId,
      playerName: e.playerName,
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

  // Are any games currently live? If so, don't poll for off-day quotes —
  // the highlights feed is already busy with real plays. Watch the games
  // map so the poll pauses/resumes on game-window transitions.
  const anyGameActive = useMemo(() => {
    for (const game of games.values()) {
      if (game.status === 'Active') return true
    }
    return false
  }, [games])

  // Poll the personalized /quotes/offday endpoint between rounds so the
  // user sees a steady drip of quotes from players they actually care
  // about (favorite team, fantasy roster, followed players). Replaces
  // the global WS broadcast as the primary source.
  useEffect(() => {
    if (anyGameActive || !user) return
    let cancelled = false
    const tick = async () => {
      try {
        const tok = await getToken()
        if (!tok || cancelled) return
        const res = await fetch(`${API_BASE}/quotes/offday?count=1`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const j = await res.json()
        if (cancelled) return
        if (!j?.success || !Array.isArray(j.data) || j.data.length === 0) return
        const pulled: OffDayHighlight[] = j.data.map((e: any, i: number) => ({
          type: 'off_day' as const,
          id: `offday-pull-${Date.now()}-${i}-${Math.random()}`,
          sortKey: e.timestamp ? new Date(e.timestamp).getTime() : Date.now(),
          playerId: e.playerId,
          playerName: e.playerName,
          teamId: e.teamId ?? null,
          teamAbbr: e.teamAbbr ?? null,
          personality: e.personality,
          text: e.text,
        }))
        setOffDayItems(prev => [...pulled, ...prev].slice(0, 12))
      } catch {
        /* silent — flavor isn't worth alerting the user about */
      }
    }
    // Fire once immediately on entering the idle window, then on interval.
    tick()
    const id = window.setInterval(tick, OFF_DAY_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [anyGameActive, user, getToken])

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

        // Care-set filter: only show plays involving players or teams
        // the user cares about. Globals (game start, game end, league
        // news, Cores dialogue) bypass this — they're handled outside
        // this loop. New users with no fav team / roster / follows
        // still see globals so the feed isn't empty.
        const onFavTeam = favoriteTeamId != null && (
          homeTeam.id === favoriteTeamId || awayTeam.id === favoriteTeamId
        )
        const cared = (id: number | null | undefined) =>
          id != null && (fantasyPlayerIds.has(id) || followedPlayerIds.has(id))
        const involvesCaredPlayer = (
          cared(play.passerId) || cared(play.receiverId) ||
          cared(play.runnerId) || cared(play.kickerId) ||
          cared(play.tacklerId) || cared(play.sackerId) ||
          cared(play.interceptorId) || cared(play.forcedFumblerId) ||
          cared(play.glitchPlayerId)
        )
        if (!onFavTeam && !involvesCaredPlayer) return

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

    // News-entry filter:
    //   - Cores dialogue (category === 'cores') always shows — league-wide voice
    //   - Anomaly transitions ('anomaly_transition') filter to care-set players
    //   - Everything else (clinches, eliminations, MVP, etc.) always shows
    const relevantNews = newsItems.filter(item => {
      if (item.category === 'anomaly_transition') {
        if (item.playerId != null && fantasyPlayerIds.has(item.playerId)) return true
        if (item.playerId != null && followedPlayerIds.has(item.playerId)) return true
        // No team check — transition events aren't team-scoped, only
        // player-scoped. Fav-team-only users still get Cores dialogue
        // and clinches; they don't get every random player crossing
        // the ladder.
        return false
      }
      return true
    })

    return [...items, ...relevantNews, ...relevantOffDay].sort((a, b) => b.sortKey - a.sortKey)
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
          // Anomaly state-transition entries — ominous one-liner about
          // a specific player crossing the ladder. No label, dim italic,
          // accent color matches the new state.
          if (item.category === 'anomaly_transition') {
            const stateAccent: Record<string, string> = {
              stirring: '#94a3b8',
              erratic:  '#fbbf24',
              rampant:  '#fb7185',
              awakened: '#a78bfa',
            }
            const accent = stateAccent[item.anomalyState ?? 'stirring'] || '#94a3b8'
            return (
              <React.Fragment key={item.id}>
                {separator}
                <div
                  style={{
                    padding: '8px 12px',
                    borderLeft: `2px solid ${accent}`,
                    backgroundColor: `${accent}10`,
                    borderRadius: '4px',
                  }}
                >
                  <p style={{
                    fontSize: '13px',
                    color: '#cbd5e1',
                    margin: 0,
                    lineHeight: '1.5',
                    fontStyle: 'italic' as const,
                  }}>
                    {item.text}
                  </p>
                </div>
              </React.Fragment>
            )
          }

          // Cores news entries get their own treatment — Core attribution
          // chip in the dim slate of in-fiction bureaucracy. No "ELIMINATED"
          // label, since the entry is not about a team's playoff fate.
          if (item.category === 'cores') {
            // Subtle color per event type. thinning + reset get a deeper
            // tint so the Boundary-thinning narrative reads as heavier
            // than a casual warning.
            const isHeavy = item.eventType === 'thinning' || item.eventType === 'reset'
            const accent = isHeavy ? '#a78bfa' : '#64748b'
            return (
              <React.Fragment key={item.id}>
                {separator}
                <div
                  style={{
                    backgroundColor: isHeavy ? 'rgba(167,139,250,0.10)' : 'rgba(100,116,139,0.08)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    borderLeft: `2px solid ${accent}`,
                  }}
                >
                  {item.coreDisplayName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: accent, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                        {item.coreDisplayName}
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: '1.5', fontStyle: 'italic' as const }}>
                    {item.text}
                  </p>
                </div>
              </React.Fragment>
            )
          }

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
