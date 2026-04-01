import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useFloosball } from '@/contexts/FloosballContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useUser } from '@clerk/react'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { FavoriteTeamModal } from './Auth/FavoriteTeamModal'
import { AuthModal } from './Auth/AuthModal'
import ShopModal from './Shop/ShopModal'
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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const notifTypeColors = {
  leaderboard_weekly: '#f59e0b',
  leaderboard_season: '#a78bfa',
  season_fp_payout: '#eab308',
  favorite_team: '#f43f5e',
}

function UserDropdown({ onClose, notifications, onMarkAllRead, onOpenTeamPicker }) {
  const { user, logout, getToken } = useAuth()
  const [emailOptOut, setEmailOptOut] = useState(user?.emailOptOut ?? false)
  const [emailDayReport, setEmailDayReport] = useState(user?.emailDayReport ?? true)
  const [emailSeasonReport, setEmailSeasonReport] = useState(user?.emailSeasonReport ?? true)
  const panelRef = useRef(null)
  const unreadNotifs = notifications.filter(n => !n.isRead)

  const patchPreference = useCallback(async (body) => {
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API_BASE}/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(body),
      })
    } catch { /* silent */ }
  }, [getToken])

  const toggleEmailOptOut = useCallback(async () => {
    const newVal = !emailOptOut
    setEmailOptOut(newVal)
    patchPreference({ emailOptOut: newVal })
  }, [emailOptOut, patchPreference])

  const toggleDayReport = useCallback(async () => {
    const newVal = !emailDayReport
    setEmailDayReport(newVal)
    patchPreference({ emailDayReport: newVal })
  }, [emailDayReport, patchPreference])

  const toggleSeasonReport = useCallback(async () => {
    const newVal = !emailSeasonReport
    setEmailSeasonReport(newVal)
    patchPreference({ emailSeasonReport: newVal })
  }, [emailSeasonReport, patchPreference])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

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
        {user?.email && (
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        )}
      </div>

      <button
        onClick={() => { onOpenTeamPicker(); onClose() }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
          padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #334155',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {user?.favoriteTeamId && (
          <img
            src={`${API_BASE}/teams/${user.favoriteTeamId}/avatar?size=20&v=2`}
            alt=""
            style={{ width: '20px', height: '20px', flexShrink: 0 }}
          />
        )}
        <span style={{ fontSize: '11px', color: '#cbd5e1', flex: 1 }}>
          {user?.favoriteTeamId ? 'Change Favorite Team' : 'Pick Favorite Team'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {user?.favoriteTeamId && (
        <NavLink
          to={`/team/${user.favoriteTeamId}`}
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '10px 14px', background: 'none', borderBottom: '1px solid #334155',
            textDecoration: 'none',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ fontSize: '11px', color: '#cbd5e1', flex: 1 }}>
            My Team
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </NavLink>
      )}

      <div style={{ padding: '8px 14px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Email notifications</span>
          <button
            onClick={toggleEmailOptOut}
            style={{
              width: '32px', height: '18px', borderRadius: '9px', border: 'none',
              backgroundColor: emailOptOut ? '#334155' : '#3b82f6',
              cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
            }}
          >
            <div style={{
              width: '14px', height: '14px', borderRadius: '7px',
              backgroundColor: '#fff', position: 'absolute', top: '2px',
              left: emailOptOut ? '2px' : '16px', transition: 'left 0.2s',
            }} />
          </button>
        </div>
        <div style={{ marginTop: '8px', paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '6px', opacity: emailOptOut ? 0.35 : 1, pointerEvents: emailOptOut ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Game Day Reports</span>
            <button
              onClick={toggleDayReport}
              style={{
                width: '28px', height: '16px', borderRadius: '8px', border: 'none',
                backgroundColor: emailDayReport ? '#3b82f6' : '#334155',
                cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
              }}
            >
              <div style={{
                width: '12px', height: '12px', borderRadius: '6px',
                backgroundColor: '#fff', position: 'absolute', top: '2px',
                left: emailDayReport ? '14px' : '2px', transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Season Reports</span>
            <button
              onClick={toggleSeasonReport}
              style={{
                width: '28px', height: '16px', borderRadius: '8px', border: 'none',
                backgroundColor: emailSeasonReport ? '#3b82f6' : '#334155',
                cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
              }}
            >
              <div style={{
                width: '12px', height: '12px', borderRadius: '6px',
                backgroundColor: '#fff', position: 'absolute', top: '2px',
                left: emailSeasonReport ? '14px' : '2px', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      </div>

      <NavLink
        to="/cards"
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
          padding: '10px 14px', background: 'none', borderBottom: '1px solid #334155',
          textDecoration: 'none',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span style={{ fontSize: '11px', color: '#cbd5e1', flex: 1 }}>
          Card Collection
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </NavLink>

      {/* Notifications */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Notifications
          </div>
          {unreadNotifs.length > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#3b82f6', fontWeight: '600', padding: 0 }}
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>No notifications yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
            {notifications.slice(0, 10).map(n => (
              <div key={n.id} style={{
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                padding: '5px 6px', borderRadius: '5px',
                backgroundColor: n.isRead ? 'transparent' : 'rgba(59,130,246,0.06)',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '3px', flexShrink: 0, marginTop: '4px',
                  backgroundColor: n.isRead ? 'transparent' : (notifTypeColors[n.type] || '#3b82f6'),
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: n.isRead ? '500' : '600', color: n.isRead ? '#cbd5e1' : '#e2e8f0', lineHeight: '1.3' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.3', marginTop: '1px' }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                    {n.createdAt ? timeAgo(n.createdAt) : ''}
                  </div>
                </div>
              </div>
            ))}
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
  const { user, logout, getToken, fantasyRoster, refetchRoster, refetchUser } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const { event: wsEvent } = useSeasonWebSocket()
  const [champion, setChampion] = useState(null)
  const [favoriteTeam, setFavoriteTeam] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const isMobile = useIsMobile()
  const isTablet = useIsMobile(1200)
  const { user: clerkUser } = useUser()
  const isAdmin = clerkUser?.publicMetadata?.role === 'admin'

  // Poll for notification count
  const hasUser = !!user
  useEffect(() => {
    if (!hasUser) return
    const fetchCount = async () => {
      try {
        const tok = await getTokenRef.current()
        if (!tok) return
        const res = await fetch(`${API_BASE}/notifications/count`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unread || 0)
        }
      } catch { /* silent */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [hasUser])

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (!showUserMenu || !user) return
    const fetchNotifs = async () => {
      try {
        const tok = await getTokenRef.current()
        if (!tok) return
        const res = await fetch(`${API_BASE}/notifications`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
        }
      } catch { /* silent */ }
    }
    fetchNotifs()
  }, [showUserMenu, user])

  const markAllRead = useCallback(async () => {
    try {
      const tok = await getTokenRef.current()
      if (!tok) return
      await fetch(`${API_BASE}/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }, [getToken])

  const fetchStandings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/standings`)
      const allTeams = res.data.flatMap(l => l.standings)
      if (user?.favoriteTeamId) {
        const fav = allTeams.find(t => t.id === user.favoriteTeamId)
        setFavoriteTeam(fav || null)
      }
    } catch (err) {}
  }

  const fetchChampion = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reigning-champion`)
      setChampion(res.data?.data || null)
    } catch { setChampion(null) }
  }

  useEffect(() => { fetchStandings() }, [user?.favoriteTeamId])
  useEffect(() => { fetchChampion() }, [])
  useEffect(() => {
    if (lastEvent?.event === 'season_end') { fetchStandings(); fetchChampion() }
  }, [lastEvent])

  // Fantasy points from snapshot (single source of truth)
  const { myEntry } = useFantasySnapshot(user?.id)
  const fantasyPoints = fantasyRoster?.isLocked && myEntry
    ? { weekPoints: (myEntry.weekPlayerFP ?? 0) + (myEntry.weekCardBonus ?? 0), seasonTotal: myEntry.seasonTotal }
    : null

  // Re-fetch roster on game events; refetch user balance on week/season end (prizes awarded)
  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'game_start' || wsEvent.event === 'game_end' || wsEvent.event === 'season_end' || wsEvent.event === 'week_start' || wsEvent.event === 'week_end') {
      refetchRoster()
    }
    if (wsEvent.event === 'game_end' || wsEvent.event === 'week_end' || wsEvent.event === 'season_end') {
      refetchUser()
    }
  }, [wsEvent, refetchRoster, refetchUser])

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
        <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        {unreadCount > 0 && (
          <div style={{
            width: '8px', height: '8px', borderRadius: '4px',
            backgroundColor: '#38bdf8', flexShrink: 0,
          }} />
        )}
      </button>
      {showUserMenu && <UserDropdown onClose={() => setShowUserMenu(false)} notifications={notifications} onMarkAllRead={markAllRead} onOpenTeamPicker={() => setShowTeamPicker(true)} />}
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
                <img
                  src={`${API_BASE}/logo?size=${isMobile ? 24 : 30}`}
                  alt="Floosball"
                  width={isMobile ? 24 : 30}
                  height={isMobile ? 24 : 30}
                  style={{ flexShrink: 0, borderRadius: '50%' }}
                />
                <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>Floosball</h1>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.30)', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.5px', alignSelf: 'center', marginTop: isMobile ? '1px' : '2px' }}>BETA</span>
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
                {fantasyPoints && (
                  <NavLink to="/fantasy" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', backgroundColor: 'rgba(34,197,94,0.12)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#4ade80' }}>
                      {fantasyPoints.weekPoints.toFixed(0)}
                    </span>
                    <span style={{ fontSize: '10px', color: '#22c55e' }}>FP</span>
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
                {['Dashboard', 'Players', 'Fantasy', 'About'].map(label => (
                  <NavLink key={label} to={`/${label.toLowerCase()}`}
                    style={({ isActive }) => ({
                      color: isActive ? '#e2e8f0' : '#94a3b8',
                      textDecoration: 'none', fontSize: isTablet ? '13px' : '14px', fontWeight: '500', transition: 'color 0.2s'
                    })}>
                    {label}
                  </NavLink>
                ))}
                {user?.favoriteTeamId && favoriteTeam && (
                  <NavLink to={`/team/${user.favoriteTeamId}`}
                    style={({ isActive }) => ({
                      textDecoration: 'none', fontSize: isTablet ? '12px' : '13px', fontWeight: '600', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '6px',
                      border: `1px solid ${favoriteTeam.color}60`,
                      backgroundColor: isActive ? `${favoriteTeam.color}20` : `${favoriteTeam.color}10`,
                      color: isActive ? '#e2e8f0' : '#cbd5e1',
                    })}>
                    <img
                      src={`${API_BASE}/teams/${user.favoriteTeamId}/avatar?size=16&v=2`}
                      alt=""
                      style={{ width: '16px', height: '16px' }}
                    />
                    {favoriteTeam.name}
                  </NavLink>
                )}
                {fantasyPoints && (
                  <NavLink to="/fantasy" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 12px', height: '31px', borderRadius: '6px', backgroundColor: 'rgba(34,197,94,0.12)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#4ade80' }}>
                        {fantasyPoints.weekPoints.toFixed(0)}
                      </span>
                      <span style={{ fontSize: '7px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Week</span>
                    </div>
                    <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(34,197,94,0.25)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80' }}>
                        {fantasyPoints.seasonTotal.toFixed(0)}
                      </span>
                      <span style={{ fontSize: '7px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Season</span>
                    </div>
                    <span style={{ fontSize: '9px', color: '#22c55e' }}>FP</span>
                  </NavLink>
                )}
                {user?.floobits != null && (
                  <button onClick={() => setShowShop(true)} style={{ background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '6px', backgroundColor: 'rgba(234,179,8,0.12)', fontFamily: 'inherit' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#eab308' }}>
                      {user.floobits.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#ca8a04' }}>F</span>
                  </button>
                )}
                {isAdmin && (
                  <NavLink to="/admin" style={({ isActive }) => ({
                    color: isActive ? '#f87171' : '#64748b',
                    textDecoration: 'none', fontSize: isTablet ? '13px' : '14px', fontWeight: '500', transition: 'color 0.2s',
                  })}>
                    Admin
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
              {[['Dashboard', '/dashboard'], ['Players', '/players'], ['Fantasy', '/fantasy'], ['About', '/about'], ...(isAdmin ? [['Admin', '/admin']] : [])].map(([label, path]) => (
                <NavLink key={label} to={path} onClick={() => setMenuOpen(false)}
                  style={({ isActive }) => navLinkStyle(isActive)}>
                  {label}
                </NavLink>
              ))}
              {user?.favoriteTeamId && favoriteTeam && (
                <NavLink to={`/team/${user.favoriteTeamId}`} onClick={() => setMenuOpen(false)}
                  style={({ isActive }) => ({
                    ...navLinkStyle(isActive), display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 10px', borderRadius: '6px', marginTop: '4px',
                    border: `1px solid ${favoriteTeam.color}60`,
                    backgroundColor: `${favoriteTeam.color}10`,
                  })}>
                  <img src={`${API_BASE}/teams/${user.favoriteTeamId}/avatar?size=14&v=2`} alt="" style={{ width: '14px', height: '14px' }} />
                  {favoriteTeam.name}
                </NavLink>
              )}
              {fantasyPoints && (
                <NavLink to="/fantasy" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: '6px', padding: '8px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4ade80' }}>
                    {fantasyPoints.weekPoints.toFixed(0)} FP
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    / {fantasyPoints.seasonTotal.toFixed(0)} season
                  </span>
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
      {showShop && <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />}
    </>
  )
}
