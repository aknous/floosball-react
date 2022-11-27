/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import axios from 'axios'
  
  export default function PlayerTable() {
    const URL = 'http://127.0.0.1:8000/players';

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
      <div className="px-4 mt-20 sm:px-6 lg:px-8">
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table id="playerTable" className="min-w-full divide-y divide-slate-300">
                  <thead className="bg-slate-50">
                    <tr className="divide-x divide-slate-200">
                      <th scope="col" className="py-3.5 pl-4 text-left text-xl font-semibold text-slate-900 sm:pl-6">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                        Position
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                        Rating
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                        Team
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                        Seasons
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {players.map((player) => (
                      <tr key={player.id} className={"divide-x divide-slate-200"}
                      >
                        <td className="whitespace-nowrap py-4 pl-4 text-xl font-medium text-slate-900 sm:pl-6">
                          {player.name}
                        </td>
                        <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.position}</td>
                        <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                            return (         
                              <span className="star">&#9733;</span>        
                            );
                          })}</td>
                        <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.team}</td>
                        <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.seasons}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  