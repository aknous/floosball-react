import React from 'react'
import { useGameUpdates } from '@/hooks/useGameUpdates'

interface LiveGameViewerProps {
  gameId: string
}

export const LiveGameViewer: React.FC<LiveGameViewerProps> = ({ gameId }) => {
  const { gameState, connected, error } = useGameUpdates(gameId)

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">Connection error. Please try again.</p>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-600">Connecting to live game...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="text-4xl font-bold">{gameState.homeScore}</div>
            <div className="text-sm text-gray-600">Home</div>
          </div>
          <div className="text-center px-6">
            <div className="text-lg font-semibold">Q{gameState.quarter}</div>
            <div className="text-sm text-gray-600">{gameState.timeRemaining}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-4xl font-bold">{gameState.awayScore}</div>
            <div className="text-sm text-gray-600">Away</div>
          </div>
        </div>

        {/* Win Probability */}
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-1">Win Probability</div>
          <div className="flex h-6 rounded overflow-hidden">
            <div 
              className="bg-blue-500 transition-all duration-300"
              style={{ width: `${gameState.homeWinProbability}%` }}
            />
            <div 
              className="bg-red-500 transition-all duration-300"
              style={{ width: `${gameState.awayWinProbability}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>{gameState.homeWinProbability.toFixed(1)}%</span>
            <span>{gameState.awayWinProbability.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Last Play */}
      {gameState.lastPlay && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Last Play</h3>
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">
                {gameState.lastPlay.offensiveTeam} - {gameState.lastPlay.playType}
              </span>
              <span className="font-semibold">
                {gameState.lastPlay.yardsGained > 0 ? '+' : ''}{gameState.lastPlay.yardsGained} yds
              </span>
            </div>
            <p className="text-gray-700">{gameState.lastPlay.description}</p>
            {gameState.lastPlay.isTouchdown && (
              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                TOUCHDOWN!
              </span>
            )}
            {gameState.lastPlay.isTurnover && (
              <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                TURNOVER
              </span>
            )}
          </div>
        </div>
      )}

      {/* Play-by-Play Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Play-by-Play</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {gameState.plays.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Waiting for plays...
            </div>
          ) : (
            <div className="divide-y">
              {gameState.plays.map((play, index) => (
                <div key={index} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-500">
                      Q{play.quarter} - {play.timeRemaining}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      {play.yardsGained > 0 ? '+' : ''}{play.yardsGained} yds
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{play.description}</p>
                  <div className="mt-1 flex gap-2">
                    {play.isTouchdown && (
                      <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        TD
                      </span>
                    )}
                    {play.isTurnover && (
                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded">
                        TO
                      </span>
                    )}
                    {play.isSack && (
                      <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                        SACK
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {gameState.isComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold text-center">
            Game Complete - Final Score: {gameState.homeScore} - {gameState.awayScore}
          </p>
        </div>
      )}
    </div>
  )
}
