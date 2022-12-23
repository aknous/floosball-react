/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import {
  Link,
  useParams,
} from "react-router-dom";
import axios from 'axios'
  
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Player() {
  const { id } = useParams();
  const [player, setPlayer] = useState([])

  const getPlayer = async () => {
    try {
      const userPlayer = await axios.get(`http://floosball.com:8000/players?id=${id}`)
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
      <div className='flex justify-center'>
        <div className='mt-4 flex bg-white rounded-lg shadow-md flex-col items-center w-1/2'>
          <div className='flex flex-col items-center mt-6'>
            <div className='flex items-center'>
              <div className='text-3xl text-center font-semibold'>{player.name}</div>
              <div className='text-lg font-light pl-1'> - {player.position}</div>
            </div>
            <div className='text-lg font-light pb-2 italic'>{player.rank}</div>
            <div className='text-2xl text-center'>Team: <span className='font-medium' style={{ color: `${player.color}` }}>{player.city} {player.team}</span></div>
            <div className='flex flex-col items-center w-60 mt-6'>
              <div className='w-28 text-xl font-medium'>Attributes</div>
              <div className='flex justify-between w-full mt-2'>
                <div className='w-28 text-xl font-medium'>Overall</div>
                <div className="w-28 text-2xl text-yellow-500">{[...Array(player.ratingStars)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
              </div>
              <div className='flex justify-between w-full mt-1'>
                <div className='w-28'>{player.attributes.att1Name}</div>
                <div className="w-28 text-lg text-yellow-500">{[...Array(player.attributes.att1)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
              </div>
              <div className='flex justify-between w-full'>
                <div className='w-28'>{player.attributes.att2Name}</div>
                <div className="w-28 text-lg text-yellow-500">{[...Array(player.attributes.att2)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
              </div>
              <div className='flex justify-between w-full'>
                <div className='w-28'>{player.attributes.att3Name}</div>
                <div className="w-28 text-lg text-yellow-500">{[...Array(player.attributes.att3)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
              </div>
              <div className='flex justify-between w-full'>
                <div className='w-28'>Playmaking</div>
                <div className="w-28 text-lg text-yellow-500">{[...Array(player.attributes.playmaking)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
              </div>
              <div className='flex justify-between w-full'>
                <div className='w-28'>X-Factor</div>
                <div className="w-28 text-lg text-yellow-500">{[...Array(player.attributes.xFactor)].map((star) => {        
                  return (         
                    <span className="star">&#9733;</span>        
                    );
                  })}
                </div>
              </div>
            </div>
            <div className='rounded-lg shadow-xl mt-8 mb-4'>
              {player.position === 'QB' &&
                <QBStats stats={player.stats} />}
              {player.position === 'RB' &&
                <RBStats stats={player.stats} />}
              {player.position === 'WR' &&
                <RcvStats stats={player.stats} />}
              {player.position === 'TE' &&
                <RcvStats stats={player.stats} />}
              {player.position === 'K' &&
                <KStats stats={player.stats} />}
            </div>
          </div>
        </div>
      </div>
      
    : null
  )
}

function QBStats(props) {
  const stats = props.stats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>SZN</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>GP</td>
          <td className='px-2 py-1 font-medium'>Comp</td>
          <td className='px-2 py-1 font-medium'>Att</td>
          <td className='px-2 py-1 font-medium'>Comp%</td>
          <td className='px-2 py-1 font-medium'>TDs</td>
          <td className='px-2 py-1 font-medium'>INTs</td>
          <td className='px-2 py-1 font-medium'>Yds</td>
          <td className='px-2 py-1 font-medium'>YPC</td>
          <td className='px-2 py-1 font-medium'>20+</td>
          <td className='px-2 py-1 font-medium'>Long</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {stats ? 
          stats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.gp}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.comp}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.att}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.compPerc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.tds}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.ints}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.yards}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.ypc}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing['20+']}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.passing.longest}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}

function RBStats(props) {
  const stats = props.stats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>SZN</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>GP</td>
          <td className='px-2 py-1 font-medium'>Carr</td>
          <td className='px-2 py-1 font-medium'>Yds</td>
          <td className='px-2 py-1 font-medium'>YPC</td>
          <td className='px-2 py-1 font-medium'>TDs</td>
          <td className='px-2 py-1 font-medium'>FUM</td>
          <td className='px-2 py-1 font-medium'>20+</td>
          <td className='px-2 py-1 font-medium'>Long</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {stats ? 
          stats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.gp}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.carries}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.yards}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.ypc}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.tds}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.fumblesLost}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing['20+']}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.rushing.longest}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}

function RcvStats(props) {
  const stats = props.stats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>SZN</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>GP</td>
          <td className='px-2 py-1 font-medium'>Rec</td>
          <td className='px-2 py-1 font-medium'>Targ</td>
          <td className='px-2 py-1 font-medium'>Rcv%</td>
          <td className='px-2 py-1 font-medium'>YPR</td>
          <td className='px-2 py-1 font-medium'>TDs</td>
          <td className='px-2 py-1 font-medium'>Yds</td>
          <td className='px-2 py-1 font-medium'>20+</td>
          <td className='px-2 py-1 font-medium'>Long</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {stats ? 
          stats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.gp}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.receptions}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.targets}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.rcvPerc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.ypr}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.tds}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.yards}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving['20+']}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.receiving.longest}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}

function KStats(props) {
  const stats = props.stats

  return (
    <table className="w-full divide-y divide-slate-300">
      <thead className="bg-slate-50">
        <tr className="divide-x divide-slate-200">
          <td className='px-2 py-1 font-medium'>SZN</td>
          <td className='px-2 py-1 font-medium'>Team</td>
          <td className='px-2 py-1 font-medium'>GP</td>
          <td className='px-2 py-1 font-medium'>FGs</td>
          <td className='px-2 py-1 font-medium'>Att</td>
          <td className='px-2 py-1 font-medium'>FG%</td>
          <td className='px-2 py-1 font-medium'>Avg</td>
          <td className='px-2 py-1 font-medium'>45+</td>
          <td className='px-2 py-1 font-medium'>Long</td>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {stats ? 
          stats.map((data) => (
            <tr key={data.name} className={"divide-x divide-slate-200"}>
              <td className="whitespace-nowrap p-2 text-xl text-slate-700 font-normal">{data.season}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500 font-semibold" style={{ color: `${data.color}` }}>{data.team}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.gp}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgs}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgAtt}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgPerc}%</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.fgAvg}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking['fg45+']}</td>
              <td className="whitespace-nowrap p-2 text-xl text-slate-500">{data.kicking.longest}</td>
            </tr>
          )) : null}
      </tbody>
    </table>
  )
}