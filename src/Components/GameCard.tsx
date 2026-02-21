import React from 'react'
import { useGameUpdates } from '@/hooks/useGameUpdates'

interface GameCardProps {
  gameId: string
  onClick: (gameId: string) => void
}

export const GameCard: React.FC<GameCardProps> = ({ gameId, onClick }) => {
  const { gameState, connected } = useGameUpdates(gameId)

  const formatTime = (val: number) => {
    const utc = new Date()
    const offset = utc.getTimezoneOffset()
    const datetime = new Date((val * 1000) - (offset * 60000))
    return datetime.toLocaleString("en-US", { timeStyle: "short", dateStyle: "short" })
  }

  // Determine game status for styling
  const isFinal = gameState.isComplete
  const isLive = !gameState.isComplete && gameState.quarter > 0

  return (
    <button
      className={`bg-white laptop:w-80 justify-self-center rounded-xl shadow-md hover:bg-slate-100 transition-all ${
        isFinal ? 'opacity-90' : isLive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      onClick={() => onClick(gameId)}
    >
      <div className='flex items-center justify-between border-b border-slate-900'>
        <div className='w-full flex flex-col my-1'>
          <div className='flex flex-col'>
            {/* Home Team */}
            <div className='flex pb-1'>
              <div className='items-center py-2'>
                <div 
                  className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full mx-3 ${
                    isLive ? 'ring-2 ring-offset-1 ring-slate-500' : ''
                  }`}
                  style={{ backgroundColor: '#3b82f6' }} // Replace with actual team color from API
                />
              </div>
              <div className='flex flex-col grow'>
                <div className='text-base text-left font-medium h-4'>Home City</div>
                <div className='flex'>
                  <div className='text-2xl text-left font-semibold h-7 align-top truncate'>Home Team</div>
                  <div className='pl-2 text-xs pt-1 font-semibold text-center text-slate-900 place-self-center h-4'>
                    0-0
                  </div>
                </div>
              </div>
              <div 
                className={`w-14 justify-self-end place-self-center text-3xl font-semibold text-center mr-1 ${
                  isFinal && gameState.homeScore > gameState.awayScore 
                    ? 'bg-slate-900 text-white rounded-xl' 
                    : ''
                }`}
              >
                {gameState.homeScore}
              </div>
            </div>

            {/* Away Team */}
            <div className='flex pt-1 border-t border-slate-300'>
              <div className='items-center py-2'>
                <div 
                  className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full mx-3 ${
                    isLive ? 'ring-2 ring-offset-1 ring-slate-500' : ''
                  }`}
                  style={{ backgroundColor: '#ef4444' }} // Replace with actual team color from API
                />
              </div>
              <div className='flex flex-col grow'>
                <div className='text-base text-left font-medium h-4'>Away City</div>
                <div className='flex'>
                  <div className='text-2xl text-left font-semibold h-7 align-top truncate'>Away Team</div>
                  <div className='pl-2 text-xs pt-1 font-semibold text-center text-slate-900 place-self-center h-4'>
                    0-0
                  </div>
                </div>
              </div>
              <div 
                className={`w-14 place-self-center text-3xl font-semibold text-center mr-1 ${
                  isFinal && gameState.awayScore > gameState.homeScore 
                    ? 'bg-slate-900 text-white rounded-xl' 
                    : ''
                }`}
              >
                {gameState.awayScore}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Status Bar */}
      <div className='flex text-slate-900 text-center gap-x-2 my-1 px-2 justify-between font-medium'>
        {isFinal ? (
          <span className="text-base">Final {gameState.quarter > 4 ? '- OT' : ''}</span>
        ) : isLive ? (
          <>
            <span className="text-base">
              {gameState.quarter > 4 ? 'OT' : `Q${gameState.quarter}`}
            </span>
            <span className="text-base">{gameState.timeRemaining}</span>
            <div className='flex items-center gap-1'>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-slate-600">
                {connected ? 'Live' : 'Reconnecting...'}
              </span>
            </div>
          </>
        ) : (
          <span className='text-base'>Scheduled</span>
        )}
      </div>

      {/* Win Probability Bar (for live games) */}
      {isLive && (
        <div className='px-2 pb-2'>
          <div className='flex h-1.5 rounded overflow-hidden'>
            <div 
              className='bg-blue-500 transition-all duration-300'
              style={{ width: `${gameState.homeWinProbability}%` }}
            />
            <div 
              className='bg-red-500 transition-all duration-300'
              style={{ width: `${gameState.awayWinProbability}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}
