import './index.css';
import React, { useEffect, useState, useRef } from 'react'
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
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'
import { FloosballProvider } from './contexts/FloosballContext'
import { SeasonWebSocketProvider } from './contexts/SeasonWebSocketContext'
import { GamesProvider } from './contexts/GamesContext'
import { ChakraProvider } from '@chakra-ui/react'

function AppLayout() {
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
        <Navbar />
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
    </div>
  )
}

function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <FloosballProvider>
          <SeasonWebSocketProvider>
            <GamesProvider>
              <AppLayout />
            </GamesProvider>
          </SeasonWebSocketProvider>
        </FloosballProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
