/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {
  Link,
  useParams,
} from "react-router-dom";
import axios from 'axios'
import { GiLaurelsTrophy } from 'react-icons/gi';
  
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Player() {
  const { id } = useParams();
  const [player, setPlayer] = useState([])

  const getPlayer = async () => {
    try {
      //const userPlayer = await axios.get(`http://floosball.com:8000/players?id=${id}`)
      const userPlayer = await axios.get(`http://localhost:8000/players?id=${id}`)
      setPlayer(userPlayer.data);  // set State
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getPlayer()
  }, [id])

  return (
    player.attributes ?
      <div className='flex justify-center mt-14'>
        <div className='mt-4 px-2 flex bg-white rounded-lg shadow-md flex-col items-center w-full laptop:w-1/2'>
          <div className='flex flex-col items-center mt-6 w-full'>
            <div className='flex items-center'>
              <div className='text-3xl text-center font-semibold'>{player.name}</div>
              <div className='text-lg font-light pl-1'> - {player.position}</div>
            </div>
            <div className='text-lg font-light pb-2 italic'>{player.rank}</div>
            {player.championships ? 
              <div className="flex justify-center gap-x-6 text-2xl text-amber-500">{player.championships.map((championship) => {        
                return (  
                  <div className='flex flex-col items-center'>
                    <GiLaurelsTrophy className='text-4xl mx-2' />
                    <div className='text-base font-normal text-slate-700'>Season {championship.Season}</div>
                    <div className='text-lg font-semibold text-slate-700' style={{ color: `${championship.teamColor}` }}>{championship.team}</div>
                  </div>               
                );
              })}</div> 
              : null
            }
            <div className='text-2xl text-center mt-4'>Team: <span className='font-medium' style={{ color: `${player.color}` }}>{player.city} {player.team}</span></div>
            <div className='flex flex-col items-center w-60 mt-2'>
              <div className='w-28 text-xl font-medium mt-4'>Attributes</div>
              <div className='flex justify-between w-full mt-2'>
                <div className='flex justify-between w-full'>
                <div className='w-28 font-bold text-xl'>Overall</div>
                  <div className='flex w-28 items-center'>
                    <div className="text-lg text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                      return (         
                        <span className="star">&#9733;</span>
                        );
                      })}
                    </div>
                    {5 > player.ratingStars ? 
                      <div className="text-lg text-slate-300">{[...Array(5 - player.ratingStars)].map((star) => {        
                        return (         
                          <span className="star">&#9733;</span>
                          );
                        })}
                      </div> 
                      : null }
                    <div className='text-xs italic ml-1'>[{player.ratingValue}]</div>
                  </div>
                </div>
              </div>
              <div className='flex justify-between w-full'>
                <div className='w-28 text-lg'>{player.attributes.att1Name}</div>
                <div className='flex w-28 items-center'>
                  <div className="text-lg text-yellow-500">{[...Array(player.attributes.att1stars)].map((star) => {        
                    return (         
                      <span className="star">&#9733;</span>
                      );
                    })}
                  </div>
                  {5 > player.attributes.att1stars ? 
                    <div className="text-lg text-slate-300">{[...Array(5 - player.attributes.att1stars)].map((star) => {        
                      return (         
                        <span className="star">&#9733;</span>
                        );
                      })}
                    </div> 
                    : null }
                  <div className='text-xs italic ml-1'>[{player.attributes.att1value}]</div>
                </div>
              </div>
              <div className='flex justify-between w-full'>
                <div className='w-28 text-lg'>{player.attributes.att2Name}</div>
                <div className='flex w-28 items-center'>
                  <div className="text-lg text-yellow-500">{[...Array(player.attributes.att2stars)].map((star) => {        
                    return (         
                      <span className="star">&#9733;</span>
                      );
                    })}
                  </div>
                  {5 > player.attributes.att2stars ? 
                    <div className="text-lg text-slate-300">{[...Array(5 - player.attributes.att2stars)].map((star) => {        
                      return (         
                        <span className="star">&#9733;</span>
                        );
                      })}
                    </div> 
                    : null }
                  <div className='text-xs italic ml-1'>[{player.attributes.att2value}]</div>
                </div>
              </div>
              {player.position != 'K' &&
                <div className='flex justify-between w-full'>
                  <div className='w-28 text-lg'>{player.attributes.att3Name}</div>
                  <div className='flex w-28 items-center'>
                    <div className="text-lg text-yellow-500">{[...Array(player.attributes.att3stars)].map((star) => {        
                      return (         
                        <span className="star">&#9733;</span>
                        );
                      })}
                    </div>
                    {5 > player.attributes.att3stars ? 
                      <div className="text-lg text-slate-300">{[...Array(5 - player.attributes.att3stars)].map((star) => {        
                        return (         
                          <span className="star">&#9733;</span>
                          );
                        })}
                      </div> 
                      : null }
                    <div className='text-xs italic ml-1'>[{player.attributes.att3value}]</div>
                  </div>
                </div>
              }
              {player.seasonPerformanceRatingValue > 0 &&
                <div className='flex justify-between w-full'>
                  <div className='w-28 text-lg'>Performance</div>
                  <div className='flex w-28 items-center'>
                    <div className="text-lg text-yellow-500">{[...Array(player.seasonPerformanceRatingStars)].map((star) => {        
                      return (         
                        <span className="star">&#9733;</span>
                        );
                      })}
                    </div>
                    {5 > player.seasonPerformanceRatingStars ? 
                      <div className="text-lg text-slate-300">{[...Array(5 - player.seasonPerformanceRatingStars)].map((star) => {        
                        return (         
                          <span className="star">&#9733;</span>
                          );
                        })}
                      </div> 
                      : null }
                    <div className='text-xs italic ml-1'>[{player.seasonPerformanceRatingValue}]</div>
                  </div>
                </div>
              }
            </div>
            <div className='laptop:rounded-lg shadow-xl mt-8 mb-4 w-full laptop:w-3/4 overflow-x-scroll'>
              {player.position === 'QB' &&
                <QBStats stats={player} />}
              {player.position === 'RB' &&
                <RBStats stats={player} />}
              {player.position === 'WR' &&
                <RcvStats stats={player} />}
              {player.position === 'TE' &&
                <RcvStats stats={player} />}
              {player.position === 'K' &&
                <KStats stats={player} />}
            </div>
          </div>
        </div>
      </div>
      
    : null
  )
}

