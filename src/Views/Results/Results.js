import React,{Fragment,useEffect,useState} from 'react'
import { Dialog, Menu, Transition } from '@headlessui/react'
import { Link } from "react-router-dom";
import { ChevronDownIcon,XIcon } from '@heroicons/react/solid'
import axios from 'axios'
import PlayList from '/Users/andrew/Projects/floosball-react/src/Components/PlayList.js'
import GameStats from '/Users/andrew/Projects/floosball-react/src/Components/GameStats.js'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Results() {
    const [seasonData, setSeasonData] = useState([])
    const [week, setWeek] = useState(1)
    const [weeksArray, setWeeksArray] = useState([])
    const [games, setGames] = useState([])
    const [showModal, setShowModal] = useState(false);
    const [selectedGame, setSelectedGame] = useState()
    const [gameModal, setGame] = useState({})

    const getSeasonData = async () => {
      try {
        const userSeasonData = await axios.get('http://127.0.0.1:8000/seasonInfo')
  
        setSeasonData(userSeasonData.data);
      
      } catch (err) {
        console.error(err.message);
      }
    };

    const getWeekData = async (week) => {
      try {
        const userGameData = await axios.get(`http://127.0.0.1:8000/results?week=${week}`)
  
        setGames(userGameData.data);
      
      } catch (err) {
        console.error(err.message);
      }
    };

    const getSelectedGame = async (id) => {
      try {
        const userGame = await axios.get(`http://127.0.0.1:8000/gameStats?id=${id}`)
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
      const interval=setInterval(()=>{
        if (showModal) {
          getSelectedGame(selectedGame)
        }
       },10000)
      return()=>clearInterval(interval)
    });
  
    useEffect(() => {
      getSeasonData()
      const interval=setInterval(()=>{
        getSeasonData()
       },60000)
         
       return()=>clearInterval(interval)
    }, [])

    useEffect(() => {
      let newArray = []
      for (let index = 1; index <= seasonData.totalWeeks; index++) {
        newArray.push(index)
      }
      setWeeksArray(newArray)

    }, [seasonData]);

    useEffect(() => {
      getWeekData(week)
    }, [week]);

    return (
        <div className='flex flex-col mt-10 items-center gap-y-10 h-screen'>
            <div className='flex justify-center'>
              <Menu as="div" className="items-center relative inline-block text-left mt-5">
                <div>
                  <Menu.Button className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100">
                    Week {week}
                    <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                  </Menu.Button>
                </div>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {weeksArray.map((week) => (
                        <Menu.Item>
                          {({ active }) => (
                            <span
                              className={classNames(
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                'block px-4 py-2 text-sm'
                              )}
                              onClick={() => setWeek(week)}
                            >
                              Week {week}
                            </span>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
            <div className="grid grid-cols-2 w-2/4 justify-center content-center overflow-x-auto gap-6 p-4">
              {games.map((game) => (
                <button id={game.id} onClick={handleClick} className="flex justify-center">
                  <div className="flex flex-col px-2 py-1 bg-white rounded-lg shadow-md w-3/4">
                    <div className="flex justify-between">
                      <div className='flex items-center'>
                        <div className="flex-grow text-3xl font-semibold text-left truncate" style={{ color: `${game.homeTeamColor}` }}>{game.homeTeam}</div>
                        <div className="pl-2 text-base font-normal text-right">{game.homeTeamRecord}</div>
                      </div>
                      <div className="text-3xl font-semibold text-right">{game.homeScore}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className='flex items-center'>
                        <div className="flex-grow text-3xl font-semibold text-left truncate" style={{ color: `${game.awayTeamColor}` }}>{game.awayTeam}</div>
                        <div className="pl-2 text-base font-normal text-right">{game.awayTeamRecord}</div>
                      </div>
                      <div className="text-3xl font-semibold truncate">{game.awayScore}</div>
                    </div>
                    <div className='flex gap-x-8 mt-2 border-t-2 border-slate-700 justify-between'>
                      <span className="text-lg">{game.status}</span>
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
                      <div className="flex overflow-y-hidden relative my-6 mx-auto w-11/12 h-5/6">
                        <div className="flex flex-col h-full border-0 rounded-lg shadow-sm relative w-full bg-white">
                          <div className="flex items-start justify-end p-2 rounded-t bg-slate-700">
                            <button
                              className="bg-transparent border-0 text-slate float-right"
                              onClick={() => setShowModal(false)}
                            >
                              <XIcon className="h-8 w-8 text-white hover:text-slate-200" aria-hidden="true" />
                            </button>
                          </div>
                          <div className='grow-0 flex bg-slate-100 justify-between h-full'>
                            <div className='w-1/2 flex flex-col overflow-y-hidden'>
                              <div className='bg-white rounded-lg shadow-md self-center mx-4 my-4 w-5/6 px-2'>
                                <table className='table-auto w-full'>
                                  <thead className='text-center'>
                                    <td></td>
                                    <td></td>
                                    <td>1</td>
                                    <td>2</td>
                                    <td>3</td>
                                    <td>4</td>
                                    <td>T</td>
                                  </thead>
                                  <tbody className='text-2xl divide-slate-500'>
                                    <tr className='divide-slate-500'>
                                      <td className='w-4'>
                                        <div className='flex justify-center'>
                                          <div className={`place-self-center rounded-full h-4 w-4 self-center bg-slate-700 ${gameModal.homeTeamPoss && gameModal.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                                        </div>
                                      </td>
                                      <td className='p-2 font-semibold w-32' style={{ color: `${gameModal.homeTeam.teamcolor}` }}>
                                        <Link to={`/team/${gameModal.homeTeam.id}`} className="hover:underline" onClick={() => setShowModal(false)}>{gameModal.homeTeam.teamName}</Link> <span className='pl-2 text-base font-normal text-slate-700 align-middle'>{gameModal.homeTeam.record}</span>
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
                                          <div className={`place-self-center rounded-full h-4 w-4 self-center bg-slate-700 ${gameModal.awayTeamPoss && gameModal.status === 'Active' ? 'visible' : 'invisible'}`}></div>
                                        </div>
                                      </td>
                                      <td className='p-2 font-semibold w-32' style={{ color: `${gameModal.awayTeam.teamcolor}` }}>
                                        <Link to={`/team/${gameModal.awayTeam.id}`} className="hover:underline" onClick={() => setShowModal(false)}>{gameModal.awayTeam.teamName}</Link> <span className='pl-2 text-base font-normal text-slate-700 align-middle'>{gameModal.awayTeam.record}</span>
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
                                  <div className='flex justify-center space-x-12 px-2 font-medium text-lg border-t-2 border-slate-500 py-1'>
                                    {gameModal.quarter === 5 ? <div>OT</div> : gameModal.isHalftime ? <div>Halftime</div> : <div>Q{gameModal.quarter}</div>}
                                    <div>{gameModal.downText}</div>
                                    <div className={`${gameModal.yardsToEZ <= 20 ? 'text-red-500 bg-red-100 rounded-full px-2' : ''}`}>{gameModal.yardLine}</div>
                                    <div>PR: {gameModal.playsLeft}</div>
                                  </div>
                                } 
                                {gameModal.status === 'Final' &&
                                  <div className='flex justify-center space-x-12 px-2 font-medium text-lg border-t-2 border-slate-500'>
                                    <div>Final</div>
                                  </div>
                                } 
                                {gameModal.status === 'Scheduled' &&
                                  <div className='flex justify-center space-x-12 px-2 font-medium text-lg border-t-2 border-slate-500'>
                                    <div>Starting Soon...</div>
                                  </div>
                                } 
                              </div>
                              <div className='mx-4 h-full'>
                                <PlayList id={selectedGame} />
                              </div>
                            </div>
                            <div className='m-4 grow bg-white rounded-lg shadow-md' style={{ height: "90%" }}>
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