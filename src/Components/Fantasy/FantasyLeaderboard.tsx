import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import type { SnapshotEntry } from '@/hooks/useFantasySnapshot'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const RANK_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: '1st', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  2: { label: '2nd', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  3: { label: '3rd', color: '#cd7f32', bg: 'rgba(205,127,50,0.15)' },
}

const WEEKLY_PRIZES: Record<number, number> = { 1: 30, 2: 20, 3: 15 }
const WEEKLY_TOP_PCT_PRIZE = 5
const SEASON_PRIZES: Record<number, number> = { 1: 200, 2: 125, 3: 75 }
const SEASON_TOP_PCT_PRIZE = 25

interface WeeklyPlayer {
  slot: string
  playerName: string
  teamAbbr: string
  weekPoints: number
}

interface WeeklyEntry {
  rank: number
  userId: number
  username: string
  weekPoints: number
  cardBonusPoints: number
  players: WeeklyPlayer[]
}

interface WeekData {
  week: number
  entries: WeeklyEntry[]
}

type ViewMode = 'season' | 'weekly'

export const FantasyLeaderboard: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('season')
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

  // Refetch historical weekly data on milestone events
  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'game_end' || wsEvent.event === 'week_start'
      || wsEvent.event === 'week_end' || wsEvent.event === 'season_end') {
      fetchWeekly()
    }
  }, [wsEvent, fetchWeekly])

  // Build live weekly view from snapshot entries
  const liveWeekEntries: WeeklyEntry[] = snapshotEntries
    .filter(e => (e.weekPlayerFP ?? 0) > 0 || (e.weekCardBonus ?? 0) > 0)
    .map(e => ({
      rank: 0,
      userId: e.userId,
      username: e.username,
      weekPoints: Math.round((e.weekPlayerFP + e.weekCardBonus) * 10) / 10,
      cardBonusPoints: e.weekCardBonus,
      players: e.players.map(p => ({
        slot: p.slot,
        playerName: p.playerName,
        teamAbbr: p.teamAbbr,
        weekPoints: p.weekFP ?? 0,
      })),
    }))
    .sort((a, b) => b.weekPoints - a.weekPoints)
  liveWeekEntries.forEach((e, i) => { e.rank = i + 1 })

  // Use live weekly data if available, otherwise fall back to historical
  const weeklyIsLive = liveWeekEntries.length > 0
  const currentWeekData: WeekData | null = weeklyIsLive
    ? { week, entries: liveWeekEntries }
    : historicalWeekData
  // Show rank badges in season view always, in weekly view only after week ends
  const showRankBadges = mode === 'season' || (mode === 'weekly' && !weeklyIsLive)

  const isLoading = mode === 'season' ? snapshotLoading : (snapshotLoading && weeklyLoading)

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: active ? '1px solid #3b82f6' : '1px solid transparent',
    backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: active ? '#60a5fa' : '#64748b',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '11px',
    fontWeight: '600',
    transition: 'all 0.15s',
  })

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Leaderboard</div>
          {season && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Season {season}{mode === 'weekly' && currentWeekData ? ` — Week ${currentWeekData.week}` : ''}</div>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => { setMode('season'); setExpandedUserId(null) }} style={toggleStyle(mode === 'season')}>
            Season
          </button>
          <button onClick={() => { setMode('weekly'); setExpandedUserId(null) }} style={toggleStyle(mode === 'weekly')}>
            Weekly
          </button>
        </div>
      </div>

      {/* Prize table toggle */}
      <div
        onClick={() => setShowPrizes(p => !p)}
        style={{
          cursor: 'pointer', userSelect: 'none', marginBottom: '12px',
          padding: '6px 10px', borderRadius: '6px',
          backgroundColor: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.2)',
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
            marginBottom: '12px', padding: '10px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(234,179,8,0.06)',
            border: '1px solid rgba(234,179,8,0.15)',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            {[1, 2, 3].map(rank => {
              const rs = RANK_STYLE[rank]
              return (
                <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{
                    width: '28px', textAlign: 'center', fontWeight: '700',
                    color: rs.color, backgroundColor: rs.bg,
                    padding: '2px 4px', borderRadius: '4px', fontSize: '10px',
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
            {mode === 'season' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8' }}>Season End Payout</span>
                <span style={{ color: '#eab308', fontWeight: '600', marginLeft: 'auto' }}>1F per 25 FP</span>
              </div>
            )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {snapshotEntries.map(entry => {
              const isExpanded = expandedUserId === entry.userId
              return (
                <div key={entry.userId}>
                  <button
                    onClick={() => setExpandedUserId(isExpanded ? null : entry.userId)}
                    style={rowStyle(isExpanded)}
                  >
                    <div style={rankStyle(entry.rank)}>
                      {showRankBadges && RANK_STYLE[entry.rank]
                        ? <span style={{
                            fontSize: '10px', fontWeight: '700',
                            color: RANK_STYLE[entry.rank].color,
                            backgroundColor: RANK_STYLE[entry.rank].bg,
                            padding: '2px 4px', borderRadius: '4px',
                          }}>{RANK_STYLE[entry.rank].label}</span>
                        : entry.rank}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={nameStyle}>{entry.username}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={pointsStyle}>{entry.seasonTotal.toFixed(0)}</div>
                      {entry.seasonCardBonus > 0 && (
                        <div style={{ fontSize: '9px', color: '#a78bfa', marginTop: '1px' }}>
                          +{entry.seasonCardBonus.toFixed(0)} cards
                        </div>
                      )}
                    </div>
                    <div style={chevronStyle(isExpanded)}>▼</div>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '6px 16px 14px 58px' }}>
                      {entry.players
                        .filter(p => p.slot !== 'PREV')
                        .sort((a, b) => b.earnedPoints - a.earnedPoints)
                        .map(p => (
                        <div key={p.slot} style={playerRowStyle}>
                          <span style={slotStyle}>{p.slot}</span>
                          <span style={playerNameStyle}>{p.playerName}</span>
                          <span style={teamAbbrStyle}>{p.teamAbbr}</span>
                          <span style={playerPointsStyle}>+{p.earnedPoints.toFixed(0)}</span>
                        </div>
                      ))}
                      {entry.players.filter(p => p.slot === 'PREV').map(p => (
                        <div key="prev" style={playerRowStyle}>
                          <span style={{ ...slotStyle, color: '#64748b' }}>PREV</span>
                          <span style={{ ...playerNameStyle, color: '#64748b', fontStyle: 'italic' }}>{p.playerName}</span>
                          <span style={teamAbbrStyle}></span>
                          <span style={{ ...playerPointsStyle, color: '#64748b' }}>+{p.earnedPoints.toFixed(0)}</span>
                        </div>
                      ))}
                      {entry.seasonCardBonus > 0 && (
                        <div key="card-bonus" style={playerRowStyle}>
                          <span style={{ ...slotStyle, color: '#a78bfa' }}>CARD</span>
                          <span style={{ ...playerNameStyle, color: '#a78bfa' }}>Card Bonus</span>
                          <span style={teamAbbrStyle}></span>
                          <span style={{ ...playerPointsStyle, color: '#a78bfa' }}>+{entry.seasonCardBonus.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Weekly view — current week only */
        currentWeekData && currentWeekData.entries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {currentWeekData.entries.map(entry => {
              const isExpanded = expandedUserId === entry.userId
              return (
                <div key={entry.userId}>
                  <button
                    onClick={() => setExpandedUserId(isExpanded ? null : entry.userId)}
                    style={rowStyle(isExpanded)}
                  >
                    <div style={rankStyle(entry.rank)}>
                      {showRankBadges && RANK_STYLE[entry.rank]
                        ? <span style={{
                            fontSize: '10px', fontWeight: '700',
                            color: RANK_STYLE[entry.rank].color,
                            backgroundColor: RANK_STYLE[entry.rank].bg,
                            padding: '2px 4px', borderRadius: '4px',
                          }}>{RANK_STYLE[entry.rank].label}</span>
                        : entry.rank}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={nameStyle}>{entry.username}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={pointsStyle}>{entry.weekPoints.toFixed(0)}</div>
                      {(entry.cardBonusPoints ?? 0) > 0 && (
                        <div style={{ fontSize: '9px', color: '#a78bfa', marginTop: '1px' }}>
                          +{entry.cardBonusPoints.toFixed(0)} cards
                        </div>
                      )}
                    </div>
                    <div style={chevronStyle(isExpanded)}>▼</div>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '6px 16px 14px 58px' }}>
                      {entry.players
                        .sort((a, b) => b.weekPoints - a.weekPoints)
                        .map(p => (
                        <div key={p.slot} style={playerRowStyle}>
                          <span style={slotStyle}>{p.slot}</span>
                          <span style={playerNameStyle}>{p.playerName}</span>
                          <span style={teamAbbrStyle}>{p.teamAbbr}</span>
                          <span style={playerPointsStyle}>+{p.weekPoints.toFixed(0)}</span>
                        </div>
                      ))}
                      {(entry.cardBonusPoints ?? 0) > 0 && (
                        <div key="card-bonus" style={playerRowStyle}>
                          <span style={{ ...slotStyle, color: '#a78bfa' }}>CARD</span>
                          <span style={{ ...playerNameStyle, color: '#a78bfa' }}>Card Bonus</span>
                          <span style={teamAbbrStyle}></span>
                          <span style={{ ...playerPointsStyle, color: '#a78bfa' }}>+{entry.cardBonusPoints.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
            No weekly data yet
          </div>
        )
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '14px',
  border: '1px solid #334155',
  padding: '24px',
}

const rowStyle = (isExpanded: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '14px',
  width: '100%', padding: '12px 16px',
  backgroundColor: isExpanded ? 'rgba(255,255,255,0.06)' : 'transparent',
  border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontFamily: 'inherit', textAlign: 'left',
  transition: 'background 0.1s',
})

const rankStyle = (rank: number): React.CSSProperties => ({
  width: '28px', textAlign: 'center', flexShrink: 0,
  fontSize: '15px', fontWeight: '700',
  color: rank <= 3 ? '#eab308' : '#94a3b8',
})

const nameStyle: React.CSSProperties = {
  fontSize: '14px', fontWeight: '600', color: '#f1f5f9',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}

const pointsStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: '700', color: '#4ade80', flexShrink: 0,
}

const chevronStyle = (isExpanded: boolean): React.CSSProperties => ({
  fontSize: '12px', color: '#64748b', flexShrink: 0,
  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s',
})

const playerRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '5px 0', fontSize: '12px',
}

const slotStyle: React.CSSProperties = { width: '32px', color: '#64748b', fontWeight: '700' }
const playerNameStyle: React.CSSProperties = { flex: 1, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const teamAbbrStyle: React.CSSProperties = { color: '#64748b', flexShrink: 0 }
const playerPointsStyle: React.CSSProperties = { color: '#4ade80', fontWeight: '700', flexShrink: 0, width: '56px', textAlign: 'right' }
