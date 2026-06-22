import React, { useEffect, useState, useCallback } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'

interface FloobitsReceivedEvent {
  event: 'floobits_received'
  amount: number
  transactionType: string
  description: string
  balanceAfter: number
  season?: number
  week?: number
}

const TX_LABELS: Record<string, string> = {
  weekly_fp_bonus: 'Weekly Earnings',
  leaderboard_season: 'Season Leaderboard',
  leaderboard_weekly: 'Weekly Leaderboard',
  pickem_correct: 'Prognostication Payout',
  pickem_leaderboard_season: 'Prognostication Season Prize',
  pickem_leaderboard_weekly: 'Prognostication Weekly Prize',
  card_effect: 'Card Effect',
  admin_grant: 'Admin Grant',
  supporter_dividend: 'Supporter Dividend',
  showcase_dividend: 'Showcase Dividend',
}

const txLabel = (slug: string) => TX_LABELS[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const FloobitsReceivedToast: React.FC = () => {
  const { subscribe } = useSeasonWebSocket()
  const { updateFloobits } = useAuth()
  const [queue, setQueue] = useState<FloobitsReceivedEvent[]>([])

  useEffect(() => {
    return subscribe((msg) => {
      if ((msg as any)?.event !== 'floobits_received') return
      const ev = msg as unknown as FloobitsReceivedEvent
      setQueue(q => [...q, ev])
      if (typeof ev.balanceAfter === 'number') updateFloobits(ev.balanceAfter)
    })
  }, [subscribe, updateFloobits])

  const dismiss = useCallback(() => setQueue(q => q.slice(1)), [])

  const latest = queue[0] ?? null
  useEffect(() => {
    if (!latest) return
    const t = setTimeout(dismiss, 5000)
    return () => clearTimeout(t)
  }, [latest, dismiss])

  if (!latest) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="font-pixel"
      style={{
        position: 'fixed',
        bottom: '230px',
        right: '24px',
        width: '300px',
        zIndex: 9998,
        backgroundColor: '#1e2d3d',
        border: '1px solid #fbbf24',
        borderRadius: '10px',
        padding: '12px 14px',
        color: '#e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        animation: 'floobits-slide-in 0.25s ease-out',
      }}
    >
      <style>{`
        @keyframes floobits-slide-in {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{
          flexShrink: 0,
          width: '26px', height: '26px', borderRadius: '50%',
          backgroundColor: 'rgba(251,191,36,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fbbf24',
        }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3.5a1 1 0 01.992.883l.008.117V11h2.5a1 1 0 01.117 1.993L13.5 13H11a1 1 0 01-.992-.883L10 12V6.5a1 1 0 011-1z" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px',
          }}>
            {txLabel(latest.transactionType)}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
            +{latest.amount} Floobits
          </div>
          {latest.description && (
            <div style={{
              fontSize: '11px', color: '#94a3b8', marginTop: '3px',
              lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {latest.description}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'none', border: 'none', color: '#64748b',
            cursor: 'pointer', padding: '2px', lineHeight: 1, fontSize: '16px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default FloobitsReceivedToast
