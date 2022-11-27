import React,{Fragment,useEffect,useState} from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'
import axios from 'axios'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Stats() {
    const [selection, setSelection] = useState('Select Season')
    const [seasons, setSeasons] = useState(5)
    const [weeks, setWeeks] = useState(18)
    const [seasonsArray, setSeasonsArray] = useState([])
    const [weeksArray, setWeeksArray] = useState([])

    useEffect(() => {
      let newArray = []
      for (let index = 1; index <= seasons; index++) {
        newArray.push(index)
      }
      setSeasonsArray(newArray)

    }, [seasons]);

    useEffect(() => {
      let newArray = []
      for (let index = 1; index <= weeks; index++) {
        newArray.push(index)
      }
      setWeeksArray(newArray)

    }, [weeks]);

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
                      {seasonsArray.map((season) => (
                        <Menu.Item>
                          {({ active }) => (
                            <span
                              className={classNames(
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                'block px-4 py-2 text-sm'
                              )}
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
            </div>
        </div>

    )
}