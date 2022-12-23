import React,{Fragment,useEffect,useState,useRef} from 'react'
import {Link} from "react-router-dom";
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'
import axios from 'axios'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Stats() {
    const [selection, setSelection] = useState('Passing')
    const [players, setPlayers] = useState([])

    const dataLoaded = useRef(false)

    const getPlayers = async (pos) => {
        try {
          dataLoaded.current = false
          const userPlayers = await axios.get(`http://floosball.com:8000/playerStats?pos=${pos}`)
  
          setPlayers(userPlayers.data);  // set State
        
        } catch (err) {
          console.error(err.message);
        }
      };
    useEffect(() => {
      dataLoaded.current = true
    }, [players])

    useEffect(() => {
        switch (selection) {
            case 'Passing':
                getPlayers('Passing');
                break;
            case 'Rushing':
                getPlayers('Rushing');
                break;
            case 'Receiving':
                getPlayers('Receiving');
                break;
            case 'Kicking':
                getPlayers('Kicking');
                break;
            case 'Defense':
                getPlayers('D');
                break;
        }

      }, [selection]);

    return (
        <div>
            <div className='flex justify-center'>
              <Menu as="div" className="items-center relative inline-block text-left mt-5">
                <div>
                  <Menu.Button className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100">
                    {selection}
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
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <span
                            className={classNames(
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                              'block px-4 py-2 text-sm'
                            )}
                            onClick={() => setSelection('Passing')}
                          >
                            Passing
                          </span>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <span
                            className={classNames(
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                              'block px-4 py-2 text-sm'
                            )}
                            onClick={() => setSelection('Rushing')}
                          >
                            Rushing
                          </span>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <span
                            className={classNames(
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                              'block px-4 py-2 text-sm'
                            )}
                            onClick={() => setSelection('Receiving')}
                          >
                            Receiving
                          </span>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <span
                            className={classNames(
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                              'block w-full px-4 py-2 text-left text-sm'
                            )}
                            onClick={() => setSelection('Kicking')}
                          >
                            Kicking
                          </span>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <span
                            className={classNames(
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                              'block w-full px-4 py-2 text-left text-sm'
                            )}
                            onClick={() => setSelection('Defense')}
                          >
                            Defense
                          </span>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
            {selection === 'Passing' &&
                <PassingStats stats={players} />}
            {selection === 'Rushing' &&
                <RushingStats stats={players} />}
            {selection === 'Receiving' &&
                <ReceivingStats stats={players} />}
            {selection === 'Kicking' &&
                <KickingStats stats={players} />}
            {selection === 'Defense' &&
                <DefenseStats stats={players} />}
        </div>

    )
}

function PassingStats(props) {
    const stats = props.stats
    return (
        <div className="px-4 mt-10 sm:px-6 lg:px-8">
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table id="playerTable" className="w-full divide-y divide-slate-300">
                      <thead className="bg-slate-50">
                        <tr className="divide-x divide-slate-200">
                          <th scope="col" className="py-3.5 pl-4 text-left text-xl font-semibold text-slate-900 sm:pl-6">
                            
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Comps
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Atts
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Comp%
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Yards
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            YPC
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            TDs
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            INT
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {stats ? 
                          stats.map((data) => (
                            <tr key={data.name} className={"divide-x divide-slate-200"}
                            >
                              <td className="whitespace-nowrap py-1 pl-1 text-xl font-medium text-slate-900 sm:pl-6">
                                <Link to={`/players/${data.id}`} className='hover:underline'>{data.name}</Link>
                                <div className="whitespace-nowrap text-sm text-yellow-500">{[...Array(data.ratingStars)].map((star) => {        
                                  return (         
                                    <span className="star">&#9733;</span>        
                                  );
                                })}</div>
                              </td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-700 font-normal">{data.abbr}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat2}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat1}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat3}%</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat4}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat5}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat6}</td>
                              <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat7}</td>
                            </tr>
                          )) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
        </div>
    )
}

