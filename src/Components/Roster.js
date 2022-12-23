import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";


export default function Roster(props) {

    const roster = props.roster
    const reserves = props.reserves
    const defenseRatingStars = props.defenseRatingStars

    return (
        <div className='flex justify-center gap-x-4'>
            <div className='flex flex-col items-center'>
                <div className='text-2xl'>Starters</div>
                <table className='divide-y mt-4 divide-slate-300 bg-white rounded-lg shadow-lg w-96'>
                    <tbody className='divide-y divide-slate-300'>
                      {roster.qb ?
                        <tr className="text-left">
                          <td className='px-4 py-2'>
                            <Link to={`/players/${roster.qb.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{roster.qb.name}</Link>
                            <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(roster.qb.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">QB</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">{roster.qb.term} szns</td>
                        </tr>
                        :
                        <tr className="text-center">
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">QB</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                        </tr>
                      }
                      {roster.rb ?
                        <tr className="text-left">
                          <td className='px-4 py-2'>
                            <Link to={`/players/${roster.rb.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{roster.rb.name}</Link>
                            <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(roster.rb.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">RB</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">{roster.rb.term} szns</td>
                        </tr>
                        :
                        <tr className="text-center">
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">QB</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                        </tr>
                      }
                      {roster.wr1 ?
                        <tr className="text-left">
                          <td className='px-4 py-2'>
                            <Link to={`/players/${roster.wr1.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{roster.wr1.name}</Link>
                            <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(roster.wr1.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">WR</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">{roster.wr1.term} szns</td>
                        </tr>
                        :
                        <tr className="text-center">
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">WR</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                        </tr>
                      }
                      {roster.wr2 ?
                        <tr className="text-left">
                          <td className='px-4 py-2'>
                            <Link to={`/players/${roster.wr2.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{roster.wr2.name}</Link>
                            <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(roster.wr2.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">WR</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">{roster.wr2.term} szns</td>
                        </tr>
                        :
                        <tr className="text-center">
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">WR</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                        </tr>
                      }
                      {roster.te ?
                        <tr className="text-left">
                          <td className='px-4 py-2'>
                            <Link to={`/players/${roster.te.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{roster.te.name}</Link>
                            <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(roster.te.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">TE</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">{roster.te.term} szns</td>
                        </tr>
                        :
                        <tr className="text-center">
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">TE</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                        </tr>
                      }
                      {roster.k ?
                        <tr className="text-left">
                          <td className='px-4 py-2'>
                            <Link to={`/players/${roster.k.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{roster.k.name}</Link>
                            <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(roster.k.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">K</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">{roster.k.term} szns</td>
                        </tr>
                        :
                        <tr className="text-center">
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">K</td>
                          <td className="whitespace-nowrap p-4 text-2xl text-slate-500">???</td>
                        </tr>
                      }
                    </tbody>
                </table>
            </div>
            {reserves.length ? 
                <div className='flex flex-col items-center'>
                    <div className='text-2xl'>Reserves</div>
                    <table className='min-w-full divide-y mt-4 divide-slate-300 bg-white rounded-lg shadow-lg'>
                        <tbody className='divide-y divide-slate-300'>
                            {reserves.map((player) => (
                                <tr className="text-left">
                                    <td className='px-4 py-2'>
                                      <Link to={`/players/${player.id}`} className="whitespace-nowrap text-xl font-semibold text-slate-700 hover:underline">{player.name}</Link>
                                      <div className="whitespace-nowrap text-lg text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                                        return (         
                                          <span className="star">&#9733;</span>        
                                        );
                                        })}
                                      </div>
                                    </td>
                                    <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.pos}</td>
                                    <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.term} szns</td>
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