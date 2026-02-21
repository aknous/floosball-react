/* This example requires Tailwind CSS v2.0+ */
import React,{Fragment,useEffect,useState} from 'react'
import {Link,useParams,} from "react-router-dom";
import { Dialog, Menu, Transition } from '@headlessui/react'
import { GiLaurelsTrophy, GiCutDiamond, GiRoundStar } from 'react-icons/gi';
import { CheckCircleIcon, XCircleIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/solid'
import { XIcon } from '@heroicons/react/outline'
import axios from 'axios'
import Roster from '../../Components/Roster';
import GameModal from '../../Components/GameModal';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react'



export default function Team() {
  const { id } = useParams();
  const [team, setTeam] = useState([])
  const [rosterHistory, setRosterHistory] = useState([])
  const [selectedMenu, setMenu] = useState(1)
  const [index, setIndex] = useState(0)

  const getTeam = async () => {
    try {
      //const userTeams = await axios.get(`http://floosball.com:8000/teams?id=${id}`)
      const userTeams = await axios.get(`http://localhost:8000/teams?id=${id}`)
      setTeam(userTeams.data);  // set State
    } catch (err) {
      console.error(err.message);
    }
  };

  const getRosterHistory = async () => {
    try {
      //const userRosterHistory = await axios.get(`http://floosball.com:8000/rosterHistory?id=${id}`)
      const userRosterHistory = await axios.get(`http://localhost:8000/rosterHistory?id=${id}`)
      setRosterHistory(userRosterHistory.data);  // set State
    } catch (err) {
      console.error(err.message);
    }
  };

  const incrementSeason = () => {
    if (index < rosterHistory.length-1) {
      setIndex(index + 1);
    }
  }

  const decrementSeason = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  }

  useEffect(() => {
    getTeam()
    getRosterHistory()
  }, [id])

  useEffect(() => {
    setIndex(rosterHistory.length-1)
  }, [rosterHistory])


  return (
    team.championships ?
      <div className='flex justify-center mt-14'>
        <div className='mt-4 flex flex-col items-center w-full laptop:w-4/5'>
          <div className='flex mt-8 w-full justify-center'>
            <div className='flex flex-col w-full'>
              <span className='text-3xl text-center font-medium'>{team.city}</span>
              <span className='text-4xl text-center font-semibold' style={{ color: `${team.color}` }}>{team.name}</span>
              <div className='mt-2 text-2xl text-center'>
                  {team.wins}-{team.losses}
              </div>
            </div>
          </div>
          <div className='flex justify-center mt-10'>
            <span className="isolate inline-flex">
              <button
                type="button"
                onClick={() => setMenu(1)}
                className={`relative inline-flex w-42 justify-center border border-slate-100 rounded-l-xl items-center px-4 py-2 text-lg font-semibold uppercase shadow-sm ${selectedMenu === 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
              >
                Roster
              </button>
              <button
                type="button"
                onClick={() => setMenu(2)}
                className={`relative -ml-px inline-flex w-42 justify-center border border-slate-100 items-center px-4 py-2 text-lg font-semibold uppercase shadow-sm ${selectedMenu === 2 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
              >
                Team History
              </button>
              <button
                type="button"
                onClick={() => setMenu(3)}
                className={`relative -ml-px inline-flex w-42 justify-center border border-slate-100 rounded-r-xl items-center px-4 py-2 text-lg font-semibold uppercase shadow-sm ${selectedMenu === 3 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
              >
                Schedule
              </button>
            </span>
          </div>
          <div className='mt-10 flex justify-center overflow-x-scroll h-140 rounded-xl'>
            {selectedMenu === 1 &&
              <div className='flex-col justify-center w-full laptop:w-3/4'>
                <div className='flex justify-center items-center mb-2'>
                  <button className='w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    onClick={decrementSeason}>
                    <ChevronLeftIcon />
                  </button>
                  <div className='text-xl px-6'>Season {rosterHistory[index]?.season}</div>
                  <button className='w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    onClick={incrementSeason}>
                    <ChevronRightIcon />
                  </button>
                </div>
                {rosterHistory[index]?.roster ? <Roster roster={rosterHistory[index].roster}/> : null}
              </div>
            }
            {selectedMenu === 2 &&
              <div>
                <table className="w-full divide-y divide-slate-300 table-auto">
                  <thead className="bg-slate-50">
                    <tr className="divide-x divide-slate-200">
                      <td className='px-2 py-1 font-bold bg-slate-900 text-white'>SZN</td>
                      <td className='px-2 py-1 font-medium'>W</td>
                      <td className='px-2 py-1 font-medium'>L</td>
                      <td className='px-2 py-1 font-medium'>Elo</td>
                      <td className='px-2 py-1 font-medium'>Playoffs</td>
                      <td className='px-2 py-1 font-medium'>League Champ</td>
                      <td className='px-2 py-1 font-medium'>#1 Seed</td>
                      <td className='px-2 py-1 font-medium'>Floosbowl Champ</td>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {team.history.map((data) => (
                      <tr key={data.name} className={"divide-x divide-slate-200"}>
                        <td className="whitespace-nowrap p-2 text-xl text-white font-bold bg-slate-900">{data.season}</td>
                        <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.wins}</td>
                        <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.losses}</td>
                        <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.elo}</td>
                        <td className="whitespace-nowrap p-2">
                          <div className='flex justify-center'>
                            {data.madePlayoffs ? 
                              <CheckCircleIcon className='h-8 w-8 text-emerald-500' />
                              :
                              <XIcon className='h-8 w-8 text-slate-200' />
                            }
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2">
                          <div className='flex justify-center'>
                            {data.leagueChamp ? 
                              <GiRoundStar className='text-3xl text-amber-500' />
                              : 
                              <XIcon className='h-8 w-8 text-slate-200' />
                            }
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2">
                          <div className='flex justify-center'>
                            {data.topSeed ? 
                              <GiCutDiamond className='text-3xl text-cyan-500' />
                              : 
                              <XIcon className='h-8 w-8 text-slate-200' />
                            }
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2">
                          <div className='flex justify-center'>
                            {data.floosbowlChamp ? 
                              <GiLaurelsTrophy className='text-3xl text-amber-500' />
                              : 
                              <XIcon className='h-8 w-8 text-slate-200' />
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
            }
            {selectedMenu === 3 && <Schedule id={id}/>}
          </div>
        </div>
      </div>
      
    : null
  )
}

function Schedule({id}) {
  //const URL = `http://floosball.com:8000/schedule?id=${id}`;
  const URL = `http://localhost:8000/schedule?id=${id}`;
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const getGames = async () => {
    try {
      const userGames = await axios.get(URL)
      setGames(userGames.data);  // set State
    
    } catch (err) {
      console.error(err.message);
    }
  };

  const formatTime = (val) => {
    var utc = new Date();
    var offset = utc.getTimezoneOffset();
    var datetime = new Date((val*1000) - (offset*60000));
    return datetime.toLocaleString("en-US", {timeStyle: "short", dateStyle: "short"});
  }

  const handleClick = (game) => {
    if (game.status === 'Active' || game.status === 'Final') {
      setSelectedGame(game.id);
      onOpen()
    } 
  }

  useEffect(() => {
    getGames()
    const interval=setInterval(()=>{
      getGames()
    },10000)
       
     return()=>clearInterval(interval)

  }, [])
  return (
    <div className='mt-4'>
      <div className='flex flex-col items-center'>
        <ul className="grid grid-cols-4 desktop:grid-cols-4 gap-8">
          {games.map((game) => (
            <button 
              key={game.id}
              className={`bg-white laptop:w-80 justify-self-center rounded-xl shadow-md hover:bg-slate-100`}
              onClick={() => handleClick(game)}
              >
              <div className='flex items-center justify-between border-b border-slate-900'>
                <div className='w-full flex flex-col mb-1'>
                  <div className='border-b border-slate-300 bg-slate-900 text-white rounded-t-xl'>{game.week}</div>
                  <div className='flex flex-col'>
                    <div className='flex pb-1'>
                      <div className='items-center py-2'>
                        <div className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full mx-3 ${game.homeTeamPoss && game.status === 'Active' ? 'ring-2 ring-offset-1 ring-slate-500' : ''}`} style={{ backgroundColor: `${game.homeTeamColor}` }}></div>
                      </div>
                      <div className='flex flex-col grow'>
                        <div className='text-base text-left font-medium h-4'>{game.homeCity}</div>
                        <div className='flex'>
                          <div className={`text-2xl text-left font-semibold h-7 align-top truncate `}>{game.homeTeam}</div>
                          <div className='pl-2 text-xs pt-1 font-semibold text-center text-slate-900 place-self-center h-4'>{game.homeTeamRecord}</div>
                        </div>
                      </div>
                      <div className={`w-14 justify-self-end place-self-center text-3xl font-semibold text-center mr-1 ${game.status === 'Final' && game.homeScore > game.awayScore ? 'bg-slate-900 text-white rounded-xl' : game.status === 'Scheduled' ? 'text-base':''}`}>{game.status === 'Scheduled' ? `` : game.homeScore}</div>
                    </div>
                    <div className='flex pt-1 border-t border-slate-300'>
                      <div className='items-center py-2'>
                        <div className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full mx-3 ${game.awayTeamPoss && game.status === 'Active' ? 'ring-2 ring-offset-1 ring-slate-500' : ''}`} style={{ backgroundColor: `${game.awayTeamColor}` }}></div>
                      </div>
                      <div className='flex flex-col grow'>
                        <div className='text-base text-left font-medium h-4'>{game.awayCity}</div>
                        <div className='flex'>
                          <div className={`text-2xl text-left font-semibold h-7 align-top truncate `}>{game.awayTeam}</div>
                          <div className='pl-2 text-xs pt-1 font-semibold text-center text-slate-900 place-self-center h-4'>{game.awayTeamRecord}</div>
                        </div>
                      </div>
                      <div className={`w-14 place-self-center text-3xl font-semibold text-center mr-1 ${game.status === 'Final' && game.awayScore > game.homeScore ? 'bg-slate-900 text-white rounded-xl' : game.status === 'Scheduled' ? 'text-base':''}`}>{game.status === 'Scheduled' ? `` : game.awayScore}</div>
                    </div>
                  </div>
                </div>
              </div>
              {game.status === 'Scheduled' ? 
                  <div className='flex text-slate-900 text-center gap-x-2 my-1 px-2 justify-between font-medium'>
                    <span className='text-base'>Starts @ {formatTime(game.startTime)}</span> 
                  </div>
                  :
                  <div className='flex text-slate-900 text-center gap-x-2 my-1 px-2 justify-between font-medium'>
                    <span className="text-base">{game.isOvertime && game.status !== "Final" ? "OT" : game.isHalftime ? 'Halftime' : game.isOvertime && game.status === "Final" ? "Final - OT" : game.status === "Final" ? 'Final' : "Q" + game.quarter}</span>
                    <div className={`text-base ${game.status === "Final" ? 'invisible' : 'visible'} ${game.yardsToEZ <= 10 ? 'text-red-500 font-black px-2' : ''}`}>{game.downText}</div>
                    <span className={`text-base ${game.status === "Final" ? 'invisible' : 'visible'} ${game.yardsToEZ <= 20 ? 'text-red-500 font-black px-2' : ''}`}>{game.yardLine}</span>
                    <span className={`text-base ${game.status === "Final" || game.isOvertime ? 'invisible' : game.playsLeft < 10 ? 'visible text-red-500 animate-pulse' : 'visible'}`}>PR: {game.playsLeft}</span>
                  </div>
                }
            </button>
          ))}
        </ul>
      </div>
      <Transition
        as={Fragment}
        show={isOpen}
        enter="transition ease-out duration-50"
        enterFrom="opacity-0 "
        enterTo="opacity-100"
        leave="transition ease-in duration-50"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Dialog as="div" className="relative flex z-10" onClose={onClose}>
          <div className="fixed inset-0 bg-slate-500 bg-opacity-50 backdrop-blur-sm" />
          <GameModal onClose={onClose} gameId={selectedGame}/>
        </Dialog>
      </Transition>
    </div>
    
  )
}
  