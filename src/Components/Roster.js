import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import { MinusSmIcon, TrendingUpIcon, TrendingDownIcon } from '@heroicons/react/solid'


export default function Roster(props) {

    const roster = props.roster
    const reserves = props.reserves
    const defenseRatingStars = props.defenseRatingStars

    return (
      <div className='w-screen pb-6'>
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
            <div className='flex flex-col items-center mt-6 laptop:mt-0'>
                <div className='text-2xl'>Defense</div>
                <table className='divide-y mt-2 divide-slate-300 bg-white rounded-lg shadow-lg w-72'>
                    <tbody className='divide-y divide-slate-300'>
                      <RosterPlayer player={roster.db1} />
                      <RosterPlayer player={roster.db2} />
                      <RosterPlayer player={roster.lb} />
                      <RosterPlayer player={roster.de} />
                      <RosterPlayer player={roster.dl} />
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
          <Link to={`/players/${player.id}`} className="whitespace-nowrap text-base laptop:text-xl font-semibold text-slate-700 hover:underline">{player.name}<span className='pl-1 text-sm font-normal align-middle'>- {player.pos}</span></Link>
          <div className="whitespace-nowrap text-sm laptop:text-lg text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
            return (         
              <span className="star">&#9733;</span>        
            );
            })}
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