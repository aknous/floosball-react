import React, { useState, useCallback, useEffect, useRef } from 'react'
import HoverTooltip from '@/Components/HoverTooltip'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K']
const TIERS = ['Random', 'S', 'A', 'B', 'C', 'D']

const TIER_COLORS: Record<string, string> = {
  S: '#f59e0b',
  A: '#22c55e',
  B: '#3b82f6',
  C: '#94a3b8',
  D: '#ef4444',
}

const TIER_LABELS: Record<string, string> = {
  S: 'S (93+)',
  A: 'A (87–92)',
  B: 'B (77–86)',
  C: 'C (69–76)',
  D: 'D (<69)',
  Random: 'Random',
}

interface CreatedPlayer {
  name: string
  position: string
  rating: number
  tier: string
}

interface MonitorData {
  deploySafety: { safe: boolean; reason: string }
  simulation: { isActive: boolean; phase: string; lastSaved: string | null }
  season: {
    seasonNumber: number; currentWeek: number; currentWeekText: string | null
    inPlayoffs: boolean; playoffRound: string | null; isComplete: boolean
    champion: string | null; mvp: string | null
    totalGames: number; completedGames: number
  }
  liveGames: { active: number; scheduled: number; final: number }
  timing: { mode: string | null; catchingUp: boolean }
  counts: { teams: number; activePlayers: number; freeAgents: number; retiredPlayers: number; hallOfFame: number }
  websockets: { total_connections: number; unique_users: number; channels: Record<string, number> }
  personality?: {
    total: number
    baseVibes: number
    commonVariants: number
    rareVariants: number
    unassigned: number
    quirked: number
    rareVariantList: string[]
    personalityCounts: Record<string, number>
    quirkCounts: Record<string, number>
  }
}

interface AnalyticsData {
  seasonNumber: number
  economy: {
    totalCirculation: number; totalEarned: number; totalSpent: number
    earningsBreakdown: Record<string, number>; spendingBreakdown: Record<string, number>
    seasonEarnings: number; seasonSpending: number
    avgBalance?: number; medianBalance?: number
    capHitRate?: number; capHitters?: number; capHitWeek?: number | null
    richestUsers?: { username: string; balance: number }[]
  }
  cards: {
    totalCards: number; byEdition: Record<string, number>; bySource: Record<string, number>
    topEffects: { effectName: string; count: number; tooltip?: string }[]
    bottomEffects?: { effectName: string; count: number; tooltip?: string }[]
    packOpenings: Record<string, number>
    combineUsage?: Record<string, number>; totalCombineUses?: number
    usersWhoEquipped?: number
  }
  fantasy: {
    totalRosters: number; avgTotalPoints: number; avgCardBonus: number
    totalSwapsUsed: number; totalPurchasedSwaps: number
    topRosteredPlayers: { name: string; count: number }[]
  }
  users: {
    totalUsers: number; active7d: number; active30d: number
    onboardingRate: number; onboardedCount: number
    favoriteTeams: { team: string; count: number }[]
    adoption: { fantasy: number; cards: number; pickEm: number; funding: number }
    signupOnly: number
    churnRiskCount?: number
    dailyActiveUsers?: { date: string; count: number }[]
    onboardingFunnel?: {
      hasAccount: number; pickedUsername: number; choseFavTeam: number
      draftedRoster: number; hasCards: number
    }
  }
  funding: {
    totalFanContributions: number
    tierDistribution: Record<string, number>
    topTeams: { team: string; contributions: number; tier: string }[]
  }
  pickEm: {
    totalPicks: number; accuracy: number; participants: number
    trend?: { week: number; participants: number; picks: number }[]
  }
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#94a3b8',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '14px',
  padding: '8px 12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

const btnStyle: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '9px 18px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
}

// ── Password gate ──────────────────────────────────────────────────────────

// Format an achievement target/progress number for the admin panel based on its key.
// Most families just append a unit ("1,000 FP"); Compound renders its encoded integer
// as a human multiplier ("1.20x").
const formatAchievementValue = (key: string, value: number): string => {
  if (!key) return value.toLocaleString()
  const base = key.replace(/_[ivx]+$/i, '')   // strip trailing tier: "banner_week_iii" → "banner_week"
  if (base === 'compound') {
    // Target stored as multiplier × 100 (e.g. 120 → "1.20x")
    return `${(value / 100).toFixed(2)}x`
  }
  const unitMap: Record<string, string> = {
    // Rookie goals (target=1): no unit
    rookie: '', prognosticator: '', pack_popper: '', field_general: '',
    deck_builder: '', patron: '',
    // Single-target season goals
    sharp: '', sparkler: '', perfect_week: '',
    // Metric-based season goals
    dedicated: 'weeks', veteran: 'weeks', curator: 'cards',
    tycoon: 'floobits', banner_week: 'FP', dynamo: 'FP', oracle: 'pts',
    magnate: 'floobits', racket: 'floobits',
    podium: 'finishes', pundit: 'finishes', benefactor: 'floobits',
  }
  const unit = unitMap[base] ?? ''
  return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString()
}

const SESSION_KEY = 'floosball_admin_pw'

const PasswordGate: React.FC<{ onAuth: (pw: string) => void }> = ({ onAuth }) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Verify against the backend — if a request succeeds the password is correct
    try {
      const res = await fetch(`${API_BASE}/admin/names`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': value },
        body: JSON.stringify({ names: [] }),
      })
      // 400 = no names provided (auth passed), 403 = wrong password
      if (res.status === 403) {
        setError(true)
        return
      }
      sessionStorage.setItem(SESSION_KEY, value)
      onAuth(value)
    } catch {
      setError(true)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0f172a',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          padding: '40px',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          Admin Access
        </h2>
        <div>
          <div style={labelStyle}>Password</div>
          <input
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            style={{
              ...inputStyle,
              borderColor: error ? '#ef4444' : '#334155',
            }}
            autoFocus
          />
          {error && (
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
              Incorrect password.
            </div>
          )}
        </div>
        <button type="submit" style={btnStyle}>Enter</button>
      </form>
    </div>
  )
}

// ── Admin content ──────────────────────────────────────────────────────────

interface BetaRequest {
  id: number
  email: string
  status: string
  requestedAt: string
}

interface AllowlistEntry {
  email: string
  addedAt: string
}

interface AdminUser {
  id: number
  email: string
  username: string | null
  floobits: number
  lifetimeEarned: number
  lifetimeSpent: number
  favoriteTeam: string | null
  favoriteTeamId: number | null
  onboarded: boolean
  createdAt: string | null
  isActive: boolean
  lastLoginAt: string | null
  betaStatus: string
  isAdmin: boolean
}

interface EffectOption { name: string; displayName: string; edition: string }
interface CardOptions {
  editions: string[]
  effects: Record<string, EffectOption[]>
  classifications: string[]
  categories: string[]
}
interface PlayerSearchResult {
  id: number; name: string; position: string; positionNum: number
  rating: number; teamId: number; teamName: string
}

const EDITION_COLORS_MAP: Record<string, string> = {
  base: '#94a3b8', holographic: '#bae6fd',
  prismatic: '#f9a8d4', diamond: '#a5f3fc',
}

const CATEGORY_FOR_POSITION: Record<string, string> = {
  QB: 'multiplier', RB: 'floobits', WR: 'flat_fp', TE: 'conditional', K: 'streak',
}

