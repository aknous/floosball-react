import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }
const GOLD = '#fbbf24'

interface UpgradeInfo {
  cardId: number
  effectName: string
  tier: number
  maxTier: number
  atMax: boolean
  nextTier: number | null
  cost: number | null
  eligibleOfferings: CardData[]
}

interface LevelUpModalProps {
  card: CardData | null   // target card; null = closed
  onClose: () => void
  onComplete: () => void  // refresh the collection
}

export default function LevelUpModal({ card, onClose, onComplete }: LevelUpModalProps) {
  const { user, getToken, updateFloobits } = useAuth()
  const [info, setInfo] = useState<UpgradeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [chosen, setChosen] = useState<CardData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Fully re-serialized card returned by the level-up POST (scaled detail + new
  // tier) — used as the preview source so the card updates in place after a level.
  const [upgraded, setUpgraded] = useState<CardData | null>(null)

  const fetchInfo = useCallback(async () => {
    if (!card) return
    setLoading(true); setError(''); setChosen(null)
    const tok = await getToken()
    if (!tok) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/cards/${card.id}/upgrade-info`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const json = await res.json()
      if (res.ok) setInfo(json.data)
      else setError(json.detail || 'Failed to load upgrade info')
    } catch { setError('Failed to load upgrade info') }
    setLoading(false)
  }, [card, getToken])

  useEffect(() => {
    if (card) { setSuccess(''); setUpgraded(null); fetchInfo() }
  }, [card, fetchInfo])

  // ESC to close
  useEffect(() => {
    if (!card) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [card, onClose])

  if (!card) return null

  const balance = user?.floobits ?? 0
  const cost = info?.cost ?? 0
  const canAfford = balance >= cost
  const tier = info?.tier ?? card.tier ?? 1
  const atMax = info?.atMax ?? false
  const offerings = info?.eligibleOfferings ?? []
  const canConfirm = !!info && !atMax && !!chosen && canAfford && !busy
  // Live preview: source from the upgraded card (post-level, scaled detail) once
  // we have it, else the original. Ribbon shows the tier it WILL become while a
  // duplicate is selected; otherwise the current tier.
  const previewBase = upgraded ?? card
  const previewTier = chosen && !atMax ? (info?.nextTier ?? tier) : tier
  const previewCard: CardData = { ...previewBase, tier: previewTier }

  const handleConfirm = async () => {
    if (!info || !chosen) return
    setBusy(true); setError('')
    const tok = await getToken()
    if (!tok) { setBusy(false); return }
    try {
      const res = await fetch(`${API_BASE}/cards/${card.id}/level-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ offeringCardId: chosen.id }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.detail || 'Level up failed'); setBusy(false); return }
      if (json.data) setUpgraded(json.data)  // scaled detail + new tier for the preview
      setSuccess(`Leveled to Tier ${ROMAN[json.data.tier] || json.data.tier}!`)
      // Refresh navbar balance
      const balRes = await fetch(`${API_BASE}/currency/balance`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (balRes.ok) { const bj = await balRes.json(); updateFloobits(bj.data?.balance ?? balance) }
      onComplete()
      fetchInfo()  // reload: new tier, new cost, one fewer duplicate
    } catch { setError('Level up failed') }
    setBusy(false)
  }

  const effLabel = card.displayName || card.effectName || 'this card'

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
          width: '100%', maxWidth: '720px', maxHeight: '90vh',
          backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'pressStart',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>Level Up</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Feed a duplicate {effLabel} to make it stronger
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
          }}>x</button>
        </div>

        {success && (
          <div style={{ padding: '10px 20px', backgroundColor: 'rgba(251,191,36,0.12)', borderBottom: '1px solid rgba(251,191,36,0.25)' }}>
            <span style={{ fontSize: '12px', color: GOLD, fontWeight: 600 }}>{success}</span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b', fontSize: '13px' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Target card preview (reflects the tier it will become) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <TradingCard card={previewCard} size="md" />
                <div style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>
                  Tier {ROMAN[tier]}{!atMax && <span style={{ color: '#94a3b8' }}> → </span>}
                  {!atMax && <span>{ROMAN[(info?.nextTier ?? tier)]}</span>}
                </div>
              </div>

              {/* Right panel */}
              <div style={{ flex: 1, minWidth: '280px', maxWidth: '360px' }}>
                {atMax ? (
                  <div style={{
                    padding: '20px', borderRadius: '10px', textAlign: 'center',
                    border: `1px solid ${GOLD}55`, background: 'rgba(251,191,36,0.08)',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: GOLD, marginBottom: '6px' }}>
                      Fully Upgraded
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
                      This card is at the max tier (IV). It carries a gold ring to show it.
                    </div>
                  </div>
                ) : offerings.length === 0 ? (
                  <div style={{
                    padding: '20px', borderRadius: '10px', textAlign: 'center',
                    border: '1px solid #334155', background: 'rgba(30,41,59,0.4)',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                      No duplicate available
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                      You need another <span style={{ color: GOLD }}>{effLabel}</span> card to level this up.
                      Open packs or use The Combine to find one.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Cost row */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                      border: `1px solid ${canAfford ? '#334155' : 'rgba(239,68,68,0.4)'}`,
                      background: 'rgba(30,41,59,0.5)',
                    }}>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Cost</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: canAfford ? GOLD : '#ef4444' }}>
                        {cost} Floobits
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: canAfford ? '#94a3b8' : '#ef4444', marginBottom: '14px', textAlign: 'right' }}>
                      You have {balance}
                    </div>

                    {/* Duplicate picker */}
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                      Choose a duplicate to feed ({offerings.length})
                    </div>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '230px', overflowY: 'auto',
                      padding: '2px',
                    }}>
                      {offerings.map(off => {
                        const isSel = chosen?.id === off.id
                        return (
                          <div
                            key={off.id}
                            onClick={() => setChosen(isSel ? null : off)}
                            style={{
                              cursor: 'pointer', borderRadius: '12px',
                              outline: isSel ? `3px solid ${GOLD}` : 'none', outlineOffset: '2px',
                              transform: isSel ? 'scale(0.96)' : 'none', transition: 'transform 0.12s',
                            }}
                          >
                            <TradingCard card={off} size="xs" />
                          </div>
                        )
                      })}
                    </div>

                    {error && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>{error}</p>
                    )}

                    <button
                      onClick={handleConfirm}
                      disabled={!canConfirm}
                      style={{
                        width: '100%', marginTop: '16px', padding: '11px', borderRadius: '8px',
                        border: 'none', fontFamily: 'pressStart', fontWeight: 700, fontSize: '13px',
                        background: canConfirm ? `linear-gradient(135deg, ${GOLD}, #d97706)` : '#334155',
                        color: canConfirm ? '#1a1206' : '#64748b',
                        cursor: canConfirm ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {busy ? 'Leveling…'
                        : !chosen ? 'Pick a duplicate'
                        : !canAfford ? 'Not enough Floobits'
                        : `Level Up to ${ROMAN[(info?.nextTier ?? tier)]}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
