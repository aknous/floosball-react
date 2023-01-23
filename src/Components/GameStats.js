import React,{useEffect,useState} from 'react'
import {Link} from "react-router-dom";


export default function GameStats(props) {

    const gameData = props.gameData

    return (
        <div className="flex flex-col w-full px-2 h-full overflow-y-auto">
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
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.qb.id}`} key={gameData.homeTeam.qb.id} className={"hover:underline"} >{gameData.homeTeam.qb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- QB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.qb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.comp}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.att}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.compPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.yards}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing['20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.tds}</td>
                        <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.ints}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.qb.id}`} key={gameData.awayTeam.qb.id} className={"hover:underline"} >{gameData.awayTeam.qb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- QB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.qb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.comp}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.att}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.compPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.yards}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing['20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.tds}</td>
                        <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.ints}</td>
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
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.rb.id}`} key={gameData.homeTeam.rb.id} className={"hover:underline"} >{gameData.homeTeam.rb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.carries}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.yards}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.ypc}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing['20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.tds}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.fumblesLost}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.rb.id}`} key={gameData.awayTeam.rb.id} className={"hover:underline"} >{gameData.awayTeam.rb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.carries}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.yards}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.ypc}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing['20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.tds}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.fumblesLost}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium'>Receiving</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Rec</th>
                        <th>Targ</th>
                        <th>%</th>
                        <th>Yds</th>
                        <th>YAC</th>
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
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.wr1.id}`} key={gameData.homeTeam.wr1.id} className={"hover:underline"} >{gameData.homeTeam.wr1.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.wr1.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.tds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.wr2.id}`} key={gameData.homeTeam.wr2.id} className={"hover:underline"} >{gameData.homeTeam.wr2.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.wr2.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.tds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.te.id}`} key={gameData.homeTeam.te.id} className={"hover:underline"} >{gameData.homeTeam.te.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- TE</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.te.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.tds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.rb.id}`} key={gameData.homeTeam.rb.id} className={"hover:underline"} >{gameData.homeTeam.rb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.tds}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.wr1.id}`} key={gameData.awayTeam.wr1.id} className={"hover:underline"} >{gameData.awayTeam.wr1.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.wr1.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.tds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.wr2.id}`} key={gameData.awayTeam.wr2.id} className={"hover:underline"} >{gameData.awayTeam.wr2.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- WR</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.wr2.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.tds}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.te.id}`} key={gameData.awayTeam.te.id} className={"hover:underline"} >{gameData.awayTeam.te.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- TE</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.te.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.tds}</td>
                    </tr>
                    
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.rb.id}`} key={gameData.awayTeam.rb.id} className={"hover:underline"} >{gameData.awayTeam.rb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- RB</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.rb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.receptions}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.targets}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.rcvPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.yards}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.yac}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.ypr}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving['20+']}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.longest}</td>
                        <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.tds}</td>
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
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.k.id}`} key={gameData.homeTeam.k.id} className={"hover:underline"} >{gameData.homeTeam.k.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- K</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.k.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.fgAtt}</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.fgs}</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.fgPerc}%</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking['fg45+']}</td>
                        <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.longest}</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.k.id}`} key={gameData.awayTeam.k.id} className={"hover:underline"} >{gameData.awayTeam.k.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- K</span>
                            <span className='pl-4 whitespace-nowrap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.k.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.fgAtt}</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.fgs}</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.fgPerc}%</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking['fg45+']}</td>
                        <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.longest}</td>
                    </tr>
                </tbody>
            </table>
            <div className='text-center text-xl font-medium border-b-2'>Defense</div>
            <table className="min-w-full divide-y divide-slate-300 mb-2">
                <thead className="bg-slate-700 text-white text-base font-normal">
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Tackles</th>
                        <th>Sacks</th>
                        <th>FUM Rec</th>
                        <th>INT</th>
                        <th>Disrupts</th>
                        <th>Targets</th>
                        <th>Dis%</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.homeTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.db1.id}`} key={gameData.homeTeam.db1.id} className={"hover:underline"} >{gameData.homeTeam.db1.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DB</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.db1.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.db1.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.db2.id}`} key={gameData.homeTeam.db2.id} className={"hover:underline"} >{gameData.homeTeam.db2.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DB</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.db2.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.db2.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.lb.id}`} key={gameData.homeTeam.lb.id} className={"hover:underline"} >{gameData.homeTeam.lb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- LB</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.lb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.lb.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.de.id}`} key={gameData.homeTeam.de.id} className={"hover:underline"} >{gameData.homeTeam.de.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DE</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.de.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.de.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.homeTeam.dl.id}`} key={gameData.homeTeam.dl.id} className={"hover:underline"} >{gameData.homeTeam.dl.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DL</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.homeTeam.dl.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.homeTeam.dl.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr className='border-b-2 border-slate-200'>
                        <td></td>
                        <td className='text-sm'>{gameData.awayTeam.teamName}</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.db1.id}`} key={gameData.awayTeam.db1.id} className={"hover:underline"} >{gameData.awayTeam.db1.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DB</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.db1.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.db1.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.db2.id}`} key={gameData.awayTeam.db2.id} className={"hover:underline"} >{gameData.awayTeam.db2.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DB</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.db2.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.db2.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.lb.id}`} key={gameData.awayTeam.lb.id} className={"hover:underline"} >{gameData.awayTeam.lb.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- LB</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.lb.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.lb.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.de.id}`} key={gameData.awayTeam.de.id} className={"hover:underline"} >{gameData.awayTeam.de.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DE</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.de.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.de.gameStats.defense.passDisPerc}%</td>
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'><Link to={`/players/${gameData.awayTeam.dl.id}`} key={gameData.awayTeam.dl.id} className={"hover:underline"} >{gameData.awayTeam.dl.name}</Link> <span className='font-light text-xs pl-1 pb-4'>- DL</span>
                            <span className='pl-4 whitespace-nodbap p-4 text-base text-yellow-500'>{[...Array(gameData.awayTeam.dl.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</span>
                        </td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.tackles}</td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.sacks}</td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.fumRec}</td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.ints}</td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.passDisruptions}</td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.passTargets}</td>
                        <td className='text-center'>{gameData.awayTeam.dl.gameStats.defense.passDisPerc}%</td>
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
                        <td className='text-center'>{gameData.homeTeam.offense.passYards}</td>
                        <td className='text-center'>{gameData.homeTeam.offense.rushYards}</td>
                        <td className='text-center'>{gameData.homeTeam.offense.totalYards}</td>
                        <td className='text-center'>{gameData.homeTeam.totalPlays}</td>
                        <td className='text-center'>{gameData.homeTeam['1stDowns']}</td>
                        <td className='text-center'>{gameData.homeTeam.turnovers}</td>
                        
                    </tr>
                    <tr>
                        <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
                        <td className='font-semibold pl-1'>{gameData.awayTeam.teamName} <span className='font-light text-xs pl-1 pb-4'></span></td>
                        <td className='text-center'>{gameData.awayTeam.offense.passYards}</td>
                        <td className='text-center'>{gameData.awayTeam.offense.rushYards}</td>
                        <td className='text-center'>{gameData.awayTeam.offense.totalYards}</td>
                        <td className='text-center'>{gameData.awayTeam.totalPlays}</td>
                        <td className='text-center'>{gameData.awayTeam['1stDowns']}</td>
                        <td className='text-center'>{gameData.awayTeam.turnovers}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )


}