function QBStats(props) {
  const seasonStats = props.stats.stats
  const careerStats = props.stats.allTimeStats

  return (
    <table className="laptop:w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
      <tr className={"divide-x divide-slate-200 bg-slate-700"}>
          <td></td>
          <td></td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.comp}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.att}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.compPerc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.tds}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.ints}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.yards}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.passing.ypc}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.fantasyPoints}</td>
        </tr>
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>Season</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>Comp</td>
          <td className='px-2 py-1 font-medium'>Att</td>
          <td className='px-2 py-1 font-medium'>Comp%</td>
          <td className='px-2 py-1 font-medium'>TDs</td>
          <td className='px-2 py-1 font-medium'>INTs</td>
          <td className='px-2 py-1 font-medium'>Yds</td>
          <td className='px-2 py-1 font-medium'>YPC</td>
          <td className='px-2 py-1 font-medium'>Pts</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {seasonStats ? 
          seasonStats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.comp}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.att}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.compPerc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.tds}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.ints}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.yards}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.ypc}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.fantasyPoints}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}

function RBStats(props) {
  const seasonStats = props.stats.stats
  const careerStats = props.stats.allTimeStats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className={"divide-x divide-slate-200 bg-slate-700"}>
          <td></td>
          <td></td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.rushing.carries}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.rushing.yards}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.rushing.ypc}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.rushing.tds}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.rushing.fumblesLost}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.fantasyPoints}</td>
        </tr>
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>Season</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>Carr</td>
          <td className='px-2 py-1 font-medium'>Yds</td>
          <td className='px-2 py-1 font-medium'>YPC</td>
          <td className='px-2 py-1 font-medium'>TDs</td>
          <td className='px-2 py-1 font-medium'>FUM</td>
          <td className='px-2 py-1 font-medium'>Pts</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {seasonStats ? 
          seasonStats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.carries}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.yards}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.ypc}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.tds}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.fumblesLost}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.fantasyPoints}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}

function RcvStats(props) {
  const seasonStats = props.stats.stats
  const careerStats = props.stats.allTimeStats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className={"divide-x divide-slate-200 bg-slate-700"}>
          <td></td>
          <td></td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.receiving.receptions}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.receiving.targets}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.receiving.rcvPerc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.receiving.ypr}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.receiving.tds}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.receiving.yards}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.fantasyPoints}</td>
        </tr>
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>Season</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>Rec</td>
          <td className='px-2 py-1 font-medium'>Targ</td>
          <td className='px-2 py-1 font-medium'>Rcv%</td>
          <td className='px-2 py-1 font-medium'>YPR</td>
          <td className='px-2 py-1 font-medium'>TDs</td>
          <td className='px-2 py-1 font-medium'>Yds</td>
          <td className='px-2 py-1 font-medium'>Pts</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {seasonStats ? 
          seasonStats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.receptions}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.targets}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.rcvPerc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.ypr}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.tds}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.yards}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.fantasyPoints}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}

function KStats(props) {
  const seasonStats = props.stats.stats
  const careerStats = props.stats.allTimeStats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className={"divide-x divide-slate-200 bg-slate-700"}>
          <td></td>
          <td></td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fgs}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fgAtt}</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fgPerc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fgUnder20perc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fg20to40perc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fg40to50perc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.kicking.fgOver50perc}%</td>
          <td className="whitespace-nowrap p-2 text-xl text-slate-100">{careerStats.fantasyPoints}</td>
        </tr>
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>Season</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>FGs</td>
          <td className='px-2 py-1 font-medium'>Att</td>
          <td className='px-2 py-1 font-medium'>FG%</td>
          <td className='px-2 py-1 font-medium'>- 20 %</td>
          <td className='px-2 py-1 font-medium'>20-40 %</td>
          <td className='px-2 py-1 font-medium'>40-50 %</td>
          <td className='px-2 py-1 font-medium'>50+ %</td>
          <td className='px-2 py-1 font-medium'>Pts</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {seasonStats ? 
          seasonStats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgs}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgAtt}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgPerc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgUnder20perc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fg20to40perc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fg40to50perc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgOver50perc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.fantasyPoints}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}
