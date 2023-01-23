/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import axios from 'axios'
import { GiPlagueDoctorProfile } from 'react-icons/gi';
  
  export default function PlayerTable() {
    const URL = 'http://floosball.com:8000/players';
    //const URL = 'http://localhost:8000/players';

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
        const userRetiredPlayers = await axios.get('http://floosball.com:8000/players?id=Retired')
        //const userRetiredPlayers = await axios.get('http://localhost:8000/players?id=Retired')

        setPlayers(userRetiredPlayers.data);  // set State
      
      } catch (err) {
        console.error(err.message);
      }
    };
    const getHofPlayers = async () => {
      try {
        const userRetiredPlayers = await axios.get('http://floosball.com:8000/players?id=HoF')
        //const userRetiredPlayers = await axios.get('http://localhost:8000/players?id=HoF')

        setPlayers(userRetiredPlayers.data);  // set State
      
      } catch (err) {
        console.error(err.message);
      }
    };

    useEffect(() => {
      switch (selection) {
          case 'Active':
              getPlayers();
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
          <span className="isolate inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setSelection('Active')}
              className={`relative inline-flex items-center rounded-l-md border border-slate-300 px-4 py-2 text-base font-medium ${selection === 'Active' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setSelection('Retired')}
              className={`relative -ml-px inline-flex items-center border border-slate-300 px-4 py-2 text-base font-medium ${selection === 'Retired' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              Retired
            </button>
            <button
              type="button"
              onClick={() => setSelection('HoF')}
              className={`relative -ml-px inline-flex items-center rounded-r-md border border-slate-300e px-4 py-2 text-base font-medium ${selection === 'HoF' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              Hall Of Fame
            </button>
          </span>
        </div>
        <div className='flex-col w-full justify-center mt-6'>
          <div className="px-4 pb-4 grid grid-cols-2 tablet:grid-cols-4 laptop:grid-cols-6 gap-2 laptop:gap-4">
            {players.map((player) => (
              <Link to={`/players/${player.id}`} key={player.id} className={"bg-white rounded-lg shadow-md p-2 hover:bg-slate-100"}>
                <div className='flex flex-col justify-between'>
                  <div className="text-sm laptop:text-xl font-medium text-slate-900 truncate">
                    {player.name}
                  </div>
                  <div className="text-base text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                      return (         
                        <span className="star">&#9733;</span>        
                      );
                    })}
                  </div>
                  <div className='flex justify-between items-center'>
                    <div className='text-sm laptop:text-base font-normal'>{player.rank}</div>
                    <div className='text-lg font-medium px-2 text-slate-500'>{player.position}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      
    )
  }
  
  