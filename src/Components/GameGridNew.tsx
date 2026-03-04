import React from 'react'
import { useGames } from '@/contexts/GamesContext'
import { useAuth } from '@/contexts/AuthContext'
import { GameCard } from './GameCard'

interface GameGridNewProps {
  handleClick?: (gameId: number) => void
}

export const GameGridNew: React.FC<GameGridNewProps> = ({ handleClick = () => {} }) => {
  const { games, loading, error } = useGames()
  const { user } = useAuth()
  const favTeamId = user?.favoriteTeamId ?? null

  // Convert Map to array, favorite team's game first
  const gamesArray = Array.from(games.values()).sort((a, b) => {
    const aIsFav = favTeamId !== null && (Number(a.homeTeam.id) === favTeamId || Number(a.awayTeam.id) === favTeamId)
    const bIsFav = favTeamId !== null && (Number(b.homeTeam.id) === favTeamId || Number(b.awayTeam.id) === favTeamId)
    if (aIsFav && !bIsFav) return -1
    if (!aIsFav && bIsFav) return 1
    return 0
  })
  

  if (error) {
    return (
      <div className='mt-4 flex justify-center'>
        <div className='bg-red-50 border border-red-200 rounded-xl p-6 max-w-md'>
          <p className='text-red-800 font-semibold'>Failed to load games</p>
          <p className='text-red-600 text-sm mt-2'>{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='mt-4'>
        <div className='flex flex-col items-center'>
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            {[...Array(6)].map((_, i) => (
              <li key={i} className='w-full flex justify-center'>
                <div className='bg-white w-full max-w-sm rounded-xl shadow-md animate-pulse'>
                  <div className='p-4 space-y-3'>
                    <div className='h-8 bg-slate-200 rounded'></div>
                    <div className='h-8 bg-slate-200 rounded'></div>
                    <div className='h-6 bg-slate-200 rounded w-3/4'></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  if (gamesArray.length === 0) {
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
    <div>
      <ul className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
        {gamesArray.map((game) => {
          const isFavGame = favTeamId !== null && (Number(game.homeTeam.id) === favTeamId || Number(game.awayTeam.id) === favTeamId)
          const favTeamColor = isFavGame
            ? (Number(game.homeTeam.id) === favTeamId ? game.homeTeam.color : game.awayTeam.color)
            : undefined
          return (
          <li key={game.id}>
            <GameCard
                gameId={game.id}
                homeTeam={game.homeTeam}
                awayTeam={game.awayTeam}
                homeTeamPoss={game.homeTeamPoss}
                awayTeamPoss={game.awayTeamPoss}
                homeScore={game.homeScore}
                awayScore={game.awayScore}
                quarter={game.quarter}
                timeRemaining={game.timeRemaining}
                status={game.status}
                homeWinProbability={game.homeWinProbability}
                awayWinProbability={game.awayWinProbability}
                isUpsetAlert={game.isUpsetAlert}
                isFeatured={game.isFeatured}
                isFav={isFavGame}
                favTeamColor={favTeamColor}
                onClick={handleClick}
              />
            </li>
          )
        })}
        </ul>
    </div>
  )
}
