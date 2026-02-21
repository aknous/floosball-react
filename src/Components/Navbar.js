/* This example requires Tailwind CSS v2.0+ */
import React, { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { NavLink } from 'react-router-dom';
import { Disclosure, Dialog, Transition } from '@headlessui/react'
import { MenuIcon, XIcon } from '@heroicons/react/outline'
import { supabase } from "../supabase/supabase";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuItemOption,
  MenuGroup,
  MenuOptionGroup,
  MenuDivider,
} from '@chakra-ui/react'

//const SEASONURL = 'http://floosball.com:8000/seasonInfo';
const SEASONURL = 'http://localhost:8000/seasonInfo';

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
    const interval = setInterval(() => {
      getSeasonData()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className='flex-col justify-center items-center h-3/4 w-36 gap-x-2 text-white text-sm font-medium text-center'>
      <div className='h-1/2 font-medium text-base'>
        {seasonData.currentWeek <= 18 ? 'Week ' + seasonData.currentWeek : seasonData.currentWeekText}
      </div>
      <div className='h-1/2 font-normal text-sm'>
        Season {seasonData.season}
      </div>
    </div>
  )
}

const navigation = [
  { name: 'Dashboard', href: '#', current: false, path: '/dashboard' },
  { name: 'Teams', href: '#', current: false, path: '/teams' },
  { name: 'Players', href: '#', current: false, path: '/players' },
  { name: 'Records', href: '#', current: false, path: '/records' },
]

export default function Navbar({ onOpen, authBool }) {

  const handleSignout = async (event) => {
    //event.preventDefault()

    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.error_description || error.message)
    }
  }

  return (
    <div>
      <Disclosure>
        <div className='flex bg-slate-900 justify-between px-2 h-14 z-50'>
          <div className='flex items-center'>
            <Disclosure.Button className="laptop:hidden inline-flex items-center justify-center my-2 mr-2 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <MenuIcon className="block h-6 w-6" aria-hidden="true" />
            </Disclosure.Button>
            <NavLink
              to='/dashboard'
              key='dashboard'
            >
              <div className='text-white text-center text-2xl font-semibold py-3'>floosball</div>
            </NavLink>
            <div>
              <SeasonDataComponent />
            </div>
          </div>
          <div className="hidden laptop:flex gap-x-1">
            {navigation.map((item) => (
              <NavLink
                to={item.path}
                key={item.name}
                className={({ isActive }) => `my-2 laptop:w-32 rounded-xl uppercase text-xl text-center font-semibold ${isActive ? 'bg-white text-slate-900' : 'text-white hover:bg-slate-500'}`}
              >
                <div className='my-1.5'>{item.name}</div>
              </NavLink>
            ))}
            {!authBool ?
              <button
                className={`my-2 laptop:w-32 rounded-xl uppercase text-xl text-white text-center font-semibold hover:bg-slate-500`}
                onClick={onOpen}
              >
                <div className='my-1.5'>Sign In</div>
              </button>
              :
              <Menu>
                <MenuButton className={`my-2 laptop:w-32 rounded-xl uppercase text-xl text-white text-center font-semibold hover:bg-slate-500`} >
                  <div className='my-1.5'>Account</div>
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={handleSignout}>Sign Out</MenuItem>
                </MenuList>
              </Menu>
            }
          </div>
        </div>
        <Disclosure.Panel className="laptop:hidden bg-slate-700">
          <div className="px-2 pt-2 pb-1">
            {navigation.map((item) => (
              <NavLink
                to={item.path}
                key={item.name}
                className={({ isActive }) => `w-28 rounded-md text-white text-base text-left font-medium ${isActive ? 'font-semibold' : ''}`}
              >
                <div className='my-1'>{item.name}</div>
              </NavLink>
            ))}
          </div>
        </Disclosure.Panel>
      </Disclosure>
    </div>

  )
}