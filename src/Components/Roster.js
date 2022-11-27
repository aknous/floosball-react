import React,{useEffect,useState} from 'react'


export default function Roster(props) {

    const roster = props.roster
    const reserves = props.reserves
    const defenseRatingStars = props.defenseRatingStars

    return (
        <div className='flex justify-center gap-x-4'>
            <div className='flex flex-col items-center'>
                <div className='text-2xl'>Starters</div>
                <table className='divide-y mt-4 divide-slate-300 bg-white rounded-lg shadow-lg'>
                    <tbody className='divide-y divide-slate-300'>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{roster.qb.name}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">QB</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(roster.qb.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{roster.rb.name}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">RB</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(roster.rb.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{roster.wr1.name}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">WR</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(roster.wr1.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{roster.wr2.name}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">WR</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(roster.wr2.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{roster.te.name}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">TE</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(roster.te.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{roster.k.name}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">K</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(roster.k.ratingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
                        <tr className="text-left">
                          <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">Defense</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">D</td>
                          <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(defenseRatingStars)].map((star) => {        
                              return (         
                                <span className="star">&#9733;</span>        
                              );
                            })}</td>
                        </tr>
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
                                    <td className="whitespace-nowrap p-4 text-xl font-semibold text-slate-700">{player.name}</td>
                                    <td className="whitespace-nowrap p-4 text-xl text-slate-500">{player.pos}</td>
                                    <td className="whitespace-nowrap p-4 text-xl text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                                        return (         
                                          <span className="star">&#9733;</span>        
                                        );
                                      })}</td>
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