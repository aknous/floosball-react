import React,{useEffect,useState} from 'react'
import { PlusIcon, MinusIcon } from '@heroicons/react/solid'


export default function Roster(props) {

    const players = props.players

    return (
        <div className='flex justify-center gap-x-4'>
            {players.length ? 
              <div className='flex flex-col items-center'>
                  <table className='min-w-full divide-y mt-4 divide-slate-300 bg-white rounded-lg shadow-lg'>
                    <thead>
                      <tr>
                        <th className='px-2'>Season</th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-300'>
                        {players.map((player) => (
                            <tr className="text-left">
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500 text-center">{player.season}</td>
                              <td className={`w-12 text-xl ${player.isAddition ? 'text-green-600' : 'text-red-500'}`}>
                                {player.isAddition ? 
                                <PlusIcon className='px-2' /> :
                                <MinusIcon className='px-2' />
                                }
                              </td>
                              <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{player.name}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(player.tier)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                                })}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.pos}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.method}</td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
              : null
            }       
        </div>
    )
}