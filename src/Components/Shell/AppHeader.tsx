import React, { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { UserDropdown } from '@/Components/Navbar'
import { FavoriteTeamModal } from '@/Components/Auth/FavoriteTeamModal'
import ShopModal from '@/Components/Shop/ShopModal'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from './tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const REGULAR_SEASON_WEEKS = 28

const TrophyIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill={ACCENT.warning} style={{ flexShrink: 0 }}>
    <path d="M5 2h10v1h3v3a3 3 0 01-3 3h-.4A5 5 0 0111 11.9V14h2.5a1 1 0 011 1v1h-9v-1a1 1 0 011-1H9v-2.1A5 5 0 015.4 9H5a3 3 0 01-3-3V3h3V2zm0 2H3.5v2A1.5 1.5 0 005 7.5V4zm10 0v3.5A1.5 1.5 0 0016.5 6V4H15z" />
  </svg>
)

const SearchIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill={TEXT.dim} style={{ flexShrink: 0 }}>
    <path d="M8 3a5 5 0 013.9 8.1l4 4-1.4 1.4-4-4A5 5 0 118 3zm0 2a3 3 0 100 6 3 3 0 000-6z" />
  </svg>
)

/**
 * The top header: identity on the left, the user on the right.
 *
 * The reigning-champion block replaced a "N games live" pill in review — the live count
 * already lives on the Games nav entry and in the front page's own band, so the header
 * slot was better spent on something no other surface shows.
 *
 * The Criticality and Rulebook indicators that used to sit here are deliberately gone:
 * anomaly status moves to the front page and the active ruleset to the game board, where
 * each has room to say something rather than being a lone glyph in the chrome.
 */
const AppHeader: React.FC = () => {
  const { seasonState } = useFloosball()
  const { user, getToken } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()

  const [champion, setChampion] = useState<any>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  // The reigning champion only changes at season end, but a stale cached value here is
  // very visible, so the cache is burned on every call.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reigning-champion?t=${Date.now()}`)
        if (!cancelled) setChampion(res.data?.data || null)
      } catch { if (!cancelled) setChampion(null) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const type = (wsEvent as any)?.type
    if (type === 'season_end' || type === 'season_start') {
      axios.get(`${API_BASE}/reigning-champion?t=${Date.now()}`)
        .then(res => setChampion(res.data?.data || null))
        .catch(() => { /* keep the last known champion */ })
    }
  }, [wsEvent])

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }
    let cancelled = false
    const load = async () => {
      try {
        const tok = await getTokenRef.current()
        if (!tok) return
        const res = await fetch(`${API_BASE}/notifications/count`, { headers: { Authorization: `Bearer ${tok}` } })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setUnreadCount(data.unread || 0)
      } catch { /* keep last */ }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user])

  useEffect(() => {
    if (!showUserMenu || !user) return
    const load = async () => {
      try {
        const tok = await getTokenRef.current()
        if (!tok) return
        const res = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${tok}` } })
        if (!res.ok) return
        const data = await res.json()
        setNotifications(data.notifications || [])
      } catch { /* keep last */ }
    }
    load()
  }, [showUserMenu, user])

  const markAllRead = async () => {
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
    } catch { /* keep last */ }
  }

  // ⚠️ The picker is NO LONGER forced open (owner). Landing on a modal before you
  // have seen anything is the worst moment to ask someone to pick a club — the
  // front page's own team panel offers it instead, once there is a league on
  // screen to pick from. The modal itself stays: `floosball:open-team-picker`
  // opens it from the team panel, the achievements page and anywhere else.
  useEffect(() => {
    if (!user) setShowUserMenu(false)
  }, [user])

  useEffect(() => {
    const openTeamPicker = () => setShowTeamPicker(true)
    const openShop = () => setShowShop(true)
    window.addEventListener('floosball:show-favorite-team-picker', openTeamPicker)
    window.addEventListener('floosball:show-shop', openShop)
    return () => {
      window.removeEventListener('floosball:show-favorite-team-picker', openTeamPicker)
      window.removeEventListener('floosball:show-shop', openShop)
    }
  }, [])

  const weekLabel = seasonState.seasonComplete
    ? seasonState.currentWeekText
    : seasonState.currentWeek > REGULAR_SEASON_WEEKS
      ? seasonState.currentWeekText
      : `Week ${seasonState.currentWeek} of ${REGULAR_SEASON_WEEKS}`

  return (
    <>
      <header
        className="font-pixel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '22px',
          padding: '14px 22px',
          background: BG.panel,
          borderBottom: `1px solid ${BORDER.hairline}`,
          fontFamily: FONT,
        }}
      >
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
          <img src="/avatars/league_logo.png" alt="" width={28} height={28} style={{ borderRadius: '50%' }} />
          <span style={{ ...font(800, 20, 1, '-0.02em'), color: TEXT.strong }}>Floosball</span>
          <span style={{
            ...font(700, 9, 1, '0.06em'),
            color: ACCENT.warning,
            background: 'rgba(245,158,11,0.28)',
            padding: '3px 5px',
          }}>BETA</span>
        </NavLink>

        <span style={{ width: '1px', height: '22px', background: BORDER.hairline }} />

        {seasonState.seasonNumber > 0 && (
          <>
            <span style={{ ...font(600, 13), color: TEXT.secondary }}>Season {seasonState.seasonNumber}</span>
            {/* The design specifies #64748b here. Raised to the codebase's readable-text
                floor — 13px at #64748b on #0f172a lands under 4.5:1, and the standings
                handoff (the latest of the three) sets #94a3b8 as the floor for any label. */}
            <span style={{ ...font(400, 13), color: TEXT.muted }}>{weekLabel}</span>
          </>
        )}

        {champion && (
          <NavLink
            to={`/team/${champion.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              paddingLeft: '10px', borderLeft: `1px solid ${BORDER.raised}`,
              textDecoration: 'none',
            }}
          >
            <img src={`/avatars/${champion.id}.png`} alt="" width={22} height={22} style={{ flexShrink: 0, borderRadius: '50%' }} />
            <span style={{ ...font(500, 15), color: ACCENT.warning, whiteSpace: 'nowrap' }}>
              {champion.city} {champion.name}
            </span>
            <TrophyIcon />
          </NavLink>
        )}

        <span style={{ flex: 1 }} />

        <ShellSearch />

        {user && (
          <button
            onClick={() => setShowShop(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              ...font(700, 13), color: ACCENT.warning, ...TABULAR,
              padding: 0, fontFamily: FONT,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8" /></svg>
            {(user.floobits ?? 0).toLocaleString()}
          </button>
        )}

        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              className="plate"
              onClick={() => setShowUserMenu(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                background: BG.card, border: `1px solid ${BORDER.hairline}`,
                padding: '5px 10px 5px 6px', cursor: 'pointer', fontFamily: FONT,
              }}
            >
              {user.favoriteTeamId && (
                <img src={`/avatars/${user.favoriteTeamId}.png`} alt="" width={22} height={22} style={{ flexShrink: 0, borderRadius: '50%' }} />
              )}
              <span style={{ ...font(600, 12), color: TEXT.secondary, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username || 'User'}
              </span>
              {unreadCount > 0 && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT.info, flexShrink: 0 }} />
              )}
            </button>
            {showUserMenu && (
              <UserDropdown
                onClose={() => setShowUserMenu(false)}
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onOpenTeamPicker={() => setShowTeamPicker(true)}
              />
            )}
          </div>
        ) : null}
      </header>

      <FavoriteTeamModal visible={showTeamPicker} onClose={() => setShowTeamPicker(false)} />
      {showShop && <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />}
    </>
  )
}

