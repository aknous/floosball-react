import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { useIsMobile } from '@/hooks/useIsMobile'
import { LeaderboardExpandedBody } from './LeaderboardExpandedBody'
import type { SnapshotEntry } from '@/hooks/useFantasySnapshot'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const RANK_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: '1st', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  2: { label: '2nd', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  3: { label: '3rd', color: '#cd7f32', bg: 'rgba(205,127,50,0.15)' },
}

const WEEKLY_PRIZES: Record<number, number> = { 1: 30, 2: 20, 3: 15 }
/**
 * The board scrolls rather than truncating.
 *
 * ⚠️ A max-height, not a full-height column. This sits beside the scoring pane, and an
 * unbounded list of every player in the league would drag the page metres long for
 * anyone below the middle of the table.
 *
 * ⚠️ THE HEIGHT IS MEASURED, not fixed (owner: the board ran past the fold and cost a
 * little scroll to see its own bottom). 520px was a guess about a viewport, and it is
 * wrong on most of them. `useFoldHeight` reads where the list actually starts and gives
 * it the rest of the window. Measured at MOUNT and on RESIZE only, deliberately NOT on
 * scroll: growing the list as the reader scrolls down would push the page bottom away by
 * exactly as much as they scrolled, and the page would never end.
 */
const FOLD_GAP = 16
const MIN_LIST_HEIGHT = 240

