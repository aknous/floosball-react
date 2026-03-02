import './index.css';
import React, { Fragment, useEffect, useState, useRef } from 'react'
import Navbar from './Components/Navbar.js'
import GameBar from './Components/GameBar'
import TeamGrid from './Views/Teams/TeamGrid'
import Team from './Views/Teams/TeamPage'
import Player from './Views/Players/PlayerPage'
import Stats from './Views/Stats/Stats'
import Players from './Views/Players/PlayersPage'
import Results from './Views/Results/Results.js'
import Records from './Views/Records/Records'
import AdminPage from './Views/Admin/AdminPage'
import Dashboard from './Views/Dashboard/Dashboard'
import DashboardNew from './Views/Dashboard/DashboardNew'
import { AuthModal } from './Components/Auth/AuthModals';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios'
import { Disclosure, Dialog, Menu, Transition } from '@headlessui/react'
import { supabase } from "./supabase/supabase";
import { FloosballProvider } from './contexts/FloosballContext'
import { SeasonWebSocketProvider } from './contexts/SeasonWebSocketContext'
import { GamesProvider } from './contexts/GamesContext'
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

// Separate component so useLocation works (needs to be inside Router from index.js)
function AppLayout({ onOpen, authBool, isOpen, onClose }) {
  const headerRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(64)

  useEffect(() => {
    if (!headerRef.current) return
    const observer = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current.offsetHeight)
    })
    observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className='bg-slate-300 min-h-screen relative font-pixel'>
      <div ref={headerRef} className='fixed w-full top-0 z-50'>
        <Navbar onOpen={onOpen} authBool={authBool} />
        <GameBar />
      </div>
      <div style={{ paddingTop: headerHeight }}>
        <Routes>
          <Route exact path='/' element={<Navigate to='/dashboard' />} />
          <Route exact path='/dashboard' element={<DashboardNew headerHeight={headerHeight} />} />
          <Route exact path='/dashboard/old' element={<Dashboard />} />
          <Route exact path='/players' element={<Players />} />
          <Route exact path='/teams' element={<TeamGrid />} />
          <Route exact path='/records' element={<Records />} />
          <Route path='/team/:id' element={<Team />} />
          <Route path='/players/:id' element={<Player />} />
          <Route exact path='/admin' element={<AdminPage />} />
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
    </div>
  )
}

function App() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [session, setSession] = useState(null)
  const [authBool, setAuthBool] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user.aud === "authenticated") {
      setAuthBool(true)
    } else {
      setAuthBool(false)
    }
  }, [session])

  return (
    <ChakraProvider>
      <FloosballProvider>
        <SeasonWebSocketProvider>
          <GamesProvider>
            <AppLayout onOpen={onOpen} authBool={authBool} isOpen={isOpen} onClose={onClose} />
          </GamesProvider>
        </SeasonWebSocketProvider>
      </FloosballProvider>
    </ChakraProvider>
  );
}

export default App;