const AdminContent: React.FC<{ password: string | null; token: string | null }> = ({ password, token }) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (password) headers['X-Admin-Password'] = password

  // Access mode toggle (request vs waitlist)
  const [accessMode, setAccessMode] = useState<'request' | 'waitlist'>('request')
  const [accessModeLoading, setAccessModeLoading] = useState(false)

  const fetchAccessMode = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/beta/access-mode`, { headers })
      if (res.ok) {
        const data = await res.json()
        setAccessMode(data.mode || 'request')
      }
    } catch { /* silent */ }
  }, [])

  React.useEffect(() => { fetchAccessMode() }, [fetchAccessMode])

  const toggleAccessMode = async () => {
    const newMode = accessMode === 'request' ? 'waitlist' : 'request'
    setAccessModeLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/access-mode`, {
        method: 'POST', headers, body: JSON.stringify({ mode: newMode }),
      })
      if (res.ok) setAccessMode(newMode)
    } catch { /* silent */ }
    finally { setAccessModeLoading(false) }
  }

  // Beta access requests
  const [betaRequests, setBetaRequests] = useState<BetaRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [actioningId, setActioningId] = useState<number | null>(null)

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/requests`, { headers })
      if (res.ok) {
        const data = await res.json()
        setBetaRequests(data.requests || [])
      }
    } catch { /* silent */ }
    finally { setRequestsLoading(false) }
  }, [])

  React.useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleApproveRequest = async (id: number) => {
    setActioningId(id)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/requests/${id}/approve`, {
        method: 'POST', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      setBetaRequests(prev => prev.filter(r => r.id !== id))
      // Refresh allowlist if on that tab
      fetchAllowlist()
    } catch { /* silent */ }
    finally { setActioningId(null) }
  }

  const handleDenyRequest = async (id: number) => {
    setActioningId(id)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/requests/${id}/deny`, {
        method: 'POST', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      setBetaRequests(prev => prev.filter(r => r.id !== id))
    } catch { /* silent */ }
    finally { setActioningId(null) }
  }

  // Beta allowlist
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([])
  const [allowlistLoading, setAllowlistLoading] = useState(false)
  const [allowlistInput, setAllowlistInput] = useState('')
  const [allowlistError, setAllowlistError] = useState<string | null>(null)
  const [allowlistSuccess, setAllowlistSuccess] = useState<string | null>(null)

  const fetchAllowlist = useCallback(async () => {
    setAllowlistLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/allowlist`, { headers })
      if (res.ok) {
        const data = await res.json()
        setAllowlist(data.emails || [])
      }
    } catch { /* silent */ }
    finally { setAllowlistLoading(false) }
  }, [])

  React.useEffect(() => { fetchAllowlist() }, [fetchAllowlist])

  const handleAddEmails = async () => {
    const emails = allowlistInput.split(/[,\n]/).map(e => e.trim()).filter(Boolean)
    if (!emails.length) return
    setAllowlistError(null)
    setAllowlistSuccess(null)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/allowlist`, {
        method: 'POST', headers, body: JSON.stringify({ emails }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      const addedCount = data.count ?? data.added?.length ?? 0
      setAllowlistSuccess(`Added ${addedCount} email${addedCount !== 1 ? 's' : ''}`)
      setAllowlistInput('')
      fetchAllowlist()
    } catch (e: any) {
      setAllowlistError(e.message)
    }
  }

  const handleRemoveEmail = async (email: string) => {
    setAllowlistError(null)
    setAllowlistSuccess(null)
    try {
      const res = await fetch(`${API_BASE}/admin/beta/allowlist/${encodeURIComponent(email)}`, {
        method: 'DELETE', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      setAllowlist(prev => prev.filter(e => e.email !== email))
    } catch (e: any) {
      setAllowlistError(e.message)
    }
  }

  // Name pool
  const [namesInput, setNamesInput] = useState('')
  const [namesResult, setNamesResult] = useState<{ added: number; total: number } | null>(null)
  const [namesError, setNamesError] = useState<string | null>(null)
  const [namesLoading, setNamesLoading] = useState(false)

  const handleAddNames = async () => {
    const names = namesInput.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length) return
    setNamesLoading(true)
    setNamesError(null)
    setNamesResult(null)
    try {
      const res = await fetch(`${API_BASE}/admin/names`, {
        method: 'POST', headers, body: JSON.stringify({ names }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      setNamesResult(await res.json())
      setNamesInput('')
    } catch (e: any) {
      setNamesError(e.message)
    } finally {
      setNamesLoading(false)
    }
  }

  // Player creation
  const [position, setPosition] = useState('QB')
  const [tier, setTier] = useState('Random')
  const [count, setCount] = useState(1)
  const [createdPlayers, setCreatedPlayers] = useState<CreatedPlayer[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  // Registered users (shared by card + floobits sections)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])

  // Card grant
  const [cardOptions, setCardOptions] = useState<CardOptions | null>(null)
  const [cardUser, setCardUser] = useState<AdminUser | null>(null)
  const [cardPlayerSearch, setCardPlayerSearch] = useState('')
  const [cardPlayerResults, setCardPlayerResults] = useState<PlayerSearchResult[]>([])
  const [cardSelectedPlayer, setCardSelectedPlayer] = useState<PlayerSearchResult | null>(null)
  const [cardEdition, setCardEdition] = useState('base')
  const [cardCategory, setCardCategory] = useState('')
  const [cardEffect, setCardEffect] = useState('')
  const [cardClassification, setCardClassification] = useState('')
  const [cardResult, setCardResult] = useState<string | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [playerSearching, setPlayerSearching] = useState(false)

  // User sorting/filtering
  const [userSort, setUserSort] = useState<string>('newest')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderResult, setReminderResult] = useState<string | null>(null)

  const fetchUsers = useCallback(async (sort?: string, filter?: string) => {
    try {
      const params = new URLSearchParams()
      if (sort && sort !== 'newest') params.set('sort', sort === 'last_login' ? 'last_login' : sort === 'username' ? 'username' : sort === 'oldest' ? 'oldest' : '')
      if (filter && filter !== 'all') params.set('filter', filter)
      const qs = params.toString()
      const res = await fetch(`${API_BASE}/admin/users${qs ? `?${qs}` : ''}`, {
        headers,
      })
      if (res.ok) {
        const data = await res.json()
        setAdminUsers(data.data?.users ?? [])
      }
    } catch { /* silent */ }
  }, [password])

  // Username re-roll
  const [rerollingUserId, setRerollingUserId] = useState<number | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [togglingAdminId, setTogglingAdminId] = useState<number | null>(null)

  const handleToggleAdmin = async (userId: number) => {
    const target = adminUsers.find(u => u.id === userId)
    const name = target?.username || target?.email || `User #${userId}`
    const action = target?.isAdmin ? 'revoke admin access from' : 'grant admin access to'
    if (!window.confirm(`Are you sure you want to ${action} "${name}"?`)) return
    setTogglingAdminId(userId)
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-admin`, {
        method: 'POST', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      const newIsAdmin = data.data?.isAdmin ?? false
      setAdminUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, isAdmin: newIsAdmin } : u
      ))
    } catch (e: any) {
      alert(`Failed to toggle admin: ${e.message}`)
    } finally {
      setTogglingAdminId(null)
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete user "${user.username || user.email}"?\n\nThis removes ALL data: cards, rosters, picks, transactions, etc. This cannot be undone.`)) return
    setDeletingUserId(user.id)
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: 'DELETE', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      setAdminUsers(prev => prev.filter(u => u.id !== user.id))
    } catch (e: any) {
      alert(`Failed to delete user: ${e.message}`)
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleRerollUsername = async (userId: number) => {
    setRerollingUserId(userId)
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reroll-username`, {
        method: 'POST', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      const newName = data.data?.newUsername
      if (newName) {
        setAdminUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, username: newName } : u
        ))
      }
    } catch { /* silent */ }
    finally { setRerollingUserId(null) }
  }

  const handleSendReminders = async () => {
    if (!window.confirm('Send onboarding reminder emails to all users who haven\'t completed setup?')) return
    setReminderLoading(true)
    setReminderResult(null)
    try {
      const res = await fetch(`${API_BASE}/admin/users/send-onboarding-reminders`, {
        method: 'POST', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      const d = data.data
      setReminderResult(`Sent ${d.sent} reminder${d.sent !== 1 ? 's' : ''}${d.failed ? ` (${d.failed} failed)` : ''} out of ${d.totalPending} pending users`)
    } catch (e: any) {
      setReminderResult(`Error: ${e.message}`)
    } finally {
      setReminderLoading(false)
    }
  }

  // Floobits grant
  const [floobitsUser, setFloobitsUser] = useState<AdminUser | null>(null)
  const [floobitsAmount, setFloobitsAmount] = useState(100)
  const [floobitsResult, setFloobitsResult] = useState<string | null>(null)
  const [floobitsError, setFloobitsError] = useState<string | null>(null)
  const [floobitsLoading, setFloobitsLoading] = useState(false)

  // Fetch card options + users on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/card-options`, {
          headers,
        })
        if (res.ok) {
          const data = await res.json()
          setCardOptions(data.data)
        }
      } catch { /* silent */ }
    }
    fetchOptions()
    fetchUsers()
  }, [password, fetchUsers])

  // Player search with debounce
  useEffect(() => {
    if (cardPlayerSearch.length < 2) { setCardPlayerResults([]); return }
    const timer = setTimeout(async () => {
      setPlayerSearching(true)
      try {
        const res = await fetch(
          `${API_BASE}/admin/players/search?q=${encodeURIComponent(cardPlayerSearch)}`,
          { headers },
        )
        if (res.ok) {
          const data = await res.json()
          setCardPlayerResults(data.data?.players ?? [])
        }
      } catch { /* silent */ }
      finally { setPlayerSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [cardPlayerSearch, password])

  const handleGrantCard = async () => {
    if (!cardUser) return
    setCardLoading(true)
    setCardError(null)
    setCardResult(null)
    try {
      const body: Record<string, any> = {
        email: cardUser.email,
        edition: cardEdition,
      }
      if (cardSelectedPlayer) body.playerId = cardSelectedPlayer.id
      if (cardCategory) body.category = cardCategory
      if (cardEffect) body.effectName = cardEffect
      if (cardClassification) body.classification = cardClassification
      const res = await fetch(`${API_BASE}/admin/grant-card`, {
        method: 'POST', headers, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      const d = data.data
      const label = cardUser.username || cardUser.email
      setCardResult(`Granted ${d.edition} ${d.displayName} (${d.playerName}) to ${label}`)
    } catch (e: any) {
      setCardError(e.message)
    } finally {
      setCardLoading(false)
    }
  }

  const handleGrantFloobits = async () => {
    if (!floobitsUser || floobitsAmount <= 0) return
    setFloobitsLoading(true)
    setFloobitsError(null)
    setFloobitsResult(null)
    try {
      const res = await fetch(`${API_BASE}/admin/grant-floobits`, {
        method: 'POST', headers,
        body: JSON.stringify({ email: floobitsUser.email, amount: floobitsAmount }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      const label = floobitsUser.username || floobitsUser.email
      setFloobitsResult(`Granted ${floobitsAmount} Floobits to ${label} (Balance: ${data.data.newBalance})`)
      // Update local user list balance
      setAdminUsers(prev => prev.map(u =>
        u.id === floobitsUser.id ? { ...u, floobits: data.data.newBalance } : u
      ))
    } catch (e: any) {
      setFloobitsError(e.message)
    } finally {
      setFloobitsLoading(false)
    }
  }

  // Get available effects based on selected category (or player's default), filtered by edition
  const activeCategory = cardCategory || (cardSelectedPlayer ? CATEGORY_FOR_POSITION[cardSelectedPlayer.position] : '')
  const allEffects: EffectOption[] = (() => {
    if (!cardOptions) return []
    let effects: EffectOption[]
    // If a category is selected, show that category's effects
    if (activeCategory) effects = cardOptions.effects[activeCategory] ?? []
    // Otherwise show all effects across all categories
    else effects = Object.values(cardOptions.effects).flat()
    // Filter by selected edition
    return effects.filter(ef => ef.edition === cardEdition)
  })()

  const handleCreatePlayers = async () => {
    setCreateLoading(true)
    setCreateError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/players`, {
        method: 'POST', headers, body: JSON.stringify({ position, tier, count }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
      const data = await res.json()
      setCreatedPlayers(prev => [...data.created, ...prev])
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreateLoading(false)
    }
  }

  // Monitor
  interface MonitorData {
    deploySafety: { safe: boolean; reason: string }
    simulation: { isActive: boolean; phase: string; lastSaved: string | null }
    season: {
      seasonNumber: number; currentWeek: number; currentWeekText: string | null
      inPlayoffs: boolean; playoffRound: string | null; isComplete: boolean
      champion: string | null; mvp: string | null
      totalGames: number; completedGames: number
    }
    liveGames: { active: number; scheduled: number; final: number }
    timing: { mode: string | null; catchingUp: boolean }
    counts: { teams: number; activePlayers: number; freeAgents: number; retiredPlayers: number; hallOfFame: number }
    memory: { rssMb: number; totalMb?: number; scheduleGames: number; gamesWithPlays: number; totalPlaysInMemory: number; pid: number }
    websockets: Record<string, any>
    personality?: {
      total: number
      baseVibes: number
      commonVariants: number
      rareVariants: number
      unassigned: number
      quirked: number
      rareVariantList: string[]
      personalityCounts: Record<string, number>
      quirkCounts: Record<string, number>
    }
  }
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  const [monitorLoading, setMonitorLoading] = useState(false)

  const fetchMonitor = useCallback(async () => {
    setMonitorLoading(true)
    setMonitorError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/monitor`, { headers })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setMonitorData(json.data)
    } catch (e: any) {
      setMonitorError(e.message)
    } finally {
      setMonitorLoading(false)
    }
  }, [password])

  type Section = 'monitor' | 'analytics' | 'achievements' | 'requests' | 'allowlist' | 'names' | 'players' | 'cards' | 'floobits' | 'users' | 'settings'
  const [activeSection, setActiveSection] = useState<Section>('monitor')

  // Auto-refresh monitor every 30s when active
  useEffect(() => {
    if (activeSection !== 'monitor') return
    fetchMonitor()
    const interval = setInterval(fetchMonitor, 30000)
    return () => clearInterval(interval)
  }, [activeSection, fetchMonitor])

  // ── Analytics ──────────────────────────────────────────────────────
  type AnalyticsTab = 'economy' | 'cards' | 'fantasy' | 'users' | 'funding' | 'pickem'
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('economy')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, { headers })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setAnalyticsData(json.data)
    } catch (e: any) {
      setAnalyticsError(e.message)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [password])

  useEffect(() => {
    if (activeSection === 'analytics') fetchAnalytics()
  }, [activeSection, fetchAnalytics])

  // Achievements metrics
  const [achMetrics, setAchMetrics] = useState<any>(null)
  const [achError, setAchError] = useState<string | null>(null)
  const [achLoading, setAchLoading] = useState(false)

  const fetchAchievements = useCallback(async () => {
    setAchLoading(true)
    setAchError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/achievements`, { headers })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setAchMetrics(json.data)
    } catch (e: any) {
      setAchError(e.message)
    } finally {
      setAchLoading(false)
    }
  }, [password])

  useEffect(() => {
    if (activeSection === 'achievements') fetchAchievements()
  }, [activeSection, fetchAchievements])

  // ── App Settings ──────────────────────────────────────────────────
  const [settingsForm, setSettingsForm] = useState<{
    feedback_url: string; feedback_visible: boolean; survey_url: string
  }>({ feedback_url: '', feedback_visible: true, survey_url: '' })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    setSettingsError(null)
    try {
      const res = await fetch(`${API_BASE}/app-settings`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json()
      setSettingsForm({
        feedback_url: data.feedback_url || '',
        feedback_visible: data.feedback_visible !== false,
        survey_url: data.survey_url || '',
      })
    } catch (e: any) {
      setSettingsError(e?.message || 'Failed to load settings')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'settings') fetchSettings()
  }, [activeSection, fetchSettings])

  const saveSettings = async () => {
    setSettingsLoading(true)
    setSettingsSaved(null)
    setSettingsError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/app-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settingsForm),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || `status ${res.status}`)
      }
      // Bust the module-level cache so next page load gets fresh values
      const { invalidateAppSettings } = await import('@/hooks/useAppSettings')
      invalidateAppSettings()
      setSettingsSaved('Saved (refresh page to see across the app)')
      setTimeout(() => setSettingsSaved(null), 4000)
    } catch (e: any) {
      setSettingsError(e?.message || 'Save failed')
    } finally {
      setSettingsLoading(false)
    }
  }

  const tabs: { id: Section; label: string }[] = [
    { id: 'monitor', label: 'Monitor' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'requests', label: 'Requests' },
    { id: 'allowlist', label: 'Allowlist' },
    { id: 'names', label: 'Names' },
    { id: 'players', label: 'Players' },
    { id: 'cards', label: 'Cards' },
    { id: 'floobits', label: 'Floobits' },
    { id: 'users', label: 'Users' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
    <div style={{
      borderBottom: '1px solid #1e293b', padding: '12px 24px',
      display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
          background: activeSection === t.id ? '#334155' : 'none',
          border: '1px solid',
          borderColor: activeSection === t.id ? '#475569' : '#334155',
          borderRadius: '4px',
          color: activeSection === t.id ? '#e2e8f0' : '#94a3b8',
          fontSize: '12px', padding: '5px 12px', cursor: 'pointer',
          fontWeight: '600', letterSpacing: '0.03em',
        }}>
          {t.label}
          {t.id === 'requests' && betaRequests.length > 0 && (
            <span style={{
              backgroundColor: '#ef4444', color: '#fff', fontSize: '10px',
              fontWeight: '700', borderRadius: '8px', padding: '1px 6px',
              marginLeft: '6px', minWidth: '16px', textAlign: 'center',
              display: 'inline-block',
            }}>{betaRequests.length}</span>
          )}
        </button>
      ))}
    </div>
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Server Monitor */}
      {activeSection === 'monitor' && <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Server Monitor</h2>
          <button onClick={fetchMonitor} disabled={monitorLoading}
            style={{ ...btnStyle, fontSize: '12px', padding: '5px 14px', opacity: monitorLoading ? 0.5 : 1 }}>
            {monitorLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {monitorError && (
          <div style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>{monitorError}</div>
        )}
        {monitorData && (() => {
          const { deploySafety, simulation, season, liveGames, timing, counts, memory, websockets, personality } = monitorData
          const statBox: React.CSSProperties = {
            backgroundColor: '#0f172a', borderRadius: '6px', padding: '12px 14px',
          }
          const statLabel: React.CSSProperties = {
            fontSize: '10px', fontWeight: '700', color: '#64748b',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px',
          }
          const statValue: React.CSSProperties = {
            fontSize: '20px', fontWeight: '700', color: '#e2e8f0',
          }
          const smallStat: React.CSSProperties = {
            fontSize: '13px', color: '#cbd5e1', lineHeight: '1.8',
          }
          const totalMemMb = memory.totalMb || 2048
          const memoryPct = memory.rssMb > 0 ? Math.round((memory.rssMb / totalMemMb) * 100) : 0
          const memoryColor = memoryPct > 80 ? '#ef4444' : memoryPct > 60 ? '#f59e0b' : '#22c55e'

          return <>
            {/* Deploy Safety Banner */}
            <div style={{
              backgroundColor: deploySafety.safe ? '#052e16' : '#450a0a',
              border: `1px solid ${deploySafety.safe ? '#166534' : '#991b1b'}`,
              borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: deploySafety.safe ? '#22c55e' : '#ef4444',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '13px', color: deploySafety.safe ? '#86efac' : '#fca5a5', fontWeight: '600' }}>
                {deploySafety.reason}
              </span>
            </div>

            {/* Memory + Season Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={statBox}>
                <div style={statLabel}>Memory (RSS)</div>
                <div style={{ ...statValue, color: memoryColor }}>{memory.rssMb} MB</div>
                <div style={{ marginTop: '6px', height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    backgroundColor: memoryColor,
                    width: `${Math.min(100, memoryPct)}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{memoryPct}% of {totalMemMb} MB</div>
              </div>
              <div style={statBox}>
                <div style={statLabel}>Season</div>
                <div style={statValue}>S{season.seasonNumber}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {season.currentWeekText || `Week ${season.currentWeek}`}
                </div>
              </div>
              <div style={statBox}>
                <div style={statLabel}>Phase</div>
                <div style={{ ...statValue, fontSize: '16px', marginTop: '4px' }}>
                  {simulation.phase.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {timing.mode || '—'}{timing.catchingUp ? ' (catching up)' : ''}
                </div>
              </div>
            </div>

            {/* Games + Play Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={statBox}>
                <div style={statLabel}>Games</div>
                <div style={statValue}>{season.completedGames}/{season.totalGames}</div>
              </div>
              <div style={statBox}>
                <div style={statLabel}>Live</div>
                <div style={{
                  ...statValue,
                  color: liveGames.active > 0 ? '#22c55e' : '#94a3b8',
                }}>{liveGames.active}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {liveGames.scheduled} queued / {liveGames.final} done
                </div>
              </div>
              <div style={statBox}>
                <div style={statLabel}>Games w/ Plays</div>
                <div style={{
                  ...statValue,
                  color: memory.gamesWithPlays > 24 ? '#f59e0b' : '#e2e8f0',
                }}>{memory.gamesWithPlays}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>of {memory.scheduleGames} total</div>
              </div>
              <div style={statBox}>
                <div style={statLabel}>Plays in Memory</div>
                <div style={statValue}>{memory.totalPlaysInMemory.toLocaleString()}</div>
              </div>
            </div>

            {/* Counts + WebSockets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={statBox}>
                <div style={{ ...statLabel, marginBottom: '8px' }}>Entity Counts</div>
                <div style={smallStat}>
                  Teams: {counts.teams}<br />
                  Active Players: {counts.activePlayers}<br />
                  Free Agents: {counts.freeAgents}<br />
                  Retired: {counts.retiredPlayers}<br />
                  Hall of Fame: {counts.hallOfFame}
                </div>
              </div>
              <div style={statBox}>
                <div style={{ ...statLabel, marginBottom: '8px' }}>WebSockets</div>
                <div style={smallStat}>
                  <div>Connections: {websockets.total_connections ?? 0}</div>
                  <div>Unique Users: {websockets.unique_users ?? 0}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>
                  PID: {memory.pid} | Last saved: {simulation.lastSaved
                    ? new Date(simulation.lastSaved).toLocaleString()
                    : '—'}
                </div>
              </div>
            </div>

            {/* Champion / MVP */}
            {(season.champion || season.mvp) && (
              <div style={{ ...statBox, marginTop: '10px', display: 'flex', gap: '24px' }}>
                {season.champion && <div style={smallStat}>Champion: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{season.champion}</span></div>}
                {season.mvp && <div style={smallStat}>MVP: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{season.mvp}</span></div>}
              </div>
            )}

            {/* Personality Distribution */}
            {personality && personality.total > 0 && (
              <div style={{ ...statBox, marginTop: '10px' }}>
                <div style={{ ...statLabel, marginBottom: '8px' }}>Personality Distribution</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Base Vibes</div>
                    <div style={{ ...statValue, fontSize: '20px' }}>{personality.baseVibes}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Common Variants</div>
                    <div style={{ ...statValue, fontSize: '20px', color: '#a78bfa' }}>{personality.commonVariants}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rare Variants</div>
                    <div style={{ ...statValue, fontSize: '20px', color: '#f59e0b' }}>{personality.rareVariants}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Quirked</div>
                    <div style={{ ...statValue, fontSize: '20px' }}>{personality.quirked}</div>
                  </div>
                </div>
                {personality.unassigned > 0 && (
                  <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '8px' }}>
                    {personality.unassigned} unassigned (will be backfilled on next boot)
                  </div>
                )}
                {personality.rareVariantList.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>Rare variants in league:</span>{' '}
                    {personality.rareVariantList.join(', ')}
                  </div>
                )}
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#94a3b8' }}>
                    Personality counts
                  </summary>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', columnCount: 2, columnGap: '20px' }}>
                    {Object.entries(personality.personalityCounts).map(([name, count]) => (
                      <div key={name}>{name}: {count}</div>
                    ))}
                  </div>
                </details>
                <details style={{ marginTop: '4px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#94a3b8' }}>
                    Quirk counts
                  </summary>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', columnCount: 2, columnGap: '20px' }}>
                    {Object.entries(personality.quirkCounts).map(([name, count]) => (
                      <div key={name}>{name}: {count}</div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </>
        })()}
      </div>}

      {/* Analytics Dashboard */}
      {activeSection === 'analytics' && <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Analytics Dashboard</h2>
          <button onClick={fetchAnalytics} disabled={analyticsLoading}
            style={{ ...btnStyle, fontSize: '12px', padding: '5px 14px', opacity: analyticsLoading ? 0.5 : 1 }}>
            {analyticsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {analyticsError && (
          <div style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>{analyticsError}</div>
        )}
        {analyticsData && (() => {
          const statBox: React.CSSProperties = {
            backgroundColor: '#0f172a', borderRadius: '6px', padding: '12px 14px',
          }
          const statLabel: React.CSSProperties = {
            fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: '4px',
          }
          const statValue: React.CSSProperties = {
            fontSize: '20px', fontWeight: '700', color: '#e2e8f0',
          }
          const smallStat: React.CSSProperties = {
            fontSize: '12px', color: '#94a3b8',
          }
          const listRow: React.CSSProperties = {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', fontSize: '12px', color: '#cbd5e1',
            borderBottom: '1px solid #1e293b',
          }

          const editionColors: Record<string, string> = {
            base: '#94a3b8', holographic: '#bae6fd', prismatic: '#f9a8d4', diamond: '#a5f3fc',
          }
          const tierColors: Record<string, string> = {
            MEGA_MARKET: '#a78bfa', LARGE_MARKET: '#3b82f6', MID_MARKET: '#2dd4bf', SMALL_MARKET: '#f97316',
          }
          const { economy, cards, fantasy, users, funding, pickEm } = analyticsData

          const analyticsTabs: { id: AnalyticsTab; label: string }[] = [
            { id: 'economy', label: 'Economy' },
            { id: 'cards', label: 'Cards' },
            { id: 'fantasy', label: 'Fantasy' },
            { id: 'users', label: 'Users' },
            { id: 'funding', label: 'Funding' },
            { id: 'pickem', label: 'Pick-Em' },
          ]

          return <>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Season {analyticsData.seasonNumber}</div>

            {/* Sub-tabs */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap',
              borderBottom: '1px solid #334155', paddingBottom: '12px',
            }}>
              {analyticsTabs.map(t => (
                <button key={t.id} onClick={() => setAnalyticsTab(t.id)} style={{
                  background: analyticsTab === t.id ? '#334155' : 'transparent',
                  border: '1px solid',
                  borderColor: analyticsTab === t.id ? '#475569' : '#1e293b',
                  borderRadius: '4px',
                  color: analyticsTab === t.id ? '#e2e8f0' : '#94a3b8',
                  fontSize: '11px', padding: '5px 12px', cursor: 'pointer',
                  fontWeight: '600',
                }}>{t.label}</button>
              ))}
            </div>

            {/* ── Economy Health ── */}
            {analyticsTab === 'economy' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={statLabel}>In Circulation</div>
                  <div style={statValue}>{economy.totalCirculation.toLocaleString()}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>All-Time Earned</div>
                  <div style={{ ...statValue, color: '#22c55e' }}>{economy.totalEarned.toLocaleString()}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>All-Time Spent</div>
                  <div style={{ ...statValue, color: '#ef4444' }}>{economy.totalSpent.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={statLabel}>Season Earnings</div>
                  <div style={{ ...statValue, color: '#22c55e', fontSize: '18px' }}>{economy.seasonEarnings.toLocaleString()}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Season Spending</div>
                  <div style={{ ...statValue, color: '#ef4444', fontSize: '18px' }}>{economy.seasonSpending.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Earnings by Source</div>
                  {Object.entries(economy.earningsBreakdown).length === 0
                    ? <div style={smallStat}>No data yet</div>
                    : Object.entries(economy.earningsBreakdown)
                      .sort(([,a],[,b]) => b - a)
                      .map(([type, amount]) => (
                        <div key={type} style={listRow}>
                          <span>{type.replace(/_/g, ' ')}</span>
                          <span style={{ color: '#22c55e', fontWeight: '600' }}>{amount.toLocaleString()}</span>
                        </div>
                      ))
                  }
                </div>
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Spending by Type</div>
                  {Object.entries(economy.spendingBreakdown).length === 0
                    ? <div style={smallStat}>No data yet</div>
                    : Object.entries(economy.spendingBreakdown)
                      .sort(([,a],[,b]) => b - a)
                      .map(([type, amount]) => (
                        <div key={type} style={listRow}>
                          <span>{type.replace(/_/g, ' ')}</span>
                          <span style={{ color: '#ef4444', fontWeight: '600' }}>{amount.toLocaleString()}</span>
                        </div>
                      ))
                  }
                </div>
              </div>
              {economy.avgBalance != null && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <div style={statBox}>
                    <div style={statLabel}>Avg Balance</div>
                    <div style={statValue}>{economy.avgBalance?.toLocaleString()}</div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Median Balance</div>
                    <div style={statValue}>{economy.medianBalance?.toLocaleString()}</div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>FP Cap Hit Rate</div>
                    <div style={statValue}>{economy.capHitRate ?? 0}%</div>
                    <div style={smallStat}>
                      {economy.capHitters ?? 0}/{economy.capHitRate != null ? Math.round((economy.capHitters ?? 0) / ((economy.capHitRate ?? 0) / 100 || 1)) : 0} users
                      {economy.capHitWeek ? ` (wk ${economy.capHitWeek})` : ''}
                    </div>
                  </div>
                </div>
              )}
              {(economy.richestUsers?.length ?? 0) > 0 && (
                <div style={{ ...statBox, marginTop: '12px' }}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Top Balances</div>
                  {economy.richestUsers!.map((u, i) => (
                    <div key={i} style={listRow}>
                      <span>{i + 1}. {u.username}</span>
                      <span style={{ fontWeight: '600', color: '#f59e0b' }}>{u.balance.toLocaleString()}F</span>
                    </div>
                  ))}
                </div>
              )}
            </>}

            {/* ── Card Analytics ── */}
            {analyticsTab === 'cards' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={statLabel}>Total Cards</div>
                  <div style={statValue}>{cards.totalCards.toLocaleString()}</div>
                </div>
                {['base', 'holographic', 'prismatic', 'diamond'].map(ed => (
                  <div key={ed} style={statBox}>
                    <div style={statLabel}>{ed}</div>
                    <div style={{ ...statValue, color: editionColors[ed] || '#e2e8f0', fontSize: '18px' }}>
                      {(cards.byEdition[ed] || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Acquisition Source</div>
                  {Object.entries(cards.bySource).length === 0
                    ? <div style={smallStat}>No data yet</div>
                    : Object.entries(cards.bySource)
                      .sort(([,a],[,b]) => b - a)
                      .map(([src, cnt]) => (
                        <div key={src} style={listRow}>
                          <span>{src.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: '600' }}>{cnt.toLocaleString()}</span>
                        </div>
                      ))
                  }
                </div>
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Top Equipped Effects</div>
                  <div style={{ ...smallStat, marginBottom: '6px' }}>user-weeks equipped</div>
                  {cards.topEffects.length === 0
                    ? <div style={smallStat}>No data yet</div>
                    : cards.topEffects.map((ef, i) => (
                      <div key={i} style={listRow}>
                        <HoverTooltip text={ef.tooltip || ''}><span>{ef.effectName}</span></HoverTooltip>
                        <span style={{ fontWeight: '600' }}>{ef.count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              {Object.keys(cards.packOpenings).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(cards.packOpenings).length}, 1fr)`, gap: '10px' }}>
                  {Object.entries(cards.packOpenings).map(([name, cnt]) => (
                    <div key={name} style={statBox}>
                      <div style={statLabel}>{name} packs</div>
                      <div style={{ ...statValue, fontSize: '18px' }}>{cnt.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                {(cards.bottomEffects?.length ?? 0) > 0 && (
                  <div style={statBox}>
                    <div style={{ ...statLabel, marginBottom: '8px' }}>Least Equipped Effects</div>
                    <div style={{ ...smallStat, marginBottom: '6px' }}>user-weeks equipped</div>
                    {cards.bottomEffects!.map((ef, i) => (
                      <div key={i} style={listRow}>
                        <HoverTooltip text={ef.tooltip || ''}><span>{ef.effectName}</span></HoverTooltip>
                        <span style={{ fontWeight: '600', color: '#94a3b8' }}>{ef.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Combine Usage</div>
                  {!cards.combineUsage || Object.keys(cards.combineUsage).length === 0
                    ? <div style={smallStat}>No upgrades yet</div>
                    : Object.entries(cards.combineUsage).map(([type, cnt]) => (
                      <div key={type} style={listRow}>
                        <span>{type.replace(/_/g, ' ')}</span>
                        <span style={{ fontWeight: '600' }}>{cnt}</span>
                      </div>
                    ))
                  }
                  {(cards.totalCombineUses ?? 0) > 0 && (
                    <div style={{ ...smallStat, marginTop: '6px' }}>{cards.totalCombineUses} total operations</div>
                  )}
                </div>
              </div>
              {cards.usersWhoEquipped != null && (
                <div style={{ ...statBox, marginTop: '12px' }}>
                  <div style={statLabel}>Users Equipped This Season</div>
                  <div style={{ ...statValue, fontSize: '18px' }}>{cards.usersWhoEquipped}</div>
                  <div style={smallStat}>
                    {users.onboardedCount > 0 ? `${Math.round(cards.usersWhoEquipped / users.onboardedCount * 100)}%` : '0%'} of onboarded users
                  </div>
                </div>
              )}
            </>}

            {/* ── Fantasy Engagement ── */}
            {analyticsTab === 'fantasy' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={statLabel}>Rosters</div>
                  <div style={statValue}>{fantasy.totalRosters}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Avg Points</div>
                  <div style={statValue}>{fantasy.avgTotalPoints}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Avg Card Bonus</div>
                  <div style={statValue}>{fantasy.avgCardBonus}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Swaps Used</div>
                  <div style={statValue}>{fantasy.totalSwapsUsed}</div>
                  <div style={smallStat}>{fantasy.totalPurchasedSwaps} purchased</div>
                </div>
              </div>
              {fantasy.topRosteredPlayers.length > 0 && (
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Most Rostered Players</div>
                  {fantasy.topRosteredPlayers.map((p, i) => (
                    <div key={i} style={listRow}>
                      <span>{i + 1}. {p.name}</span>
                      <span style={{ fontWeight: '600' }}>{p.count} rosters</span>
                    </div>
                  ))}
                </div>
              )}
            </>}

            {/* ── User Engagement ── */}
            {analyticsTab === 'users' && <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={statLabel}>Total Users</div>
                  <div style={statValue}>{users.totalUsers}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Active 7d</div>
                  <div style={{ ...statValue, color: users.active7d > 0 ? '#22c55e' : '#e2e8f0' }}>{users.active7d}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Active 30d</div>
                  <div style={statValue}>{users.active30d}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Onboarding</div>
                  <div style={statValue}>{users.onboardingRate}%</div>
                  <div style={smallStat}>{users.onboardedCount} / {users.totalUsers}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Signup Only</div>
                  <div style={{ ...statValue, color: users.signupOnly > 0 ? '#f59e0b' : '#e2e8f0' }}>{users.signupOnly}</div>
                  <div style={smallStat}>no beta request</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Churn Risk</div>
                  <div style={{ ...statValue, color: (users.churnRiskCount ?? 0) > 0 ? '#ef4444' : '#22c55e' }}>{users.churnRiskCount ?? 0}</div>
                  <div style={smallStat}>14d+ inactive</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {[
                  { label: 'Fantasy', count: users.adoption.fantasy },
                  { label: 'Cards Equipped', count: cards.usersWhoEquipped ?? 0 },
                  { label: 'Pick-Em', count: users.adoption.pickEm },
                  { label: 'Funding', count: users.adoption.funding },
                ].map(({ label, count }) => (
                  <div key={label} style={statBox}>
                    <div style={statLabel}>{label}</div>
                    <div style={{ ...statValue, fontSize: '18px' }}>{count}</div>
                    <div style={smallStat}>
                      {users.onboardedCount > 0 ? `${Math.round(count / users.onboardedCount * 100)}%` : '0%'} of onboarded users
                    </div>
                  </div>
                ))}
              </div>
              {users.onboardingFunnel && (
                <div style={{ ...statBox, marginBottom: '12px' }}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Onboarding Funnel</div>
                  {[
                    { label: 'Has Account', count: users.onboardingFunnel.hasAccount },
                    { label: 'Picked Username', count: users.onboardingFunnel.pickedUsername },
                    { label: 'Chose Favorite Team', count: users.onboardingFunnel.choseFavTeam },
                    { label: 'Drafted Fantasy Roster', count: users.onboardingFunnel.draftedRoster },
                    { label: 'Equipped Cards', count: cards.usersWhoEquipped ?? 0 },
                  ].map(({ label, count }) => (
                    <div key={label} style={listRow}>
                      <span>{label}</span>
                      <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600' }}>{count}</span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          {users.onboardingFunnel!.hasAccount > 0
                            ? `${Math.round(count / users.onboardingFunnel!.hasAccount * 100)}%`
                            : '0%'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {(users.dailyActiveUsers?.length ?? 0) > 0 && (
                <div style={{ ...statBox, marginBottom: '12px' }}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Daily Active (Last 28d)</div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '40px' }}>
                    {(() => {
                      const dau = users.dailyActiveUsers!
                      const maxCount = Math.max(...dau.map(d => d.count))
                      return dau.map((d, i) => (
                        <div key={i} title={`${d.date}: ${d.count} users`} style={{
                          flex: 1, backgroundColor: '#3b82f6', borderRadius: '1px',
                          height: maxCount > 0 ? `${(d.count / maxCount) * 100}%` : '0',
                          minHeight: d.count > 0 ? '2px' : '0',
                        }} />
                      ))
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {users.dailyActiveUsers![0]?.date}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {users.dailyActiveUsers![users.dailyActiveUsers!.length - 1]?.date}
                    </span>
                  </div>
                </div>
              )}
              {users.favoriteTeams.length > 0 && (
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Favorite Teams</div>
                  {users.favoriteTeams.map((ft, i) => (
                    <div key={i} style={listRow}>
                      <span>{ft.team}</span>
                      <span style={{ fontWeight: '600' }}>{ft.count} fans</span>
                    </div>
                  ))}
                </div>
              )}
            </>}

            {/* ── Team Funding ── */}
            {analyticsTab === 'funding' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={statBox}>
                  <div style={statLabel}>Fan Contributions</div>
                  <div style={statValue}>{funding.totalFanContributions.toLocaleString()}</div>
                </div>
                {['MEGA_MARKET', 'LARGE_MARKET', 'MID_MARKET', 'SMALL_MARKET'].map(tier => (
                  <div key={tier} style={statBox}>
                    <div style={statLabel}>{tier.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</div>
                    <div style={{ ...statValue, color: tierColors[tier] || '#e2e8f0', fontSize: '18px' }}>
                      {funding.tierDistribution[tier] || 0}
                    </div>
                  </div>
                ))}
              </div>
              {funding.topTeams.length > 0 && (
                <div style={statBox}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Top Funded Teams</div>
                  {funding.topTeams.map((t, i) => (
                    <div key={i} style={listRow}>
                      <span>{t.team}</span>
                      <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: tierColors[t.tier] || '#94a3b8', fontSize: '11px' }}>
                          {(t.tier || '').replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontWeight: '600' }}>{t.contributions.toLocaleString()}F</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>}

            {/* ── Pick-Em ── */}
            {analyticsTab === 'pickem' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={statBox}>
                  <div style={statLabel}>Total Picks</div>
                  <div style={statValue}>{pickEm.totalPicks.toLocaleString()}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Accuracy</div>
                  <div style={statValue}>{pickEm.accuracy}%</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Participants</div>
                  <div style={statValue}>{pickEm.participants}</div>
                </div>
              </div>
              {(pickEm.trend?.length ?? 0) > 0 && (
                <div style={{ ...statBox, marginTop: '12px' }}>
                  <div style={{ ...statLabel, marginBottom: '8px' }}>Weekly Participation</div>
                  {pickEm.trend!.map(w => (
                    <div key={w.week} style={listRow}>
                      <span>Week {w.week}</span>
                      <span style={{ display: 'flex', gap: '16px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>{w.participants} users</span>
                        <span style={{ fontWeight: '600' }}>{w.picks} picks</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>}
          </>
        })()}
      </div>}

      {/* Beta Access Requests */}
      {activeSection === 'requests' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Beta Access Requests</h2>

        {/* Access Mode Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 14px', backgroundColor: '#0f172a',
          borderRadius: '6px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Access Mode:</span>
          <button
            onClick={toggleAccessMode}
            disabled={accessModeLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: '1px solid #334155',
              borderRadius: '4px', padding: '4px 12px', fontSize: '12px',
              fontWeight: '600', cursor: accessModeLoading ? 'not-allowed' : 'pointer',
              color: accessMode === 'waitlist' ? '#f59e0b' : '#3b82f6',
              opacity: accessModeLoading ? 0.5 : 1,
            }}
          >
            {accessMode === 'waitlist' ? 'Waitlist' : 'Request Access'}
          </button>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {accessMode === 'waitlist'
              ? 'Users see "Join Waitlist" — no individual approvals needed'
              : 'Users see "Request Access" — you approve individually'}
          </span>
        </div>

        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
          Pending requests from users who want to join the closed beta.
        </p>
        {requestsLoading ? (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Loading...</div>
        ) : betaRequests.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>No pending requests.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {betaRequests.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                backgroundColor: '#0f172a', borderRadius: '5px',
                padding: '8px 10px', fontSize: '13px',
              }}>
                <span style={{ color: '#e2e8f0', flex: 1 }}>{r.email}</span>
                <span style={{ color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {new Date(r.requestedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleApproveRequest(r.id)}
                  disabled={actioningId === r.id}
                  style={{
                    backgroundColor: '#22c55e', color: '#fff', border: 'none',
                    borderRadius: '4px', padding: '4px 12px', fontSize: '12px',
                    fontWeight: '600', cursor: actioningId === r.id ? 'not-allowed' : 'pointer',
                    opacity: actioningId === r.id ? 0.5 : 1,
                  }}
                >Approve</button>
                <button
                  onClick={() => handleDenyRequest(r.id)}
                  disabled={actioningId === r.id}
                  style={{
                    backgroundColor: '#334155', color: '#e2e8f0', border: 'none',
                    borderRadius: '4px', padding: '4px 12px', fontSize: '12px',
                    fontWeight: '600', cursor: actioningId === r.id ? 'not-allowed' : 'pointer',
                    opacity: actioningId === r.id ? 0.5 : 1,
                  }}
                >Deny</button>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Beta Allowlist */}
      {activeSection === 'allowlist' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Beta Allowlist</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          Manage which emails can access the app during beta.
        </p>
        <div style={{ marginBottom: '12px' }}>
          <div style={labelStyle}>Add Emails (comma or newline separated)</div>
          <textarea
            value={allowlistInput}
            onChange={e => setAllowlistInput(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder={'user@example.com, another@example.com'}
          />
        </div>
        <button
          onClick={handleAddEmails}
          disabled={!allowlistInput.trim()}
          style={{ ...btnStyle, opacity: !allowlistInput.trim() ? 0.5 : 1 }}
        >
          Add Emails
        </button>
        {allowlistSuccess && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#22c55e' }}>{allowlistSuccess}</div>
        )}
        {allowlistError && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>{allowlistError}</div>
        )}
        {allowlistLoading ? (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>Loading...</div>
        ) : allowlist.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            <div style={{ ...labelStyle, marginBottom: '8px' }}>
              Allowed Emails ({allowlist.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allowlist.map(entry => (
                <div key={entry.email} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  backgroundColor: '#0f172a', borderRadius: '5px',
                  padding: '6px 10px', fontSize: '13px',
                }}>
                  <span style={{ color: '#e2e8f0', flex: 1 }}>{entry.email}</span>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {new Date(entry.addedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleRemoveEmail(entry.email)}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      cursor: 'pointer', fontSize: '13px', padding: '2px 6px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
            No emails on the allowlist yet.
          </div>
        )}
      </div>}

      {/* Name Pool */}
      {activeSection === 'names' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Name Pool</h2>
        <div style={{ marginBottom: '12px' }}>
          <div style={labelStyle}>Add Names (one per line)</div>
          <textarea
            value={namesInput}
            onChange={e => setNamesInput(e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder={'John Smith\nJane Doe\nAlex Johnson'}
          />
        </div>
        <button
          onClick={handleAddNames}
          disabled={namesLoading || !namesInput.trim()}
          style={{ ...btnStyle, opacity: namesLoading || !namesInput.trim() ? 0.5 : 1 }}
        >
          {namesLoading ? 'Adding…' : 'Add Names'}
        </button>
        {namesResult && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#22c55e' }}>
            Added {namesResult.added} name{namesResult.added !== 1 ? 's' : ''}. Pool total: {namesResult.total}
          </div>
        )}
        {namesError && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>{namesError}</div>
        )}
      </div>}

      {/* Create Players */}
      {activeSection === 'players' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Create Players</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          New players are added to the free agent pool and will be available next offseason.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={labelStyle}>Position</div>
            <select value={position} onChange={e => setPosition(e.target.value)} style={selectStyle}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Tier</div>
            <select value={tier} onChange={e => setTier(e.target.value)} style={selectStyle}>
              {TIERS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Count</div>
            <input
              type="number" min={1} max={10} value={count}
              onChange={e => setCount(Math.max(1, Math.min(10, Number(e.target.value))))}
              style={inputStyle}
            />
          </div>
        </div>
        <button onClick={handleCreatePlayers} disabled={createLoading}
          style={{ ...btnStyle, opacity: createLoading ? 0.5 : 1 }}>
          {createLoading ? 'Creating…' : 'Create'}
        </button>
        {createError && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>{createError}</div>
        )}
        {createdPlayers.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ ...labelStyle, marginBottom: '8px' }}>Recently Created</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {createdPlayers.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  backgroundColor: '#0f172a', borderRadius: '5px',
                  padding: '6px 10px', fontSize: '13px',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '700',
                    color: TIER_COLORS[p.tier] ?? '#94a3b8', letterSpacing: '0.06em', minWidth: '14px' }}>
                    {p.tier.replace('Tier', '')}
                  </span>
                  <span style={{ color: '#e2e8f0', flex: 1 }}>{p.name}</span>
                  <span style={{ color: '#64748b' }}>{p.position}</span>
                  <span style={{ color: '#94a3b8', minWidth: '36px', textAlign: 'right' }}>{p.rating}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}

      {/* Grant Card */}
      {activeSection === 'cards' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Grant Card</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
          Grant a trading card with specific edition, effect, and classification to a user.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <div style={labelStyle}>User</div>
          <select value={cardUser?.id ?? ''} onChange={e => {
            const u = adminUsers.find(u => u.id === Number(e.target.value))
            setCardUser(u ?? null)
          }} style={selectStyle}>
            <option value="">Select user...</option>
            {adminUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.username || u.email} ({u.floobits}F)
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={labelStyle}>Player <span style={{ color: '#64748b', fontWeight: '400' }}>(optional — random if empty)</span></div>
          {cardSelectedPlayer ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: '#0f172a', borderRadius: '6px', padding: '8px 12px',
              border: '1px solid #334155',
            }}>
              <span style={{ color: '#e2e8f0', flex: 1 }}>
                {cardSelectedPlayer.name}
                <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '12px' }}>
                  {cardSelectedPlayer.position} / {cardSelectedPlayer.teamName} / {cardSelectedPlayer.rating} OVR
                </span>
              </span>
              <button onClick={() => { setCardSelectedPlayer(null); setCardPlayerSearch(''); setCardEffect('') }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>
                Clear
              </button>
            </div>
          ) : (
            <>
              <input value={cardPlayerSearch} onChange={e => setCardPlayerSearch(e.target.value)}
                style={inputStyle} placeholder="Search player name..." />
              {playerSearching && (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Searching...</div>
              )}
              {cardPlayerResults.length > 0 && (
                <div style={{
                  marginTop: '4px', backgroundColor: '#0f172a', borderRadius: '6px',
                  border: '1px solid #334155', maxHeight: '200px', overflowY: 'auto',
                }}>
                  {cardPlayerResults.map(p => (
                    <button key={p.id} onClick={() => { setCardSelectedPlayer(p); setCardPlayerResults([]) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                        padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid #1e293b',
                        color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                      }}>
                      <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', width: '24px' }}>{p.position}</span>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>{p.teamName}</span>
                      <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>{p.rating}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={labelStyle}>Edition</div>
            <select value={cardEdition} onChange={e => { setCardEdition(e.target.value); setCardEffect('') }} style={selectStyle}>
              {(cardOptions?.editions ?? ['base', 'holographic', 'prismatic', 'diamond']).map(ed => (
                <option key={ed} value={ed} style={{ color: EDITION_COLORS_MAP[ed] }}>{ed.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Category</div>
            <select value={cardCategory} onChange={e => { setCardCategory(e.target.value); setCardEffect('') }} style={selectStyle}>
              <option value="">Default ({cardSelectedPlayer ? (CATEGORY_FOR_POSITION[cardSelectedPlayer.position] || '?') : '—'})</option>
              {(cardOptions?.categories ?? []).map(cat => (
                <option key={cat} value={cat}>{cat.replace(/_/g, ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Effect</div>
            <select value={cardEffect} onChange={e => setCardEffect(e.target.value)} style={selectStyle}>
              <option value="">Random</option>
              {allEffects.map(ef => (
                <option key={ef.name} value={ef.name}>{ef.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Classification</div>
            <select value={cardClassification} onChange={e => setCardClassification(e.target.value)} style={selectStyle}>
              <option value="">None</option>
              {(cardOptions?.classifications ?? []).map(c => (
                <option key={c} value={c}>{c.toUpperCase().replace(/_/g, ' + ')}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleGrantCard}
          disabled={cardLoading || !cardUser}
          style={{ ...btnStyle, opacity: cardLoading || !cardUser ? 0.5 : 1 }}>
          {cardLoading ? 'Granting...' : cardSelectedPlayer ? 'Grant Card' : 'Grant Random Card'}
        </button>
        {cardResult && <div style={{ marginTop: '10px', fontSize: '13px', color: '#22c55e' }}>{cardResult}</div>}
        {cardError && <div style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>{cardError}</div>}
      </div>}

      {/* Grant Floobits */}
      {activeSection === 'floobits' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Grant Floobits</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
          Add Floobits to a user's balance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={labelStyle}>User</div>
            <select value={floobitsUser?.id ?? ''} onChange={e => {
              const u = adminUsers.find(u => u.id === Number(e.target.value))
              setFloobitsUser(u ?? null)
            }} style={selectStyle}>
              <option value="">Select user...</option>
              {adminUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.username || u.email} ({u.floobits}F)
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Amount</div>
            <input type="number" min={1} value={floobitsAmount}
              onChange={e => setFloobitsAmount(Math.max(1, Number(e.target.value)))}
              style={inputStyle} />
          </div>
        </div>
        <button onClick={handleGrantFloobits}
          disabled={floobitsLoading || !floobitsUser || floobitsAmount <= 0}
          style={{ ...btnStyle, opacity: floobitsLoading || !floobitsUser ? 0.5 : 1 }}>
          {floobitsLoading ? 'Granting...' : 'Grant Floobits'}
        </button>
        {floobitsResult && <div style={{ marginTop: '10px', fontSize: '13px', color: '#22c55e' }}>{floobitsResult}</div>}
        {floobitsError && <div style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>{floobitsError}</div>}
      </div>}

      {/* Achievements */}
      {activeSection === 'achievements' && <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Achievements</h2>
          {achMetrics && (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {achMetrics.totalUsers} users · Season {achMetrics.season || '—'} (per-season counts)
            </div>
          )}
        </div>
        {achLoading && <div style={{ fontSize: '13px', color: '#94a3b8' }}>Loading...</div>}
        {achError && <div style={{ fontSize: '13px', color: '#ef4444' }}>{achError}</div>}
        {achMetrics && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600 }}>Achievement</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600 }}>Scope</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600, textAlign: 'right' }}>Target</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600, textAlign: 'right' }}>Unlocks</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600, textAlign: 'right' }}>%</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155', fontWeight: 600, textAlign: 'right' }}>Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              {(achMetrics.achievements || []).map((a: any) => {
                const fmt = (n: number) => formatAchievementValue(a.key, n)
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 10px', color: '#e2e8f0', fontWeight: 500 }}>{a.name}</td>
                    <td style={{ padding: '6px 10px', color: '#cbd5e1' }}>{a.category}</td>
                    <td style={{ padding: '6px 10px', color: '#cbd5e1' }}>{a.scope}</td>
                    <td style={{ padding: '6px 10px', color: '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(a.target)}</td>
                    <td style={{ padding: '6px 10px', color: '#e2e8f0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{a.unlocks}</td>
                    <td style={{
                      padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                      color: a.unlockPct >= 50 ? '#22c55e' : a.unlockPct >= 20 ? '#f59e0b' : '#94a3b8',
                    }}>{a.unlockPct}%</td>
                    <td style={{ padding: '6px 10px', color: '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(a.avgProgress)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>}

      {/* Registered Users */}
      {activeSection === 'users' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Registered Users</h2>

        {/* Controls row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Filter:</span>
            {(['all', 'active', 'pending', 'inactive'] as const).map(f => (
              <button key={f} onClick={() => { setUserFilter(f); fetchUsers(userSort, f) }} style={{
                background: userFilter === f ? '#334155' : 'none',
                border: '1px solid', borderColor: userFilter === f ? '#475569' : '#334155',
                borderRadius: '4px', padding: '3px 10px', fontSize: '11px',
                fontWeight: '600', cursor: 'pointer',
                color: userFilter === f ? '#e2e8f0' : '#94a3b8',
              }}>
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'pending' ? 'Pending' : 'Inactive'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Sort:</span>
            <select
              value={userSort}
              onChange={e => { setUserSort(e.target.value); fetchUsers(e.target.value, userFilter) }}
              style={{
                backgroundColor: '#0f172a', border: '1px solid #334155',
                borderRadius: '4px', padding: '3px 8px', fontSize: '11px',
                color: '#e2e8f0', cursor: 'pointer',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="last_login">Last Login</option>
              <option value="username">Username</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSendReminders}
            disabled={reminderLoading}
            style={{
              backgroundColor: '#334155', color: '#e2e8f0', border: 'none',
              borderRadius: '4px', padding: '4px 12px', fontSize: '11px',
              fontWeight: '600', cursor: reminderLoading ? 'not-allowed' : 'pointer',
              opacity: reminderLoading ? 0.5 : 1,
            }}
          >
            {reminderLoading ? 'Sending...' : 'Send Onboarding Reminders'}
          </button>
        </div>

        {reminderResult && (
          <div style={{
            fontSize: '12px', marginBottom: '12px', padding: '8px 12px',
            backgroundColor: '#0f172a', borderRadius: '4px',
            color: reminderResult.startsWith('Error') ? '#ef4444' : '#22c55e',
          }}>
            {reminderResult}
          </div>
        )}

        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
          {adminUsers.length} user{adminUsers.length !== 1 ? 's' : ''}
          {userFilter !== 'all' ? ` (${userFilter})` : ''}
        </p>
        {adminUsers.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>No users found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Username', 'Email', 'Favorite Team', 'Floobits', 'Joined', 'Last Login', 'Status', 'Beta', 'Admin', ''].map(h => (
                    <th key={h} style={{
                      ...labelStyle, textAlign: 'left', padding: '8px 10px',
                      marginBottom: 0, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {u.username || <span style={{ color: '#64748b', fontStyle: 'italic' }}>—</span>}
                      <button
                        onClick={() => handleRerollUsername(u.id)}
                        disabled={rerollingUserId === u.id}
                        style={{
                          background: 'none', border: 'none',
                          color: rerollingUserId === u.id ? '#475569' : '#3b82f6',
                          cursor: rerollingUserId === u.id ? 'default' : 'pointer',
                          fontSize: '11px', fontWeight: '600',
                          marginLeft: '8px', padding: '2px 4px',
                        }}
                      >
                        {rerollingUserId === u.id ? '...' : 'Re-roll'}
                      </button>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#cbd5e1' }}>{u.email}</td>
                    <td style={{ padding: '8px 10px', color: '#cbd5e1' }}>
                      {u.favoriteTeam || <span style={{ color: '#64748b' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#cbd5e1', textAlign: 'right' }}>
                      {u.floobits.toLocaleString()}
                      <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '4px' }}>
                        ({u.lifetimeEarned.toLocaleString()} / {u.lifetimeSpent.toLocaleString()})
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
                        color: !u.isActive ? '#ef4444' : u.onboarded ? '#22c55e' : '#f59e0b',
                      }}>
                        {!u.isActive ? 'Inactive' : u.onboarded ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
                        color: u.betaStatus === 'approved' ? '#22c55e'
                          : u.betaStatus === 'no_request' ? '#ef4444'
                          : u.betaStatus === 'pending' ? '#f59e0b'
                          : '#94a3b8',
                      }}>
                        {u.betaStatus === 'no_request' ? 'No Request' : u.betaStatus === 'approved' ? 'Approved' : u.betaStatus === 'pending' ? 'Pending' : u.betaStatus}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => handleToggleAdmin(u.id)}
                        disabled={togglingAdminId === u.id}
                        style={{
                          background: 'none', border: '1px solid',
                          borderColor: u.isAdmin ? '#22c55e' : '#334155',
                          borderRadius: '4px', padding: '2px 8px',
                          fontSize: '11px', fontWeight: '600',
                          color: u.isAdmin ? '#22c55e' : '#64748b',
                          cursor: togglingAdminId === u.id ? 'default' : 'pointer',
                        }}
                      >
                        {togglingAdminId === u.id ? '...' : u.isAdmin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingUserId === u.id}
                        style={{
                          background: 'none', border: 'none',
                          color: deletingUserId === u.id ? '#475569' : '#ef4444',
                          cursor: deletingUserId === u.id ? 'default' : 'pointer',
                          fontSize: '11px', fontWeight: '600', padding: '2px 4px',
                        }}
                      >
                        {deletingUserId === u.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* Settings */}
      {activeSection === 'settings' && <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0' }}>App Settings</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
          Runtime-editable settings. Changes apply on the next page load for any user (cached client-side per session).
        </p>

        {settingsError && (
          <div style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>{settingsError}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '560px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
              Feedback URL
            </label>
            <input
              type="text"
              value={settingsForm.feedback_url}
              onChange={e => setSettingsForm(s => ({ ...s, feedback_url: e.target.value }))}
              disabled={settingsLoading}
              placeholder="https://forms.gle/..."
              style={{
                width: '100%', padding: '8px 10px',
                fontSize: '13px', color: '#e2e8f0',
                backgroundColor: '#0f172a',
                border: '1px solid #334155', borderRadius: '4px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settingsForm.feedback_visible}
                onChange={e => setSettingsForm(s => ({ ...s, feedback_visible: e.target.checked }))}
                disabled={settingsLoading}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              Show Feedback button in footer
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
              Survey URL (mid-season modal)
            </label>
            <input
              type="text"
              value={settingsForm.survey_url}
              onChange={e => setSettingsForm(s => ({ ...s, survey_url: e.target.value }))}
              disabled={settingsLoading}
              placeholder="https://forms.gle/..."
              style={{
                width: '100%', padding: '8px 10px',
                fontSize: '13px', color: '#e2e8f0',
                backgroundColor: '#0f172a',
                border: '1px solid #334155', borderRadius: '4px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <button
              onClick={saveSettings}
              disabled={settingsLoading}
              style={{
                padding: '8px 16px',
                fontSize: '13px', fontWeight: '600',
                backgroundColor: settingsLoading ? '#334155' : '#3b82f6',
                color: '#ffffff',
                border: 'none', borderRadius: '4px',
                cursor: settingsLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {settingsLoading ? 'Saving…' : 'Save'}
            </button>
            {settingsSaved && (
              <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>{settingsSaved}</span>
            )}
          </div>
        </div>
      </div>}
    </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const { user, getToken } = useAuth()
  const stored = sessionStorage.getItem(SESSION_KEY)
  const [password, setPassword] = useState<string | null>(stored)
  const [token, setToken] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  // If user is admin, fetch a token for API calls
  useEffect(() => {
    if (user?.isAdmin && !fetchedRef.current) {
      fetchedRef.current = true
      getToken().then(t => setToken(t))
    }
  }, [user?.isAdmin, getToken])

  // Admin user with token: skip password gate
  if (user?.isAdmin && token) {
    return <AdminContent password={null} token={token} />
  }

  // Fallback: password gate
  if (!password) {
    return <PasswordGate onAuth={setPassword} />
  }
  return <AdminContent password={password} token={null} />
}

export default AdminPage
