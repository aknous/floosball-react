import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

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

  const fetchVaulted = useCallback(async () => {
    setLoading(true)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/collection?vaulted=true&sort=rarity`, {
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
  }, [getToken])

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

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>Loading…</div>
          ) : available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px', lineHeight: 1.7 }}>
              No vaulted cards available to feature. Vault cards from your collection first.
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
