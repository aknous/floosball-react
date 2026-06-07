import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const GOLD = '#fbbf24'

interface VaultConfirmModalProps {
  cards: CardData[]          // cards to vault; [] = closed
  onClose: () => void
  onComplete: () => void     // refresh the collection
}

export default function VaultConfirmModal({ cards, onClose, onComplete }: VaultConfirmModalProps) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!cards.length) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [cards.length, onClose, busy])

  useEffect(() => {
    if (cards.length) { setError(''); setProgress(0) }
  }, [cards])

  if (!cards.length) return null

  const handleConfirm = async () => {
    setBusy(true); setError('')
    const tok = await getToken()
    if (!tok) { setBusy(false); return }
    let done = 0
    for (const c of cards) {
      try {
        const res = await fetch(`${API_BASE}/cards/${c.id}/vault`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError(json.detail || `Failed to vault ${c.playerName}`)
          break
        }
        done += 1
        setProgress(done)
      } catch {
        setError(`Failed to vault ${c.playerName}`)
        break
      }
    }
    setBusy(false)
    onComplete()
    if (done === cards.length) onClose()
  }

  const single = cards.length === 1

  return ReactDOM.createPortal(
    <div
      onClick={() => { if (!busy) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '560px', maxHeight: '90vh',
          backgroundColor: '#0f172a', border: `1px solid ${GOLD}44`, borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'pressStart',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="10.5" width="16" height="11" rx="2" stroke={GOLD} strokeWidth="2"/>
              <path d="M8 10.5V7a4 4 0 018 0v3.5" stroke={GOLD} strokeWidth="2"/>
            </svg>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
              Vault {single ? 'Card' : `${cards.length} Cards`}
            </h2>
          </div>
          <button onClick={() => { if (!busy) onClose() }} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
          }}>x</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Warning */}
          <div style={{
            padding: '12px 14px', borderRadius: '8px', marginBottom: '16px',
            border: `1px solid ${GOLD}33`, background: 'rgba(251,191,36,0.08)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: GOLD, marginBottom: '6px' }}>
              This is permanent
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
              Vaulted cards live in your collection forever and count toward collection
              goals. You can&apos;t equip, sell, or use them in The Combine after this.
            </div>
          </div>

          {/* Card preview(s) */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center',
            maxHeight: '300px', overflowY: 'auto',
          }}>
            {cards.map(c => (
              <TradingCard key={c.id} card={c} size={single ? 'md' : 'xs'} />
            ))}
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '14px', textAlign: 'center' }}>{error}</p>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #1e293b',
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => { if (!busy) onClose() }}
            disabled={busy}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', fontFamily: 'pressStart',
              fontSize: '12px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: 'none',
              background: `linear-gradient(135deg, ${GOLD}, #d97706)`,
              color: '#1a1206', fontFamily: 'pressStart', fontSize: '12px', fontWeight: 800,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
            }}
          >
            {busy
              ? (single ? 'Vaulting…' : `Vaulting ${progress}/${cards.length}…`)
              : (single ? 'Vault It' : `Vault ${cards.length}`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
