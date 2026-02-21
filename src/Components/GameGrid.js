/* This example requires Tailwind CSS v2.0+ */
import React,{Fragment,useEffect,useState} from 'react'
import { Dialog, Menu, Transition } from '@headlessui/react'
import { Link } from "react-router-dom";
import axios from 'axios'
import PlayList from './PlayList'
import GameStats from './GameStats'
import GameModal from './GameModal'
import { ArrowCircleLeftIcon, ArrowCircleRightIcon, XIcon } from '@heroicons/react/solid'
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
  

export default function GameGrid({handleClick}) {
  //const URL = 'http://floosball.com:8000/currentGames';
  const URL = 'http://localhost:8000/currentGames';
  const [games, setGames] = useState([])

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
        <ul className="grid grid-cols-3 desktop:grid-cols-3 gap-8">
          {games.map((game) => (
            <button 
              key={game.id}
              className={`bg-white laptop:w-80 justify-self-center rounded-xl shadow-md hover:bg-slate-100`}
              onClick={() => game.status === "Active" || game.status === "Final" ? handleClick(game.id) : null}
              >
              <div className='flex items-center justify-between border-b border-slate-900'>
                <div className='w-full flex flex-col my-1'>
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
                      <div className={`w-14 justify-self-end place-self-center text-3xl font-semibold text-center mr-1 ${game.status === 'Final' && game.homeScore > game.awayScore ? 'bg-slate-900 text-white rounded-xl' : game.status === 'Scheduled' ? 'text-base':''}`}>{game.status === 'Scheduled' ? `${game.homeTeamWinProbability}%` : game.homeScore}</div>
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
                      <div className={`w-14 place-self-center text-3xl font-semibold text-center mr-1 ${game.status === 'Final' && game.awayScore > game.homeScore ? 'bg-slate-900 text-white rounded-xl' : game.status === 'Scheduled' ? 'text-base':''}`}>{game.status === 'Scheduled' ? `${game.awayTeamWinProbability}%` : game.awayScore}</div>
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
                    <span className="text-base">{game.isOvertime && game.status != "Final" ? "OT" : game.isHalftime ? 'Halftime' : game.isOvertime && game.status === "Final" ? "Final - OT" : game.status === "Final" ? 'Final' : "Q" + game.quarter}</span>
                    <div className={`text-base ${game.status === "Final" ? 'invisible' : 'visible'} ${game.yardsToEZ <= 10 ? 'text-red-500 font-black px-2' : ''}`}>{game.downText}</div>
                    <span className={`text-base ${game.status === "Final" ? 'invisible' : 'visible'} ${game.yardsToEZ <= 20 ? 'text-red-500 font-black px-2' : ''}`}>{game.yardLine}</span>
                    <span className={`text-base ${game.status === "Final" || game.isOvertime ? 'invisible' : game.playsLeft < 10 ? 'visible text-red-500 animate-pulse' : 'visible'}`}>PR: {game.playsLeft}</span>
                  </div>
                }
            </button>
          ))}
        </ul>
      </div>
    </div>
    
  )
}