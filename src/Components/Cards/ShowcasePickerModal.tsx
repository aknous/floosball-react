import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const EDITIONS = ['all', 'base', 'holographic', 'prismatic', 'diamond'] as const
const POSITIONS = [
  { value: 0, label: 'All' },
  { value: 1, label: 'QB' },
  { value: 2, label: 'RB' },
  { value: 3, label: 'WR' },
  { value: 4, label: 'TE' },
  { value: 5, label: 'K' },
]
const SORTS = [
  { value: 'rarity', label: 'Rarity' },
  { value: 'rating', label: 'Rating' },
  { value: 'recent', label: 'Newest' },
  { value: 'tier', label: 'Tier' },
  { value: 'name', label: 'Name' },
  { value: 'team', label: 'Team' },
  { value: 'position', label: 'Position' },
] as const

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: '6px',
  border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
  backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
  color: active ? '#60a5fa' : '#94a3b8',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s', fontFamily: 'pressStart', textTransform: 'capitalize',
})

interface ShowcasePickerModalProps {
  open: boolean
  excludeIds: Set<number>       // already-featured card ids
  onClose: () => void
  onPick: (card: CardData) => void
}

export default function ShowcasePickerModal({ open, excludeIds, onClose, onPick }: ShowcasePickerModalProps) {
  const { getToken } = useAuth()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)
  const [editionFilter, setEditionFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState(0)
  const [sortBy, setSortBy] = useState<string>('rarity')

  const fetchVaulted = useCallback(async () => {
    setLoading(true)
    try {
      const tok = await getToken()
      if (!tok) return
      const params = new URLSearchParams()
      params.set('vaulted', 'true')
      params.set('sort', sortBy)
      if (editionFilter !== 'all') params.set('edition', editionFilter)
      if (positionFilter > 0) params.set('position', String(positionFilter))
      const res = await fetch(`${API_BASE}/cards/collection?${params}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setCards(json.data?.cards ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [getToken, editionFilter, positionFilter, sortBy])

  useEffect(() => { if (open) fetchVaulted() }, [open, fetchVaulted])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const available = cards.filter(c => !excludeIds.has(c.id))

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '860px', maxHeight: '90vh',
          backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'pressStart',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>Feature a Card</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Pick from your Vault
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
          }}>x</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px 0', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {EDITIONS.map(e => (
              <button key={e} onClick={() => setEditionFilter(e)} style={pillStyle(editionFilter === e)}>{e}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
            {POSITIONS.map(p => (
              <button key={p.value} onClick={() => setPositionFilter(p.value)} style={pillStyle(positionFilter === p.value)}>{p.label}</button>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'pressStart' }}>Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155',
                backgroundColor: '#1e293b', color: '#cbd5e1', fontSize: '11px',
                fontFamily: 'pressStart', cursor: 'pointer',
              }}
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>Loading…</div>
          ) : available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px', lineHeight: 1.7 }}>
              {editionFilter !== 'all' || positionFilter > 0
                ? 'No vaulted cards match these filters.'
                : 'No vaulted cards available to feature. Vault cards from your collection first.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {available.map(card => (
                <div
                  key={card.id}
                  onClick={() => onPick(card)}
                  style={{ cursor: 'pointer', borderRadius: '12px', transition: 'transform 0.12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
                >
                  <TradingCard card={card} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
