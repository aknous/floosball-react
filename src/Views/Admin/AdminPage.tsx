import React, { useState, useCallback } from 'react'

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
      height: 'calc(100vh - 56px)',
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

const AdminContent: React.FC<{ password: string }> = ({ password }) => {
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Password': password }

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
    <div style={{ backgroundColor: '#0f172a', minHeight: 'calc(100vh - 56px)', color: '#e2e8f0' }}>
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '28px' }}>Admin Portal</h1>

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
