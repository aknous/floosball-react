import React from 'react'
import { useFloosball } from '@/contexts/FloosballContext'

export const SeasonStatus: React.FC = () => {
  const { seasonState, connected } = useFloosball()

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">Season Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Week</span>
          <span className="font-semibold">{seasonState.currentWeek}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Active Games</span>
          <span className="font-semibold">{seasonState.activeGames.length}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Completed Today</span>
          <span className="font-semibold">{seasonState.completedGames.length}</span>
        </div>

        {seasonState.seasonComplete && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800 font-semibold text-center">
              Season Complete!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
