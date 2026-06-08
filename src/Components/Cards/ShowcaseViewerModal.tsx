import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const GRADE_COLORS: Record<string, string> = {
  F: '#64748b', D: '#94a3b8', C: '#60a5fa', B: '#4ade80', A: '#a78bfa', S: '#fbbf24',
}

interface Slot { slotNumber: number; card: CardData | null }
interface ViewerData {
  username: string
  grade: string
  estimatedPayout: number
  activeSets: { key: string; name: string }[]
  slots: Slot[]
}

interface ShowcaseViewerModalProps {
  userId: number | null   // null = closed
  onClose: () => void
}

export default function ShowcaseViewerModal({ userId, onClose }: ShowcaseViewerModalProps) {
  const { getToken } = useAuth()
  const [data, setData] = useState<ViewerData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchShowcase = useCallback(async () => {
    if (userId == null) return
    setLoading(true); setData(null)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/showcase/user/${userId}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setData(json.data ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [userId, getToken])

  useEffect(() => { if (userId != null) fetchShowcase() }, [userId, fetchShowcase])

  useEffect(() => {
    if (userId == null) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [userId, onClose])

  if (userId == null) return null

  const gradeColor = GRADE_COLORS[data?.grade ?? 'F'] || '#94a3b8'
  const filled = (data?.slots ?? []).filter(s => s.card)

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10004,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '760px', maxHeight: '90vh',
          borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          fontFamily: 'pressStart',
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,191,36,0.08), transparent 70%), linear-gradient(180deg, #141b30 0%, #0a0e1a 100%)',
          border: '1px solid rgba(251,191,36,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(251,191,36,0.18)',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle at 35% 30%, ${gradeColor}33, ${gradeColor}10)`,
            border: `2px solid ${gradeColor}`,
            fontSize: '24px', fontWeight: 800, color: gradeColor,
          }}>{data?.grade ?? '—'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>
              {data?.username ?? 'Showcase'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {filled.length}/8 on display
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
          }}>x</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Active sets */}
          {(data?.activeSets?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center', marginBottom: '18px' }}>
              {data!.activeSets.map(s => (
                <span key={s.key} style={{
                  fontSize: '11px', color: '#fbbf24', fontWeight: 700,
                  background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
                  borderRadius: '4px', padding: '2px 7px',
                }}>◆ {s.name}</span>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>Loading…</div>
          ) : filled.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
              Nothing on display.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              {filled.map(s => (
                <TradingCard key={s.slotNumber} card={s.card!} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
