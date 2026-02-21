import React, { useState, useEffect } from 'react'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGameUpdates } from '@/hooks/useGameUpdates'
import type { PlayEvent } from '@/types/websocket'
import { InformationCircleIcon } from '@heroicons/react/outline'

interface HighlightWithGame extends PlayEvent {
  gameId: string
  teamColor: string
  teamName: string
  teamAbbr: string
  homeAbbr: string
  awayAbbr: string
  homeScore: number
  awayScore: number
}

interface HighlightFeedProps {
  onPlayClick: (gameId: string) => void
}

export const HighlightFeed: React.FC<HighlightFeedProps> = ({ onPlayClick }) => {
  const { seasonState } = useFloosball()
  const [highlights, setHighlights] = useState<HighlightWithGame[]>([])

  // Subscribe to all active games and collect highlights
  const activeGameIds = seasonState.activeGames

  // This is a simplified version - in production you'd want to manage subscriptions better
  useEffect(() => {
    // Clear highlights when week changes
    setHighlights([])
  }, [seasonState.currentWeek])

  const getPlayTypeColor = (play: PlayEvent) => {
    if (play.isTouchdown) return 'bg-emerald-500 text-white'
    if (play.isTurnover) return 'bg-red-500 text-white'
    if (play.isSack) return 'bg-orange-500 text-white'
    if (play.yardsGained >= 20) return 'bg-blue-500 text-white'
    return 'bg-slate-100 text-slate-900'
  }

  const getPlayLabel = (play: PlayEvent) => {
    if (play.isTouchdown) return 'TOUCHDOWN'
    if (play.isTurnover) return 'TURNOVER'
    if (play.isSack) return 'SACK'
    if (play.yardsGained >= 20) return 'BIG PLAY'
    return play.playType.toUpperCase()
  }

  return (
    <div className='flex flex-col items-center laptop:w-2/5 mx-2 laptop:mx-4'>
      <div className='flex mx-2 bg-white rounded-xl shadow-md w-full h-96 laptop:h-150 overflow-y-auto'>
        <ul className='divide-y divide-slate-300 p-2 w-full'>
          {highlights.length === 0 ? (
            <li className='flex p-4 h-16 items-center justify-center'>
              <div className='flex space-x-3 items-center text-slate-500'>
                <InformationCircleIcon className='h-6 w-6' />
                <span className="text-sm laptop:text-base font-medium italic">
                  Waiting for highlights...
                </span>
              </div>
            </li>
          ) : (
            highlights.map((highlight, index) => (
              <li
                key={index}
                className='p-2 hover:bg-slate-100 cursor-pointer transition-colors'
                onClick={() => onPlayClick(highlight.gameId)}
              >
                <div className='flex space-x-3 items-center'>
                  <div
                    className='py-2 w-6 laptop:w-8 h-6 laptop:h-8 rounded-full flex-shrink-0'
                    style={{ backgroundColor: highlight.teamColor }}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm laptop:text-base font-bold uppercase">
                        {highlight.teamName}
                      </h3>
                      <div className={`rounded-full px-2 py-1 ${getPlayTypeColor(highlight)}`}>
                        <div className='text-xs font-bold uppercase'>
                          {getPlayLabel(highlight)}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-xs laptop:text-sm font-medium text-slate-700'>
                        {highlight.description}
                      </p>
                      {(highlight.isTouchdown || highlight.isTurnover) && (
                        <span className='text-xs font-medium text-slate-700 w-32 text-right'>
                          {highlight.homeAbbr} {highlight.homeScore} | {highlight.awayAbbr} {highlight.awayScore}
                        </span>
                      )}
                    </div>
                    <div className='text-xs text-slate-500'>
                      Q{highlight.quarter} - {highlight.timeRemaining}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
