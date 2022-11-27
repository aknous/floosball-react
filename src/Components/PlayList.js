import React,{useEffect,useState} from 'react'
import axios from 'axios'


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

export default function PlayList(props) {

    const [scoringPlays, setScoringPlays] = useState([])
    const [plays, setPlays] = useState([])
    const [showPlays, setShowPlays] = useState(true);
    const [showScoringPlays, setShowScoringPlays] = useState(false);

    const handleClick = (e) => {
        if (e.currentTarget.id === 'plays') {
            setShowScoringPlays(false);
            setShowPlays(true);
            getPlays()
        }
        else if (e.currentTarget.id === 'scoringPlays') {
            setShowPlays(false);
            setShowScoringPlays(true);
            getScoringPlays();
        }
      }
    
    const getScoringPlays = async () => {
        try {
          const userScoringPlays = await axios.get(`http://127.0.0.1:8000/scoringPlays?id=${props.id}`)
    
          setScoringPlays(userScoringPlays.data);  // set State
        
        } catch (err) {
          console.error(err.message);
        }
      };

      const getPlays = async () => {
        try {
          const userPlays = await axios.get(`http://127.0.0.1:8000/plays?id=${props.id}`)
    
          setPlays(userPlays.data);  // set State
        
        } catch (err) {
          console.error(err.message);
        }
      };

    useEffect(() => {
        getPlays()
        const interval=setInterval(()=>{
            if (showPlays) {
                getPlays()
            }
         },15000)
           
         return()=>clearInterval(interval)
    }, []);

    useEffect(() => {
        const interval=setInterval(()=>{
            if (showScoringPlays) {
                getScoringPlays()
            }
            
         },15000)
           
         return()=>clearInterval(interval)
    }, []);

    return (
        <div className="flex flex-col h-4/6 bg-white rounded-lg shadow-md">
            <nav className="-mb-px flex justify-center" aria-label="Tabs">
                <button
                    id={'plays'}
                    onClick={handleClick}
                    className={classNames(
                        showPlays
                        ? 'border-slate-500 text-slate-600'
                        : 'border-transparent text-gray-500 hover:text-slate-700 hover:border-slate-300',
                        'w-1/4 py-4 px-1 text-center border-b-2 font-normal text-xl'
                    )}
                >
                    All Plays
                </button>
                <button
                    id={'scoringPlays'}
                    onClick={handleClick}
                    className={classNames(
                        showScoringPlays
                        ? 'border-slate-500 text-slate-600'
                        : 'border-transparent text-gray-500 hover:text-slate-700 hover:border-slate-300',
                        'w-1/4 py-4 px-1 text-center border-b-2 font-normal text-xl'
                    )}
                >
                    Scoring Plays
                </button>
            </nav>
            <div className='flex-1 mx-2 overflow-auto'>
                <ul className='divide-y-2 divide-slate-200'>
                    {showPlays ?
                        plays.map((data) => (
                            <li className='p-2'>
                                <div className='flex space-x-3'>
                                    <div className='flex flex-col w-20'>
                                        <h3 className="text-sm font-medium">{data.down}</h3>
                                        <h3 className="text-sm font-medium">{data.yardLine}</h3>
                                    </div>
                                    <div className='py-2 w-8 h-8 rounded-full' style={{ backgroundColor: `${data.color}` }}></div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium">{data.team}</h3>
                                            <div className={`bg-slate-100 rounded-full ${data.isTd ? 'bg-green-100': ''} ${data.isFg ? 'bg-violet-100': ''} ${data.isSafety ? 'bg-rose-100': ''}`}>
                                                <div className={`p-1 text-xs ${data.isTd ? 'text-green-700': ''} ${data.isFg ? 'text-violet-700': ''} ${data.isSafety ? 'text-rose-700': ''}`}>{data.result}</div>
                                            </div>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <p className='text-sm font-light'>{data.playText}</p>
                                            <span className={`text-xs text-slate-700 ${data.scoreChange ? 'visible' : 'invisible'}`}>{data.homeAbbr} {data.homeScore} | {data.awayAbbr} {data.awayScore}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )): null
                    }
                    {showScoringPlays ?
                        scoringPlays.map((data) => (
                            <li className='p-2'>
                                <div className='flex items-center justify-center space-x-4 text-sm font-medium'>
                                    {data.quarter === 5 ? <div>OT</div> : <div>Q{data.quarter}</div>}
                                    <div>PR: {data.playsLeft%33}</div>
                                </div>
                                <div className='flex space-x-3'>
                                    <div className='flex flex-col w-20'>
                                        <h3 className="text-sm font-medium">{data.down}</h3>
                                        <h3 className="text-sm font-medium">{data.yardLine}</h3>
                                    </div>
                                    <div className='py-2 w-8 h-8 rounded-full' style={{ backgroundColor: `${data.color}` }}></div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium">{data.team}</h3>
                                            <div className={`bg-slate-100 rounded-full ${data.isTd ? 'bg-green-100': ''} ${data.isFg ? 'bg-violet-100': ''} ${data.isSafety ? 'bg-rose-100': ''}`}>
                                                <div className={`p-1 text-xs ${data.isTd ? 'text-green-700': ''} ${data.isFg ? 'text-violet-700': ''} ${data.isSafety ? 'text-rose-700': ''}`}>{data.result}</div>
                                            </div>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <p className='text-sm font-light'>{data.playText}</p>
                                            <span className={`text-xs text-slate-700 ${data.scoreChange ? 'visible' : 'invisible'}`}>{data.homeAbbr} {data.homeScore} | {data.awayAbbr} {data.awayScore}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )): null
                    }
                </ul>
            </div>
        </div>

    )


}