import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Supporter income surface — the non-fantasy, idle Floobit path. Shows the fan's
// loyalty tier + tenure, patron rank, total multiplier, and the dividends
// accrued and waiting to be claimed. Lives on the Front Office page (the
// favorite-team hub). Consumes GET /api/supporter/me + POST /api/supporter/claim.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface SupporterStatus {
  favoriteTeamId: number | null
  supporterWeeks: number
  loyaltyTier: string
  loyaltyMultiplier: number
  patronTier: string | null
  patronMultiplier: number
  totalMultiplier: number
  nextTier: { label: string; multiplier: number; weeksAway: number } | null
  unclaimed: number
  earning: boolean
}

const C = {
  card: '#1e293b', border: '#334155',
  text: '#e2e8f0', body: '#cbd5e1', muted: '#94a3b8',
  gold: '#fbbf24', green: '#22c55e', blue: '#3b82f6', warn: '#f59e0b',
}

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ backgroundColor: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
    {children}
  </div>
)

const Header = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Supporter
    </span>
    <span style={{ fontSize: 10, color: C.muted }}>fan dividends</span>
  </div>
)

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? C.gold : C.body }}>{value}</div>
  </div>
)

const SupporterCard: React.FC = () => {
  const { getToken, refetchUser } = useAuth()
  const [status, setStatus] = useState<SupporterStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  const load = useCallback(async () => {
    try {
      const tok = await getToken()
      const res = await fetch(`${API_BASE}/supporter/me`, { headers: { Authorization: `Bearer ${tok}` } })
      const json = await res.json()
      setStatus((json?.data ?? null) as SupporterStatus | null)
    } catch {
      /* leave last known */
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const claim = async () => {
    if (!status || status.unclaimed <= 0 || claiming) return
    setClaiming(true)
    try {
      const tok = await getToken()
      await fetch(`${API_BASE}/supporter/claim`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } })
      await Promise.all([load(), refetchUser ? refetchUser() : Promise.resolve()])
    } catch {
      /* ignore */
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return <Card><Header /><div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Loading…</div></Card>
  }
  if (!status) return null
  if (status.favoriteTeamId == null) {
    return (
      <Card>
        <Header />
        <p style={{ color: C.muted, fontSize: 12, margin: '8px 0 0', lineHeight: 1.5 }}>
          Pick a favorite team to start earning supporter dividends just for backing them.
        </p>
      </Card>
    )
  }

  const seasons = Math.floor(status.supporterWeeks / 28)
  const canClaim = status.unclaimed > 0 && !claiming

  return (
    <Card>
      <Header />

      {/* Loyalty tier + tenure */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>{status.loyaltyTier}</span>
        <span style={{ fontSize: 11, color: C.muted }}>
          {status.supporterWeeks} wks{seasons >= 1 ? ` · ~${seasons} season${seasons === 1 ? '' : 's'}` : ''} backing your team
        </span>
      </div>

      {/* Multipliers */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        <Stat label="Loyalty" value={`×${status.loyaltyMultiplier}`} />
        {status.patronTier && <Stat label={status.patronTier} value={`×${status.patronMultiplier}`} />}
        <Stat label="Total" value={`×${status.totalMultiplier}`} highlight />
      </div>

      {/* Next tier */}
      {status.nextTier && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
          Next: <span style={{ color: C.body, fontWeight: 600 }}>{status.nextTier.label}</span>
          {' '}(×{status.nextTier.multiplier}) in {status.nextTier.weeksAway} wks
        </div>
      )}

      {/* Claim */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claimable</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: status.unclaimed > 0 ? C.gold : C.muted }}>
            {status.unclaimed} F
          </div>
        </div>
        <button
          onClick={claim}
          disabled={!canClaim}
          style={{
            padding: '8px 18px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 13,
            cursor: canClaim ? 'pointer' : 'not-allowed',
            backgroundColor: canClaim ? C.blue : '#334155',
            color: canClaim ? '#fff' : C.muted,
          }}
        >
          {claiming ? 'Claiming…' : 'Claim'}
        </button>
      </div>

      {!status.earning && (
        <p style={{ fontSize: 10, color: C.warn, margin: '8px 0 0', lineHeight: 1.45 }}>
          Income paused — you've been away. Sign in to keep the dividends flowing.
        </p>
      )}
    </Card>
  )
}

export default SupporterCard
