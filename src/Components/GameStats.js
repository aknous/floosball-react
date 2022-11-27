import React,{useEffect,useState} from 'react'


export default function GameStats(props) {

    const gameData = props.gameData

    return (
        <div className="flex flex-col px-2 h-full overflow-y-auto">
            <div className='mt-2 text-xl font-medium text-center'>Passing</div>
            <table className="table-fixed min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-light">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Comp</th>
                        <th>Att</th>
                        <th>%</th>
                        <th>Yds</th>
                        <th>20+</th>
                        <th>Long</th>
                        <th>TDs</th>
                        <th>INT</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.homeTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.qb.name} <span className='font-light text-xs pl-1 pb-4'>- QB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.qb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passComp}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passAtt}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passCompPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passYards}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.tds}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.ints}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.qb.name} <span className='font-light text-xs pl-1 pb-4'>- QB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.qb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passComp}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passAtt}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passCompPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passYards}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.tds}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.ints}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium'>Rushing</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Carr</th>
                        <th>Yds</th>
                        <th>YPC</th>
                        <th>20+</th>
                        <th>Long</th>
                        <th>TDs</th>
                        <th>FUM</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.homeTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.rb.name} <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.carries}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.runYards}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.ypc}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats['run20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.runTds}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.fumblesLost}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.ints}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.rb.name} <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.carries}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.runYards}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.ypc}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats['run20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.runTds}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.fumblesLost}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.ints}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium'>Receiving</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Targ</th>
                        <th>Rec</th>
                        <th>%</th>
                        <th>Yds</th>
                        <th>YPR</th>
                        <th>20+</th>
                        <th>Long</th>
                        <th>TDs</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.homeTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.wr1.name} <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.wr1.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.rcvTds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.wr2.name} <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.wr2.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.rcvTds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.te.name} <span className='font-light text-xs pl-1 pb-4'>- TE</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.te.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.rcvTds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.rb.name} <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rcvTds}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.wr1.name} <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.wr1.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.rcvTds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.wr2.name} <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.wr2.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.rcvTds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.te.name} <span className='font-light text-xs pl-1 pb-4'>- TE</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.te.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.rcvTds}</td>
                    </tr>
                    
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.rb.name} <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rcvYards}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats['pass20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rcvTds}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium border-b-2'>Special Teams</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Att</th>
                        <th>Fgs</th>
                        <th>%</th>
                        <th>45+</th>
                        <th>Long</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.homeTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.k.name} <span className='font-light text-xs pl-1 pb-4'>- K</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.k.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.fgAtt}</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.fgs}</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.fgPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats['fg45+']}</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.longest}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.k.name} <span className='font-light text-xs pl-1 pb-4'>- K</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.k.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.fgAtt}</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.fgs}</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.fgPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats['fg45+']}</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.longest}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium border-b-2'>Defense</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Sacks</th>
                        <th>Safeties</th>
                        <th>INT</th>
                        <th>FUM Rec</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.teamName} <span className='font-light text-xs pl-1 pb-4'></span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.defenseRating)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                              </td>
                        <td className='text-center'>{gameData.homeTeam.sacks}</td>
                        <td className='text-center'>{gameData.homeTeam.safeties}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.ints}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.fumblesLost}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.teamName} <span className='font-light text-xs pl-1 pb-4'></span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.defenseRating)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                              </td>
                        <td className='text-center'>{gameData.awayTeam.sacks}</td>
                        <td className='text-center'>{gameData.awayTeam.safeties}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.ints}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.fumblesLost}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium border-b-2'>Team Stats</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Pass Yds</th>
                        <th>Rush Yds</th>
                        <th>Total Yds</th>
                        <th>Plays</th>
                        <th>1st Downs</th>
                        <th>Turnovers</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.homeTeam.teamName} <span className='font-light text-xs pl-1 pb-4'></span></td>
                        <td className='text-center'>{gameData.homeTeam.passYards}</td>
                        <td className='text-center'>{gameData.homeTeam.rushYards}</td>
                        <td className='text-center'>{gameData.homeTeam.totalYards}</td>
                        <td className='text-center'>{gameData.homeTeam.totalPlays}</td>
                        <td className='text-center'>{gameData.homeTeam['1stDowns']}</td>
                        <td className='text-center'>{gameData.homeTeam.turnovers}</td>
                        
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.teamName} <span className='font-light text-xs pl-1 pb-4'></span></td>
                        <td className='text-center'>{gameData.awayTeam.passYards}</td>
                        <td className='text-center'>{gameData.awayTeam.rushYards}</td>
                        <td className='text-center'>{gameData.awayTeam.totalYards}</td>
                        <td className='text-center'>{gameData.awayTeam.totalPlays}</td>
                        <td className='text-center'>{gameData.awayTeam['1stDowns']}</td>
                        <td className='text-center'>{gameData.awayTeam.turnovers}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )


}