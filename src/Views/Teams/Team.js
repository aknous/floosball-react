/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {
  Link,
  useParams,
} from "react-router-dom";
import { GiLaurelsTrophy } from 'react-icons/gi';
import axios from 'axios'
import Schedule from '../../Components/Schedule';
import Roster from '../../Components/Roster';
import RosterHistory from '../../Components/RosterHistory';
  
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Team() {
  const { id } = useParams();
  const [team, setTeam] = useState([])
  const [rosterHistory, setRosterHistory] = useState([])
  const [selectedMenu, setMenu] = useState(1)

  const getTeam = async () => {
    try {
      const userTeams = await axios.get(`http://127.0.0.1:8000/teams?id=${id}`)
      setTeam(userTeams.data);  // set State
    } catch (err) {
      console.error(err.message);
    }
  };

  const getRosterHistory = async () => {
    try {
      const userRosterHistory = await axios.get(`http://127.0.0.1:8000/rosterHistory?id=${id}`)
      setRosterHistory(userRosterHistory.data);  // set State
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleClick = (e) => {
    if (e.currentTarget.id === 'roster') {
      setMenu(1);
    }
    else if (e.currentTarget.id === 'schedule') {
      setMenu(2);
    }
    else if (e.currentTarget.id === 'history') {
      setMenu(3);
    }
  }

  useEffect(() => {
    getTeam()
    getRosterHistory()
  }, [id])

  return (
    team.roster ?
      <div className='flex justify-center'>
        <div className='mt-4 flex flex-col items-center w-4/5'>
          <div className='flex mt-8 w-full justify-center'>
            <div className='flex flex-col w-full'>
              <span className='text-3xl text-center font-medium'>{team.city}</span>
              <span className='text-4xl text-center font-semibold' style={{ color: `${team.color}` }}>{team.name}</span>
              <div className='mt-2 text-2xl text-center'>
                  {team.wins}-{team.losses}
              </div>
              {team.championships ? 
                <div className="flex justify-center gap-x-6 text-3xl text-amber-500 py-4">{team.championships.map((championship) => {        
                  return (  
                    <div className='flex flex-col items-center'>
                      <GiLaurelsTrophy className='text-4xl mx-2' />
                      <div className='text-xl font-medium text-slate-700'>{championship}</div>
                    </div>               
                  );
                })}</div> 
                : null
              }
            </div>
          </div>
          <div className='flex justify-center mt-6 w-3/4'>
            <nav className="-mb-px flex justify-center w-3/4" aria-label="Tabs">
              <button
                  id={'roster'}
                  onClick={handleClick}
                  className={classNames(
                    selectedMenu === 1
                      ? 'border-slate-500 text-slate-900'
                      : 'border-transparent text-gray-900 hover:text-slate-900 hover:border-slate-300',
                      'w-1/4 py-4 px-1 text-center border-b-2 font-medium text-2xl'
                  )}
              >
                  Roster
              </button>
              <button
                  id={'schedule'}
                  onClick={handleClick}
                  className={classNames(
                    selectedMenu === 2
                      ? 'border-slate-500 text-slate-900'
                      : 'border-transparent text-gray-900 hover:text-slate-900 hover:border-slate-300',
                      'w-1/4 py-4 px-1 text-center border-b-2 font-medium text-2xl'
                  )}
              >
                  Schedule
              </button>
              <button
                  id={'history'}
                  onClick={handleClick}
                  className={classNames(
                    selectedMenu === 3
                      ? 'border-slate-500 text-slate-900'
                      : 'border-transparent text-gray-900 hover:text-slate-900 hover:border-slate-300',
                      'w-1/4 py-4 px-1 text-center border-b-2 font-medium text-2xl'
                  )}
              >
                  Player History
              </button>
            </nav>
          </div>
          <div className='mt-10'>
            {selectedMenu === 1 &&
              <Roster roster={team.roster} reserves={team.reserves} defenseRatingStars={team.defenseRatingStars}/>
            }
            {selectedMenu === 2 &&
              <Schedule schedule={team.schedule}/>
            }
            {selectedMenu === 3 &&
              <RosterHistory players={rosterHistory}/>
            }
          </div>
        </div>
      </div>
      
    : null
  )
}
  