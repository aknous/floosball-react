import React, { useState, useCallback } from 'react'
import { usePickEm } from '@/contexts/PickEmContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PickEmGame, PickEmLeaderboardEntry } from '@/types/pickem'
import { PickEmDay } from './PickEmDay'
import { PickRow, multiplierToPoints } from './PickRow'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const RANK_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: '1st', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  2: { label: '2nd', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  3: { label: '3rd', color: '#cd7f32', bg: 'rgba(205,127,50,0.15)' },
}

type ViewMode = 'results' | 'day' | 'leaderboard'

export const PickEmPanel: React.FC = () => {
  const { user, getToken } = useAuth()
  const userId = user?.id ?? null
  const {
    games, weekSummary, season, week, weekText,
    seasonLeaderboard, weekLeaderboard, loading, submitPick,
  } = usePickEm()
  const [mode, setMode] = useState<ViewMode>('results')
  const [showHelp, setShowHelp] = useState(false)
  type AutoPickMode = 'off' | 'favorites' | 'underdogs' | 'random'
  const [autoPickMode, setAutoPickMode] = useState<AutoPickMode>(user?.autoPickMode ?? 'off')

  const changeAutoPickMode = useCallback(async (newMode: AutoPickMode) => {
    setAutoPickMode(newMode)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API_BASE}/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ autoPickMode: newMode }),
      })
    } catch { /* silent */ }
  }, [getToken])

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
        Loading prognostications...
      </div>
    )
  }

  const pickedCount = games.filter(g => g.userPick != null).length
  const totalGames = games.length

  // Tab labels: regular season → "Week N" / "Day N Games"; playoffs fall back.
  const isRegularSeason = week >= 1 && week <= 28
  const dayNumber = Math.floor(week / 7) + 1  // matches backend week // 7 (1-based for display)
  const viewLabel = (m: ViewMode): string => {
    if (m === 'leaderboard') return 'Leaderboard'
    if (m === 'results') return isRegularSeason ? `Week ${week}` : (weekText || 'Picks')
    return isRegularSeason ? `Day ${dayNumber} Games` : 'All Games'
  }

  return (
    <div style={{ fontSize: '14px' }}>
      {/* Mode Toggle + Help Button */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', padding: '0 4px', alignItems: 'center' }}>
        {(['results', 'day', 'leaderboard'] as ViewMode[]).map(m => (
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
            {viewLabel(m)}
          </button>
        ))}
        <button
          onClick={() => setShowHelp(!showHelp)}
          title="How Prognostications work"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '1px solid #475569',
            backgroundColor: showHelp ? '#334155' : 'transparent',
            color: showHelp ? '#e2e8f0' : '#94a3b8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          ?
        </button>
      </div>

      {/* Help Tooltip */}
      {showHelp && (
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: '#1a2332',
          border: '1px solid #334155',
          marginBottom: '8px',
          fontSize: '11px',
          lineHeight: '1.5',
          color: '#cbd5e1',
        }}>
          <div style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '6px', fontSize: '12px' }}>
            How Prognostications Work
          </div>
          <div style={{ marginBottom: '6px' }}>
            Pick the winner of each game. Pre-game picks are worth <span style={{ fontWeight: '600' }}>10 base points</span>. Mid-game picks are worth less depending on the quarter and how close the game is.
          </div>
          <div style={{ fontWeight: '600', color: '#f59e0b', marginTop: '8px', marginBottom: '4px', fontSize: '11px' }}>
            Win Probability Modifier
          </div>
          <div style={{ marginBottom: '4px' }}>
            Your points get multiplied based on win probability when you pick. Picking underdogs pays more, picking favorites pays less. Once you pick, your modifier is locked in.
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2px 12px',
            marginBottom: '6px',
            fontSize: '11px',
          }}>
            <span><span style={{ color: '#22c55e', fontWeight: '600' }}>20% underdog</span> 2.69x</span>
            <span><span style={{ color: '#ef4444', fontWeight: '600' }}>80% favorite</span> 0.63x</span>
            <span><span style={{ color: '#22c55e', fontWeight: '600' }}>30% underdog</span> 1.89x</span>
            <span><span style={{ color: '#ef4444', fontWeight: '600' }}>70% favorite</span> 0.71x</span>
            <span><span style={{ color: '#22c55e', fontWeight: '600' }}>40% underdog</span> 1.31x</span>
            <span><span style={{ color: '#ef4444', fontWeight: '600' }}>60% favorite</span> 0.83x</span>
            <span><span style={{ color: '#94a3b8', fontWeight: '600' }}>50% even</span> 1.0x</span>
          </div>
          <div style={{ marginBottom: '6px', color: '#94a3b8' }}>
            Pre-game win probability comes from ELO ratings. During a game it uses live win probability, so picking the trailing team gives a bigger bonus.
          </div>
          <div style={{ fontWeight: '600', color: '#38bdf8', marginBottom: '4px', fontSize: '11px' }}>
            Certainty Decay
          </div>
          <div style={{ marginBottom: '6px' }}>
            Close games hold their point value longer as quarters pass. Blowouts decay faster.
          </div>
          <div style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '4px', fontSize: '11px' }}>
            Auto-Pick
          </div>
          <div style={{ marginBottom: '6px' }}>
            Enable the toggle below to auto-pick the higher-ELO team at game start for any games you haven't picked yet. You get full timing (1.0x) but the favorite penalty applies. You can override any auto-pick before the game ends.
          </div>
          <div style={{ color: '#94a3b8' }}>
            You can change your pick any time before the game ends. Changing recalculates both multipliers based on the current game state.
            Floobits earned = total points x 0.5. Hit 96+ points in a week for a Clairvoyant bonus!
          </div>
        </div>
      )}

      {/* Auto-pick mode selector */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '10px',
          padding: '6px 8px', marginBottom: '6px',
          borderRadius: '6px', backgroundColor: '#1e293b',
        }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>Auto-pick</span>
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#0f172a', borderRadius: '5px', padding: '2px' }}>
            {([
              { id: 'off',        label: 'Off' },
              { id: 'favorites',  label: 'Favorites' },
              { id: 'underdogs',  label: 'Underdogs' },
              { id: 'random',     label: 'Random' },
            ] as const).map(opt => {
              const active = autoPickMode === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => changeAutoPickMode(opt.id)}
                  style={{
                    fontSize: '11px', fontWeight: 600,
                    padding: '3px 8px', borderRadius: '4px',
                    border: 'none',
                    cursor: active ? 'default' : 'pointer',
                    backgroundColor: active ? '#3b82f6' : 'transparent',
                    color: active ? '#fff' : '#94a3b8',
                    transition: 'background-color 0.15s, color 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'results' ? (
        games.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No games in the current slot. Check <span style={{ color: '#cbd5e1', fontWeight: 600 }}>All Today</span> to pick ahead.
          </div>
        ) : (
          <ResultsView
            games={games}
            weekSummary={weekSummary}
            week={week}
            pickedCount={pickedCount}
            totalGames={totalGames}
            submitPick={submitPick}
          />
        )
      ) : mode === 'day' ? (
        <PickEmDay />
      ) : (
        <LeaderboardView
          seasonEntries={seasonLeaderboard}
          weekEntries={weekLeaderboard}
          week={week}
          weekText={weekText}
          userId={userId}
        />
      )}
    </div>
  )
}

