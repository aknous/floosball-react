import React, { useState } from 'react'
import { usePickEm } from '@/contexts/PickEmContext'
import type { AuthUser } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PickEmGame, PickEmLeaderboardEntry } from '@/types/pickem'

const RANK_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: '1st', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  2: { label: '2nd', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  3: { label: '3rd', color: '#cd7f32', bg: 'rgba(205,127,50,0.15)' },
}

type ViewMode = 'results' | 'leaderboard'

export const PickEmPanel: React.FC = () => {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const {
    games, locked, weekSummary, previousWeekSummary, season, week,
    seasonLeaderboard, weekLeaderboard, loading, submitPick,
  } = usePickEm()
  const [mode, setMode] = useState<ViewMode>('results')

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
        Loading prognostications...
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No games available for picks this week.
      </div>
    )
  }

  const pickedCount = games.filter(g => g.userPick != null).length
  const totalGames = games.length

  return (
    <div style={{ fontSize: '13px' }}>
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', padding: '0 4px' }}>
        {(['results', 'leaderboard'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mode === m ? '#334155' : 'transparent',
              color: mode === m ? '#e2e8f0' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {m === 'results' ? 'My Picks' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {mode === 'results' ? (
        <ResultsView
          games={games}
          locked={locked}
          weekSummary={weekSummary}
          previousWeekSummary={previousWeekSummary}
          week={week}
          pickedCount={pickedCount}
          totalGames={totalGames}
          submitPick={submitPick}
        />
      ) : (
        <LeaderboardView
          seasonEntries={seasonLeaderboard}
          weekEntries={weekLeaderboard}
          week={week}
          userId={userId}
        />
      )}
    </div>
  )
}

interface ResultsViewProps {
  games: PickEmGame[]
  locked: boolean
  weekSummary: { correct: number; total: number; perfectWeek: boolean } | null
  previousWeekSummary: { week: number; correct: number; total: number; perfectWeek: boolean } | null
  week: number
  pickedCount: number
  totalGames: number
  submitPick: (gameIndex: number, teamId: number) => Promise<void>
}

const ResultsView: React.FC<ResultsViewProps> = ({
  games, locked, weekSummary, previousWeekSummary, week, pickedCount, totalGames, submitPick,
}) => {
  return (
    <div>
      {/* Previous Week Results (shown when early-pivoted to next week) */}
      {previousWeekSummary && (
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: previousWeekSummary.perfectWeek ? 'rgba(34,197,94,0.10)' : '#1a2332',
          border: previousWeekSummary.perfectWeek ? '1px solid rgba(34,197,94,0.2)' : '1px solid #293548',
          marginBottom: '6px',
          textAlign: 'center',
        }}>
          {previousWeekSummary.perfectWeek ? (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e', letterSpacing: '0.05em' }}>
                CLAIRVOYANT — Week {previousWeekSummary.week}
              </div>
              <div style={{ fontSize: '11px', color: '#86efac', marginTop: '1px' }}>
                {previousWeekSummary.correct}/{previousWeekSummary.total} correct — +{previousWeekSummary.correct * 5} Floobits
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Week {previousWeekSummary.week}:</span>{' '}
              {previousWeekSummary.correct}/{previousWeekSummary.total} correct — +{previousWeekSummary.correct * 5} Floobits
            </div>
          )}
        </div>
      )}

      {/* Summary Banner */}
      {weekSummary ? (
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: weekSummary.perfectWeek ? 'rgba(34,197,94,0.15)' : '#1e293b',
          border: weekSummary.perfectWeek ? '1px solid rgba(34,197,94,0.3)' : '1px solid #334155',
          marginBottom: '6px',
          textAlign: 'center',
        }}>
          {weekSummary.perfectWeek ? (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', letterSpacing: '0.05em' }}>
                CLAIRVOYANT
              </div>
              <div style={{ fontSize: '12px', color: '#86efac', marginTop: '2px' }}>
                {weekSummary.correct}/{weekSummary.total} correct — Perfect Week!
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>
                {weekSummary.correct}/{weekSummary.total} correct
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                +{weekSummary.correct * 5} Floobits earned
              </div>
            </div>
          )}
        </div>
      ) : !locked ? (
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          marginBottom: '6px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#94a3b8',
        }}>
          {pickedCount === totalGames
            ? 'All picks submitted'
            : `${pickedCount} of ${totalGames} games picked`
          }
        </div>
      ) : null}

      {/* Game Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {games.map(game => (
          <PickRow
            key={game.gameIndex}
            game={game}
            locked={locked}
            onPick={(teamId) => submitPick(game.gameIndex, teamId)}
          />
        ))}
      </div>
    </div>
  )
}

interface PickRowProps {
  game: PickEmGame
  locked: boolean
  onPick: (teamId: number) => void
}

const PickRow: React.FC<PickRowProps> = ({ game, locked, onPick }) => {
  const hasResult = game.result?.correct != null
  const isCorrect = game.result?.correct === true
  const homeSelected = game.userPick === game.homeTeam.id
  const awaySelected = game.userPick === game.awayTeam.id
  const homeColor = game.homeTeam.color || '#94a3b8'
  const awayColor = game.awayTeam.color || '#94a3b8'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '5px 8px',
      borderRadius: '6px',
      backgroundColor: '#1e293b',
      borderTop: '1px solid #334155',
      borderBottom: '1px solid #334155',
      borderLeft: `3px solid ${homeColor}`,
      borderRight: `3px solid ${awayColor}`,
    }}>
      {/* Home Team Button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!locked && !hasResult) onPick(game.homeTeam.id) }}
        disabled={locked || hasResult}
        style={{
          flex: 1,
          padding: '4px 8px',
          borderRadius: '5px',
          border: homeSelected ? `1px solid ${homeColor}` : '1px solid transparent',
          backgroundColor: homeSelected ? `${homeColor}22` : 'transparent',
          color: homeSelected ? homeColor : '#cbd5e1',
          fontSize: '14px',
          fontWeight: homeSelected ? '700' : '500',
          cursor: locked || hasResult ? 'default' : 'pointer',
          textAlign: 'center',
          opacity: awaySelected && !hasResult ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
      >
        <div>{game.homeTeam.abbr}</div>
        <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500', marginTop: '2px' }}>
          {game.homeTeam.record} · {Math.round(game.homeTeam.elo)}
        </div>
      </button>

      {/* Status Icon */}
      <div style={{ width: '20px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {hasResult && game.userPick != null ? (
          isCorrect ? (
            <svg viewBox="0 0 24 24" fill="#22c55e" style={{ width: '16px', height: '16px' }}>
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="#ef4444" style={{ width: '16px', height: '16px' }}>
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
            </svg>
          )
        ) : locked && game.userPick != null ? (
          <svg viewBox="0 0 24 24" fill="#94a3b8" style={{ width: '14px', height: '14px' }}>
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
          </svg>
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>vs</span>
        )}
      </div>

      {/* Away Team Button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!locked && !hasResult) onPick(game.awayTeam.id) }}
        disabled={locked || hasResult}
        style={{
          flex: 1,
          padding: '4px 8px',
          borderRadius: '5px',
          border: awaySelected ? `1px solid ${awayColor}` : '1px solid transparent',
          backgroundColor: awaySelected ? `${awayColor}22` : 'transparent',
          color: awaySelected ? awayColor : '#cbd5e1',
          fontSize: '14px',
          fontWeight: awaySelected ? '700' : '500',
          cursor: locked || hasResult ? 'default' : 'pointer',
          textAlign: 'center',
          opacity: homeSelected && !hasResult ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
      >
        <div>{game.awayTeam.abbr}</div>
        <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500', marginTop: '2px' }}>
          {game.awayTeam.record} · {Math.round(game.awayTeam.elo)}
        </div>
      </button>
    </div>
  )
}

interface LeaderboardViewProps {
  seasonEntries: PickEmLeaderboardEntry[]
  weekEntries: PickEmLeaderboardEntry[]
  week: number
  userId?: number | null
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  seasonEntries, weekEntries, week, userId,
}) => {
  const [subMode, setSubMode] = useState<'season' | 'weekly'>('season')
  const entries = subMode === 'season' ? seasonEntries : weekEntries

  return (
    <div>
      {/* Sub-toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', padding: '0 4px' }}>
        {(['season', 'weekly'] as const).map(m => (
          <button
            key={m}
            onClick={() => setSubMode(m)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: subMode === m ? '#334155' : 'transparent',
              color: subMode === m ? '#e2e8f0' : '#94a3b8',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {m === 'season' ? 'Season' : `Week ${week}`}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          No leaderboard data yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {entries.map(entry => {
            const rankInfo = RANK_STYLE[entry.rank]
            const isMe = userId != null && entry.userId === userId
            return (
              <div
                key={entry.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: isMe ? '#253348' : rankInfo?.bg || '#1e293b',
                  border: isMe ? '1px solid #3b82f6' : '1px solid #334155',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: '28px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: rankInfo?.color || '#94a3b8',
                }}>
                  {rankInfo?.label || `#${entry.rank}`}
                </div>

                {/* Username */}
                <div style={{ flex: 1, fontSize: '12px', fontWeight: '500', color: '#e2e8f0' }}>
                  {entry.username}
                  {isMe && <span style={{ color: '#3b82f6', marginLeft: '4px', fontSize: '10px' }}>(you)</span>}
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{entry.correctCount}</span>
                  <span style={{ color: '#94a3b8' }}>/{entry.totalPicks}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '11px' }}>
                    {entry.accuracy}%
                  </span>
                </div>

                {/* Perfect Weeks (season only) */}
                {subMode === 'season' && entry.perfectWeeks != null && entry.perfectWeeks > 0 && (
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.perfectWeeks}x
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
