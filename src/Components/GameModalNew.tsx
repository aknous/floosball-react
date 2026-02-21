import React, { useState } from 'react'
import { useGameUpdates } from '@/hooks/useGameUpdates'
import { XIcon } from '@heroicons/react/solid'
import { Link } from 'react-router-dom'

interface GameModalNewProps {
  onClose: () => void
  gameId: string
}

export const GameModalNew: React.FC<GameModalNewProps> = ({ onClose, gameId }) => {
  const { gameState, connected, loading } = useGameUpdates(gameId)
  const [activeTab, setActiveTab] = useState<'box' | 'plays' | 'stats'>('box')

  if (loading) {
    return (
      <div className="flex justify-center items-center overflow-x-hidden fixed inset-0 z-50 outline-none font-pixel">
        <div className="flex overflow-y-hidden relative my-6 mx-auto w-11/12 h-5/6 rounded-xl bg-white shadow-lg">
          <div className="flex items-center justify-center w-full">
            <div className="animate-pulse text-slate-500">Loading game...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center overflow-x-hidden fixed inset-0 z-50 outline-none font-pixel">
      <div className="flex overflow-y-hidden relative my-6 mx-auto w-11/12 h-5/6 rounded-xl">
        <div className="flex flex-col h-full border-0 shadow-lg relative w-full bg-white">
          {/* Header */}
          <div className="flex items-start justify-between p-2 rounded-t bg-slate-900">
            <div className='flex items-center gap-2'>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className='text-white text-sm'>
                {connected ? 'Live' : 'Reconnecting...'}
              </span>
            </div>
            <button
              className="bg-transparent border-0 text-slate float-right"
              onClick={() => onClose()}
            >
              <XIcon className="h-8 w-8 text-white hover:text-slate-200" aria-hidden="true" />
            </button>
          </div>

          <div className='grow-0 laptop:flex bg-slate-100 justify-between h-full'>
            <div className='laptop:w-1/2 flex flex-col overflow-y-hidden'>
              {/* Box Score */}
              <div className='bg-white rounded-lg shadow-md self-center mx-4 my-4 laptop:w-5/6 laptop:px-2'>
                <table className='table-auto w-full'>
                  <tbody className='text-base laptop:text-3xl divide-slate-500'>
                    {/* Home Team Row */}
                    <tr className='divide-slate-500 laptop:pt-2'>
                      <td className='w-4'>
                        <div className='flex justify-center'>
                          <div className={`place-self-center rounded-full h-2 laptop:h-4 w-2 laptop:w-4 self-center bg-slate-900 visible`} />
                        </div>
                      </td>
                      <td className='p-1 laptop:p-2 w-36 laptop:w-32'>
                        <span className="font-bold drop-shadow-sm">Home Team</span>
                        <span className='pl-2 text-xs laptop:text-base font-normal text-slate-900 align-middle'>0-0</span>
                      </td>
                      <td className='w-8 text-center'>-</td>
                      <td className='w-8 text-center'>-</td>
                      <td className='w-8 text-center'>-</td>
                      <td className='w-8 text-center'>-</td>
                      <td className='w-8 text-center text-white bg-slate-900'>{gameState.homeScore}</td>
                    </tr>
                    {/* Away Team Row */}
                    <tr className='divide-slate-500'>
                      <td className='w-4'>
                        <div className='flex justify-center'>
                          <div className={`place-self-center rounded-full h-2 laptop:h-4 w-2 laptop:w-4 self-center bg-slate-900 visible`} />
                        </div>
                      </td>
                      <td className='p-1 laptop:p-2 w-32'>
                        <span className="font-bold drop-shadow-sm">Away Team</span>
                        <span className='pl-2 text-xs laptop:text-base font-normal text-slate-900 align-middle'>0-0</span>
                      </td>
                      <td className='text-center'>-</td>
                      <td className='text-center'>-</td>
                      <td className='text-center'>-</td>
                      <td className='text-center'>-</td>
                      <td className='text-center text-white bg-slate-900'>{gameState.awayScore}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Game Status */}
                {!gameState.isComplete && (
                  <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t border-slate-900 py-1'>
                    <div>{gameState.quarter > 4 ? 'OT' : `Q${gameState.quarter}`}</div>
                    <div>{gameState.timeRemaining}</div>
                  </div>
                )}
                {gameState.isComplete && (
                  <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t border-slate-900 py-1'>
                    <div>Final {gameState.quarter > 4 ? '- OT' : ''}</div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className='flex justify-center gap-2 px-4'>
                <button
                  onClick={() => setActiveTab('box')}
                  className={`px-4 py-2 rounded-t-lg font-semibold ${
                    activeTab === 'box' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Box Score
                </button>
                <button
                  onClick={() => setActiveTab('plays')}
                  className={`px-4 py-2 rounded-t-lg font-semibold ${
                    activeTab === 'plays' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Plays
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-4 py-2 rounded-t-lg font-semibold ${
                    activeTab === 'stats' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Stats
                </button>
              </div>

              {/* Tab Content */}
              <div className='flex-1 bg-white mx-4 rounded-b-lg shadow-md overflow-y-auto'>
                {activeTab === 'plays' && (
                  <div className='p-4'>
                    {gameState.plays.length === 0 ? (
                      <div className='text-center text-slate-500 py-8'>
                        No plays yet
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        {gameState.plays.map((play, index) => (
                          <div key={index} className='border-b border-slate-200 pb-2'>
                            <div className='flex justify-between text-xs text-slate-500 mb-1'>
                              <span>Q{play.quarter} - {play.timeRemaining}</span>
                              <span>{play.yardsGained > 0 ? '+' : ''}{play.yardsGained} yds</span>
                            </div>
                            <p className='text-sm'>{play.description}</p>
                            <div className='flex gap-2 mt-1'>
                              {play.isTouchdown && (
                                <span className='text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded'>TD</span>
                              )}
                              {play.isTurnover && (
                                <span className='text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded'>TO</span>
                              )}
                              {play.isSack && (
                                <span className='text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded'>SACK</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'box' && (
                  <div className='p-4 text-center text-slate-500'>
                    Box score details coming soon
                  </div>
                )}
                {activeTab === 'stats' && (
                  <div className='p-4 text-center text-slate-500'>
                    Player stats coming soon
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
