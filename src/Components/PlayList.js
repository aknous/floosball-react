import React,{useEffect,useState} from 'react'
import { InformationCircleIcon } from '@heroicons/react/outline'
import axios from 'axios'


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

export default function PlayList(props) {

    const [highlights, setHighlights] = useState([])
    const [plays, setPlays] = useState([])
    const [showPlays, setShowPlays] = useState(true);
    const [showHighlights, setShowHighlights] = useState(false);

    const handleClick = (e) => {
        if (e.currentTarget.id === 'plays') {
            setShowHighlights(false);
            setShowPlays(true);
            getPlays()
        }
        else if (e.currentTarget.id === 'highlights') {
            setShowPlays(false);
            setShowHighlights(true);
            getHighlights();
        }
      }
    
    const getHighlights = async () => {
        try {
          const userHighlights = await axios.get(`http://127.0.0.1:8000/highlights?id=${props.id}`)
    
          setHighlights(userHighlights.data);  // set State
        
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
        getPlays();
        const interval=setInterval(()=>{
            getHighlights();
            getPlays();
         },5000)
           
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
                    Game Feed
                </button>
                <button
                    id={'highlights'}
                    onClick={handleClick}
                    className={classNames(
                        showHighlights
                        ? 'border-slate-500 text-slate-600'
                        : 'border-transparent text-gray-500 hover:text-slate-700 hover:border-slate-300',
                        'w-1/4 py-4 px-1 text-center border-b-2 font-normal text-xl'
                    )}
                >
                    Highlights
                </button>
            </nav>
            <div className='flex-1 mx-2 overflow-auto'>
                <ul className='divide-y-2 divide-slate-200'>
                    {showPlays ?
                        plays.map((data) => (
                            data.type === 'play' ?
                                <li className='p-2'>
                                    <div className='flex space-x-3 items-center'>
                                        <div className='flex flex-col w-20'>
                                            <h3 className="text-sm font-medium">{data.down}</h3>
                                            <h3 className="text-sm font-medium">{data.yardLine}</h3>
                                        </div>
                                        <div className='py-2 w-8 h-8 rounded-full' style={{ backgroundColor: `${data.color}` }}></div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-medium">{data.team}</h3>
                                                <div className={`bg-slate-100 rounded-full ${data.result === 'Field Goal is No Good' ? 'bg-slate-600': ''} ${data.result === 'Turnover On Downs' ? 'bg-slate-600': ''} ${data.result === '1st Down' ? 'bg-green-100': ''} ${data.result === 'Punt' ? 'bg-slate-600': ''} ${data.result === 'Fumble' ? 'bg-red-500': ''} ${data.result === 'Interception' ? 'bg-red-500': ''} ${data.isTd ? 'bg-emerald-500': ''} ${data.isFg ? 'bg-indigo-500': ''} ${data.isSafety ? 'bg-rose-500': ''}`}>
                                                    <div className={`p-1 text-xs mx-1 font-medium ${data.result === 'Field Goal is No Good' ? 'text-slate-100': ''} ${data.result === 'Turnover On Downs' ? 'text-slate-100': ''} ${data.result === '1st Down' ? 'text-green-700': ''} ${data.result === 'Punt' ? 'text-slate-100': ''} ${data.result === 'Fumble' ? 'text-white': ''} ${data.result === 'Interception' ? 'text-white': ''} ${data.isTd ? 'text-white': ''} ${data.isFg ? 'text-white': ''} ${data.isSafety ? 'text-white': ''}`}>{data.result}</div>
                                                </div>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <p className='text-sm'>{data.playText}</p>
                                                <span className={`text-xs text-slate-700 ${data.scoreChange ? 'visible' : 'invisible'}`}>{data.homeAbbr} {data.homeScore} | {data.awayAbbr} {data.awayScore}</span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                :
                                <li className='flex p-2 h-16 items-center justify-center'>
                                    <div className='flex space-x-3 justify-center'>
                                        <div className='flex space-x-1 items-center'>
                                            <div className='h-6 w-6'><InformationCircleIcon /></div>
                                            <div className="text-lg font-medium items-center">{data.text}</div>
                                        </div>
                                    </div>
                                </li>
                        )): null
                    }
                    {showHighlights ?
                        highlights.map((data) => (
                            data.type === 'play' ?
                                <li className='p-2'>
                                    <div className='flex items-center justify-center space-x-4 text-sm font-medium'>
                                        {data.quarter === 'OT' ? <div>{data.quarter}</div> : <div>Q{data.quarter}</div>}
                                        <div>PR: {data.playsLeft}</div>
                                    </div>
                                    <div className='flex space-x-3 items-center'>
                                        <div className='flex flex-col w-20'>
                                            <h3 className="text-sm font-medium">{data.down}</h3>
                                            <h3 className="text-sm font-medium">{data.yardLine}</h3>
                                        </div>
                                        <div className='py-2 w-8 h-8 rounded-full' style={{ backgroundColor: `${data.color}` }}></div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-medium">{data.team}</h3>
                                                <div className={`bg-slate-100 rounded-full ${data.result === 'Field Goal is No Good' ? 'bg-slate-600': ''} ${data.result === 'Turnover On Downs' ? 'bg-slate-600': ''} ${data.result === '1st Down' ? 'bg-green-100': ''} ${data.result === 'Punt' ? 'bg-slate-600': ''} ${data.result === 'Fumble' ? 'bg-red-500': ''} ${data.result === 'Interception' ? 'bg-red-500': ''} ${data.isTd ? 'bg-emerald-500': ''} ${data.isFg ? 'bg-indigo-500': ''} ${data.isSafety ? 'bg-rose-500': ''}`}>
                                                    <div className={`p-1 text-xs mx-1 font-medium ${data.result === 'Field Goal is No Good' ? 'text-slate-100': ''} ${data.result === 'Turnover On Downs' ? 'text-slate-100': ''} ${data.result === '1st Down' ? 'text-green-700': ''} ${data.result === 'Punt' ? 'text-slate-100': ''} ${data.result === 'Fumble' ? 'text-white': ''} ${data.result === 'Interception' ? 'text-white': ''} ${data.isTd ? 'text-white': ''} ${data.isFg ? 'text-white': ''} ${data.isSafety ? 'text-white': ''}`}>{data.result}</div>
                                                </div>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <p className='text-sm'>{data.playText}</p>
                                                <span className={`text-xs text-slate-700 ${data.scoreChange ? 'visible' : 'invisible'}`}>{data.homeAbbr} {data.homeScore} | {data.awayAbbr} {data.awayScore}</span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                : null
                        )): null
                    }
                </ul>
            </div>
        </div>

    )


}