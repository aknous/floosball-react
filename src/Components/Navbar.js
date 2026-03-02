import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useFloosball } from '@/contexts/FloosballContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const TrophySVG = () => (
  <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '13px', height: '13px', flexShrink: 0 }}>
    <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
  </svg>
)

export default function Navbar() {
  const { seasonState, lastEvent } = useFloosball()
  const [champion, setChampion] = useState(null)

  const fetchChampion = async () => {
    try {
      const res = await axios.get(`${API_BASE}/standings`)
      const champ = res.data.flatMap(l => l.standings).find(t => t.floosbowlChampion)
      setChampion(champ || null)
    } catch (err) {}
  }

  useEffect(() => { fetchChampion() }, [])

  useEffect(() => {
    if (lastEvent?.event === 'season_end') fetchChampion()
  }, [lastEvent])

  return (
    <nav style={{ 
      backgroundColor: '#0f172a', 
      borderBottom: '1px solid #334155',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* Logo/Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <NavLink to="/dashboard" style={{ textDecoration: 'none' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>Floosball</h1>
          </NavLink>
          
          {/* Season Info */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#94a3b8' }}>
            <span>Season {seasonState.seasonNumber}</span>
            <span>•</span>
            <span>{seasonState.currentWeekText}</span>
          </div>

          {/* Reigning Champion */}
          {champion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingLeft: '8px', borderLeft: '1px solid #334155' }}>
              <img
                src={`${API_BASE}/teams/${champion.id}/avatar?size=20&v=2`}
                alt={champion.name}
                style={{ width: '20px', height: '20px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                {champion.city} {champion.name}
              </span>
              <TrophySVG />
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <NavLink 
            to="/dashboard" 
            style={({ isActive }) => ({
              color: isActive ? '#e2e8f0' : '#94a3b8',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s'
            })}
          >
            Dashboard
          </NavLink>
<NavLink 
            to="/players" 
            style={({ isActive }) => ({
              color: isActive ? '#e2e8f0' : '#94a3b8',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s'
            })}
          >
            Players
          </NavLink>
          <NavLink
            to="/records"
            style={({ isActive }) => ({
              color: isActive ? '#e2e8f0' : '#94a3b8',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s'
            })}
          >
            Records
          </NavLink>
        </div>
      </div>
    </nav>
  )
}