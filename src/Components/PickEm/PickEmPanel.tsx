import React, { useState, useCallback } from 'react'
import { usePickEm } from '@/contexts/PickEmContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PickEmGame, PickEmLeaderboardEntry } from '@/types/pickem'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const RANK_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: '1st', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  2: { label: '2nd', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  3: { label: '3rd', color: '#cd7f32', bg: 'rgba(205,127,50,0.15)' },
}

/** Multiplier-to-display-points (base 10, timing x underdog) */
function multiplierToPoints(timing: number, underdog: number = 1.0): number {
  return Math.round(timing * underdog * 10)
}

/** Win probability from ELO (home vs away) */
function eloToWinPct(homeElo: number, awayElo: number): { home: number; away: number } {
  const homeWp = 1.0 / (1.0 + Math.pow(10, -(homeElo - awayElo) / 400))
  return { home: Math.round(homeWp * 100), away: Math.round((1 - homeWp) * 100) }
}

/** Color for a multiplier value */
function multiplierColor(m: number): string {
  if (m >= 0.8) return '#22c55e'  // green
  if (m >= 0.4) return '#eab308'  // yellow
  return '#ef4444'                 // red
}

type ViewMode = 'results' | 'leaderboard'

export const PickEmPanel: React.FC = () => {
  const { user, getToken } = useAuth()
  const userId = user?.id ?? null
  const {
    games, weekSummary, season, week, weekText,
    seasonLeaderboard, weekLeaderboard, loading, submitPick,
  } = usePickEm()
  const [mode, setMode] = useState<ViewMode>('results')
  const [showHelp, setShowHelp] = useState(false)
  const [autoPick, setAutoPick] = useState(user?.autoPickFavorites ?? false)

  const toggleAutoPick = useCallback(async () => {
    const newVal = !autoPick
    setAutoPick(newVal)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API_BASE}/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ autoPickFavorites: newVal }),
      })
    } catch { /* silent */ }
  }, [autoPick, getToken])

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
      {/* Mode Toggle + Help Button */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', padding: '0 4px', alignItems: 'center' }}>
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

      {/* Auto-pick toggle */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', marginBottom: '6px',
          borderRadius: '6px', backgroundColor: '#1e293b',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Auto-pick favorites</span>
          <button
            onClick={toggleAutoPick}
            style={{
              width: '32px', height: '18px', borderRadius: '9px', border: 'none',
              backgroundColor: autoPick ? '#3b82f6' : '#334155',
              cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
            }}
          >
            <div style={{
              width: '14px', height: '14px', borderRadius: '7px',
              backgroundColor: '#fff', position: 'absolute', top: '2px',
              left: autoPick ? '16px' : '2px', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      )}

      {mode === 'results' ? (
        <ResultsView
          games={games}
          weekSummary={weekSummary}
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
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', letterSpacing: '0.05em' }}>
                CLAIRVOYANT
              </div>
              <div style={{ fontSize: '12px', color: '#86efac', marginTop: '2px' }}>
                {weekSummary.totalPoints} pts — {weekSummary.correct}/{weekSummary.total} correct
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>
                {weekSummary.totalPoints} pts — {weekSummary.correct}/{weekSummary.total} correct
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
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
          fontSize: '12px',
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

interface PickRowProps {
  game: PickEmGame
  onPick: (teamId: number) => void
}

const PickRow: React.FC<PickRowProps> = ({ game, onPick }) => {
  const hasResult = game.result?.correct != null
  const isCorrect = game.result?.correct === true
  const homeSelected = game.userPick === game.homeTeam.id
  const awaySelected = game.userPick === game.awayTeam.id
  const homeColor = game.homeTeam.color || '#94a3b8'
  const awayColor = game.awayTeam.color || '#94a3b8'
  const canPick = game.pickable && !hasResult

  // Show locked-in multiplier if user has picked, otherwise current available
  const displayTimingMult = game.userPick != null && game.pointsMultiplier != null
    ? game.pointsMultiplier
    : game.currentMultiplier
  const displayUnderdogMult = game.userPick != null && game.underdogMultiplier != null
    ? game.underdogMultiplier
    : 1.0
  const displayPoints = multiplierToPoints(displayTimingMult, displayUnderdogMult)
  const badgeColor = multiplierColor(displayTimingMult)

  const winPct = eloToWinPct(game.homeTeam.elo, game.awayTeam.elo)

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
    }}>
      {/* Home Team Button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (canPick) onPick(game.homeTeam.id) }}
        disabled={!canPick}
        style={{
          flex: 1,
          padding: '4px 8px',
          borderRadius: '5px',
          border: homeSelected ? `1px solid ${homeColor}` : '1px solid transparent',
          backgroundColor: homeSelected ? `${homeColor}22` : `${homeColor}15`,
          color: homeSelected ? homeColor : '#cbd5e1',
          fontSize: '14px',
          fontWeight: homeSelected ? '700' : '500',
          cursor: canPick ? 'pointer' : 'default',
          textAlign: 'center',
          opacity: awaySelected && !hasResult ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <img
            src={`/avatars/${game.homeTeam.id}.png`}
            alt={game.homeTeam.abbr}
            crossOrigin="anonymous"
            style={{ width: '20px', height: '20px', flexShrink: 0 }}
          />
          <span>{game.homeTeam.abbr}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500', marginTop: '2px' }}>
          {game.homeTeam.record} · {winPct.home}%
        </div>
      </button>

      {/* Center: Status Icon + Multiplier Badge */}
      <div style={{
        width: '36px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
      }}>
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
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>vs</span>
        )}
        {/* Multiplier badge */}
        {!hasResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: badgeColor,
              backgroundColor: `${badgeColor}18`,
              padding: '1px 4px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
            }}>
              {displayPoints} pt{displayPoints !== 1 ? 's' : ''}
            </div>
            {game.userPick != null && displayUnderdogMult !== 1.0 && (
              <div style={{
                fontSize: '9px', whiteSpace: 'nowrap', fontWeight: '600',
                color: displayUnderdogMult > 1.0 ? '#22c55e' : '#ef4444',
              }}>
                {displayUnderdogMult}x
              </div>
            )}
          </div>
        )}
        {/* Show earned points for resolved picks */}
        {hasResult && game.userPick != null && game.result?.pointsEarned != null && (
          <div style={{
            fontSize: '9px',
            fontWeight: '700',
            color: isCorrect ? '#22c55e' : '#64748b',
            whiteSpace: 'nowrap',
          }}>
            {isCorrect ? `+${game.result.pointsEarned}` : '0'} pts
          </div>
        )}
      </div>

      {/* Away Team Button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (canPick) onPick(game.awayTeam.id) }}
        disabled={!canPick}
        style={{
          flex: 1,
          padding: '4px 8px',
          borderRadius: '5px',
          border: awaySelected ? `1px solid ${awayColor}` : '1px solid transparent',
          backgroundColor: awaySelected ? `${awayColor}22` : `${awayColor}15`,
          color: awaySelected ? awayColor : '#cbd5e1',
          fontSize: '14px',
          fontWeight: awaySelected ? '700' : '500',
          cursor: canPick ? 'pointer' : 'default',
          textAlign: 'center',
          opacity: homeSelected && !hasResult ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <img
            src={`/avatars/${game.awayTeam.id}.png`}
            alt={game.awayTeam.abbr}
            crossOrigin="anonymous"
            style={{ width: '20px', height: '20px', flexShrink: 0 }}
          />
          <span>{game.awayTeam.abbr}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500', marginTop: '2px' }}>
          {game.awayTeam.record} · {winPct.away}%
        </div>
      </button>
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
        fontSize: '12px',
        fontWeight: '700',
        color: rankInfo?.color || '#94a3b8',
      }}>
        {rankInfo?.label || `#${entry.rank}`}
      </div>

      {/* Username */}
      <div style={{ flex: 1, fontSize: '12px', fontWeight: '500', color: '#e2e8f0', minWidth: 0 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.username}
          {isMe && <span style={{ color: '#3b82f6', marginLeft: '4px', fontSize: '10px' }}>(you)</span>}
        </div>
      </div>

      {/* Points */}
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
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
              fontSize: '11px',
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
