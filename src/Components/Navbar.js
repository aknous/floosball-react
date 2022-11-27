/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { NavLink } from 'react-router-dom';

const SEASONURL = 'http://127.0.0.1:8000/seasonInfo';

function SeasonDataComponent() {
  const [seasonData, setSeasonData] = useState([])

  const getSeasonData = async () => {
    try {
      const userSeasonData = await axios.get(SEASONURL)

      setSeasonData(userSeasonData.data);  // set State
    
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getSeasonData()
    const interval=setInterval(()=>{
      getSeasonData()
     },60000)
       
     return()=>clearInterval(interval)
  }, [])

  return (
    <div className='flex justify-end py-3 gap-x-4 text-white text-lg font-semibold w-96'>
      <div>
        Season {seasonData.season}
      </div>
      <div>
        {seasonData.currentWeek <= 18 ? 'Week ' + seasonData.currentWeek : seasonData.currentWeek}
      </div>
    </div>
  )
}

const navigation = [
  { name: 'Stats', href: '#', current: false, path: '/stats' },
  { name: 'Teams', href: '#', current: false, path: '/teams' },
  { name: 'Results', href: '#', current: false, path: '/results' },
  { name: 'Players', href: '#', current: false, path: '/players' },
]

export default function Navbar() {
  return (
    <div className='flex bg-slate-700 justify-between px-4 h-14'>
      <div className='text-white text-left text-2xl font-semibold w-96 py-3'>floosball</div>
      <div className="flex gap-x-1">
        {navigation.map((item) => (
          <NavLink
            to = {item.path}
            key={item.name}
            className={({isActive})=>`my-2 w-24 rounded-md text-lg text-center font-semibold ${isActive ? 'bg-white text-slate-900' : 'text-white hover:bg-slate-500'}`}
          >
            <div className='my-1.5'>{item.name}</div>
          </NavLink>
        ))}
      </div>
      <div>
        <SeasonDataComponent />
      </div>
    </div>
  )
}