import './index.css';
import React, { Fragment, useEffect, useState } from 'react'
import Navbar from './Components/Navbar.js'
import GameBar from './Components/GameBar.js'
import TeamGrid from './Views/Teams/TeamGrid'
import Team from './Views/Teams/Team'
import Player from './Views/Players/Player'
import Stats from './Views/Stats/Stats'
import Players from './Views/Players/PlayerTable'
import Results from './Views/Results/Results.js'
import Records from './Views/Records/Records'
import Dashboard from './Views/Dashboard/Dashboard'
import { AuthModal } from './Components/Auth/AuthModals';
import { Route, Routes, Navigate, BrowserRouter } from 'react-router-dom';
import axios from 'axios'
import { Disclosure, Dialog, Menu, Transition } from '@headlessui/react'
import { supabase } from "./supabase/supabase";
import { ChakraProvider } from '@chakra-ui/react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react'

function App() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [appVer, setAppVer] = useState([])
  const [session, setSession] = useState(null)
  const [authBool, setAuthBool] = useState(false)

  const getAppVer = async () => {
    try {
      //const userAppVer = await axios.get('http://floosball.com:8000/info')
      const userAppVer = await axios.get('http://localhost:8000/info')

      setAppVer(userAppVer.data);  // set State

    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    console.log(session)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    console.log(session?.user)
    if (session?.user.aud === "authenticated") {
      setAuthBool(true)
    }
    else {
      setAuthBool(false)
    }
  }, [session])


  useEffect(() => {
    getAppVer()
  }, [])
  return (
    <ChakraProvider>
      <div className='bg-slate-300 min-h-screen relative font-pixel'>
        <div className='fixed w-full top-0 z-50'>
          <Navbar onOpen={onOpen} authBool={authBool} />
        </div>
        <div>
          <Routes>
            <Route exact path='/' element={<Navigate to='/dashboard' />} />
            <Route exact path='/dashboard' element={<Dashboard />} />
            <Route exact path='/players' element={<Players />} />
            <Route exact path='/teams' element={<TeamGrid />} />
            <Route exact path='/records' element={<Records />} />
            <Route path='/team/:id' element={<Team />} />
            <Route path='/players/:id' element={<Player />} />
          </Routes>
        </div>
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalBody>
              <AuthModal onClose={onClose} />
            </ModalBody>
          </ModalContent>
        </Modal>
        <div className='flex justify-end z-50 bg-slate-300 w-full'>
          <span className='text-slate-400 text-sm font-light mr-8 my-2 z-0'> floosball v{appVer}</span>
        </div>
      </div>
    </ChakraProvider>
  );
}

export default App;
