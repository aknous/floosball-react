/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { ArrowCircleLeftIcon, ArrowCircleRightIcon } from '@heroicons/react/solid'
  

export default function GameGrid() {
  const URL = 'http://127.0.0.1:8000/currentGames';
  const [games, setGames] = useState([])
  const getGames = async () => {
    try {
      const userGames = await axios.get(URL)
      setGames(userGames.data);  // set State
    
    } catch (err) {
      console.error(err.message);
    }
  };
  useEffect(() => {
    getGames()
    const interval=setInterval(()=>{
      getGames()
    },5000)
       
     return()=>clearInterval(interval)

  }, [])
  return (
    <ul className="grid grid-cols-2 gap-6 mt-4 mx-10 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 text-slate-900">
      {games.map((game) => (
        <li key={game.id} className={`mt-6 bg-slate-50 rounded-md shadow-md hover:bg-slate-100 ${game.yardsToEZ <= 20 ? "ring-4 ring-offset-4 ring-offset-slate-200 ring-red-500" : ""}`}>
          <div className='flex items-center justify-between'>
            <div className='w-1/3 flex flex-col mt-2 ml-6'>
              <span className='text-2xl text-center font-medium'>{game.homeCity}</span>
              <span className={`text-3xl text-center font-semibold text-${game.homeTeamColor}-500`}>{game.homeTeam}</span>
              <div className='mt-2 text-4xl font-semibold text-center'>{game.homeScore}</div>
            </div>
            <div className='grow'>
              <ArrowCircleLeftIcon className={`float-left h-10 w-10 ${game.homeTeamPoss ? 'visible' : 'invisible'}`} />
            </div>
            <div className='flex flex-col text-slate-700 text-lg text-center gap-x-8 mt-2 px-2 justify-between'>
              <span className="">{game.status === "Final" ? "Final" : "Q" + game.quarter}</span>
              <span className="">PR: {game.playsLeft%33}</span>
              <span className="">{game.downText}</span>
              <span className="">{game.yardLine}</span>
            </div>
            <div className='grow'>
              <ArrowCircleRightIcon className={`float-right h-10 w-10 ${game.awayTeamPoss ? 'visible' : 'invisible'}`} />
            </div>
            <div className='w-1/3 flex flex-col mt-2 mr-6'>
              <span className='text-2xl text-center font-medium'>{game.awayCity}</span>
              <span className={`text-3xl text-center font-semibold text-${game.awayTeamColor}-500`}>{game.awayTeam}</span>
              <div className='mt-2 text-4xl font-semibold text-center'>{game.awayScore}</div>
            </div>
          </div>
          <div className='text-center mt-4 border-t-2 px-4 italic text-base text-ellipsis tracking-tight'>{game.lastPlay}</div>
        </li>
      ))}
    </ul>
  )
}
  