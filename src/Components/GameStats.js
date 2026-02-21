import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom";


export default function GameStats(props) {

  const gameData = props.gameData

  return (
    <div className="flex flex-col w-full px-2 h-full overflow-y-auto">
      <div className='mt-2 text-xl font-medium text-center'>Passing</div>
      <table className="table-fixed min-w-full divide-y divide-slate-300 mb-2">
        <thead className="bg-slate-900 text-white text-base font-light">
          <tr>
            <th></th>
            <th></th>
            <th>Comp</th>
            <th>Att</th>
            <th>Missed</th>
            <th>Comp%</th>
            <th>Yds</th>
            <th>TDs</th>
            <th>INT</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.homeTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.qb.id}`} key={gameData.homeTeam.qb.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.qb.number} </span>{gameData.homeTeam.qb.name}</Link>
              <div className={`flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.qb.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.qb.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.qb.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.qb.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.qb.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.qb.playerTier === 5 && 'S'}
                  {gameData.homeTeam.qb.playerTier === 4 && 'A'}
                  {gameData.homeTeam.qb.playerTier === 3 && 'B'}
                  {gameData.homeTeam.qb.playerTier === 2 && 'C'}
                  {gameData.homeTeam.qb.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.comp}</td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.att}</td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.missedPass}</td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.compPerc}%</td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.yards}</td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.tds}</td>
            <td className='text-center'>{gameData.homeTeam.qb.gameStats.passing.ints}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.qb.gameStats.fantasyPoints}</td>
          </tr>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.awayTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.qb.id}`} key={gameData.awayTeam.qb.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.qb.number} </span>{gameData.awayTeam.qb.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.qb.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.qb.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.qb.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.qb.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.qb.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.qb.playerTier === 5 && 'S'}
                  {gameData.awayTeam.qb.playerTier === 4 && 'A'}
                  {gameData.awayTeam.qb.playerTier === 3 && 'B'}
                  {gameData.awayTeam.qb.playerTier === 2 && 'C'}
                  {gameData.awayTeam.qb.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.comp}</td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.att}</td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.missedPass}</td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.compPerc}%</td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.yards}</td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.tds}</td>
            <td className='text-center'>{gameData.awayTeam.qb.gameStats.passing.ints}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.qb.gameStats.fantasyPoints}</td>
          </tr>
        </tbody>
      </table>
      <div className='text-center text-xl font-medium'>Rushing</div>
      <table className="min-w-full divide-y divide-slate-300 mb-2">
        <thead className="bg-slate-900 text-white text-base font-normal">
          <tr>
            <th></th>
            <th></th>
            <th>Carr</th>
            <th>Yds</th>
            <th>YPC</th>
            <th>TDs</th>
            <th>FUM</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.homeTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.rb.id}`} key={gameData.homeTeam.rb.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.rb.number} </span>{gameData.homeTeam.rb.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.rb.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.rb.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.rb.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.rb.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.rb.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.rb.playerTier === 5 && 'S'}
                  {gameData.homeTeam.rb.playerTier === 4 && 'A'}
                  {gameData.homeTeam.rb.playerTier === 3 && 'B'}
                  {gameData.homeTeam.rb.playerTier === 2 && 'C'}
                  {gameData.homeTeam.rb.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.carries}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.yards}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.ypc}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.tds}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.rushing.fumblesLost}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.rb.gameStats.fantasyPoints}</td>
          </tr>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.awayTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.rb.id}`} key={gameData.awayTeam.rb.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.rb.number} </span>{gameData.awayTeam.rb.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.rb.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.rb.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.rb.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.rb.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.rb.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.rb.playerTier === 5 && 'S'}
                  {gameData.awayTeam.rb.playerTier === 4 && 'A'}
                  {gameData.awayTeam.rb.playerTier === 3 && 'B'}
                  {gameData.awayTeam.rb.playerTier === 2 && 'C'}
                  {gameData.awayTeam.rb.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.carries}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.yards}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.ypc}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.tds}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.rushing.fumblesLost}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.rb.gameStats.fantasyPoints}</td>
          </tr>
        </tbody>
      </table>
      <div className='text-center text-xl font-medium'>Receiving</div>
      <table className="min-w-full divide-y divide-slate-300 mb-2">
        <thead className="bg-slate-900 text-white text-base font-normal">
          <tr>
            <th></th>
            <th></th>
            <th>Rec</th>
            <th>Drops</th>
            <th>Yds</th>
            <th>YAC</th>
            <th>YPR</th>
            <th>TDs</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.homeTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.wr1.id}`} key={gameData.homeTeam.wr1.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.wr1.number} </span>{gameData.homeTeam.wr1.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.wr1.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.wr1.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.wr1.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.wr1.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.wr1.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.wr1.playerTier === 5 && 'S'}
                  {gameData.homeTeam.wr1.playerTier === 4 && 'A'}
                  {gameData.homeTeam.wr1.playerTier === 3 && 'B'}
                  {gameData.homeTeam.wr1.playerTier === 2 && 'C'}
                  {gameData.homeTeam.wr1.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.homeTeam.wr1.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.wr1.gameStats.fantasyPoints}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.wr2.id}`} key={gameData.homeTeam.wr2.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.wr2.number} </span>{gameData.homeTeam.wr2.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.wr2.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.wr2.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.wr2.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.wr2.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.wr2.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.wr2.playerTier === 5 && 'S'}
                  {gameData.homeTeam.wr2.playerTier === 4 && 'A'}
                  {gameData.homeTeam.wr2.playerTier === 3 && 'B'}
                  {gameData.homeTeam.wr2.playerTier === 2 && 'C'}
                  {gameData.homeTeam.wr2.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.homeTeam.wr2.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.wr2.gameStats.fantasyPoints}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.te.id}`} key={gameData.homeTeam.te.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.te.number} </span>{gameData.homeTeam.te.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.te.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.te.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.te.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.te.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.te.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.te.playerTier === 5 && 'S'}
                  {gameData.homeTeam.te.playerTier === 4 && 'A'}
                  {gameData.homeTeam.te.playerTier === 3 && 'B'}
                  {gameData.homeTeam.te.playerTier === 2 && 'C'}
                  {gameData.homeTeam.te.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.homeTeam.te.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.te.gameStats.fantasyPoints}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.rb.id}`} key={gameData.homeTeam.rb.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.rb.number} </span>{gameData.homeTeam.rb.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.rb.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.rb.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.rb.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.rb.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.rb.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.rb.playerTier === 5 && 'S'}
                  {gameData.homeTeam.rb.playerTier === 4 && 'A'}
                  {gameData.homeTeam.rb.playerTier === 3 && 'B'}
                  {gameData.homeTeam.rb.playerTier === 2 && 'C'}
                  {gameData.homeTeam.rb.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.homeTeam.rb.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.rb.gameStats.fantasyPoints}</td>
          </tr>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.awayTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.wr1.id}`} key={gameData.awayTeam.wr1.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.wr1.number} </span>{gameData.awayTeam.wr1.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.wr1.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.wr1.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.wr1.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.wr1.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.wr1.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.wr1.playerTier === 5 && 'S'}
                  {gameData.awayTeam.wr1.playerTier === 4 && 'A'}
                  {gameData.awayTeam.wr1.playerTier === 3 && 'B'}
                  {gameData.awayTeam.wr1.playerTier === 2 && 'C'}
                  {gameData.awayTeam.wr1.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.awayTeam.wr1.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.wr1.gameStats.fantasyPoints}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.wr2.id}`} key={gameData.awayTeam.wr2.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.wr2.number} </span>{gameData.awayTeam.wr2.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.wr2.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.wr2.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.wr2.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.wr2.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.wr2.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.wr2.playerTier === 5 && 'S'}
                  {gameData.awayTeam.wr2.playerTier === 4 && 'A'}
                  {gameData.awayTeam.wr2.playerTier === 3 && 'B'}
                  {gameData.awayTeam.wr2.playerTier === 2 && 'C'}
                  {gameData.awayTeam.wr2.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.awayTeam.wr2.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.wr2.gameStats.fantasyPoints}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.te.id}`} key={gameData.awayTeam.te.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.te.number} </span>{gameData.awayTeam.te.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.te.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.te.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.te.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.te.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.te.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.te.playerTier === 5 && 'S'}
                  {gameData.awayTeam.te.playerTier === 4 && 'A'}
                  {gameData.awayTeam.te.playerTier === 3 && 'B'}
                  {gameData.awayTeam.te.playerTier === 2 && 'C'}
                  {gameData.awayTeam.te.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.awayTeam.te.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.te.gameStats.fantasyPoints}</td>
          </tr>

          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.rb.id}`} key={gameData.awayTeam.rb.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.rb.number} </span>{gameData.awayTeam.rb.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.rb.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.rb.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.rb.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.rb.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.rb.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.rb.playerTier === 5 && 'S'}
                  {gameData.awayTeam.rb.playerTier === 4 && 'A'}
                  {gameData.awayTeam.rb.playerTier === 3 && 'B'}
                  {gameData.awayTeam.rb.playerTier === 2 && 'C'}
                  {gameData.awayTeam.rb.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.receptions}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.drops}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.yards}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.yac}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.ypr}</td>
            <td className='text-center'>{gameData.awayTeam.rb.gameStats.receiving.tds}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.rb.gameStats.fantasyPoints}</td>
          </tr>
        </tbody>
      </table>
      <div className='text-center text-xl font-medium border-b-2'>Special Teams</div>
      <table className="min-w-full divide-y divide-slate-300 mb-2">
        <thead className="bg-slate-900 text-white text-base font-normal">
          <tr>
            <th></th>
            <th></th>
            <th>Fgs</th>
            <th>Att</th>
            <th>%</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.homeTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.homeTeam.k.id}`} key={gameData.homeTeam.k.id} className={"hover:underline"} ><span className='font-normal'>{gameData.homeTeam.k.number} </span>{gameData.homeTeam.k.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.k.playerTier === 5 && 'bg-yellow-500'} ${gameData.homeTeam.k.playerTier === 4 && 'bg-purple-500'} ${gameData.homeTeam.k.playerTier === 3 && 'bg-blue-500'} ${gameData.homeTeam.k.playerTier === 2 && 'bg-emerald-500'} ${gameData.homeTeam.k.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.k.playerTier === 5 && 'S'}
                  {gameData.homeTeam.k.playerTier === 4 && 'A'}
                  {gameData.homeTeam.k.playerTier === 3 && 'B'}
                  {gameData.homeTeam.k.playerTier === 2 && 'C'}
                  {gameData.homeTeam.k.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.fgs}</td>
            <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.fgAtt}</td>
            <td className='text-center'>{gameData.homeTeam.k.gameStats.kicking.fgPerc}%</td>
            <td className='text-center font-bold'>{gameData.homeTeam.k.gameStats.fantasyPoints}</td>
          </tr>
          <tr className='border-b-2 border-slate-200'>
            <td></td>
            <td className='text-sm'>{gameData.awayTeam.teamName}</td>
          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/players/${gameData.awayTeam.k.id}`} key={gameData.awayTeam.k.id} className={"hover:underline"} ><span className='font-normal'>{gameData.awayTeam.k.number} </span>{gameData.awayTeam.k.name}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.k.playerTier === 5 && 'bg-yellow-500'} ${gameData.awayTeam.k.playerTier === 4 && 'bg-purple-500'} ${gameData.awayTeam.k.playerTier === 3 && 'bg-blue-500'} ${gameData.awayTeam.k.playerTier === 2 && 'bg-emerald-500'} ${gameData.awayTeam.k.playerTier === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.k.playerTier === 5 && 'S'}
                  {gameData.awayTeam.k.playerTier === 4 && 'A'}
                  {gameData.awayTeam.k.playerTier === 3 && 'B'}
                  {gameData.awayTeam.k.playerTier === 2 && 'C'}
                  {gameData.awayTeam.k.playerTier === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.fgs}</td>
            <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.fgAtt}</td>
            <td className='text-center'>{gameData.awayTeam.k.gameStats.kicking.fgPerc}%</td>
            <td className='text-center font-bold'>{gameData.awayTeam.k.gameStats.fantasyPoints}</td>
          </tr>
        </tbody>
      </table>
      <div className='text-center text-xl font-medium border-b-2'>Defense</div>
      <table className="min-w-full divide-y divide-slate-300 mb-2">
        <thead className="bg-slate-900 text-white text-base font-normal">
          <tr>
            <th></th>
            <th></th>
            <th>Sacks</th>
            <th>Ints</th>
            <th>FR</th>
            <th>Sftys</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ backgroundColor: `${gameData.homeTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/team/${gameData.homeTeam.id}`} key={gameData.homeTeam.id} className={"hover:underline"} >{gameData.homeTeam.teamName}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.homeTeam.defenseRating === 5 && 'bg-yellow-500'} ${gameData.homeTeam.defenseRating === 4 && 'bg-purple-500'} ${gameData.homeTeam.defenseRating === 3 && 'bg-blue-500'} ${gameData.homeTeam.defenseRating === 2 && 'bg-emerald-500'} ${gameData.homeTeam.defenseRating === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.homeTeam.defenseRating === 5 && 'S'}
                  {gameData.homeTeam.defenseRating === 4 && 'A'}
                  {gameData.homeTeam.defenseRating === 3 && 'B'}
                  {gameData.homeTeam.defenseRating === 2 && 'C'}
                  {gameData.homeTeam.defenseRating === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.homeTeam.defense.sacks}</td>
            <td className='text-center'>{gameData.homeTeam.defense.ints}</td>
            <td className='text-center'>{gameData.homeTeam.defense.fumRec}</td>
            <td className='text-center'>{gameData.homeTeam.defense.safeties}</td>
            <td className='text-center font-bold'>{gameData.homeTeam.defense.fantasyPoints}</td>

          </tr>
          <tr>
            <td style={{ backgroundColor: `${gameData.awayTeam.teamcolor}` }} className='w-2'></td>
            <td className='font-semibold pl-1 flex items-center'>
              <Link to={`/team/${gameData.awayTeam.id}`} key={gameData.awayTeam.id} className={"hover:underline"} >{gameData.awayTeam.teamName}</Link>
              <div className={`bg-slate-100 flex items-center justify-center ml-2 w-5 h-5 rounded-full ${gameData.awayTeam.defenseRating === 5 && 'bg-yellow-500'} ${gameData.awayTeam.defenseRating === 4 && 'bg-purple-500'} ${gameData.awayTeam.defenseRating === 3 && 'bg-blue-500'} ${gameData.awayTeam.defenseRating === 2 && 'bg-emerald-500'} ${gameData.awayTeam.defenseRating === 1 && 'bg-gray-500'}`}>
                <div className={`text-xs text-center text-white font-bold uppercase`}>
                  {gameData.awayTeam.defenseRating === 5 && 'S'}
                  {gameData.awayTeam.defenseRating === 4 && 'A'}
                  {gameData.awayTeam.defenseRating === 3 && 'B'}
                  {gameData.awayTeam.defenseRating === 2 && 'C'}
                  {gameData.awayTeam.defenseRating === 1 && 'D'}
                </div>
              </div>
            </td>
            <td className='text-center'>{gameData.awayTeam.defense.sacks}</td>
            <td className='text-center'>{gameData.awayTeam.defense.ints}</td>
            <td className='text-center'>{gameData.awayTeam.defense.fumRec}</td>
            <td className='text-center'>{gameData.awayTeam.defense.safeties}</td>
            <td className='text-center font-bold'>{gameData.awayTeam.defense.fantasyPoints}</td>
          </tr>
        </tbody>
      </table>
      <div className='text-center text-xl font-medium border-b-2'>Team Stats</div>
      <table className="min-w-full divide-y divide-slate-300 mb-2">
        <thead className="bg-slate-900 text-white text-base font-normal">
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