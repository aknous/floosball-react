/* This example requires Tailwind CSS v2.0+ */
import React,{useEffect,useState} from 'react'
import axios from 'axios'

const URL = 'http://floosball.com:8000/standings';


function StandingsComponent() {

  const [standings, setStandings] = useState([])

  const getStandings = async () => {
    try {
      const userStandings = await axios.get(URL)

      setStandings(userStandings.data);  // set State
    
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getStandings()
      const interval=setInterval(()=>{
        getStandings()
       },60000)
         
       return()=>clearInterval(interval)
  }, [])


  return (
    standings.map((data) => (
      <div className="w-96 flex flex-col text-slate-900">
        <div className='text-3xl text-center pb-2 border-b-2 border-slate-500 font-medium'>
          {data.name}
        </div>
        <div className='flex flex-col space-y-4 mt-8'>
          {data.standings.map((data) => (
              <div className='flex'>
                <span className='w-64 text-xl text-center'>{data.name}</span>
                <span className='w-32 text-xl text-center font-semibold'>{data.record}</span>
              </div>
          ))}
        </div>
        
      </div>
    ))
  )
}


export default function GameGrid() {
  return (
      <div className="py-2 flex shrink-0 justify-center mt-20 mx-10 divide-x-2 divide-slate-500">
        <StandingsComponent />
      </div>
  )
}
  