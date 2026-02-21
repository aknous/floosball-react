import React, { Fragment, useEffect, useState } from 'react'
import { Link } from "react-router-dom";
import axios from 'axios'
import PlayList from './PlayList'
import GameStats from './GameStats'
import { XIcon } from '@heroicons/react/solid'


export default function Game({ onClose, gameId }) {
  const [game, setGame] = useState()
  const [doneLoading, setLoading] = useState(false);

  const getGame = async () => {
    try {
      //const userGame = await axios.get(`http://floosball.com:8000/gameStats?id=${gameId}`)
      const userGame = await axios.get(`http://localhost:8000/gameStats?id=${gameId}`)
        .then((res) => {
          setGame(res.data);
          setLoading(true);
        })  // set State
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getGame()
    const newInterval = setInterval(() => {
      getGame()
    }, 7000)
    return () => clearInterval(newInterval)
  }, []);

  return (
    doneLoading ?
      <div className="flex justify-center items-center overflow-x-hidden fixed inset-0 z-50 outline-none font-pixel">
        <div className="flex overflow-y-hidden relative my-6 mx-auto w-11/12 h-5/6 rounded-xl">
          <div className="flex flex-col h-full border-0 shadow-sm relative w-full bg-white">
            <div className="flex items-start justify-end p-2 rounded-t bg-slate-900">
              <button
                className="bg-transparent border-0 text-slate float-right"
                onClick={() => onClose()}
              >
                <XIcon className="h-8 w-8 text-white hover:text-slate-200" aria-hidden="true" />
              </button>
            </div>
            <div className='grow-0 laptop:flex bg-slate-100 justify-between h-full'>
              <div className='laptop:w-1/2 flex flex-col overflow-y-hidden'>
                <div className='bg-white rounded-lg shadow-md self-center mx-4 my-4 laptop:w-5/6 laptop:px-2'>
                  <table className='table-auto w-full'>
                    <tbody className='text-base laptop:text-3xl divide-slate-500'>
                      <tr className='divide-slate-500 laptop:pt-2'>
                        <td className='w-4'>
                          <div className='flex justify-center'>
                            <div className={`place-self-center rounded-full h-2 laptop:h-4 w-2 laptop:w-4 self-center bg-slate-900 ${game.homeTeamPoss && game.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                          </div>
                        </td>
                        <td className='p-1 laptop:p-2 w-36 laptop:w-32' style={{ color: `${game.homeTeam.teamcolor}` }}>
                          <Link to={`/team/${game.homeTeam.id}`} className="hover:underline font-bold  drop-shadow-sm" onClick={() => onClose()}>{game.homeTeam.teamName}</Link> <span className='pl-2 text-xs laptop:text-base font-normal text-slate-900 align-middle'>{game.homeTeam.record}</span>
                        </td>
                        <td className='w-8 text-center'>{game.homeTeam.qtr1pts}</td>
                        <td className='w-8 text-center'>{game.quarter > 1 || game.status === 'Final' ? game.homeTeam.qtr2pts : ''}</td>
                        <td className='w-8 text-center'>{game.quarter > 2 || game.status === 'Final' ? game.homeTeam.qtr3pts : ''}</td>
                        <td className='w-8 text-center'>{game.quarter > 3 || game.status === 'Final' ? game.homeTeam.qtr4pts : ''}</td>
                        <td className='w-8 text-center text-white bg-slate-900'>{game.homeTeam.score}</td>
                      </tr>
                      <tr className='divide-slate-500'>
                        <td className='w-4'>
                          <div className='flex justify-center'>
                            <div className={`place-self-center rounded-full h-2 laptop:h-4 w-2 laptop:w-4 self-center bg-slate-900 ${game.awayTeamPoss && game.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                          </div>
                        </td>
                        <td className='p-1 laptop:p-2 w-32' style={{ color: `${game.awayTeam.teamcolor}` }}>
                          <Link to={`/team/${game.awayTeam.id}`} className="hover:underline font-bold  drop-shadow-sm" onClick={() => onClose()}>{game.awayTeam.teamName}</Link> <span className='pl-2 text-xs laptop:text-base font-normal text-slate-900 align-middle'>{game.awayTeam.record}</span>
                        </td>
                        <td className='text-center'>{game.awayTeam.qtr1pts}</td>
                        <td className='text-center'>{game.quarter > 1 || game.status === 'Final' ? game.awayTeam.qtr2pts : ''}</td>
                        <td className='text-center'>{game.quarter > 2 || game.status === 'Final' ? game.awayTeam.qtr3pts : ''}</td>
                        <td className='text-center'>{game.quarter > 3 || game.status === 'Final' ? game.awayTeam.qtr4pts : ''}</td>
                        <td className='text-center text-white bg-slate-900'>{game.awayTeam.score}</td>
                      </tr>
                    </tbody>
                  </table>
                  {game.status === 'Active' &&
                    <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t border-slate-900 py-1'>
                      {game.quarter === 5 ? <div>OT</div> : game.isHalftime ? <div>Halftime</div> : <div>Q{game.quarter}</div>}
                      <div>{game.downText}</div>
                      <div className={`${game.yardsToEZ <= 20 ? 'text-red-500 bg-red-100 rounded-full px-2' : ''}`}>{game.yardLine}</div>
                      <div>PR: {game.playsLeft}</div>
                    </div>
                  }
                  {game.status === 'Final' &&
                    <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t border-slate-900'>
                      <div>Final</div>
                    </div>
                  }
                  {game.status === 'Scheduled' &&
                    <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t border-slate-900'>
                      <div>Starting Soon...</div>
                    </div>
                  }
                </div>
                <div className='laptop:mx-4 h-full'>
                  <PlayList id={gameId} />
                </div>
              </div>
              <div className='hidden laptop:flex m-4 grow bg-white rounded-lg shadow-md' style={{ height: "90%" }}>
                <GameStats gameData={game} />
              </div>
            </div>
          </div>
        </div>
      </div>
      : null
  )
}