/**
 * Search is a live filter over teams and players. It stays a plain field with a results
 * panel rather than a route — the header is not a place to lose your page from.
 */
const ShellSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<{ teams: any[]; players: any[] }>({ teams: [], players: [] })
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const term = query.trim().toLowerCase()
    if (term.length < 2) { setResults({ teams: [], players: [] }); return }
    let cancelled = false
    const id = setTimeout(async () => {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          fetch(`${API_BASE}/teams`).then(r => r.json()),
          fetch(`${API_BASE}/players?limit=600`).then(r => r.json()),
        ])
        if (cancelled) return
        const teams = (teamsRes?.data ?? teamsRes ?? []) as any[]
        const players = (playersRes?.data ?? playersRes ?? []) as any[]
        setResults({
          teams: teams.filter(t => `${t.city} ${t.name}`.toLowerCase().includes(term)).slice(0, 4),
          players: players.filter(p => (p.name || '').toLowerCase().includes(term)).slice(0, 6),
        })
      } catch { /* leave the last results up */ }
    }, 220)
    return () => { cancelled = true; clearTimeout(id) }
  }, [query])

  const hasResults = results.teams.length > 0 || results.players.length > 0

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: BG.card, border: `1px solid ${BORDER.hairline}`,
        padding: '7px 11px', width: '196px',
      }}>
        <SearchIcon />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Teams, players, cards"
          style={{
            ...font(400, 12), color: TEXT.body,
            background: 'transparent', border: 'none', outline: 'none',
            width: '100%', minWidth: 0, fontFamily: FONT,
          }}
        />
      </label>
      {open && hasResults && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: '260px',
          background: BG.card, border: `1px solid ${BORDER.raised}`, zIndex: 60,
        }}>
          {results.teams.map(t => (
            <NavLink
              key={`t${t.id}`}
              to={`/team/${t.id}`}
              className="row"
              onClick={() => { setOpen(false); setQuery('') }}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 11px', textDecoration: 'none' }}
            >
              <img src={`/avatars/${t.id}.png`} alt="" width={18} height={18} style={{ borderRadius: '50%' }} />
              <span style={{ ...font(600, 12), color: TEXT.body }}>{t.city} {t.name}</span>
            </NavLink>
          ))}
          {results.players.map(p => (
            <NavLink
              key={`p${p.id}`}
              to={`/players/${p.id}`}
              className="row"
              onClick={() => { setOpen(false); setQuery('') }}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 11px', textDecoration: 'none' }}
            >
              <span style={{ ...font(600, 12), color: TEXT.body }}>{p.name}</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...font(400, 10, 1, '0.08em'), color: TEXT.muted }}>{p.position}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default AppHeader
