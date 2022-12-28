/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import axios from 'axios'
  

export default function TeamTable() {
  const URL = 'http://floosball.com:8000/teams';
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
    <div className='laptop:grid grid-cols-2 justify-center'>
      {teams.map((division) => 
        <div className='my-5 mx-2 laptop:mx-10 text-lg laptop:text-3xl text-center font-semibold text-slate-700'>{division.divisionName} Division
          <div className='bg-white rounded-lg shadow-lg'>
            <table id="teamTable" className="min-w-full divide-y divide-slate-300">
              <tbody className="divide-y divide-slate-200 text-xl font-normal">
                {division.teams.map((team) => (
                  <tr key={team.id} className={`hover:bg-slate-100 ${team.eliminated ? 'opacity-40' : ''}`}>
                    <td key={team.id} className="pl-2 py-3 w-36 laptop:w-48">
                      <Link to={`/team/${team.id}`} className={`text-lg laptop:text-2xl font-semibold text-left truncate hover:underline ${team.eliminated ? 'line-through' : ''}`} style={{ color: `${team.color}` }}>{team.city} {team.name}</Link>
                    </td>
                    <td className="text-center text-sm laptop:text-xl font-normal text-slate-900 w-8">
                      {team.wins}
                    </td>
                    <td className="text-center text-sm laptop:text-xl font-normal text-slate-900 w-8">
                      {team.losses}
                    </td>
                    <td className="text-center text-sm laptop:text-xl font-normal text-slate-900 w-8">
                      {team.winPerc}
                    </td>
                    <td className="text-center text-sm laptop:text-xl font-normal text-slate-900 w-8">
                      {team.streak}
                    </td>
                    <td className="text-center text-sm laptop:text-xl font-normal text-slate-900 w-8">
                      {team.pointDiff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>       
      )}
    </div>
  )
}
  