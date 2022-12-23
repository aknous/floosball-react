/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import axios from 'axios'
import { GiPlagueDoctorProfile } from 'react-icons/gi';
  
  export default function PlayerTable() {
    const URL = 'http://floosball.com:8000/players';

    const [players, setPlayers] = useState([])

    const getPlayers = async () => {
      try {
        const userPlayers = await axios.get(URL)

        setPlayers(userPlayers.data);  // set State
      
      } catch (err) {
        console.error(err.message);
      }
    };

    useEffect(() => {
        getPlayers()
    }, [])


    return (
      <div className='h-screen overflow-auto'>
        <div className="px-4 grid grid-cols-6 gap-4">
          {players.map((player) => (
            <Link to={`/players/${player.id}`} key={player.id} className={"bg-white rounded-lg shadow-md p-2 hover:bg-slate-100"}>
              <div className='flex flex-col justify-between'>
                <div className="text-xl font-medium text-slate-900 truncate">
                  {player.name}
                </div>
                <div className="text-base text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                    return (         
                      <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
                <div className='flex justify-between items-center'>
                  <div className='text-base font-normal'>{player.rank}</div>
                  <div className='text-lg font-medium px-2 text-slate-500'>{player.position}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
    )
  }
  
  