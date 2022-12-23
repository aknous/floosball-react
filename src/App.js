import './index.css';
import React,{useEffect,useState} from 'react'
import Navbar from './Components/Navbar.js'
import GameBar from './Components/GameBar.js'
import TeamGrid from './Views/Teams/TeamGrid'
import Team from './Views/Teams/Team'
import Player from './Views/Players/Player'
import Stats from './Views/Stats/Stats'
import Players from './Views/Players/PlayerTable'
import Results from './Views/Results/Results.js'
import Dashboard from './Views/Dashboard/Dashboard'
import { Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios'

function App() {
  return (
    <div className='bg-slate-200'>
      <div>
        <Navbar />
        <GameBar />
      </div>
      <div>
        <Routes>
          <Route exact path='/' element={<Navigate to='/dashboard'/>} />
          <Route exact path='/dashboard' element={<Dashboard />} />
          <Route exact path='/players' element={<Players />} />
          <Route exact path='/stats' element={<Stats />} />
          <Route exact path='/teams' element={<TeamGrid />} />
          <Route exact path='/results' element={<Results />} />
          <Route path='/team/:id' element={<Team />} />
          <Route path='/players/:id' element={<Player />} />
        </Routes>
      </div>
      <div className='w-full h-6'></div>
      <div className='flex justify-end'>
        <span className='text-slate-400 text-sm font-light mr-8 my-2'> floosball v{appVer}</span>
      </div>
    </div>
  );
}

export default App;
