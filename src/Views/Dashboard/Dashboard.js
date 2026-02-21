import React, { Fragment, useEffect, useState } from 'react'
import { Link } from "react-router-dom";
import { Dialog, Menu, Transition } from '@headlessui/react'
import axios from 'axios'
import { InformationCircleIcon } from '@heroicons/react/outline'
import GameModal from '/Users/andrew/Projects/floosball-react/src/Components/GameModal'
import GameGrid from '/Users/andrew/Projects/floosball-react/src/Components/GameGrid.js'
import { GiLaurelsTrophy, GiCutDiamond, GiRoundStar } from 'react-icons/gi';
import { XCircleIcon, CheckCircleIcon, FireIcon } from '@heroicons/react/solid'
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

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}


function TopPlayers(props) {
  const pos = props.pos

  const [players, setPlayers] = useState([])

  const getPlayers = async () => {
    try {
      //const userPlayers = await axios.get(`http://floosball.com:8000/topPlayers?pos=${pos}`)
      const userPlayers = await axios.get(`http://localhost:8000/topPlayers?pos=${pos}`)

      setPlayers(userPlayers.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getPlayers();
    const interval = setInterval(() => {
      getPlayers();
    }, 60000)

    return () => clearInterval(interval)

  }, []);

  return (
    <div className='flex mx-2 bg-white rounded-xl shadow-md w-full'>
      <table className='divide-y divide-slate-400 w-full'>
        {players.map((player) => (
          <tr className='flex items-center justify-between px-5'>
            <td className='flex flex-col items-center py-2 pr-2 laptop:pr-1'>
              <div className='mt-2 w-6 laptop:w-8 h-6 laptop:h-8 rounded-full' style={{ backgroundColor: `${player.color}` }}></div>
              <div className='text-sm laptop:text-base font-semibold'>{player.abbr}</div>
            </td>
            <td className='w-2/3 flex items-center'>
              {pos === 'D' ? <Link to={`/team/${player.id}`} className='text-base laptop:text-xl truncate font-medium hover:underline'>{player.name}</Link> : <Link to={`/players/${player.id}`} className='text-base laptop:text-xl truncate font-medium hover:underline'>{player.name}</Link>}
              <div className={`bg-white ml-3 flex items-center justify-center w-5 h-5 rounded-full ${player.ratingTier === 5 && 'bg-yellow-500'} ${player.ratingTier === 4 && 'bg-purple-500'} ${player.ratingTier === 3 && 'bg-blue-500'} ${player.ratingTier === 2 && 'bg-emerald-500'} ${player.ratingTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-sm text-center text-white font-bold`}>
                  {player.ratingTier === 5 && 'S'}
                  {player.ratingTier === 4 && 'A'}
                  {player.ratingTier === 3 && 'B'}
                  {player.ratingTier === 2 && 'C'}
                  {player.ratingTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-sm laptop:text-lg font-semibold w-12 text-center pr-2'>{player.pts} pts</td>
          </tr>
        ))}
      </table>
    </div>
  )

}

function PowerRankings() {

  const [teams, setTeams] = useState([])

  const getTeams = async () => {
    try {
      //const userPlayers = await axios.get(`http://floosball.com:8000/powerRankings`)
      const userTeams = await axios.get(`http://localhost:8000/powerRankings`)

      setTeams(userTeams.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getTeams();
    const interval = setInterval(() => {
      getTeams();
    }, 60000)

    return () => clearInterval(interval)

  }, []);

  return (
    <div className='h-146 overflow-auto w-112 place-self-center mt-4 rounded-lg shadow-md'>
      <div className='flex bg-white'>
        <table className='divide-y divide-slate-400 mx-2 w-full'>
          {teams.map((team) => (
            <tr>
              <td className='flex h-14 items-center justify-between'>
                <div className='flex justify-between items-center'>
                  <div className='items-center py-2 mx-3 laptop:pr-1'>
                    <div className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full ${team.eliminated ? 'opacity-25' : ''}`} style={{ backgroundColor: `${team.color}` }}></div>
                  </div>
                  <div key={team.id} className="text-left">
                    <Link to={`/team/${team.id}`} className={`text-lg laptop:text-xl font-semibold text-left  truncate hover:underline`}>{team.city} {team.name}</Link>
                    <span className='text-xs italic font-medium'> {team.record}</span>
                  </div>
                  <div className='flex items-center ml-2 space-x-1'>
                    {team.winningStreak ? <div className='w-8 text-red-500'><FireIcon className='w-6 h-6' /></div> : null}
                  </div>
                </div>
                <div className='flex justify-end mr-3 text-sm laptop:text-xl font-normal text-center text-slate-900 space-x-4'>
                  <div className="w-12">{team.elo}</div>
                </div>
              </td>
            </tr>
          ))}
        </table>
      </div>
    </div>
  )

}

function PlayoffPicture() {

  const [playoffTeams, setPlayoffTeams] = useState([])
  const [nonPlayoffTeams, setNonPlayoffTeams] = useState([])
  const [leagues, setLeagues] = useState([])

  const getTeams = async () => {
    try {
      //const userTeams = await axios.get(`http://floosball.com:8000/playoffPicture`)
      const userTeams = await axios.get(`http://localhost:8000/playoffPicture`)

      //setPlayoffTeams(userTeams.data[1].playoffTeams);
      //setNonPlayoffTeams(userTeams.data[2].nonPlayoffTeams);
      setLeagues(userTeams.data);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getTeams();
    const interval = setInterval(() => {
      getTeams();
    }, 30000)

    return () => clearInterval(interval);


  }, []);

  return (
    <div className='h-146 flex overflow-auto place-self-center mt-4'>
      {leagues.map((league) => (
        <div className='place-self-center'>
          <div className='bg-white rounded-xl shadow-md mx-2'>
            <div className='my-1 text-lg laptop:text-lg text-left font-semibold text-slate-700 underline pl-2'>Playoff Teams</div>
            <table id="teamTable" className="min-w-full divide-y divide-slate-300">
              <tbody className="divide-y divide-slate-200 text-xl font-normal">
                <tr>
                  <td className='flex h-8 items-center justify-between'>
                    <div className='flex justify-between items-center'>
                      <div className='items-center py-2 mx-3 laptop:pr-1'>
                        <div className='w-6 laptop:w-8 h-6 laptop:h-8 rounded-full'></div>
                      </div>
                      <div className="text-left">
                        <div className={`text-base font-semibold text-left`}>Team</div>
                      </div>
                    </div>
                    <div className='flex justify-end w-56 mr-3 text-sm laptop:text-base font-semibold text-center text-slate-900 space-x-4'>
                      <div className="w-12">Rating</div>
                      <div className="w-14">Record</div>
                    </div>
                  </td>
                </tr>
                {league[0].map((team) => (
                  <tr key={team.id}>
                    <td className='flex h-14 items-center justify-between'>
                      <div className='flex justify-between items-center'>
                        <div className='items-center py-2 mx-3 laptop:pr-1'>
                          <div className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full ${team.eliminated ? 'opacity-25' : ''}`} style={{ backgroundColor: `${team.color}` }}></div>
                        </div>
                        <div key={team.id} className="text-left">
                          <Link to={`/team/${team.id}`} className={`text-lg laptop:text-xl font-semibold text-left  truncate hover:underline`}>{team.city} {team.name}</Link>
                        </div>
                        <div className='flex items-center ml-2 space-x-1'>
                          {team.clinchedPlayoffs ? <div className='w-8 text-emerald-500'><CheckCircleIcon className='w-6 h-6' /></div> : null}
                          {team.clinchedTopSeed ? <div className='w-8 text-amber-500'><GiRoundStar className='w-6 h-6' /></div> : null}
                          {team.leagueChampion ? <div className='w-8 text-cyan-500'><GiCutDiamond className='w-6 h-6' /> </div> : null}
                          {team.floosbowlChampion ? <div className='w-8 text-amber-500'><GiLaurelsTrophy className='w-6 h-6' /></div> : null}
                          {team.winningStreak ? <div className='w-8 text-red-500'><FireIcon className='w-6 h-6' /></div> : null}
                        </div>
                      </div>
                      <div className='flex justify-end w-56 mr-3 text-sm laptop:text-xl font-normal text-center text-slate-900 space-x-4'>
                        <div className="w-12">{team.elo}</div>
                        <div className="w-14">{team.record}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='bg-white rounded-xl shadow-md my-5 mx-2'>
            <div className='my-1 text-lg laptop:text-lg text-left font-semibold text-slate-700 underline pl-2'>Non-Playoff Teams</div>
            <table id="teamTable" className="min-w-full divide-y divide-slate-300">
              <tbody className="divide-y divide-slate-200 text-xl font-normal">
                <tr>
                  <td className='flex h-8 items-center justify-between'>
                    <div className='flex justify-between items-center'>
                      <div className='items-center py-2 mx-3 laptop:pr-1'>
                        <div className='w-6 laptop:w-8 h-6 laptop:h-8 rounded-full'></div>
                      </div>
                      <div className="text-left">
                        <div className={`text-base font-semibold text-left`}>Team</div>
                      </div>
                    </div>
                    <div className='flex justify-end w-56 mr-3 text-sm laptop:text-base font-semibold text-center text-slate-900 space-x-4'>
                      <div className="w-12">Rating</div>
                      <div className="w-14">Record</div>
                    </div>
                  </td>
                </tr>
                {league[1].map((team) => (
                  <tr key={team.id}>
                    <td className='flex h-14 items-center justify-between'>
                      <div className='flex justify-between items-center'>
                        <div className='items-center py-2 mx-3 laptop:pr-1'>
                          <div className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full ${team.eliminated ? 'opacity-25' : ''}`} style={{ backgroundColor: `${team.color}` }}></div>
                        </div>
                        <div key={team.id} className="text-left">
                          <Link to={`/team/${team.id}`} className={`text-lg laptop:text-xl font-semibold text-left  truncate hover:underline`}>{team.city} {team.name}</Link>
                        </div>
                        <div className='flex items-center ml-2 space-x-1'>
                          {team.clinchedPlayoffs ? <div className='w-8 text-emerald-500'><CheckCircleIcon className='w-6 h-6' /></div> : null}
                          {team.clinchedTopSeed ? <div className='w-8 text-amber-500'><GiRoundStar className='w-6 h-6' /></div> : null}
                          {team.leagueChampion ? <div className='w-8 text-cyan-500'><GiCutDiamond className='w-6 h-6' /> </div> : null}
                          {team.floosbowlChampion ? <div className='w-8 text-amber-500'><GiLaurelsTrophy className='w-6 h-6' /></div> : null}
                          {team.winningStreak ? <div className='w-8 text-red-500'><FireIcon className='w-6 h-6' /></div> : null}
                        </div>
                      </div>
                      <div className='flex justify-end w-56 mr-3 text-sm laptop:text-xl font-normal text-center text-slate-900 space-x-4'>
                        <div className="w-12">{team.elo}</div>
                        <div className="w-14">{team.record}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>

  )
}

export default function Dashboard() {

  const [highlights, setHighlights] = useState([])
  const [champ, setChamp] = useState([])
  const [selection, setSelection] = useState(1)

  const getHighlights = async () => {
    try {
      //const userHighlights = await axios.get('http://floosball.com:8000/highlights')
      const userHighlights = await axios.get('http://localhost:8000/highlights')

      setHighlights(userHighlights.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  const getChamp = async () => {
    try {
      //const userChamp = await axios.get('http://floosball.com:8000/champion')
      const userChamp = await axios.get('http://localhost:8000/champion')

      setChamp(userChamp.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  const [selectedGame, setSelectedGame] = useState()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleClick = (gameId) => {
      setSelectedGame(gameId);
      onOpen()
  }

  useEffect(() => {
    getHighlights();
    getChamp();
    const interval = setInterval(() => {
      getHighlights();
    }, 10000)

    return () => clearInterval(interval)
  }, []);

  return (
    <div className='h-full mt-14'>
      <div className="py-2 flex shrink-0 justify-center mx-10 divide-x divide-slate-500">
        <div className='text-xl laptop:text-3xl font-semibold'>welcome to floosball.</div>
      </div>
      {champ?.team ?
        <div className="py-2 flex shrink-0 justify-center mx-10 divide-x divide-slate-500">
          <div className='text-xl laptop:text-2xl font-medium bg-white rounded-2xl px-6 py-2 shadow-sm'>reigning champion: <Link to={`/team/${champ.id}`} className=' font-semibold hover:underline drop-shadow-sm' style={{ color: `${champ.color}` }}>{champ.team}</Link></div>
        </div>
        : null
      }
      <div className='laptop:flex flex-row-reverse mt-4 laptop:mt-10'>
        <div className='flex flex-col items-center laptop:w-2/5 mx-2 laptop:mx-4'>
          <div className='flex mx-2 bg-white rounded-xl shadow-md w-full h-96 laptop:h-150 overflow-x-auto laptop:overscroll-x-none'>
            <ul className='divide-y divide-slate-300 p-2 w-full'>
              {highlights.map((data) => (
                data.type === 'play' ?
                  <li className='p-2 hover:bg-slate-100 cursor-pointer' onClick={() => handleClick(data.id)}>
                    <div className='flex space-x-3 items-center'>
                      <div className='py-2 w-6 laptop:w-8 h-6 laptop:h-8 rounded-full' style={{ backgroundColor: `${data.color}` }}></div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm laptop:text-base font-bold uppercase">{data.team}</h3>
                          <div className={`bg-slate-100 rounded-full ${data.result === 'Field Goal is No Good' ? 'bg-slate-600' : ''} ${data.result === 'Turnover On Downs' ? 'bg-slate-600' : ''} ${data.result === '1st Down' ? 'bg-green-100' : ''} ${data.result === 'Punt' ? 'bg-slate-600' : ''} ${data.result === 'Fumble' ? 'bg-red-500' : ''} ${data.result === 'Interception' ? 'bg-red-500' : ''} ${data.isTd ? 'bg-emerald-500' : ''} ${data.isFg ? 'bg-indigo-500' : ''} ${data.isSafety ? 'bg-rose-500' : ''}`}>
                            <div className={`p-1 text-xs mx-1 font-bold uppercase ${data.result === 'Field Goal is No Good' ? 'text-slate-100' : ''} ${data.result === 'Turnover On Downs' ? 'text-slate-100' : ''} ${data.result === '1st Down' ? 'text-green-700' : ''} ${data.result === 'Punt' ? 'text-slate-100' : ''} ${data.result === 'Fumble' ? 'text-white' : ''} ${data.result === 'Interception' ? 'text-white' : ''} ${data.isTd ? 'text-white' : ''} ${data.isFg ? 'text-white' : ''} ${data.isSafety ? 'text-white' : ''}`}>{data.result}</div>
                          </div>
                        </div>
                        <div className='flex items-center justify-between'>
                          <p className='shrink laptop:w-auto text-xs laptop:text-sm font-medium'>{data.playText}</p>
                          <span className={`text-xs font-medium text-slate-700 w-32 text-right ${data.scoreChange ? 'visible' : 'invisible'}`}>{data.homeAbbr} {data.homeScore} | {data.awayAbbr} {data.awayScore}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                  :
                  <li className='flex p-2 h-16 items-center'>
                    <div className='flex space-x-3 justify-center'>
                      <div className='flex space-x-1 items-center'>
                        <div className='h-6 w-6'><InformationCircleIcon /></div>
                        <div className="text-sm laptop:text-lg font-semibold items-center italic">{data.text}</div>
                      </div>
                    </div>
                  </li>
              ))}
            </ul>
          </div>
        </div>
        <div className='flex flex-col w-3/5 mx-2'>
          <div className='flex justify-center'>
            <span className="isolate inline-flex">
              <button
                type="button"
                onClick={() => setSelection(1)}
                className={`relative inline-flex w-42 justify-center border border-slate-100 rounded-l-xl items-center px-4 py-2 text-lg font-semibold uppercase shadow-sm ${selection === 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
              >
                Games
              </button>
              <button
                type="button"
                onClick={() => setSelection(2)}
                className={`relative -ml-px inline-flex w-42 justify-center border border-slate-100 rounded-r-xl items-center px-4 py-2 text-lg font-semibold uppercase shadow-sm ${selection === 2 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
              >
                Fantasy
              </button>
            </span>
          </div>
          {selection === 1 ? <GameGrid handleClick={handleClick} />
            : selection === 3 ? <PowerRankings />
              : selection === 4 ? <PlayoffPicture /> :
                <div className='h-146 mt-4 overflow-auto pb-4'>
                  <div className='laptop:grid grid-cols-2 gap-x-6 mx-2 laptop:mx-4'>
                    <div className='flex flex-col items-center laptop:mt-0'>
                      <div className='text-xl font-semibold mt-2'>QB's</div>
                      <TopPlayers pos='QB' />
                    </div>
                    <div className='flex flex-col items-center laptop:mt-0'>
                      <div className='text-xl font-semibold mt-2'>RB's</div>
                      <TopPlayers pos='RB' />
                    </div>
                    <div className='flex flex-col items-center laptop:mt-0'>
                      <div className='text-xl font-semibold mt-4'>WR's</div>
                      <TopPlayers pos='WR' />
                    </div>
                    <div className='flex flex-col items-center laptop:mt-0'>
                      <div className='text-xl font-semibold mt-4'>TE's</div>
                      <TopPlayers pos='TE' />
                    </div>
                    <div className='flex flex-col items-center laptop:mt-0'>
                      <div className='text-xl font-semibold mt-4'>K's</div>
                      <TopPlayers pos='K' />
                    </div>
                    <div className='flex flex-col items-center laptop:mt-0'>
                      <div className='text-xl font-semibold mt-4'>Defense</div>
                      <TopPlayers pos='D' />
                    </div>
                  </div>
                </div>
          }
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
              <GameModal onClose={onClose} gameId={selectedGame} />
            </Dialog>
          </Transition>
        </div>
      </div>
    </div>
  )
}