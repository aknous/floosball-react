import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSidebar, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAchievements } from '@/contexts/AchievementsContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'


const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
      </svg>
    ),
  },
  {
    key: 'players',
    label: 'Players',
    path: '/players',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
      </svg>
    ),
  },
  {
    key: 'fantasy',
    label: 'Fantasy',
    path: '/fantasy',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  {
    key: 'cards',
    label: 'Cards',
    path: '/cards',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
        <path d="M16 5v10a2 2 0 01-2 2h1a2 2 0 002-2V7a2 2 0 00-2-2h1z" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: 'rookies',
    label: 'Rookies',
    path: '/rookies',
    icon: (
      // Upward-pointing arrow + dot (prospect rising) — visually distinct from
      // the player silhouette used for Players.
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3a1 1 0 01.7.3l4 4a1 1 0 11-1.4 1.4L11 6.4V15a1 1 0 11-2 0V6.4L6.7 8.7A1 1 0 115.3 7.3l4-4A1 1 0 0110 3z" />
      </svg>
    ),
  },
  {
    key: 'achievements',
    label: 'Achievements',
    path: '/achievements',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a1 1 0 011 1v1h3a1 1 0 011 1v2a4 4 0 01-3.528 3.971A4.002 4.002 0 0111 14.874V16h2a1 1 0 110 2H7a1 1 0 110-2h2v-1.126A4.002 4.002 0 015.528 10.97 4 4 0 012 7V5a1 1 0 011-1h3V3a1 1 0 011-1h3zM4 6v1a2 2 0 001.26 1.857A6 6 0 016 7V6H4zm12 0h-2v1c0 .3.022.593.06.878A2 2 0 0016 7V6z" />
      </svg>
    ),
  },
  {
    key: 'guide',
    label: 'Guide',
    path: '/about',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
]

const FOOTER_HEIGHT = 37

const Sidebar: React.FC<{ headerHeight?: number }> = ({ headerHeight = 64 }) => {
  const { collapsed, toggle } = useSidebar()
  const [hovered, setHovered] = useState(false)
  const { user } = useAuth()
  const { unclaimedCount } = useAchievements()
  const location = useLocation()

  // Look up favorite team name for the nav item. Cached in localStorage keyed
  // by team id so name shows immediately on reload; refresh in the background.
  const favTeamId = user?.favoriteTeamId ?? null
  const cacheKey = favTeamId ? `favTeamName:${favTeamId}` : null
  const [favTeamName, setFavTeamName] = useState<string | null>(() => {
    if (!cacheKey) return null
    try { return localStorage.getItem(cacheKey) } catch { return null }
  })
  useEffect(() => {
    if (!favTeamId || !cacheKey) {
      setFavTeamName(null)
      return
    }
    // Hydrate from cache if the id changed
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) setFavTeamName(cached)
    } catch {}
    let cancelled = false
    fetch(`${API_BASE}/teams/${favTeamId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        const team = json?.data ?? json
        const name = team?.name
        if (!name) return
        setFavTeamName(name)
        try { localStorage.setItem(cacheKey, name) } catch {}
      })
      .catch(() => { /* keep cached value */ })
    return () => { cancelled = true }
  }, [favTeamId, cacheKey])
  const expanded = !collapsed || (collapsed && hovered)
  const width = expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED

  const handleToggle = () => {
    if (expanded) {
      // Collapse: dismiss persistent state + hover peek
      if (!collapsed) toggle()
      setHovered(false)
    } else {
      // Expand
      toggle()
    }
  }

  return (
    <nav
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        top: headerHeight,
        left: 0,
        bottom: FOOTER_HEIGHT,
        width,
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Nav items */}
      <div style={{ flex: 1, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')
          return (
            <NavLink
              key={item.key}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 0',
                paddingLeft: '20px',
                textDecoration: 'none',
                color: isActive ? '#e2e8f0' : '#cbd5e1',
                backgroundColor: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                minHeight: '40px',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
                {item.icon}
                {item.key === 'achievements' && unclaimedCount > 0 && !expanded && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-4px',
                    minWidth: '14px', height: '14px', padding: '0 3px',
                    borderRadius: '7px', backgroundColor: '#f59e0b', color: '#0f172a',
                    fontSize: '9px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unclaimedCount > 9 ? '9+' : unclaimedCount}
                  </span>
                )}
              </span>
              {expanded && (
                <span style={{ fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.label}
                  {item.key === 'achievements' && unclaimedCount > 0 && (
                    <span style={{
                      minWidth: '18px', height: '18px', padding: '0 6px',
                      borderRadius: '9px', backgroundColor: '#f59e0b', color: '#0f172a',
                      fontSize: '10px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {unclaimedCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          )
        })}

        {/* My Team — conditional */}
        {user?.favoriteTeamId && (
          <NavLink
            to={`/team/${user.favoriteTeamId}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 0',
              paddingLeft: '20px',
              textDecoration: 'none',
              color: location.pathname === `/team/${user.favoriteTeamId}` ? '#e2e8f0' : '#cbd5e1',
              backgroundColor: location.pathname === `/team/${user.favoriteTeamId}` ? 'rgba(59,130,246,0.1)' : 'transparent',
              borderLeft: location.pathname === `/team/${user.favoriteTeamId}` ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              minHeight: '40px',
            }}
            onMouseEnter={e => {
              if (location.pathname !== `/team/${user.favoriteTeamId}`) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              if (location.pathname !== `/team/${user.favoriteTeamId}`) e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <img
              src={`/avatars/${user.favoriteTeamId}.png`}
              alt="My Team"
              style={{ width: '24px', height: '24px', flexShrink: 0 }}
            />
            {expanded && (
              <span style={{ fontSize: '15px', fontWeight: '500' }}>
                {favTeamName || 'My Team'}
              </span>
            )}
          </NavLink>
        )}
        {/* Toggle */}
        <button
          onClick={handleToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 0',
            paddingLeft: '22px',
            border: 'none',
            background: 'none',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'color 0.15s',
            minHeight: '40px',
            width: '100%',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          {expanded && (
            <span style={{ fontSize: '15px', fontWeight: '500' }}>
              Collapse
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}

export default Sidebar
