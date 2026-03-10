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
import FantasyPage from './Views/Fantasy/FantasyPage'
import AboutPage from './Views/About/AboutPage'
import CardsPage from './Views/Cards/CardsPage'
import Dashboard from './Views/Dashboard/Dashboard'
import DashboardNew from './Views/Dashboard/DashboardNew'
import { Footer } from './Components/Footer'
import { Route, Routes, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react'
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
    <div className='min-h-screen relative font-pixel' style={{ backgroundColor: '#0f172a' }}>
      <div ref={headerRef} className='fixed w-full top-0 z-50'>
        <Navbar />
        <GameBar />
      </div>
      <div style={{ paddingTop: headerHeight, paddingBottom: 33 }}>
        <Routes>
          <Route exact path='/' element={<Navigate to='/dashboard' />} />
          <Route exact path='/dashboard' element={<DashboardNew headerHeight={headerHeight} />} />
          <Route exact path='/dashboard/old' element={<Dashboard />} />
          <Route exact path='/players' element={<Players />} />
          <Route exact path='/teams' element={<TeamGrid />} />
          <Route exact path='/records' element={<Records />} />
          <Route path='/team/:id' element={<Team />} />
          <Route path='/players/:id' element={<Player />} />
          <Route exact path='/fantasy' element={<FantasyPage />} />
          <Route exact path='/cards' element={<CardsPage />} />
          <Route exact path='/about' element={<AboutPage />} />
          <Route exact path='/admin' element={<AdminPage />} />
        </Routes>
        <Footer />
      </div>
    </div>
  )
}

const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY

const clerkAppearance = {
  variables: {
    colorPrimary: '#3b82f6',
    colorBackground: '#1e293b',
    colorText: '#e2e8f0',
    colorTextSecondary: '#94a3b8',
    colorInputBackground: '#0f172a',
    colorInputText: '#e2e8f0',
    colorNeutral: '#e2e8f0',
    colorDanger: '#ef4444',
    borderRadius: '8px',
    fontFamily: 'inherit',
  },
  elements: {
    rootBox: { fontFamily: 'inherit' },
    card: { backgroundColor: '#1e293b', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
    headerTitle: { color: '#e2e8f0' },
    headerSubtitle: { color: '#94a3b8' },
    socialButtonsBlockButton: { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' },
    socialButtonsBlockButtonText: { color: '#e2e8f0' },
    formFieldLabel: { color: '#94a3b8' },
    formFieldInput: { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' },
    formFieldAction: { color: '#3b82f6' },
    formFieldHintText: { color: '#64748b' },
    formButtonPrimary: { backgroundColor: '#3b82f6', color: '#fff' },
    formButtonReset: { color: '#3b82f6' },
    footerAction: { color: '#94a3b8' },
    footerActionLink: { color: '#3b82f6' },
    footer: { '& a': { color: '#64748b' } },
    dividerLine: { backgroundColor: '#334155' },
    dividerText: { color: '#64748b' },
    identityPreviewEditButton: { color: '#3b82f6' },
    identityPreview: { backgroundColor: '#0f172a', border: '1px solid #334155' },
    identityPreviewText: { color: '#e2e8f0' },
    otpCodeFieldInput: { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' },
    alternativeMethodsBlockButton: { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' },
    modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { backgroundColor: '#1e293b' },
    navbar: { backgroundColor: '#1e293b', borderRight: '1px solid #334155' },
    navbarButton: { color: '#94a3b8' },
    navbarButtonIcon: { color: '#94a3b8' },
    pageScrollBox: { backgroundColor: '#1e293b' },
    profileSection: { borderBottom: '1px solid #334155' },
    profileSectionTitle: { borderBottom: '1px solid #334155' },
    profileSectionTitleText: { color: '#e2e8f0' },
    profileSectionContent: { color: '#94a3b8' },
    userPreviewMainIdentifier: { color: '#e2e8f0' },
    userPreviewSecondaryIdentifier: { color: '#94a3b8' },
    userButtonPopoverCard: { backgroundColor: '#1e293b', border: '1px solid #334155' },
    userButtonPopoverActionButton: { color: '#e2e8f0' },
    userButtonPopoverActionButtonText: { color: '#e2e8f0' },
    userButtonPopoverActionButtonIcon: { color: '#94a3b8' },
    userButtonPopoverFooter: { borderTop: '1px solid #334155' },
    badge: { backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    avatarBox: { border: '1px solid #334155' },
    tagInputContainer: { backgroundColor: '#0f172a', border: '1px solid #334155' },
    selectButton: { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' },
    selectOptionsContainer: { backgroundColor: '#1e293b', border: '1px solid #334155' },
    selectOption: { color: '#e2e8f0' },
    menuButton: { color: '#94a3b8' },
    menuList: { backgroundColor: '#1e293b', border: '1px solid #334155' },
    menuItem: { color: '#e2e8f0' },
  },
}

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} appearance={clerkAppearance}>
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
    </ClerkProvider>
  );
}

export default App;
