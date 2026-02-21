import React from 'react'
import { useCurrentGames } from '@/hooks/useCurrentGames'
import { GameCard } from './GameCard'

interface GameGridNewProps {
  handleClick: (gameId: string) => void
}

export const GameGridNew: React.FC<GameGridNewProps> = ({ handleClick }) => {
  const { games, loading, error } = useCurrentGames()

  if (error) {
    return (
      <div className='mt-4 flex justify-center'>
        <div className='bg-red-50 border border-red-200 rounded-xl p-6 max-w-md'>
          <p className='text-red-800 font-semibold'>Failed to load games</p>
          <p className='text-red-600 text-sm mt-2'>{error.message}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='mt-4'>
        <div className='flex flex-col items-center'>
          <ul className="grid grid-cols-3 desktop:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <li key={i} className='bg-white laptop:w-80 justify-self-center rounded-xl shadow-md animate-pulse'>
                <div className='p-4 space-y-3'>
                  <div className='h-8 bg-slate-200 rounded'></div>
                  <div className='h-8 bg-slate-200 rounded'></div>
                  <div className='h-6 bg-slate-200 rounded w-3/4'></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className='mt-4 flex justify-center'>
        <div className='bg-white rounded-xl shadow-md p-8 max-w-md text-center'>
          <p className='text-slate-600 text-lg'>No games scheduled</p>
          <p className='text-slate-500 text-sm mt-2'>Check back later for upcoming games</p>
        </div>
      </div>
    )
  }

  return (
    <div className='mt-4'>
      <div className='flex flex-col items-center'>
        <ul className="grid grid-cols-3 desktop:grid-cols-3 gap-8">
          {games.map((game) => (
            <li key={game.id}>
              <GameCard 
                gameId={game.id} 
                onClick={handleClick}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
