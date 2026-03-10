import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useFloosball } from '@/contexts/FloosballContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { FavoriteTeamModal } from './Auth/FavoriteTeamModal'
import { AuthModal } from './Auth/AuthModal'

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
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.username || 'Unknown'}
        </div>
        {user?.floobits != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#eab308' }}>
              {user.floobits.toLocaleString()}
            </span>
            <span style={{ fontSize: '9px', color: '#a16207', fontWeight: '600' }}>Floobits</span>
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
  const { user, logout, fantasyRoster, refetchRoster } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()
  const [champion, setChampion] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const isMobile = useIsMobile()
  const isTablet = useIsMobile(1200)

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

  // Fantasy points from snapshot (single source of truth)
  const { myEntry } = useFantasySnapshot(user?.id)
  const fantasyPoints = fantasyRoster?.isLocked && myEntry
    ? { totalPoints: myEntry.seasonTotal }
    : null

  // Re-fetch roster on game events
  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'game_end' || wsEvent.event === 'season_end' || wsEvent.event === 'week_start' || wsEvent.event === 'week_end') {
      refetchRoster()
    }
  }, [wsEvent, refetchRoster])

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

  const displayName = user?.username || 'User'

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
      onClick={() => setShowAuthModal(true)}
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
              <NavLink to="/dashboard" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setMenuOpen(false)}>
                <svg width={isMobile ? 24 : 30} height={isMobile ? 24 : 30} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
                  <circle cx="16" cy="16" r="16" fill="#3b82f6" />
                  <g transform="rotate(-45 16 16)">
                    <ellipse cx="16" cy="16" rx="10" ry="6.5" fill="#e2e8f0" />
                    <line x1="6" y1="16" x2="26" y2="16" stroke="#3b82f6" strokeWidth="1.2" />
                    <line x1="13" y1="13.2" x2="13" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
                    <line x1="16" y1="12.5" x2="16" y2="19.5" stroke="#3b82f6" strokeWidth="1" />
                    <line x1="19" y1="13.2" x2="19" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
                  </g>
                </svg>
                <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>Floosball</h1>
              </NavLink>

              {!isMobile && !isTablet && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#94a3b8' }}>
                  <span>Season {seasonState.seasonNumber}</span>
                  <span>•</span>
                  <span>{seasonState.currentWeekText}</span>
                </div>
              )}

              {!isMobile && !isTablet && champion && (
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
                {user?.floobits != null && (
                  <NavLink to="/cards" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px', backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#eab308' }}>
                      {user.floobits.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#a16207' }}>F</span>
                  </NavLink>
                )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: isTablet ? '14px' : '24px' }}>
                {['Dashboard', 'Players', 'Records', 'Fantasy', 'Cards', 'About'].map(label => (
                  <NavLink key={label} to={`/${label.toLowerCase()}`}
                    style={({ isActive }) => ({
                      color: isActive ? '#e2e8f0' : '#94a3b8',
                      textDecoration: 'none', fontSize: isTablet ? '13px' : '14px', fontWeight: '500', transition: 'color 0.2s'
                    })}>
                    {label}
                  </NavLink>
                ))}
                {fantasyPoints && (
                  <NavLink to="/fantasy" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '6px', backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80' }}>
                      {fantasyPoints.totalPoints.toFixed(0)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#22c55e' }}>FP</span>
                  </NavLink>
                )}
                {user?.floobits != null && (
                  <NavLink to="/cards" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#eab308' }}>
                      {user.floobits.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#a16207' }}>F</span>
                  </NavLink>
                )}
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
              {[['Dashboard', '/dashboard'], ['Players', '/players'], ['Records', '/records'], ['Fantasy', '/fantasy'], ['Cards', '/cards'], ['About', '/about']].map(([label, path]) => (
                <NavLink key={label} to={path} onClick={() => setMenuOpen(false)}
                  style={({ isActive }) => navLinkStyle(isActive)}>
                  {label}
                </NavLink>
              ))}
              {fantasyPoints && (
                <NavLink to="/fantasy" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4ade80' }}>
                    {fantasyPoints.totalPoints.toFixed(0)} FP
                  </span>
                  <span style={{ fontSize: '11px', color: '#22c55e' }}>Fantasy Points</span>
                </NavLink>
              )}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', marginTop: '4px' }}>
                {user ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{displayName}</span>
                      {user.floobits != null && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#eab308' }}>
                          {user.floobits.toLocaleString()} Floobits
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { logout(); setMenuOpen(false) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', color: '#64748b', padding: 0 }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMenuOpen(false); setShowAuthModal(true) }}
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

      <FavoriteTeamModal visible={showTeamPicker} onClose={() => setShowTeamPicker(false)} />
      <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
