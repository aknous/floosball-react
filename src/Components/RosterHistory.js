import React,{Fragment,useEffect,useState} from 'react'
import { Menu, Transition } from '@headlessui/react'
import { PlusIcon, MinusIcon,ChevronDownIcon } from '@heroicons/react/solid'
import axios from 'axios'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Roster(props) {
    const players = props.players
    const [seasonData, setSeasonData] = useState([])
    const [seasonsArray, setSeasonsArray] = useState([])
    const [selectedSeason, setSelectedSeason] = useState(1)

    const getSeasonData = async () => {
      try {
        const userSeasonData = await axios.get('http://floosball.com:8000/seasonInfo')
  
        setSeasonData(userSeasonData.data);
      
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
  
    useEffect(() => {
      let newArray = []
      for (let index = 1; index <= seasonData.season; index++) {
        newArray.push(index)
      }
      setSeasonsArray(newArray)

    }, [seasonData]);

    return (
      <div className='flex-col laptop:flex w-full gap-x-6'>
        <Menu as="div" className="items-center relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100">
              Season {selectedSeason}
              <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-100 laptop:right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {seasonsArray.map((season) => (
                  <Menu.Item>
                    {({ active }) => (
                      <span
                        className={classNames(
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                          'block px-4 py-2 text-sm'
                        )}
                        onClick={() => setSelectedSeason(season)}
                      >
                        Season {season}
                      </span>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
        <div className='flex justify-center gap-x-4 laptop:h-128 laptop:overflow-y-auto mt-4'>
          <div className='h-full'>
            {players.length ? 
              <div className='flex flex-col items-center'>
                  <table className='min-w-full divide-y divide-slate-300 bg-white rounded-lg shadow-lg w-80 laptop:w-96 truncate'>
                    <tbody className='divide-y divide-slate-300'>
                        {players.map((player) => (
                          player.season === selectedSeason ?
                            <tr className="text-center">
                              <td className={`w-12 laptop:w-14 text-xl ${player.isAddition ? 'text-green-600' : 'text-red-500'}`}>
                                {player.isAddition ? 
                                <PlusIcon className='px-2' /> :
                                <MinusIcon className='px-2' />
                                }
                              </td>
                              <td className='p-2'>
                                <div className="whitespace-nowrap text-base laptop:text-xl font-semibold text-slate-700">{player.name}<span className='pl-1 text-xs laptop:text-sm font-normal align-middle'>- {player.pos}</span></div>
                                <div className="whitespace-nowrap text-sm laptop:text-base text-yellow-500">{[...Array(player.tier)].map((star) => {        
                                  return (         
                                    <span className="star">&#9733;</span>        
                                  );
                                  })}</div>
                                {player.isAddition ?
                                  <div className='text-xs laptop:text-sm font-medium text-slate-700 italic'>{`${player.term} season(s)`}</div>
                                  : null
                                }
                              </td>
                            </tr>
                          : null
                        ))}
                    </tbody>
                  </table>
              </div>
              : null
            }   
          </div>    
        </div>
      </div>
        
    )
}