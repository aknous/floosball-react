import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";
import axios from 'axios'
import { InformationCircleIcon } from '@heroicons/react/outline'

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }


function TopPlayers(props) {
    const pos = props.pos

    const [players, setPlayers] = useState([])

    const getPlayers = async () => {
        try {
          const userPlayers = await axios.get(`http://floosball.com:8000/topPlayers?pos=${pos}`)
    
          setPlayers(userPlayers.data);  // set State
        
        } catch (err) {
          console.error(err.message);
        }
      };

    useEffect(() => {
        getPlayers();
        const interval=setInterval(()=>{
            getPlayers();
        },60000)
           
        return()=>clearInterval(interval)
           
    }, []);

    return (
        <div className='flex mx-2 bg-white rounded-lg shadow-md w-full'>
            <table className='divide-y-2 divide-slate-200 mx-2 w-full'>
                {players.map((player) => (
                    <tr className=''>
                        <td className='flex flex-col items-center py-2 pr-2 laptop:pr-1'>
                            <div className='mt-2 w-6 laptop:w-8 h-6 laptop:h-8 rounded-full' style={{ backgroundColor: `${player.color}` }}></div>
                            <div className='text-xs laptop:text-sm font-medium'>{player.abbr}</div>
                        </td>
                        <td className='w-3/5'>
                            <Link to={`/players/${player.id}`} className='text-base laptop:text-xl truncate font-medium hover:underline'>{player.name}</Link>
                            <div className="whitespace-nowrap text-sm laptop:text-base text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}
                            </div>
                        </td>
                        <td className='text-sm laptop:text-xl'>{player.yards} yds</td>
                        <td className='text-sm laptop:text-xl'>{player.tds} tds</td>
                    </tr>
                ))}
            </table>
        </div>
    )
    
}

export default function Dashboard() {

    const [highlights, setHighlights] = useState([])

    const getHighlights = async () => {
        try {
          const userHighlights = await axios.get('http://floosball.com:8000/highlights')
    
          setHighlights(userHighlights.data);  // set State
        
        } catch (err) {
          console.error(err.message);
        }
      };

    useEffect(() => {
        getHighlights();
        const interval=setInterval(()=>{
            getHighlights();
        },10000)
           
        return()=>clearInterval(interval)
    }, []);

    return (
        <div className='h-full'>
            <div className="py-2 flex shrink-0 justify-center mt-6 mx-10 divide-x-2 divide-slate-500">
                <div className='text-xl laptop:text-3xl font-semibold'>welcome to floosball.</div>
            </div>
            <div className='laptop:flex flex-row-reverse mt-4 laptop:mt-10'>
                <div className='flex flex-col items-center laptop:w-2/5 mx-2 laptop:mx-4'>
                    <div className='text-lg laptop:text-xl font-semibold'>The Feed</div>
                    <div className='flex mx-2 bg-white rounded-lg shadow-md w-full h-96 laptop:h-142 overflow-x-auto laptop:overscroll-x-none'>
                        <ul className='divide-y-2 divide-slate-200 p-2 w-full'>
                            {highlights.map((data) => (
                                data.type === 'play' ?
                                <li className='p-2'>
                                    <div className='flex space-x-3 items-center'>
                                        <div className='py-2 w-6 laptop:w-8 h-6 laptop:h-8 rounded-full' style={{ backgroundColor: `${data.color}` }}></div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm laptop:text-base font-medium">{data.team}</h3>
                                                <div className={`bg-slate-100 rounded-full ${data.result === 'Field Goal is No Good' ? 'bg-slate-600': ''} ${data.result === 'Turnover On Downs' ? 'bg-slate-600': ''} ${data.result === '1st Down' ? 'bg-green-100': ''} ${data.result === 'Punt' ? 'bg-slate-600': ''} ${data.result === 'Fumble' ? 'bg-red-500': ''} ${data.result === 'Interception' ? 'bg-red-500': ''} ${data.isTd ? 'bg-emerald-500': ''} ${data.isFg ? 'bg-indigo-500': ''} ${data.isSafety ? 'bg-rose-500': ''}`}>
                                                    <div className={`p-1 text-xs mx-1 font-medium ${data.result === 'Field Goal is No Good' ? 'text-slate-100': ''} ${data.result === 'Turnover On Downs' ? 'text-slate-100': ''} ${data.result === '1st Down' ? 'text-green-700': ''} ${data.result === 'Punt' ? 'text-slate-100': ''} ${data.result === 'Fumble' ? 'text-white': ''} ${data.result === 'Interception' ? 'text-white': ''} ${data.isTd ? 'text-white': ''} ${data.isFg ? 'text-white': ''} ${data.isSafety ? 'text-white': ''}`}>{data.result}</div>
                                                </div>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <p className='w-48 laptop:w-auto text-xs laptop:text-sm truncate'>{data.playText}</p>
                                                <span className={`text-xs text-slate-700 ${data.scoreChange ? 'visible' : 'invisible'}`}>{data.homeAbbr} {data.homeScore} | {data.awayAbbr} {data.awayScore}</span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                :
                                <li className='flex p-2 h-16 items-center'>
                                    <div className='flex space-x-3 justify-center'>
                                        <div className='flex space-x-1 items-center'>
                                            <div className='h-6 w-6'><InformationCircleIcon /></div>
                                            <div className="text-sm laptop:text-lg font-medium items-center">{data.text}</div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className='laptop:grid grid-cols-2 laptop:w-3/5 gap-x-6 mx-2 laptop:mx-4'>
                    <div className='flex flex-col items-center mt-4 laptop:mt-0'>
                        <div className='text-xl font-semibold'>Top QB's</div>
                        <TopPlayers pos='QB'/>
                    </div>
                    <div className='flex flex-col items-center mt-4 laptop:mt-0'>
                        <div className='text-xl font-semibold'>Top RB's</div>
                        <TopPlayers pos='RB'/>
                    </div>
                    <div className='flex flex-col items-center mt-4 laptop:mt-0'>
                        <div className='text-xl font-semibold'>Top WR's</div>
                        <TopPlayers pos='WR'/>
                    </div>
                    <div className='flex flex-col items-center mt-4 laptop:mt-0'>
                        <div className='text-xl font-semibold'>Top TE's</div>
                        <TopPlayers pos='TE'/>
                    </div>
                </div>
            </div>
        </div>
    )
  }