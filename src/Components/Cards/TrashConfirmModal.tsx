import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const RED = '#ef4444'

interface TrashConfirmModalProps {
  card: CardData | null   // card to trash; null = closed
  onClose: () => void
  onComplete: () => void
}

export default function TrashConfirmModal({ card, onClose, onComplete }: TrashConfirmModalProps) {
  const { getToken } = useAuth()
  const isMobile = useIsMobile()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!card) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [card, onClose, busy])

  useEffect(() => { if (card) setError('') }, [card])

  if (!card) return null

  const handleConfirm = async () => {
    setBusy(true); setError('')
    try {
      const tok = await getToken()
      if (!tok) { setBusy(false); return }
      const res = await fetch(`${API_BASE}/cards/${card.id}/vault`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.detail || 'Failed to remove card')
        setBusy(false)
        return
      }
      onComplete()
      onClose()
    } catch {
      setError('Failed to remove card')
    } finally {
      setBusy(false)
    }
  }

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
          width: '100%', maxWidth: '460px',
          backgroundColor: '#0f172a', border: `1px solid ${RED}44`, borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'pressStart',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
            Remove from Vault
          </h2>
          <button onClick={() => { if (!busy) onClose() }} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
          }}>x</button>
        </div>

        <div style={{
          padding: '20px', display: 'flex', gap: '16px',
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <TradingCard card={card} size="sm" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: RED, marginBottom: '6px' }}>
              This trashes the card for good
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
              Removing {card.playerName} from your Vault deletes it. There&apos;s no
              Floobit return and it can&apos;t be recovered.
            </div>
            {error && (
              <p style={{ color: RED, fontSize: '12px', marginTop: '10px' }}>{error}</p>
            )}
          </div>
        </div>

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
              background: RED, color: '#fff', fontFamily: 'pressStart',
              fontSize: '12px', fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Removing…' : 'Trash It'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