const useFoldHeight = <T extends HTMLElement>(deps: unknown[] = []) => {
  const ref = useRef<T>(null)
  const [maxHeight, setMaxHeight] = useState<number | null>(null)
  useEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const avail = window.innerHeight - el.getBoundingClientRect().top - FOLD_GAP
      setMaxHeight(Math.max(MIN_LIST_HEIGHT, Math.round(avail)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { ref, maxHeight }
}

const listStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px',
  overflowY: 'auto', overflowX: 'hidden',
}

const WEEKLY_TOP_PCT_PRIZE = 5
const SEASON_PRIZES: Record<number, number> = { 1: 200, 2: 125, 3: 75 }
const SEASON_TOP_PCT_PRIZE = 25

interface WeeklyPlayer {
  slot: string
  playerName: string
  teamAbbr: string
  teamId?: number | null
  weekPoints: number
}

interface WeeklyEntry {
  rank: number
  userId: number
  username: string
  favoriteTeamId?: number | null
  weekPoints: number
  cardBonusPoints: number
  players: WeeklyPlayer[]
  cardBreakdowns?: any[]
}

interface WeekData {
  week: number
  entries: WeeklyEntry[]
}

type ViewMode = 'season' | 'weekly'

export const FantasyLeaderboard: React.FC<{ seasonOnly?: boolean }> = ({ seasonOnly = false }) => {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const currentUserId = user?.id ?? null
  const [mode, setMode] = useState<ViewMode>(seasonOnly ? 'season' : 'weekly')
  const { event: wsEvent } = useSeasonWebSocket()
  const { entries: snapshotEntries, season, week, gamesActive, loading: snapshotLoading } = useFantasySnapshot()

  // Historical weekly data from REST (for completed weeks — snapshot only has current week)
  const [historicalWeekData, setHistoricalWeekData] = useState<WeekData | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(true)

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [showPrizes, setShowPrizes] = useState(false)

  const fetchWeekly = useCallback(() => {
    axios.get(`${API_BASE}/fantasy/leaderboard/weekly`)
      .then(res => {
        const data = res.data?.data || res.data
        const w = data.weeks || []
        setHistoricalWeekData(w.length > 0 ? w[w.length - 1] : null)
      })
      .catch(() => {})
      .finally(() => setWeeklyLoading(false))
  }, [])

  useEffect(() => { fetchWeekly() }, [fetchWeekly])

  // Refetch historical weekly data on week transitions
  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'week_start' || wsEvent.event === 'week_end') {
      fetchWeekly()
    }
  }, [wsEvent, fetchWeekly])

  // Build live weekly view from snapshot entries. Memoized on snapshotEntries
  // so the filter/map/sort over 100+ users only runs when the snapshot actually
  // changes (~every 10s), not on every re-render the live-game context triggers.
  const liveWeekEntries: WeeklyEntry[] = useMemo(() => {
    const entries = snapshotEntries
      .filter(e => (e.weekPlayerFP ?? 0) > 0 || (e.weekCardBonus ?? 0) > 0)
      .map(e => ({
        rank: 0,
        userId: e.userId,
        username: e.username,
        favoriteTeamId: e.favoriteTeamData?.teamId ?? null,
        weekPoints: Math.round((e.weekPlayerFP + e.weekCardBonus) * 10) / 10,
        cardBonusPoints: e.weekCardBonus,
        players: e.players.filter(p => p.slot !== 'PREV').map(p => ({
          slot: p.slot,
          playerName: p.playerName,
          teamAbbr: p.teamAbbr,
          teamId: p.teamId ?? null,
          weekPoints: p.weekFP ?? 0,
        })),
        cardBreakdowns: e.cardBreakdowns,
      }))
      .sort((a, b) => b.weekPoints - a.weekPoints)
    entries.forEach((e, i) => { e.rank = i + 1 })
    return entries
  }, [snapshotEntries])

  // Use live weekly data if available, otherwise fall back to historical
  const weeklyIsLive = liveWeekEntries.length > 0
  // If the snapshot says we're on a newer week than the historical data,
  // don't fall back to stale previous-week results — show current week empty
  const historicalIsStale = historicalWeekData != null && week > historicalWeekData.week
  const currentWeekData: WeekData | null = weeklyIsLive
    ? { week, entries: liveWeekEntries }
    : historicalIsStale ? { week, entries: [] } : historicalWeekData
  // Show rank badges in season view always, in weekly view only after week ends
  const showRankBadges = mode === 'season' || (mode === 'weekly' && !weeklyIsLive)

  // ⚠️ Re-measured when the ROW COUNT changes, not just on mount. The list is rendered
  // only once its data has landed, so a measurement taken at mount finds no element at
  // all and the board would come back unbounded — the very thing this replaced. The mode
  // is in here too: the two views carry different chrome above the list.
  const { ref: listRef, maxHeight: listMaxHeight } = useFoldHeight<HTMLDivElement>(
    [mode, snapshotEntries.length, currentWeekData?.entries.length ?? 0])

  const isLoading = mode === 'season' ? snapshotLoading : (snapshotLoading && weeklyLoading)

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    border: 'none',
    backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: active ? '#60a5fa' : '#64748b',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '11px',
    fontWeight: '600',
    transition: 'all 0.15s',
  })

  return (
    <div style={cardStyleFn(isMobile)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Leaderboards</div>
          {season && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Season {season}{mode === 'weekly' && currentWeekData ? ` — Week ${currentWeekData.week}` : ''}</div>}
        </div>
        {!seasonOnly && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => { setMode('season'); setExpandedUserId(null) }} style={toggleStyle(mode === 'season')}>
              Season
            </button>
            <button onClick={() => { setMode('weekly'); setExpandedUserId(null) }} style={toggleStyle(mode === 'weekly')}>
              Weekly
            </button>
          </div>
        )}
      </div>

      {/* Prize table toggle + user leaderboard content */}
      <>
      <div
        onClick={() => setShowPrizes(p => !p)}
        style={{
          cursor: 'pointer', userSelect: 'none', marginBottom: '12px',
          padding: '6px 10px',
          backgroundColor: 'rgba(234,179,8,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11px', color: '#eab308', fontWeight: '600' }}>
          {showPrizes ? '−' : '+'} Prizes
        </span>
        {!showPrizes && (
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            {mode === 'season' ? '200 / 125 / 75 F' : '30 / 20 / 15 F'}
          </span>
        )}
      </div>
      {showPrizes && (() => {
        const prizes = mode === 'season' ? SEASON_PRIZES : WEEKLY_PRIZES
        const topPctPrize = mode === 'season' ? SEASON_TOP_PCT_PRIZE : WEEKLY_TOP_PCT_PRIZE
        return (
          <div style={{
            marginBottom: '12px', padding: '10px 12px',
            backgroundColor: 'rgba(234,179,8,0.10)',
            borderBottom: '2px solid rgba(234,179,8,0.5)',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            {[1, 2, 3].map(rank => {
              const rs = RANK_STYLE[rank]
              return (
                <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{
                    width: '28px', textAlign: 'center', fontWeight: '700',
                    color: rs.color, backgroundColor: rs.bg,
                    padding: '2px 4px', fontSize: '10px',
                  }}>{rs.label}</span>
                  <span style={{ color: '#eab308', fontWeight: '600', marginLeft: 'auto' }}>
                    {prizes[rank]}F
                  </span>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', marginTop: '2px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#94a3b8' }}>Top 25%</span>
              <span style={{ color: '#eab308', fontWeight: '600', marginLeft: 'auto' }}>{topPctPrize}F</span>
            </div>
          </div>
        )
      })()}

      {/* Content */}
      {isLoading ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
      ) : mode === 'season' ? (
        /* Season view — from snapshot */
        snapshotEntries.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
            No locked rosters yet
          </div>
        ) : (
          <div ref={listRef} style={{ ...listStyle, maxHeight: listMaxHeight ?? undefined }}>
            {(() => {
              // ⚠️ EVERYONE, not the top five (owner: users asked for a real
              // leaderboard). A cut-off board answers "who is winning" and refuses the
              // question most people actually have, which is "where am I". The list
              // scrolls instead, and the reader's own row is tinted wherever it falls,
              // so the pinned duplicate that used to sit under the top five is gone.
              const rows = snapshotEntries
              return <>
                {rows.map(entry => {
                  const isMe = currentUserId != null && entry.userId === currentUserId
                  return (
                    <div key={entry.userId}>
                      {/* ⚠️ A SEASON ROW DOES NOT OPEN (owner). It used to expand into the
                          lineup and card breakdown, but under the fusion the equipped cards
                          ARE the roster and they are swapped week to week — so what it
                          showed was TODAY's six cards under a total earned by twenty-eight
                          weeks of other ones. The weekly board still opens, because a week
                          has a banked lineup that genuinely produced its score. */}
                      <div style={{ ...rowStyle(false, isMobile, isMe), cursor: 'default' }}>
                        <div style={rankStyleFn(entry.rank, isMobile)}>
                          {showRankBadges && RANK_STYLE[entry.rank]
                            ? <span style={{
                                fontSize: '10px', fontWeight: '700',
                                color: RANK_STYLE[entry.rank].color,
                                backgroundColor: RANK_STYLE[entry.rank].bg,
                                padding: '2px 4px',
                              }}>{RANK_STYLE[entry.rank].label}</span>
                            : entry.rank}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {entry.favoriteTeamData?.teamId && (
                            <img
                              src={`/avatars/${entry.favoriteTeamData.teamId}.png`}
                              alt=""
                              style={{ width: isMobile ? 16 : 20, height: isMobile ? 16 : 20, flexShrink: 0, }}
                            />
                          )}
                          <div style={nameStyleFn(isMobile)}>
                            {entry.username}
                            {isMe && <span style={{ color: '#3b82f6', marginLeft: '4px', fontSize: '10px' }}>(you)</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={pointsStyleFn(isMobile)}>{entry.seasonTotal.toFixed(0)}</div>
                          {entry.seasonCardBonus > 0 && (
                            <div style={{ fontSize: '9px', color: '#a78bfa', marginTop: '1px' }}>
                              +{entry.seasonCardBonus.toFixed(0)} FP from cards
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            })()}
          </div>
        )
      ) : (
        /* Weekly view — current week only */
        currentWeekData && currentWeekData.entries.length > 0 ? (
          <div ref={listRef} style={{ ...listStyle, maxHeight: listMaxHeight ?? undefined }}>
            {(() => {
              // See the season branch: the whole board, scrolled, with your own row tinted.
              const rows = currentWeekData.entries
              return <>
                {rows.map(entry => {
                  const isExpanded = expandedUserId === entry.userId
                  const isMe = currentUserId != null && entry.userId === currentUserId
                  return (
                    <div key={entry.userId}>
                      <button
                        onClick={() => setExpandedUserId(isExpanded ? null : entry.userId)}
                        style={rowStyle(isExpanded, isMobile, isMe)}
                      >
                        <div style={rankStyleFn(entry.rank, isMobile)}>
                          {showRankBadges && RANK_STYLE[entry.rank]
                            ? <span style={{
                                fontSize: '10px', fontWeight: '700',
                                color: RANK_STYLE[entry.rank].color,
                                backgroundColor: RANK_STYLE[entry.rank].bg,
                                padding: '2px 4px',
                              }}>{RANK_STYLE[entry.rank].label}</span>
                            : entry.rank}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {entry.favoriteTeamId && (
                            <img
                              src={`/avatars/${entry.favoriteTeamId}.png`}
                              alt=""
                              style={{ width: isMobile ? 16 : 20, height: isMobile ? 16 : 20, flexShrink: 0, }}
                            />
                          )}
                          <div style={nameStyleFn(isMobile)}>
                            {entry.username}
                            {isMe && <span style={{ color: '#3b82f6', marginLeft: '4px', fontSize: '10px' }}>(you)</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={pointsStyleFn(isMobile)}>{entry.weekPoints.toFixed(0)}</div>
                          {(entry.cardBonusPoints ?? 0) > 0 && (
                            <div style={{ fontSize: '9px', color: '#a78bfa', marginTop: '1px' }}>
                              +{entry.cardBonusPoints.toFixed(0)} FP from cards
                            </div>
                          )}
                        </div>
                        <div style={chevronStyle(isExpanded)}>▼</div>
                      </button>
                      {isExpanded && season != null && currentWeekData && (
                        <LeaderboardExpandedBody
                          userId={entry.userId}
                          season={season}
                          week={currentWeekData.week}
                          players={entry.players.map(p => ({
                            slot: p.slot, playerName: p.playerName, teamAbbr: p.teamAbbr, teamId: (p as any).teamId ?? null,
                            points: p.weekPoints,
                          }))}
                          breakdowns={entry.cardBreakdowns}
                          isMobile={isMobile}
                        />
                      )}
                    </div>
                  )
                })}
              </>
            })()}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
            No weekly data yet
          </div>
        )
      )}
      </>
    </div>
  )
}

// ⚠️ 18px, NOT 24 — and the two files must move together. This page is trying to fit
// the fold, and measured on a 982px window it came to 945px against 919px of room. The
// last 12 of that overflow is here: both dashboard columns wear this shell, they are
// within 3px of each other in height, so whichever keeps the larger padding becomes the
// taller column and sets the row. Simulated on production before shipping: 945 -> 919,
// nothing left over.
const cardStyleFn = (mobile: boolean): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  padding: mobile ? '12px' : '18px',
})

const rowStyle = (isExpanded: boolean, mobile: boolean, isMe: boolean = false): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: mobile ? '8px' : '14px',
  width: '100%', padding: mobile ? '8px 10px' : '12px 16px',
  backgroundColor: isMe ? '#253348' : isExpanded ? 'rgba(255,255,255,0.06)' : 'transparent',
  borderLeft: isMe ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer',
  fontFamily: 'inherit', textAlign: 'left',
  transition: 'background 0.1s',
})

const rankStyleFn = (rank: number, mobile: boolean): React.CSSProperties => ({
  width: mobile ? '22px' : '28px', textAlign: 'center', flexShrink: 0,
  fontSize: mobile ? '12px' : '15px', fontWeight: '700',
  color: rank <= 3 ? '#eab308' : '#94a3b8',
})

const nameStyleFn = (mobile: boolean): React.CSSProperties => ({
  fontSize: mobile ? '12px' : '14px', fontWeight: '600', color: '#f1f5f9',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
})

const pointsStyleFn = (mobile: boolean): React.CSSProperties => ({
  fontSize: mobile ? '12px' : '15px', fontWeight: '700', color: '#4ade80', flexShrink: 0,
})

const chevronStyle = (isExpanded: boolean): React.CSSProperties => ({
  fontSize: '12px', color: '#64748b', flexShrink: 0,
  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s',
})