interface ResultsViewProps {
  games: PickEmGame[]
  weekSummary: { correct: number; total: number; totalPoints: number; clairvoyant: boolean } | null
  week: number
  pickedCount: number
  totalGames: number
  submitPick: (gameIndex: number, teamId: number) => Promise<void>
}

const ResultsView: React.FC<ResultsViewProps> = ({
  games, weekSummary, week, pickedCount, totalGames, submitPick,
}) => {
  return (
    <div>
      {/* Summary Banner */}
      {weekSummary ? (
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: weekSummary.clairvoyant ? 'rgba(34,197,94,0.10)' : '#1e293b',
          borderBottom: weekSummary.clairvoyant ? '2px solid rgba(34,197,94,0.5)' : '2px solid #334155',
          marginBottom: '6px',
          textAlign: 'center',
        }}>
          {weekSummary.clairvoyant ? (
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e', letterSpacing: '0.05em' }}>
                CLAIRVOYANT
              </div>
              <div style={{ fontSize: '13px', color: '#86efac', marginTop: '2px' }}>
                {weekSummary.totalPoints} pts — {weekSummary.correct}/{weekSummary.total} correct
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>
                {weekSummary.totalPoints} pts — {weekSummary.correct}/{weekSummary.total} correct
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                +{Math.round(weekSummary.totalPoints * 0.5)} Floobits earned
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          marginBottom: '6px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#94a3b8',
        }}>
          {(() => {
            const possiblePts = games.reduce((sum, g) => {
              if (g.userPick != null && g.pointsMultiplier != null) {
                return sum + multiplierToPoints(g.pointsMultiplier, g.underdogMultiplier ?? 1.0)
              }
              return sum
            }, 0)
            return possiblePts > 0
              ? <span><span style={{ color: '#e2e8f0', fontWeight: '600' }}>{possiblePts} pts</span> possible if all correct</span>
              : 'No picks yet'
          })()}
        </div>
      )}

      {/* Game Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {games.map(game => (
          <PickRow
            key={game.gameIndex}
            game={game}
            onPick={(teamId) => submitPick(game.gameIndex, teamId)}
          />
        ))}
      </div>
    </div>
  )
}

interface LeaderboardViewProps {
  seasonEntries: PickEmLeaderboardEntry[]
  weekEntries: PickEmLeaderboardEntry[]
  week: number
  weekText: string
  userId?: number | null
}

const LeaderboardRow: React.FC<{
  entry: PickEmLeaderboardEntry
  isMe: boolean
  isSeason: boolean
}> = ({ entry, isMe, isSeason }) => {
  const [hovered, setHovered] = useState(false)
  const rankInfo = RANK_STYLE[entry.rank]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        borderRadius: '6px',
        backgroundColor: isMe ? '#253348' : rankInfo?.bg || '#1e293b',
        border: isMe ? '1px solid #3b82f6' : '1px solid #334155',
        cursor: 'default',
      }}
    >
      {/* Rank */}
      <div style={{
        width: '28px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: '700',
        color: rankInfo?.color || '#94a3b8',
      }}>
        {rankInfo?.label || `#${entry.rank}`}
      </div>

      {/* Username */}
      <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#e2e8f0', minWidth: 0 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.username}
          {isMe && <span style={{ color: '#3b82f6', marginLeft: '4px', fontSize: '11px' }}>(you)</span>}
        </div>
      </div>

      {/* Auto-pick badge — weekly view only, when every pick this week was auto */}
      {!isSeason && entry.allAuto && (
        <span
          title="All picks this week were auto-picked"
          style={{
            fontSize: '9px', fontWeight: '700',
            color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.15)',
            padding: '2px 5px', borderRadius: '3px',
            letterSpacing: '0.04em', flexShrink: 0,
          }}
        >
          AUTO
        </span>
      )}

      {/* Points */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
        {entry.totalPoints} pts
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 20000,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          fontSize: '11px',
          lineHeight: '1.6',
        }}>
          <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
            {entry.username}
          </div>
          <div style={{ color: '#cbd5e1' }}>
            Correct: <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{entry.correctCount}/{entry.totalPicks}</span>
            <span style={{ color: '#94a3b8' }}> ({entry.accuracy}%)</span>
          </div>
          <div style={{ color: '#cbd5e1' }}>
            Points: <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{entry.totalPoints}</span>
          </div>
          {isSeason && entry.clairvoyantWeeks != null && entry.clairvoyantWeeks > 0 && (
            <div style={{ color: '#22c55e', fontWeight: '600' }}>
              Clairvoyant: {entry.clairvoyantWeeks}x
            </div>
          )}
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '8px',
            height: '8px',
            backgroundColor: '#1e293b',
            borderRight: '1px solid #475569',
            borderBottom: '1px solid #475569',
          }} />
        </div>
      )}
    </div>
  )
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  seasonEntries, weekEntries, week, weekText, userId,
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
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {m === 'season' ? 'Season' : (weekText || `Week ${week}`)}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          No leaderboard data yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {entries.map(entry => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isMe={userId != null && entry.userId === userId}
              isSeason={subMode === 'season'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
