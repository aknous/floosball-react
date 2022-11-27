import React,{useEffect,useState} from 'react'


export default function Schedule(props) {

    const schedule = props.schedule;

    return (
        <div className='mx-2 mt-4 flex justify-center'>
            <div className='grid grid-cols-6 justify-left gap-x-2 overflow-x-scroll'>
                {schedule.map((data) =>(
                    <div className={`flex flex-col items-center shrink-0 w-56 h-20 p-2 bg-slate-50 text-slate-900 shadow-md rounded-lg my-2 ${data.status === 'Active' ? 'border-2 border-sky-500' : ''}`}>
                        <div className='text-sm'>{data.week}</div>
                        <div className='flex items-center'>
                            {data.isHomeTeam ? <span>vs.</span>: <span>@</span>} <span className='text-xl font-medium pl-1 whitespace-nowrap' style={{ color: `${data.vsColor}` }}>{data.vsTeam}</span> <span className='pl-1 text-xs'>({data.vsRecord})</span>
                        </div>
                        {data.status === 'Final' ? <div className='text-sm text-left'>{data.isWin ? <span className='text-green-700 font-semibold'> W</span> : <span className='text-red-700 font-semibold'> L</span>} {data.homeScore}-{data.awayScore}</div>: null}
                    </div>
                    
                ))}
            </div>
        </div>
    )
}