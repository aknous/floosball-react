import React, { useState, useCallback, useEffect } from 'react'

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

interface AllowlistEntry {
  email: string
  addedAt: string
}

interface AdminUser {
  id: number; email: string; username: string | null; floobits: number
}

interface EffectOption { name: string; displayName: string }
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
  base: '#94a3b8', chrome: '#d4d4d8', holographic: '#c4b5fd',
  gold: '#fbbf24', prismatic: '#f9a8d4', diamond: '#a5f3fc',
}

const CATEGORY_FOR_POSITION: Record<string, string> = {
  QB: 'multiplier', RB: 'floobits', WR: 'flat_fp', TE: 'conditional', K: 'streak',
}

const AdminContent: React.FC<{ password: string }> = ({ password }) => {
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Password': password }

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
          headers: { 'X-Admin-Password': password },
        })
        if (res.ok) {
          const data = await res.json()
          setCardOptions(data.data)
        }
      } catch { /* silent */ }
    }
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users`, {
          headers: { 'X-Admin-Password': password },
        })
        if (res.ok) {
          const data = await res.json()
          setAdminUsers(data.data?.users ?? [])
        }
      } catch { /* silent */ }
    }
    fetchOptions()
    fetchUsers()
  }, [password])

  // Player search with debounce
  useEffect(() => {
    if (cardPlayerSearch.length < 2) { setCardPlayerResults([]); return }
    const timer = setTimeout(async () => {
      setPlayerSearching(true)
      try {
        const res = await fetch(
          `${API_BASE}/admin/players/search?q=${encodeURIComponent(cardPlayerSearch)}`,
          { headers: { 'X-Admin-Password': password } },
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

  // Get available effects based on selected category (or player's default)
  const activeCategory = cardCategory || (cardSelectedPlayer ? CATEGORY_FOR_POSITION[cardSelectedPlayer.position] : '')
  const allEffects: EffectOption[] = (() => {
    if (!cardOptions) return []
    // If a category is selected, show that category's effects
    if (activeCategory) return cardOptions.effects[activeCategory] ?? []
    // Otherwise show all effects across all categories
    return Object.values(cardOptions.effects).flat()
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

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '28px' }}>Admin Portal</h1>

      {/* Beta Allowlist */}
      <div style={sectionStyle}>
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
      </div>

      {/* Name Pool */}
      <div style={sectionStyle}>
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
      </div>

      {/* Create Players */}
      <div style={sectionStyle}>
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
      </div>

      {/* Grant Card */}
      <div style={sectionStyle}>
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
            <select value={cardEdition} onChange={e => setCardEdition(e.target.value)} style={selectStyle}>
              {(cardOptions?.editions ?? ['base', 'chrome', 'holographic', 'gold', 'prismatic', 'diamond']).map(ed => (
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
      </div>

      {/* Grant Floobits */}
      <div style={sectionStyle}>
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
      </div>
    </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const stored = sessionStorage.getItem(SESSION_KEY)
  const [password, setPassword] = useState<string | null>(stored)

  if (!password) {
    return <PasswordGate onAuth={setPassword} />
  }
  return <AdminContent password={password} />
}

export default AdminPage
