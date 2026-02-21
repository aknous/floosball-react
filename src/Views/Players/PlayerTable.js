/* This example requires Tailwind CSS v2.0+ */
import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom";
import axios from 'axios'
import { GiPlagueDoctorProfile } from 'react-icons/gi';

export default function PlayerTable() {
  //const URL = 'http://floosball.com:8000/players';
  const URL = 'http://localhost:8000/players';

  const [players, setPlayers] = useState([])
  const [selection, setSelection] = useState('Active')

  const getPlayers = async () => {
    try {
      const userPlayers = await axios.get(URL)

      setPlayers(userPlayers.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  const getRetiredPlayers = async () => {
    try {
      //const userRetiredPlayers = await axios.get('http://floosball.com:8000/players?id=Retired')
      const userRetiredPlayers = await axios.get('http://localhost:8000/players?id=Retired')

      setPlayers(userRetiredPlayers.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };
  const getHofPlayers = async () => {
    try {
      //const userRetiredPlayers = await axios.get('http://floosball.com:8000/players?id=HoF')
      const userRetiredPlayers = await axios.get('http://localhost:8000/players?id=HoF')

      setPlayers(userRetiredPlayers.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };
  const getFaPlayers = async () => {
    try {
      //const userFaPlayers = await axios.get('http://floosball.com:8000/players?id=FA')
      const userFaPlayers = await axios.get('http://localhost:8000/players?id=FA')

      setPlayers(userFaPlayers.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    switch (selection) {
      case 'Active':
        getPlayers();
        break;
      case 'FA':
        getFaPlayers();
        break;
      case 'Retired':
        getRetiredPlayers();
        break;
      case 'HoF':
        getHofPlayers();
        break;
    }

  }, [selection]);

  return (
    <div>
      <div className='flex justify-center'>
        <span className="inline-flex rounded-md shadow-sm mt-16">
          <button
            type="button"
            onClick={() => setSelection('Active')}
            className={`relative inline-flex items-center rounded-l-xl border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 'Active' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setSelection('FA')}
            className={`relative -ml-px inline-flex items-center border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 'FA' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            Free Agents
          </button>
          <button
            type="button"
            onClick={() => setSelection('Retired')}
            className={`relative -ml-px inline-flex items-center border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 'Retired' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            Retired
          </button>
          <button
            type="button"
            onClick={() => setSelection('HoF')}
            className={`relative -ml-px inline-flex items-center rounded-r-xl border border-slate-100 px-4 py-2 text-semibold font-medium uppercase ${selection === 'HoF' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            Hall Of Fame
          </button>
        </span>
      </div>
      <div className='flex-col w-full justify-center mt-6'>
        <div className="px-4 pb-4 grid grid-cols-2 tablet:grid-cols-4 laptop:grid-cols-6 gap-2 laptop:gap-4">
          {players.map((player) => (
            <Link to={`/players/${player.id}`} key={player.id} className={`bg-white rounded-lg hover:bg-slate-100`}>
              <div className='flex flex-col justify-between'>
                <div className={`flex items-center justify-start p-2 rounded-t-lg h-5 ${player.ratingTier === 5 && "bg-yellow-500"} ${player.ratingTier === 4 && "bg-purple-500"} ${player.ratingTier === 3 && "bg-blue-500"} ${player.ratingTier === 2 && "bg-emerald-500"} ${player.ratingTier === 1 && "bg-gray-400"}`}>
                  <div className='text-sm text-white italic font-bold'>
                    {player.ratingTier === 5 && <span className='text-yellow-100'> S Tier</span>}
                    {player.ratingTier === 4 && <span className='text-purple-100'> A Tier</span>}
                    {player.ratingTier === 3 && <span className='text-blue-100'> B Tier</span>}
                    {player.ratingTier === 2 && <span className='text-emerald-100'> C Tier</span>}
                    {player.ratingTier === 1 && <span className='text-gray-100'> D Tier</span>}
                  </div>
                </div>
                <div className='flex flex-col pl-2'>
                  <div className="text-sm laptop:text-xl font-semibold text-slate-900 truncate">
                    {player.name}
                  </div>
                  <div className='flex justify-between items-center'>
                    <div className='text-md font-medium text-slate-500'>
                    {player.position === 'QB' && <span>Quarterback</span>}
                    {player.position === 'RB' && <span>Running Back</span>}
                    {player.position === 'WR' && <span>Wide Receiver</span>}
                    {player.position === 'TE' && <span>Tight End</span>}
                    {player.position === 'K' && <span>Kicker</span>}
                    </div>
                  </div>
                  <div className='flex justify-between items-center'>
                    <div className='text-md font-medium text-slate-500'>{player.team}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>


  )
}

