/* This example requires Tailwind CSS v2.0+ */
import React,{Fragment,useEffect,useState} from 'react'
import { Link } from "react-router-dom";
import { Dialog, Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/solid'
import axios from 'axios'
import PlayList from './PlayList'
import GameStats from './GameStats'

const GAMESURL = 'http://floosball.com:8000/currentGames';


export default function GameBar() {

  const [games, setGames] = useState([])
  const [showModal, setShowModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState()
  const [gameModal, setGame] = useState({})

  const getGames = async () => {
    try {
      const userGames = await axios.get(GAMESURL)

      setGames(userGames.data);  // set State
    
    } catch (err) {
      console.error(err.message);
    }
  };

  const getSelectedGame = async (id) => {
    try {
      const userGame = await axios.get(`http://floosball.com:8000/gameStats?id=${id}`)
      .then((res) => 
        setGame(res.data)
        )  // set State
        
    
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleClick = (e) => {
    setSelectedGame(e.currentTarget.id)
    getSelectedGame(e.currentTarget.id)
    setShowModal(true)
  }

  useEffect(() => {
      getGames()
      const interval=setInterval(()=>{
        getGames()
       },10000)
       return()=>clearInterval(interval)
  }, []);

  useEffect(() => {
    const newInterval=setInterval(()=>{
      if (showModal) {
        getSelectedGame(selectedGame)
      }
     },10000)
    return()=>clearInterval(newInterval)
  }, selectedGame);
 

  return (
    <div className='overflow-x-scroll mx-1'>
      <div className="flex shrink-0 justify-left gap-x-1 laptop:gap-x-4 w-full">
        {games.map((game) => (
          <button id={game.id} onClick={handleClick}>
            <div className={` w-36 laptop:w-full flex items-center px-2 bg-slate-50 text-slate-900 shadow-md rounded-lg my-1 laptop:my-4 ${game.yardsToEZ <= 20 && game.status === 'Active' ? "border-b-4 border-red-500" : ""}`}>
              <div className="flex-none rounded-lg w-full laptop:w-48">
                <div className="flex">
                  <div className={`rounded-full h-1 laptop:h-2 w-1 laptop:w-2 bg-slate-700 self-center ${game.homeTeamPoss && game.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                  <div className="pl-2 flex-grow text-sm laptop:text-xl font-semibold text-left truncate" style={{ color: `${game.homeTeamColor}` }}>{game.homeTeam}</div>
                  <div className="text-sm laptop:text-xl font-semibold text-right">{game.homeScore}</div>
                </div>
                <div className="flex">
                  <div className={`rounded-full h-1 laptop:h-2 w-1 laptop:w-2 bg-slate-700 self-center ${game.awayTeamPoss && game.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                  <div className="pl-2 flex-grow text-sm laptop:text-xl font-semibold text-left truncate" style={{ color: `${game.awayTeamColor}` }}>{game.awayTeam}</div>
                  <div className="text-sm laptop:text-xl font-semibold truncate">{game.awayScore}</div>
                </div>
                <div className='flex gap-x-8 laptop:mt-2 px-2 border-t-2 border-slate-700 justify-between'>
                  <span className="text-xs laptop:text-sm float-left">{game.status === "Final" ? "Final" : game.quarter === "OT" ? "OT" : game.isHalftime ? "Halftime" : "Q" + game.quarter}</span>
                  <span className="text-xs laptop:text-sm float-right">PR: {game.playsLeft}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
        {showModal && gameModal.homeTeam?.teamcolor && gameModal.awayTeam?.teamcolor ? 
          <Transition.Root show={showModal} as={Fragment}>
            <Dialog as="div" className="relative flex z-10" onClose={setShowModal}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-slate-200 bg-opacity-75 blur transition-opacity" />
              </Transition.Child>
              <div className="flex justify-center items-center overflow-x-hidden fixed inset-0 z-50 outline-none focus:outline-none">
                <div className="flex overflow-y-hidden relative py-4 laptop:my-6 mx-2 laptop:mx-auto laptop:w-11/12 h-screen laptop:h-5/6">
                  <div className="flex flex-col h-full border-0 rounded-lg shadow-sm relative w-full bg-white">
                    <div className="flex items-start justify-end p-2 rounded-t bg-slate-700">
                      <button
                        className="bg-transparent border-0 text-slate float-right"
                        onClick={() => setShowModal(false)}
                      >
                        <XIcon className="h-8 w-8 text-white hover:text-slate-200" aria-hidden="true" />
                      </button>
                    </div>
                    <div className='grow-0 laptop:flex bg-slate-100 justify-between h-full'>
                      <div className='laptop:w-1/2 flex flex-col overflow-y-hidden'>
                        <div className='bg-white rounded-lg shadow-md self-center mx-4 my-4 laptop:w-5/6 laptop:px-2'>
                          <table className='table-auto w-full'>
                            <tbody className='text-base laptop:text-2xl divide-slate-500'>
                              <tr className='divide-slate-500 laptop:pt-2'>
                                <td className='w-4'>
                                  <div className='flex justify-center'>
                                    <div className={`place-self-center rounded-full h-2 laptop:h-4 w-2 laptop:w-4 self-center bg-slate-700 ${gameModal.homeTeamPoss && gameModal.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                                  </div>
                                </td>
                                <td className='p-1 laptop:p-2 font-semibold w-36 laptop:w-32' style={{ color: `${gameModal.homeTeam.teamcolor}` }}>
                                  <Link to={`/team/${gameModal.homeTeam.id}`} className="hover:underline" onClick={() => setShowModal(false)}>{gameModal.homeTeam.teamName}</Link> <span className='pl-2 text-xs laptop:text-base font-normal text-slate-700 align-middle'>{gameModal.homeTeam.record}</span>
                                </td>
                                <td className='w-8 text-center'>{gameModal.homeTeam.qtr1pts}</td>
                                <td className='w-8 text-center'>{gameModal.quarter > 1 || gameModal.status === 'Final' ? gameModal.homeTeam.qtr2pts : ''}</td>
                                <td className='w-8 text-center'>{gameModal.quarter > 2 || gameModal.status === 'Final' ? gameModal.homeTeam.qtr3pts : ''}</td>
                                <td className='w-8 text-center'>{gameModal.quarter > 3 || gameModal.status === 'Final' ? gameModal.homeTeam.qtr4pts : ''}</td>
                                <td className='w-8 text-center text-white bg-slate-700'>{gameModal.homeTeam.score}</td>
                              </tr>
                              <tr className='divide-slate-500'>
                                <td className='w-4'>
                                  <div className='flex justify-center'>
                                    <div className={`place-self-center rounded-full h-2 laptop:h-4 w-2 laptop:w-4 self-center bg-slate-700 ${gameModal.awayTeamPoss && gameModal.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                                  </div>
                                </td>
                                <td className='p-1 laptop:p-2 font-semibold w-32' style={{ color: `${gameModal.awayTeam.teamcolor}` }}>
                                  <Link to={`/team/${gameModal.awayTeam.id}`} className="hover:underline" onClick={() => setShowModal(false)}>{gameModal.awayTeam.teamName}</Link> <span className='pl-2 text-xs laptop:text-base font-normal text-slate-700 align-middle'>{gameModal.awayTeam.record}</span>
                                </td>
                                <td className='text-center'>{gameModal.awayTeam.qtr1pts}</td>
                                <td className='text-center'>{gameModal.quarter > 1 || gameModal.status === 'Final' ? gameModal.awayTeam.qtr2pts : ''}</td>
                                <td className='text-center'>{gameModal.quarter > 2 || gameModal.status === 'Final' ? gameModal.awayTeam.qtr3pts : ''}</td>
                                <td className='text-center'>{gameModal.quarter > 3 || gameModal.status === 'Final' ? gameModal.awayTeam.qtr4pts : ''}</td>
                                <td className='text-center text-white bg-slate-700'>{gameModal.awayTeam.score}</td>
                              </tr>
                            </tbody>
                          </table>
                          {gameModal.status === 'Active' &&
                            <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t-2 border-slate-500 py-1'>
                              {gameModal.quarter === 5 ? <div>OT</div> : gameModal.isHalftime ? <div>Halftime</div> : <div>Q{gameModal.quarter}</div>}
                              <div>{gameModal.downText}</div>
                              <div className={`${gameModal.yardsToEZ <= 20 ? 'text-red-500 bg-red-100 rounded-full px-2' : ''}`}>{gameModal.yardLine}</div>
                              <div>PR: {gameModal.playsLeft}</div>
                            </div>
                          } 
                          {gameModal.status === 'Final' &&
                            <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t-2 border-slate-500'>
                              <div>Final</div>
                            </div>
                          } 
                          {gameModal.status === 'Scheduled' &&
                            <div className='flex justify-center space-x-12 px-2 font-medium text-sm laptop:text-lg border-t-2 border-slate-500'>
                              <div>Starting Soon...</div>
                            </div>
                          } 
                        </div>
                        <div className='laptop:mx-4 h-full'>
                          <PlayList id={selectedGame} />
                        </div>
                      </div>
                      <div className='hidden laptop:flex m-4 grow bg-white rounded-lg shadow-md' style={{ height: "90%" }}>
                        <GameStats gameData={gameModal} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        : null}
      </div>
    </div>
    
  )
}