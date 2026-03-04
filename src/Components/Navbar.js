import React, { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useFloosball } from '@/contexts/FloosballContext'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { LoginModal } from './Auth/LoginModal'
import { FavoriteTeamModal } from './Auth/FavoriteTeamModal'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const TrophySVG = () => (
  <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '13px', height: '13px', flexShrink: 0 }}>
    <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
  </svg>
)

const navLinkStyle = (isActive) => ({
  color: isActive ? '#e2e8f0' : '#94a3b8',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: '500',
  transition: 'color 0.2s',
  padding: '10px 0',
  display: 'block',
})

function UserDropdown({ onClose }) {
  const { user, logout, setFavoriteTeam } = useAuth()
  const [teams, setTeams] = useState([])
  const [hoveredTeamId, setHoveredTeamId] = useState(null)
  const panelRef = useRef(null)

  useEffect(() => {
    axios.get(`${API_BASE}/teams`)
      .then(res => {
        const data = res.data
        if (data?.success && Array.isArray(data?.data)) setTeams(data.data)
        else if (Array.isArray(data)) setTeams(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const displayName = user?.username ? `@${user.username}` : user?.email?.split('@')[0]
  const favTeam = teams.find(t => t.id === user?.favoriteTeamId)

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        width: '224px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        zIndex: 200,
        overflow: 'hidden',
        fontFamily: 'pressStart',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </div>
        {user?.username && (
          <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 14px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Favorite Team
        </div>
        {teams.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#475569' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
            {teams.map(team => {
              const isFav = user?.favoriteTeamId === team.id
              const isHov = hoveredTeamId === team.id
              return (
                <button
                  key={team.id}
                  onClick={() => setFavoriteTeam(team.id)}
                  onMouseEnter={() => setHoveredTeamId(team.id)}
                  onMouseLeave={() => setHoveredTeamId(null)}
                  title={`${team.city} ${team.name}`}
                  style={{
                    padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                    borderRadius: '4px',
                    outline: isFav
                      ? `2px solid ${team.color || '#3b82f6'}`
                      : isHov ? '2px solid #475569' : '2px solid transparent',
                    outlineOffset: '1px',
                    transition: 'outline 0.1s',
                  }}
                >
                  <img
                    src={`${API_BASE}/teams/${team.id}/avatar?size=28&v=2`}
                    alt={team.abbr}
                    style={{ width: '28px', height: '28px', display: 'block' }}
                  />
                </button>
              )
            })}
          </div>
        )}
        {favTeam && (
          <div style={{ marginTop: '7px', fontSize: '11px', color: '#94a3b8' }}>
            {favTeam.city} {favTeam.name}
          </div>
        )}
      </div>

      <button
        onClick={() => { logout(); onClose() }}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          padding: '11px 14px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '13px', color: '#94a3b8',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
      >
        Sign Out
      </button>
    </div>
  )
}

export default function Navbar() {
  const { seasonState, lastEvent } = useFloosball()
  const { user, logout } = useAuth()
  const [champion, setChampion] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const isMobile = useIsMobile()

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

  useEffect(() => {
    if (!isMobile) setMenuOpen(false)
  }, [isMobile])

  useEffect(() => {
    if (!user) {
      setShowUserMenu(false)
    } else if (user.favoriteTeamId == null) {
      setShowTeamPicker(true)
    }
  }, [user])

  const displayName = user?.username ? `@${user.username}` : user?.email?.split('@')[0]

  const userControls = user ? (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowUserMenu(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 10px', borderRadius: '6px',
          backgroundColor: showUserMenu ? '#1e293b' : 'transparent',
          border: '1px solid #334155',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {user.favoriteTeamId && (
          <img
            src={`${API_BASE}/teams/${user.favoriteTeamId}/avatar?size=18&v=2`}
            alt=""
            style={{ width: '18px', height: '18px', flexShrink: 0 }}
          />
        )}
        <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
      </button>
      {showUserMenu && <UserDropdown onClose={() => setShowUserMenu(false)} />}
    </div>
  ) : (
    <button
      onClick={() => setShowLogin(true)}
      style={{
        padding: '5px 12px', borderRadius: '6px',
        backgroundColor: 'transparent',
        border: '1px solid #475569',
        cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '12px', color: '#94a3b8', fontWeight: '600',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#e2e8f0' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8' }}
    >
      Sign In
    </button>
  )

  return (
    <>
      <nav style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '12px 16px' : '16px 24px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', minWidth: 0 }}>
              <NavLink to="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }} onClick={() => setMenuOpen(false)}>
                <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>Floosball</h1>
              </NavLink>

              {!isMobile && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#94a3b8' }}>
                  <span>Season {seasonState.seasonNumber}</span>
                  <span>•</span>
                  <span>{seasonState.currentWeekText}</span>
                </div>
              )}

              {!isMobile && champion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingLeft: '8px', borderLeft: '1px solid #334155' }}>
                  <img src={`${API_BASE}/teams/${champion.id}/avatar?size=20&v=2`} alt={champion.name}
                    style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {champion.city} {champion.name}
                  </span>
                  <TrophySVG />
                </div>
              )}
            </div>

            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#94a3b8', flexShrink: 0 }}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '22px', height: '22px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '22px', height: '22px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {['Dashboard', 'Players', 'Records'].map(label => (
                  <NavLink key={label} to={`/${label.toLowerCase()}`}
                    style={({ isActive }) => ({
                      color: isActive ? '#e2e8f0' : '#94a3b8',
                      textDecoration: 'none', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s'
                    })}>
                    {label}
                  </NavLink>
                ))}
                {userControls}
              </div>
            )}
          </div>

          {isMobile && menuOpen && (
            <div style={{ borderTop: '1px solid #1e293b', marginTop: '12px', paddingTop: '4px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', paddingBottom: '8px', display: 'flex', gap: '8px' }}>
                <span>Season {seasonState.seasonNumber}</span>
                <span>•</span>
                <span>{seasonState.currentWeekText}</span>
                {champion && (
                  <>
                    <span>•</span>
                    <img src={`${API_BASE}/teams/${champion.id}/avatar?size=14&v=2`} alt=""
                      style={{ width: '14px', height: '14px', alignSelf: 'center' }} />
                    <span style={{ color: '#f59e0b' }}>{champion.city} {champion.name}</span>
                  </>
                )}
              </div>
              {[['Dashboard', '/dashboard'], ['Players', '/players'], ['Records', '/records']].map(([label, path]) => (
                <NavLink key={label} to={path} onClick={() => setMenuOpen(false)}
                  style={({ isActive }) => navLinkStyle(isActive)}>
                  {label}
                </NavLink>
              ))}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', marginTop: '4px' }}>
                {user ? (
                  <>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{displayName}</div>
                    <button
                      onClick={() => { logout(); setMenuOpen(false) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', color: '#64748b', padding: 0 }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowLogin(true); setMenuOpen(false) }}
                    style={{ background: 'none', border: '1px solid #475569', borderRadius: '5px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: '#94a3b8' }}
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </nav>

      <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
      <FavoriteTeamModal visible={showTeamPicker} onClose={() => setShowTeamPicker(false)} />
    </>
  )
}
