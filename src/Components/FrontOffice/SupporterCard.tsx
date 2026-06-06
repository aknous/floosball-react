import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import HoverTooltip from '@/Components/HoverTooltip'

// Supporter income surface — the non-fantasy, idle Floobit path. Shows the fan's
// loyalty tier + tenure, patron rank, total multiplier, and the dividends
// accrued and waiting to be claimed. Lives on the Front Office page (the
// favorite-team hub). Consumes GET /api/supporter/me + POST /api/supporter/claim.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface PendingDividend {
  season: number
  week: number
  amount: number
  breakdown: { parts: Record<string, number>; mult: number; amount: number; won: boolean } | null
}

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
  pending?: PendingDividend[]
  weeklyBase: number
  weeklyWinBonus: number
  weeklyMin: number
  weeklyMax: number
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
    <span style={{ fontSize: 11, color: C.muted }}>fan dividends</span>
  </div>
)

// One labeled term in the dividend equation: a small label + its value. Hover
// tip (where given) explains what it is and how to grow it.
const Term: React.FC<{ label: string; value: string; color?: string; tip?: string }> = ({ label, value, color, tip }) => {
  const body = (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color ?? C.body }}>{value}</span>
    </span>
  )
  return tip
    ? <HoverTooltip text={tip}><span style={{ borderBottom: '1px dotted #475569' }}>{body}</span></HoverTooltip>
    : body
}

// Equation operator / parenthesis.
const Op: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>{children}</span>
)

// Human labels + display order for the dividend breakdown parts.
const PART_LABELS: Record<string, string> = {
  base: 'Base', win: 'Win', upset: 'Upset', shutout: 'Shutout',
  blowout: 'Blowout', comeback: 'Comeback', streak: 'Streak', playoff: 'Playoff',
}
const PART_ORDER = ['base', 'win', 'upset', 'shutout', 'blowout', 'comeback', 'streak', 'playoff']

function formatParts(bd: PendingDividend['breakdown']): string {
  if (!bd?.parts) return ''
  // Show every part as +X so the line reads as a sum, then the ×multiplier.
  const segs = PART_ORDER.filter(k => bd.parts[k]).map(k => `${PART_LABELS[k]} +${bd.parts[k]}`)
  return `${segs.join(' · ')} ×${bd.mult}`
}

const SupporterCard: React.FC = () => {
  const { getToken, refetchUser } = useAuth()
  const [status, setStatus] = useState<SupporterStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

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
      // Let the navbar clear its dividend badge immediately.
      window.dispatchEvent(new Event('supporter:claimed'))
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

  const loyaltyTip = `You've backed this team ${status.supporterWeeks} wks${seasons >= 1 ? ` (~${seasons} season${seasons === 1 ? '' : 's'})` : ''}. Tenure climbs the longer you stay.`
    + (status.nextTier ? ` Next: ${status.nextTier.label} (×${status.nextTier.multiplier}) in ${status.nextTier.weeksAway} wks.` : '')
  const patronTip = status.patronTier
    ? `Your standing among this team's funders this season. Fund the team to climb the ranks.`
    : `Fund your team to earn a patron rank. The season's biggest backers rank highest and boost their dividends.`
  const winTip = `Paid the weeks your team wins. The bonus grows with the win: upsets, shutouts, blowouts, comebacks, win streaks, and playoff rounds all add more on top.`
  return (
    <Card>
      {/* Header + equation on the left, claim on the right — one row, no extra
          content row. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Supporter Dividend
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>- Floobits every week for backing your team</span>
          </div>

          {/* The dividend equation, fantasy-calc style: (Base + Win) scaled by
              (Loyalty × Patron). Spells out exactly what's multiplied; loyalty
              and patron terms are hoverable for how to grow them. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Op>(</Op>
            <Term label="Base" value={`${status.weeklyBase} F`} color={C.gold} />
            <Op>+</Op>
            <Term label="Win" value={`${status.weeklyWinBonus}+ F`} color={C.gold} tip={winTip} />
            <Op>)</Op>
            <Op>×</Op>
            <Op>(</Op>
            <Term label="Tenure" value={`${status.loyaltyTier} ×${status.loyaltyMultiplier}`} tip={loyaltyTip} />
            <Op>×</Op>
            <Term label="Funding" value={status.patronTier ? `${status.patronTier} ×${status.patronMultiplier}` : 'None ×1'} tip={patronTip} />
            <Op>)</Op>
            <Op>=</Op>
            <span style={{ fontSize: 17, fontWeight: 800, color: C.gold }}>{status.weeklyMin}–{status.weeklyMax} F</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            Win bonus applies the weeks they win, and grows with upsets, shutouts, blowouts, comebacks, streaks, and playoff wins.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claimable</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: status.unclaimed > 0 ? C.gold : C.muted }}>
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
      </div>

      {!status.earning && (
        <p style={{ fontSize: 11, color: C.warn, margin: '8px 0 0', lineHeight: 1.45 }}>
          Paused while you're away. Sign in to keep dividends flowing.
        </p>
      )}

      {/* Collapsible per-week breakdown of what's in the pool. Collapsed by
          default, so it adds only a single subtle toggle line until opened. */}
      {(status.pending?.length ?? 0) > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowBreakdown(v => !v)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 11, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 9 }}>{showBreakdown ? '▾' : '▸'}</span>
            {showBreakdown ? 'Hide' : 'Show'} pool breakdown ({status.pending!.length} {status.pending!.length === 1 ? 'week' : 'weeks'})
          </button>
          {showBreakdown && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {status.pending!.map(p => (
                <div key={`${p.season}-${p.week}`} style={{
                  display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 11,
                }}>
                  <span style={{ color: C.muted, minWidth: 52 }}>Week {p.week}</span>
                  <span style={{ color: C.body, flex: 1, minWidth: 0 }}>{formatParts(p.breakdown)}</span>
                  <span style={{ color: C.gold, fontWeight: 700 }}>+{p.amount} F</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default SupporterCard
