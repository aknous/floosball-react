import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import { MinusSmIcon, TrendingUpIcon, TrendingDownIcon } from '@heroicons/react/solid'


export default function Roster(props) {

    const roster = props.roster

    return (
      <div className='pb-6'>
        <div className='laptop:flex tablet:justify-center gap-x-2 laptop:gap-x-8'>
          <div className='flex flex-col items-center'>
            <div className='text-2xl'>Offense</div>
            <table className='divide-y mt-2 divide-slate-300 bg-white rounded-lg shadow-lg w-72'>
                <tbody className='divide-y divide-slate-300'>
                  <RosterPlayer player={roster.qb} />
                  <RosterPlayer player={roster.rb} />
                  <RosterPlayer player={roster.wr1} />
                  <RosterPlayer player={roster.wr2} />
                  <RosterPlayer player={roster.te} />
                  <RosterPlayer player={roster.k} />
                </tbody>
            </table>
          </div>  
          <div className='flex flex-col items-center'>
            <div className='text-2xl'>Defense</div>
            <table className='divide-y mt-2 divide-slate-300 bg-white rounded-lg shadow-lg w-72'>
                <tbody className='divide-y divide-slate-300'>
                <tr className="text-center">
                    <td className='px-4 py-2'>
                      <div className="whitespace-nowrap text-base laptop:text-lg font-semibold text-slate-700 hover:underline">Pass Defense</div>
                      <div className='flex justify-center items-center'>
                        <div className='flex'>
                          <div className="whitespace-nowrap text-sm laptop:text-lg text-yellow-500">{[...Array(roster.defense.passDefenseStars)].map((star) => {        
                            return (         
                              <span className="star">&#9733;</span>        
                            );
                            })}
                          </div>
                          {5 > roster.defense.passDefenseStars ? 
                              <div className="text-lg text-slate-300">{[...Array(5 - roster.defense.passDefenseStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>
                                  );
                                })}
                              </div> 
                              : null }
                        </div>
                        <div className='text-slate-700 text-xs italic ml-1'>[{roster.defense.passDefenseRating}]</div>
                      </div>
                    </td>
                  </tr>
                  <tr className="text-center">
                    <td className='px-4 py-2'>
                      <div className="whitespace-nowrap text-base laptop:text-lg font-semibold text-slate-700 hover:underline">Run Defense</div>
                      <div className='flex justify-center items-center'>
                        <div className='flex'>
                          <div className="whitespace-nowrap text-sm laptop:text-lg text-yellow-500">{[...Array(roster.defense.runDefenseStars)].map((star) => {        
                            return (         
                              <span className="star">&#9733;</span>        
                            );
                            })}
                          </div>
                          {5 > roster.defense.runDefenseStars ? 
                              <div className="text-lg text-slate-300">{[...Array(5 - roster.defense.runDefenseStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>
                                  );
                                })}
                              </div> 
                              : null }
                        </div>
                        <div className='text-slate-700 text-xs italic ml-1'>[{roster.defense.runDefenseRating}]</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
            </table>
          </div>
        </div>
      </div>
    )
}

function RosterPlayer(props) {
  const player = props.player

  return (
    player ?
      <tr className="text-center">
        <td className='px-4 py-2'>
          <Link to={`/players/${player.id}`} className="whitespace-nowrap text-base laptop:text-lg font-semibold text-slate-700 hover:underline"><span className='font-normal text-sm align-middle'>#{player.number}</span> {player.name}<span className='pl-1 text-sm font-normal align-middle'>- {player.pos}</span></Link>
          <div className='flex justify-center items-center'>
            <div className='flex'>
              <div className="whitespace-nowrap text-sm laptop:text-lg text-yellow-500">{[...Array(player.stars)].map((star) => {        
                return (         
                  <span className="star">&#9733;</span>        
                );
                })}
              </div>
              {5 > player.stars ? 
                <div className="text-lg text-slate-300">{[...Array(5 - player.stars)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>
                    );
                  })}
                </div> 
                : null }
            </div>
            <div className='text-slate-700 text-xs italic ml-1'>[{player.rating}]</div>
          </div> 
          <div className='text-xs font-medium text-slate-700 italic'>{`${player.termRemaining} season(s) until FA`}</div>
        </td>
      </tr>
      :
      <tr className="text-center">
        <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
      </tr>
  )

}