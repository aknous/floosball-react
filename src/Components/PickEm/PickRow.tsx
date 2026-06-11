import React, { useState } from 'react'
import { useGames } from '@/contexts/GamesContext'
import type { PickEmGame } from '@/types/pickem'

/** Multiplier-to-display-points (base 10, timing x underdog) */
export function multiplierToPoints(timing: number, underdog: number = 1.0): number {
  return Math.round(timing * underdog * 10)
}

/** Win probability from ELO (home vs away) */
export function eloToWinPct(homeElo: number, awayElo: number): { home: number; away: number } {
  const homeWp = 1.0 / (1.0 + Math.pow(10, -(homeElo - awayElo) / 400))
  return { home: Math.round(homeWp * 100), away: Math.round((1 - homeWp) * 100) }
}

/** Color for a multiplier value */
export function multiplierColor(m: number): string {
  if (m >= 0.8) return '#22c55e'  // green
  if (m >= 0.4) return '#eab308'  // yellow
  return '#ef4444'                 // red
}

export interface PickRowProps {
  game: PickEmGame
  onPick: (teamId: number) => void
}

export const PickRow: React.FC<PickRowProps> = ({ game, onPick }) => {
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

  // Prefer live win probability (updated via WebSocket game_state events) once the game
  // is active — falls back to pre-game ELO calc when Scheduled/Final.
  const { games: liveGamesMap } = useGames()
  const liveGame = React.useMemo(() => {
    for (const g of liveGamesMap.values()) {
      if (
        String(g.homeTeam?.id) === String(game.homeTeam.id)
        && String(g.awayTeam?.id) === String(game.awayTeam.id)
      ) {
        return g
      }
    }
    return null
  }, [liveGamesMap, game.homeTeam.id, game.awayTeam.id])

  const winPct = liveGame && liveGame.status === 'Active'
    ? { home: Math.round(liveGame.homeWinProbability ?? 50), away: Math.round(liveGame.awayWinProbability ?? 50) }
    : eloToWinPct(game.homeTeam.elo, game.awayTeam.elo)

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
          fontSize: '15px',
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
        <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '500', marginTop: '2px' }}>
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
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>vs</span>
        )}
        {/* Multiplier badge */}
        {!hasResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
            <div style={{
              fontSize: '11px',
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
                fontSize: '10px', whiteSpace: 'nowrap', fontWeight: '600',
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
            fontSize: '10px',
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
          fontSize: '15px',
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
        <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '500', marginTop: '2px' }}>
          {game.awayTeam.record} · {winPct.away}%
        </div>
      </button>
    </div>
  )
}