function RushingStats(props) {
    const stats = props.stats
    return (
        <div className="px-4 mt-10 sm:px-6 lg:px-8">
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table id="playerTable" className="min-w-full divide-y divide-slate-300">
                      <thead className="bg-slate-50">
                        <tr className="divide-x divide-slate-200">
                          <th scope="col" className="py-3.5 pl-4 text-left text-xl font-semibold text-slate-900 sm:pl-6">
                            
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Carr
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Run Yds
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            YPC
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Run TDs
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            FUM
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {stats.map((data) => (
                          <tr key={data.name} className={"divide-x divide-slate-200"}
                          >
                            <td className="whitespace-nowrap py-1 pl-1 text-xl font-medium text-slate-900 sm:pl-6">
                              <Link to={`/players/${data.id}`} className='hover:underline'>{data.name}</Link>
                              <div className="whitespace-nowrap text-sm text-yellow-500">{[...Array(data.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</div>
                            </td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.abbr}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat1}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat2}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat3}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat4}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat5}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
        </div>
    )
}
function ReceivingStats(props) {
    const stats = props.stats
    return (
        <div className="px-4 mt-10 sm:px-6 lg:px-8">
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table id="playerTable" className="min-w-full divide-y divide-slate-300">
                      <thead className="bg-slate-50">
                        <tr className="divide-x divide-slate-200">
                          <th scope="col" className="py-3.5 pl-4 text-left text-xl font-semibold text-slate-900 sm:pl-6">
                            
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Rec
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Targets
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Rcv%
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Rcv Yds
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            YPR
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            TDs
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {stats.map((data) => (
                          <tr key={data.name} className={"divide-x divide-slate-200"}
                          >
                            <td className="whitespace-nowrap py-1 pl-1 text-xl font-medium text-slate-900 sm:pl-6">
                              <Link to={`/players/${data.id}`} className='hover:underline'>{data.name} <span className='text-xs font-normal'>{data.pos}</span></Link>
                              <div className="whitespace-nowrap text-sm text-yellow-500">{[...Array(data.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</div>
                            </td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.abbr}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat1}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat2}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat3}%</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat4}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat5}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat6}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
        </div>
    )
}
function KickingStats(props) {
    const stats = props.stats
    return (
        <div className="px-4 mt-10 sm:px-6 lg:px-8">
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table id="playerTable" className="min-w-full divide-y divide-slate-300">
                      <thead className="bg-slate-50">
                        <tr className="divide-x divide-slate-200">
                          <th scope="col" className="py-3.5 pl-4 text-left text-xl font-semibold text-slate-900 sm:pl-6">
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Field Goals
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Field Goal Attempts
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Field Goal %
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-xl font-semibold text-slate-900">
                            Avg Yards
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {stats.map((data) => (
                          <tr key={data.name} className={"divide-x divide-slate-200"}
                          >
                            <td className="whitespace-nowrap py-1 pl-1 text-xl font-medium text-slate-900 sm:pl-6">
                              <Link to={`/players/${data.id}`} className='hover:underline'>{data.name}</Link>
                              <div className="whitespace-nowrap text-sm text-yellow-500">{[...Array(data.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</div>
                            </td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.abbr}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat1}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat2}</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat3}%</td>
                            <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat4}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
        </div>
    )
}

function DefenseStats(props) {
  const stats = props.stats
  return (
      <div className="px-4 mt-10 sm:px-6 lg:px-8">
          <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table id="playerTable" className="min-w-full divide-y divide-slate-300">
                    <thead className="bg-slate-50">
                      <tr className="divide-x divide-slate-200">
                        <th scope="col" className="py-3.5 pl-2 text-left text-sm font-semibold text-slate-900 sm:pl-6">
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Sacks
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          INTs
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          FUM Rec
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Pass Yds Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Run Yds Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Total Yds Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Avg. Yds Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Run TDs Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Pass TDs Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          TDs Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Avg. TDs Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Pts Alwd
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
                          Avg. Pts Alwd
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {stats.map((data) => (
                        <tr key={data.name} className={"divide-x divide-slate-200"}
                        >
                          <td className="whitespace-nowrap py-1 px-1 text-xl font-medium text-slate-900 sm:pl-6">
                            <Link to={`/team/${data.id}`} className='hover:underline'>{data.city} {data.name}</Link>
                            <div className="whitespace-nowrap text-sm text-yellow-500">{[...Array(data.ratingStars)].map((star) => {        
                                return (         
                                  <span className="star">&#9733;</span>        
                                );
                              })}</div>
                          </td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat1}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat2}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat3}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat4}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat5}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat6}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat7}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat8}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat9}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat10}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat11}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat12}</td>
                          <td className="whitespace-nowrap p-4 text-xl text-slate-500">{data.stat13}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
      </div>
  )
}