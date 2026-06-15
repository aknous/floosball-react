import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSidebar, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAchievements } from '@/contexts/AchievementsContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { isFeatureSeen, FEATURE_CARDS, FEATURE_SUPPORTER } from '@/utils/featureAnnounce'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// New-feature "ping": a soft pulsing dot with an expanding ring. Distinct from
// the count badges (achievements / dividends) — it just says "look here".
if (typeof document !== 'undefined' && !document.getElementById('feature-ping-kf')) {
  const style = document.createElement('style')
  style.id = 'feature-ping-kf'
  style.textContent = `
    @keyframes featurePingRing { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(2.4); opacity: 0; } }
    @keyframes featurePingDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
  `
  document.head.appendChild(style)
}

const FeaturePing: React.FC = () => (
  <span style={{
    position: 'absolute', top: '-3px', right: '-5px',
    width: '9px', height: '9px', pointerEvents: 'none',
  }}>
    <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      backgroundColor: '#22d3ee', animation: 'featurePingRing 1.8s ease-out infinite',
    }} />
    <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      backgroundColor: '#22d3ee', border: '2px solid #0f172a',
      animation: 'featurePingDot 1.8s ease-in-out infinite',
    }} />
  </span>
)


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
    key: 'teams',
    label: 'League',
    path: '/teams',
    icon: (
      // Pennant flag on a pole — classic team-spirit aesthetic
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 2h2v1l11 4-11 4v7H3V2z" />
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
    key: 'frontoffice',
    label: 'Team Management',
    path: '/front-office',
    icon: (
      // Building/tower icon — represents the front-office HQ where fans fund,
      // vote, and scout rookies.
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 2h12v16h-4v-4h-4v4H4V2zm2 2v2h2V4H6zm4 0v2h2V4h-2zm4 0v2h2V4h-2zM6 8v2h2V8H6zm4 0v2h2V8h-2zm4 0v2h2V8h-2zM6 12v2h2v-2H6zm8 0v2h2v-2h-2z" />
      </svg>
    ),
  },
  {
    key: 'bracket',
    label: 'Bracket',
    path: '/bracket',
    icon: (
      // Tournament bracket — four slots merging to a final.
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5h4M6 11h4M10 5v6M10 8h4" />
        <path d="M6 13h4M6 19h4M10 13v6M10 16h4" />
        <path d="M14 8v8M14 12h3" />
      </svg>
    ),
  },
  {
    key: 'awards',
    label: 'Awards',
    path: '/awards',
    icon: (
      // Trophy — MVP & Hall of Fame voting (season's-end only).
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" />
      </svg>
    ),
  },
  {
    key: 'achievements',
    label: 'Achievements',
    path: '/achievements',
    icon: (
      // Trophy with cup + handles + base
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2a3 3 0 003 3h.34A4.5 4.5 0 009 13v2H7v2h6v-2h-2v-2a4.5 4.5 0 003.66-2H15a3 3 0 003-3V6a2 2 0 00-2-2h-2V3a1 1 0 00-1-1H7zM4 6h2v3H5a1 1 0 01-1-1V6zm12 0v2a1 1 0 01-1 1h-1V6h2z" />
      </svg>
    ),
  },
  {
    key: 'history',
    label: 'History',
    path: '/history',
    icon: (
      // Hardcover book — closed, slight bookmark/page indicator at bottom
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 3a2 2 0 012-2h9a2 2 0 012 2v13a1 1 0 01-1.5.87L10 14.74l-5.5 2.13A1 1 0 013 16V3zm2 0v11.34l4-1.55 4 1.55V3H6z" />
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
  const { user, getToken } = useAuth()
  const { unclaimedCount } = useAchievements()
  const { seasonState } = useFloosball()
  const location = useLocation()

  // Supporter dividends waiting to be claimed → a badge on the Front Office
  // entry. Refresh on mount, on navigation, on a slow interval (to catch
  // week-end accrual), and when the Front Office page reports a claim.
  const [supporterUnclaimed, setSupporterUnclaimed] = useState(0)
  useEffect(() => {
    if (!user) { setSupporterUnclaimed(0); return }
    let cancelled = false
    const loadSupporter = async () => {
      try {
        const tok = await getToken()
        const res = await fetch(`${API_BASE}/supporter/me`, { headers: { Authorization: `Bearer ${tok}` } })
        const json = await res.json()
        const amt = (json?.data?.unclaimed ?? 0) as number
        if (!cancelled) setSupporterUnclaimed(amt)
      } catch { /* keep last */ }
    }
    loadSupporter()
    const id = setInterval(loadSupporter, 180_000)
    window.addEventListener('supporter:claimed', loadSupporter)
    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('supporter:claimed', loadSupporter)
    }
  }, [user, getToken, location.pathname])

  // Awards (MVP / Hall of Fame) voting is season's-end only — the nav entry
  // appears only while a window is open. Public status endpoint, no auth.
  const [awardsOpen, setAwardsOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    const loadAwards = async () => {
      try {
        const res = await fetch(`${API_BASE}/awards/status`)
        const json = await res.json()
        if (!cancelled) setAwardsOpen(!!json?.data?.anyOpen)
      } catch { /* keep last */ }
    }
    loadAwards()
    const id = setInterval(loadAwards, 180_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [location.pathname])

  // New-feature pings (Cards systems, Supporter). Clear when the user has seen
  // the announcement (markFeatureSeen dispatches 'feature:seen').
  const [featureSeen, setFeatureSeen] = useState({
    cards: isFeatureSeen(FEATURE_CARDS),
    supporter: isFeatureSeen(FEATURE_SUPPORTER),
  })
  useEffect(() => {
    const refresh = () => setFeatureSeen({
      cards: isFeatureSeen(FEATURE_CARDS),
      supporter: isFeatureSeen(FEATURE_SUPPORTER),
    })
    refresh()
    window.addEventListener('feature:seen', refresh)
    return () => window.removeEventListener('feature:seen', refresh)
  }, [location.pathname])

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
        {NAV_ITEMS.filter(item => {
          // Team Management is a per-user hub (contribute, ballots, etc.).
          // Signed-out visitors have no team to manage — hide the entry.
          if (item.key === 'frontoffice' && !user) return false
          // Bracket challenge only opens once the playoffs are seeded — hide
          // the entry during the regular season.
          if (item.key === 'bracket' && !seasonState.bracketAvailable) return false
          // Awards voting is season's-end only — show the entry only while a
          // window (MVP or Hall of Fame) is open.
          if (item.key === 'awards' && !awardsOpen) return false
          return true
        }).map(item => {
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
                paddingRight: '12px',
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
                {/* Team Management gets the favorite team's avatar as its icon
                    when the user has one set — the page is a team-specific
                    hub, so using the team's logo is more meaningful than the
                    generic building icon. Falls back to the building if the
                    user hasn't picked a favorite team yet. */}
                {item.key === 'frontoffice' && user?.favoriteTeamId ? (
                  <img
                    src={`/avatars/${user.favoriteTeamId}.png`}
                    alt={favTeamName || 'Team Management'}
                    style={{ width: '24px', height: '24px' }}
                  />
                ) : item.icon}
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
                {/* Front Office: a gold dot when supporter dividends are claimable. */}
                {item.key === 'frontoffice' && supporterUnclaimed > 0 && !expanded && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-4px',
                    width: '10px', height: '10px', borderRadius: '5px',
                    backgroundColor: '#fbbf24', border: '2px solid #0f172a',
                  }} />
                )}
                {/* Awards: a gold dot while voting is open (the entry only
                    appears in-window, so this just draws the eye). */}
                {item.key === 'awards' && !expanded && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-4px',
                    width: '10px', height: '10px', borderRadius: '5px',
                    backgroundColor: '#fbbf24', border: '2px solid #0f172a',
                  }} />
                )}
                {/* New-feature pings (until the user has seen the announcement). */}
                {item.key === 'cards' && user && !featureSeen.cards && <FeaturePing />}
                {item.key === 'frontoffice' && user && !featureSeen.supporter && <FeaturePing />}
              </span>
              {expanded && (
                <span style={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  {item.key === 'achievements' && unclaimedCount > 0 && (
                    <span style={{
                      flexShrink: 0, marginLeft: 'auto',
                      minWidth: '18px', height: '18px', padding: '0 6px',
                      borderRadius: '9px', backgroundColor: '#f59e0b', color: '#0f172a',
                      fontSize: '10px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {unclaimedCount}
                    </span>
                  )}
                  {/* Gold pill = claimable dividends, capped so it never widens
                      enough to clip against the sidebar edge. */}
                  {item.key === 'frontoffice' && supporterUnclaimed > 0 && (
                    <span style={{
                      flexShrink: 0, marginLeft: 'auto',
                      minWidth: '18px', height: '18px', padding: '0 6px',
                      borderRadius: '9px', backgroundColor: '#fbbf24', color: '#0f172a',
                      fontSize: '10px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {supporterUnclaimed > 99 ? '99+' : supporterUnclaimed}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          )
        })}

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
