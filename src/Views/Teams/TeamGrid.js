/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import axios from 'axios'
import { GiLaurelsTrophy, GiCutDiamond, GiRoundStar } from 'react-icons/gi';
import { XCircleIcon, CheckCircleIcon } from '@heroicons/react/solid'
  

export default function TeamTable() {
  //const URL = 'http://floosball.com:8000/teams';
  const URL = 'http://localhost:8000/teams';
  const [teams, setTeams] = useState([])

  const getTeams = async () => {
    try {
      const userTeams = await axios.get(URL)
      setTeams(userTeams.data);  // set State
    
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getTeams()
    const interval=setInterval(()=>{
      getTeams()
    },60000)
       
     return()=>clearInterval(interval)

  }, [])

  return (
    <div className='flex flex-col'>
      <div className='laptop:grid grid-cols-2 items-center mt-14'>
        {teams.map((division) => 
          <div className='bg-white rounded-xl shadow-md my-5 mx-2 laptop:mx-10'>
            <div className='my-1 text-lg laptop:text-2xl text-center font-semibold text-slate-700  underline'>{division.divisionName} Division</div>
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
                    <div className='flex justify-between w-88 mr-3 text-sm laptop:text-base font-semibold text-center text-slate-900'>
                      <div className="w-12">Rating</div>
                      <div className="w-6">W</div>
                      <div className="w-6">L</div>
                      <div className="w-16">WIN %</div>
                      <div className="w-8">STRK</div>
                      <div className="w-12">+/-</div>
                    </div>
                  </td>
                </tr>
                {division.teams.map((team) => (
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
                          {team.leagueChampion ? <div className='w-8 text-cyan-500'><GiCutDiamond className='w-6 h-6' /> </div>: null}
                          {team.floosbowlChampion ? <div className='w-8 text-amber-500'><GiLaurelsTrophy className='w-6 h-6' /></div> : null}
                        </div>
                      </div>
                      <div className='flex justify-between w-88 mr-3 text-sm laptop:text-xl font-normal text-center text-slate-900'>
                        <div className="w-12">{team.elo}</div>
                        <div className="w-6">{team.wins}</div>
                        <div className="w-6">{team.losses}</div>
                        <div className="w-16">{team.winPerc}</div>
                        <div className={`w-8 ${team.winningStreak ? 'text-red-500 font-black' : ''}`}>{team.streak}</div>
                        <div className="w-12">{team.pointDiff}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>       
        )}
      </div>
      <div className='flex items-center justify-center bg-white rounded-full shadow-md h-8 w-156 place-self-center'>
        <div className='flex justify-center space-x-10 items-center'>
          <div className='flex'>
            <div className='w-8 text-emerald-500'><CheckCircleIcon className='w-6 h-6' /></div>
            <div className=' align-middle'> = Clinched Playoffs</div>
          </div>
          <div className='flex'>
            <div className='w-8 text-amber-500'><GiRoundStar className='w-6 h-6' /></div>
            <div> = Clinched #1 Seed</div>
          </div>
          <div className='flex'>
            <div className='w-8 text-cyan-500'><GiCutDiamond className='w-6 h-6' /></div>
            <div> = League Champion</div>
          </div>
          <div className='flex'>
            <div className='w-8 text-amber-500'><GiLaurelsTrophy className='w-6 h-6' /></div>
            <div> = Floosbowl Champion</div>
          </div>
        </div>
      </div>
    </div>
  )
}
  