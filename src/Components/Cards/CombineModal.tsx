import React, { useState, useEffect, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData, EDITION_STYLES } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type Tab = 'promotion' | 'blender' | 'transplant'

interface CombineModalProps {
  visible: boolean
  onClose: () => void
  onComplete: () => void
  initialCard?: CardData
}

const EDITION_ORDER = ['base', 'chrome', 'holographic', 'gold', 'prismatic', 'diamond']

const BLENDER_THRESHOLDS = [
  { min: 400, edition: 'diamond' },
  { min: 150, edition: 'prismatic' },
  { min: 75, edition: 'gold' },
  { min: 40, edition: 'holographic' },
  { min: 15, edition: 'chrome' },
  { min: 0, edition: 'base' },
]

const editionSort: Record<string, number> = {
  diamond: 0, prismatic: 1, gold: 2, holographic: 3, chrome: 4, base: 5,
}

function sortCards(cards: CardData[]): CardData[] {
  return [...cards].sort((a, b) => {
    const ea = editionSort[a.edition] ?? 99
    const eb = editionSort[b.edition] ?? 99
    if (ea !== eb) return ea - eb
    return b.playerRating - a.playerRating
  })
}

// ─── Sub-component: Card Slot ──────────────────────────────────────────────

interface CardSlotProps {
  label: string
  subtitle?: string
  card: CardData | null
  onSelect: () => void
  onClear: () => void
  accentColor: string
  destructive?: boolean
}

function CardSlot({ label, subtitle, card, onSelect, onClear, accentColor, destructive }: CardSlotProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '10px', fontWeight: '700', color: accentColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </span>
      {subtitle && (
        <span style={{ fontSize: '9px', color: destructive ? '#f87171' : '#64748b', fontWeight: '600' }}>
          {subtitle}
        </span>
      )}
      {card ? (
        <div style={{ position: 'relative' }}>
          <TradingCard card={card} size="sm" noHoverLift />
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            style={{
              position: 'absolute', top: '-6px', right: '-6px',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: '#ef4444', border: 'none', color: '#fff',
              fontSize: '11px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: '700',
            }}
          >
            x
          </button>
        </div>
      ) : (
        <button
          onClick={onSelect}
          style={{
            width: '160px', height: '270px', borderRadius: '10px',
            border: `2px dashed ${accentColor}40`,
            backgroundColor: 'rgba(30,41,59,0.5)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'border-color 0.2s, background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${accentColor}80`
            e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${accentColor}40`
            e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.5)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Select Card</span>
        </button>
      )}
    </div>
  )
}

// ─── Sub-component: Card Picker Grid ───────────────────────────────────────

interface CardPickerProps {
  cards: CardData[]
  onSelect: (card: CardData) => void
  onCancel: () => void
  title: string
  filter?: (card: CardData) => boolean
}

function CardPicker({ cards, onSelect, onCancel, title, filter }: CardPickerProps) {
  const filtered = filter ? cards.filter(filter) : cards
  const sorted = sortCards(filtered)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 2,
      backgroundColor: '#0f172a', borderRadius: '12px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid #1e293b',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>{title}</span>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', color: '#64748b',
          fontSize: '18px', cursor: 'pointer', padding: '4px',
        }}>x</button>
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexWrap: 'wrap', gap: '12px',
        justifyContent: 'center', alignContent: 'flex-start',
      }}>
        {sorted.length === 0 ? (
          <span style={{ color: '#64748b', fontSize: '12px', marginTop: '40px' }}>
            No eligible cards available
          </span>
        ) : sorted.map(card => (
          <div key={card.id} onClick={() => onSelect(card)} style={{ cursor: 'pointer' }}>
            <TradingCard card={card} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-component: Blender Value Bar ──────────────────────────────────────

function BlenderBar({ totalValue }: { totalValue: number }) {
  const maxDisplay = 450
  const pct = Math.min(100, (totalValue / maxDisplay) * 100)

  // Determine current edition
  let currentEdition = 'base'
  for (const t of BLENDER_THRESHOLDS) {
    if (totalValue >= t.min) { currentEdition = t.edition; break }
  }

  const markers = [
    { value: 15, label: 'Chrome', color: EDITION_STYLES.chrome?.borderColor || '#a1a1aa' },
    { value: 40, label: 'Holo', color: EDITION_STYLES.holographic?.borderColor || '#a78bfa' },
    { value: 75, label: 'Gold', color: EDITION_STYLES.gold?.borderColor || '#eab308' },
    { value: 150, label: 'Prismatic', color: EDITION_STYLES.prismatic?.borderColor || '#f472b6' },
    { value: 400, label: 'Diamond', color: EDITION_STYLES.diamond?.borderColor || '#67e8f9' },
  ]

  const editionStyle = EDITION_STYLES[currentEdition]

  return (
    <div style={{ width: '100%', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Total Value: {totalValue}</span>
        <span style={{
          fontSize: '11px', fontWeight: '700',
          color: editionStyle?.labelColor || '#94a3b8',
        }}>
          {editionStyle?.label || 'Base'} Edition
        </span>
      </div>
      <div style={{
        height: '8px', backgroundColor: '#1e293b', borderRadius: '4px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, #475569, ${editionStyle?.borderColor || '#475569'})`,
          borderRadius: '4px', transition: 'width 0.3s, background 0.3s',
        }} />
      </div>
      <div style={{ position: 'relative', height: '16px', marginTop: '2px' }}>
        {markers.map(m => (
          <span key={m.value} style={{
            position: 'absolute', left: `${(m.value / maxDisplay) * 100}%`,
            transform: 'translateX(-50%)', fontSize: '8px',
            color: totalValue >= m.value ? m.color : '#475569',
            fontWeight: totalValue >= m.value ? '700' : '400',
            transition: 'color 0.3s',
          }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Arrow SVG ─────────────────────────────────────────────────────────────

function ArrowIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CombineModal({ visible, onClose, onComplete, initialCard }: CombineModalProps) {
  const { getToken } = useAuth()
  const [tab, setTab] = useState<Tab>('promotion')
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)

  // Promotion state
  const [proSubject, setProSubject] = useState<CardData | null>(null)
  const [proOffering, setProOffering] = useState<CardData | null>(null)
  const [proPicking, setProPicking] = useState<'subject' | 'offering' | null>(null)
  const [proPreview, setProPreview] = useState<any>(null)
  const [proError, setProError] = useState('')

  // Blender state
  const [blendOfferings, setBlendOfferings] = useState<CardData[]>([])
  const [blendPicking, setBlendPicking] = useState(false)
  const [blendPreview, setBlendPreview] = useState<any>(null)
  const [blendError, setBlendError] = useState('')

  // Transplant state
  const [transTarget, setTransTarget] = useState<CardData | null>(null)
  const [transOffering, setTransOffering] = useState<CardData | null>(null)
  const [transPicking, setTransPicking] = useState<'target' | 'offering' | null>(null)
  const [transPreview, setTransPreview] = useState<any>(null)
  const [transError, setTransError] = useState('')

  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch user's unequipped cards
  const fetchCards = useCallback(async () => {
    setLoading(true)
    const tok = await getToken()
    if (!tok) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/cards/collection?activeOnly=false`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      const all: CardData[] = json.data?.cards ?? []
      setCards(all.filter(c => !c.isEquipped))
    } catch { /* ignore */ }
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    if (visible) {
      fetchCards()
      setSuccessMessage('')
      // Set initial card if provided
      if (initialCard && !initialCard.isEquipped) {
        setProSubject(initialCard)
        setTransTarget(initialCard)
      }
    }
  }, [visible, fetchCards, initialCard])

  // ESC to close
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (proPicking) setProPicking(null)
        else if (blendPicking) setBlendPicking(false)
        else if (transPicking) setTransPicking(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, proPicking, blendPicking, transPicking, onClose])

  // IDs already used in the current operation (can't double-select)
  const usedIds = useMemo(() => {
    const ids = new Set<number>()
    if (tab === 'promotion') {
      if (proSubject) ids.add(proSubject.id)
      if (proOffering) ids.add(proOffering.id)
    } else if (tab === 'blender') {
      blendOfferings.forEach(c => ids.add(c.id))
    } else {
      if (transTarget) ids.add(transTarget.id)
      if (transOffering) ids.add(transOffering.id)
    }
    return ids
  }, [tab, proSubject, proOffering, blendOfferings, transTarget, transOffering])

  // ─── Preview fetchers ────────────────────────────────────────────────

  const fetchPromotionPreview = useCallback(async (subject: CardData, offering: CardData) => {
    setProPreview(null)
    setProError('')
    const tok = await getToken()
    if (!tok) return
    try {
      const res = await fetch(`${API_BASE}/cards/promote/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ subjectCardId: subject.id, offeringCardId: offering.id }),
      })
      const json = await res.json()
      if (!res.ok) { setProError(json.detail || 'Preview failed'); return }
      setProPreview(json.data)
    } catch { setProError('Preview failed') }
  }, [getToken])

  const fetchBlendPreview = useCallback(async (offerings: CardData[]) => {
    setBlendPreview(null)
    setBlendError('')
    if (offerings.length < 2) return
    const tok = await getToken()
    if (!tok) return
    try {
      const res = await fetch(`${API_BASE}/cards/blend/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ offeringCardIds: offerings.map(c => c.id) }),
      })
      const json = await res.json()
      if (!res.ok) { setBlendError(json.detail || 'Preview failed'); return }
      setBlendPreview(json.data)
    } catch { setBlendError('Preview failed') }
  }, [getToken])

  const fetchTransplantPreview = useCallback(async (target: CardData, offering: CardData) => {
    setTransPreview(null)
    setTransError('')
    const tok = await getToken()
    if (!tok) return
    try {
      const res = await fetch(`${API_BASE}/cards/transplant/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ targetCardId: target.id, offeringCardId: offering.id }),
      })
      const json = await res.json()
      if (!res.ok) { setTransError(json.detail || 'Preview failed'); return }
      setTransPreview(json.data)
    } catch { setTransError('Preview failed') }
  }, [getToken])

  // Auto-preview when both slots are filled
  useEffect(() => {
    if (proSubject && proOffering) fetchPromotionPreview(proSubject, proOffering)
  }, [proSubject, proOffering, fetchPromotionPreview])

  useEffect(() => {
    if (blendOfferings.length >= 2) fetchBlendPreview(blendOfferings)
    else setBlendPreview(null)
  }, [blendOfferings, fetchBlendPreview])

  useEffect(() => {
    if (transTarget && transOffering) fetchTransplantPreview(transTarget, transOffering)
  }, [transTarget, transOffering, fetchTransplantPreview])

  // ─── Action handlers ─────────────────────────────────────────────────

  const handlePromote = async () => {
    if (!proSubject || !proOffering) return
    setActionLoading(true)
    setProError('')
    const tok = await getToken()
    if (!tok) { setActionLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/cards/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ subjectCardId: proSubject.id, offeringCardId: proOffering.id }),
      })
      const json = await res.json()
      if (!res.ok) { setProError(json.detail || 'Promotion failed'); setActionLoading(false); return }
      setSuccessMessage(`${proSubject.playerName} promoted to ${proOffering.edition}!`)
      setProSubject(null); setProOffering(null); setProPreview(null)
      onComplete()
      fetchCards()
    } catch { setProError('Promotion failed') }
    setActionLoading(false)
  }

  const handleBlend = async () => {
    if (blendOfferings.length < 2) return
    setActionLoading(true)
    setBlendError('')
    const tok = await getToken()
    if (!tok) { setActionLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/cards/blend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ offeringCardIds: blendOfferings.map(c => c.id) }),
      })
      const json = await res.json()
      if (!res.ok) { setBlendError(json.detail || 'Blend failed'); setActionLoading(false); return }
      const resultCard = json.data
      setSuccessMessage(`New ${resultCard?.edition || ''} card created!`)
      setBlendOfferings([]); setBlendPreview(null)
      onComplete()
      fetchCards()
    } catch { setBlendError('Blend failed') }
    setActionLoading(false)
  }

  const handleTransplant = async () => {
    if (!transTarget || !transOffering) return
    setActionLoading(true)
    setTransError('')
    const tok = await getToken()
    if (!tok) { setActionLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/cards/transplant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ targetCardId: transTarget.id, offeringCardId: transOffering.id }),
      })
      const json = await res.json()
      if (!res.ok) { setTransError(json.detail || 'Transplant failed'); setActionLoading(false); return }
      setSuccessMessage(`Effect transplanted onto ${transTarget.playerName}!`)
      setTransTarget(null); setTransOffering(null); setTransPreview(null)
      onComplete()
      fetchCards()
    } catch { setTransError('Transplant failed') }
    setActionLoading(false)
  }

  // ─── Tab pill styling ────────────────────────────────────────────────

  const tabColors: Record<Tab, string> = {
    promotion: '#60a5fa',
    blender: '#f59e0b',
    transplant: '#a78bfa',
  }

  const pillStyle = (t: Tab): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: `1px solid ${tab === t ? tabColors[t] : '#334155'}`,
    backgroundColor: tab === t ? `${tabColors[t]}20` : 'transparent',
    color: tab === t ? tabColors[t] : '#94a3b8',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'pressStart',
  })

  // ─── Available card filters ──────────────────────────────────────────

  const availableCards = useMemo(() =>
    cards.filter(c => !usedIds.has(c.id)),
    [cards, usedIds]
  )

  if (!visible) return null

  const accentColor = tabColors[tab]

  // ─── Render ──────────────────────────────────────────────────────────

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: '800px', maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: `1px solid #334155`,
          borderRadius: '12px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'pressStart',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
              The Combine
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
              Upgrade your cards through sacrifice
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
          }}>x</button>
        </div>

        {/* Tabs */}
        <div style={{
          padding: '12px 20px',
          display: 'flex', gap: '8px',
          borderBottom: '1px solid #1e293b',
        }}>
          <button style={pillStyle('promotion')} onClick={() => setTab('promotion')}>
            Promotion
          </button>
          <button style={pillStyle('blender')} onClick={() => setTab('blender')}>
            The Blender
          </button>
          <button style={pillStyle('transplant')} onClick={() => setTab('transplant')}>
            Transplant
          </button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div style={{
            padding: '10px 20px', backgroundColor: 'rgba(34,197,94,0.1)',
            borderBottom: '1px solid rgba(34,197,94,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: '600' }}>
              {successMessage}
            </span>
            <button onClick={() => setSuccessMessage('')} style={{
              background: 'none', border: 'none', color: '#4ade80',
              fontSize: '14px', cursor: 'pointer',
            }}>x</button>
          </div>
        )}

        {/* Body */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          position: 'relative', minHeight: '400px',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '13px' }}>
              Loading cards...
            </div>
          ) : (
            <>
              {/* ─── PROMOTION TAB ─── */}
              {tab === 'promotion' && !proPicking && (
                <div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px', textAlign: 'center' }}>
                    Sacrifice a higher-edition card to promote another card to that edition
                  </p>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '24px', flexWrap: 'wrap',
                  }}>
                    <CardSlot
                      label="Sacrifice"
                      subtitle="Destroyed"
                      card={proOffering}
                      onSelect={() => setProPicking('offering')}
                      onClear={() => { setProOffering(null); setProPreview(null); setProError('') }}
                      accentColor={accentColor}
                      destructive
                    />
                    <ArrowIcon color={accentColor} />
                    <CardSlot
                      label="Upgrade"
                      subtitle="Gets promoted"
                      card={proSubject}
                      onSelect={() => setProPicking('subject')}
                      onClear={() => { setProSubject(null); setProPreview(null); setProError('') }}
                      accentColor={accentColor}
                    />
                  </div>

                  {proError && (
                    <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', marginTop: '16px' }}>
                      {proError}
                    </p>
                  )}

                  {proPreview && (
                    <div style={{
                      marginTop: '20px', padding: '14px', borderRadius: '8px',
                      backgroundColor: 'rgba(30,41,59,0.5)', border: '1px solid #334155',
                      textAlign: 'center',
                    }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>
                        {proPreview.playerName} promoted to{' '}
                        <span style={{ color: EDITION_STYLES[proPreview.resultEdition]?.labelColor || '#e2e8f0' }}>
                          {EDITION_STYLES[proPreview.resultEdition]?.label || proPreview.resultEdition}
                        </span>
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                        Effect: {proPreview.effectDisplayName} — {proPreview.tooltip}
                      </p>
                    </div>
                  )}

                  {proSubject && proOffering && proPreview && !proError && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        onClick={handlePromote}
                        disabled={actionLoading}
                        style={{
                          padding: '10px 28px', borderRadius: '8px',
                          backgroundColor: accentColor, border: 'none',
                          color: '#0f172a', fontSize: '13px', fontWeight: '700',
                          cursor: actionLoading ? 'wait' : 'pointer',
                          opacity: actionLoading ? 0.6 : 1,
                          fontFamily: 'pressStart',
                        }}
                      >
                        {actionLoading ? 'Processing...' : 'Promote'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Promotion picker overlay */}
              {tab === 'promotion' && proPicking && (
                <CardPicker
                  cards={availableCards}
                  title={proPicking === 'subject' ? 'Select Subject Card' : 'Select Offering Card (higher edition)'}
                  filter={proPicking === 'offering' && proSubject
                    ? (c) => EDITION_ORDER.indexOf(c.edition) > EDITION_ORDER.indexOf(proSubject.edition)
                    : undefined
                  }
                  onSelect={(card) => {
                    if (proPicking === 'subject') {
                      setProSubject(card)
                      // Clear offering if it's now invalid
                      if (proOffering && EDITION_ORDER.indexOf(proOffering.edition) <= EDITION_ORDER.indexOf(card.edition)) {
                        setProOffering(null)
                      }
                    } else {
                      setProOffering(card)
                    }
                    setProPicking(null)
                  }}
                  onCancel={() => setProPicking(null)}
                />
              )}

              {/* ─── BLENDER TAB ─── */}
              {tab === 'blender' && !blendPicking && (
                <div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px', textAlign: 'center' }}>
                    Throw cards in, see what comes out. Edition is based on total card value.
                  </p>

                  {/* Selected offerings */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '8px',
                    justifyContent: 'center', minHeight: '60px',
                    padding: '12px', borderRadius: '8px',
                    backgroundColor: 'rgba(30,41,59,0.3)',
                    border: '1px solid #1e293b',
                  }}>
                    {blendOfferings.map(card => (
                      <div key={card.id} style={{
                        position: 'relative', padding: '6px 10px',
                        borderRadius: '6px', backgroundColor: '#1e293b',
                        border: `1px solid ${EDITION_STYLES[card.edition]?.borderColor || '#334155'}`,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <span style={{ fontSize: '10px', color: EDITION_STYLES[card.edition]?.labelColor || '#94a3b8' }}>
                          {EDITION_STYLES[card.edition]?.label}
                        </span>
                        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>{card.playerName}</span>
                        <button
                          onClick={() => setBlendOfferings(prev => prev.filter(c => c.id !== card.id))}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444',
                            fontSize: '12px', cursor: 'pointer', padding: '0 2px',
                          }}
                        >x</button>
                      </div>
                    ))}
                    {blendOfferings.length === 0 && (
                      <span style={{ color: '#475569', fontSize: '11px', alignSelf: 'center' }}>
                        No cards added yet
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      onClick={() => setBlendPicking(true)}
                      style={{
                        padding: '6px 16px', borderRadius: '6px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${accentColor}60`,
                        color: accentColor, fontSize: '11px', fontWeight: '600',
                        cursor: 'pointer', fontFamily: 'pressStart',
                      }}
                    >
                      + Add Card
                    </button>
                  </div>

                  <BlenderBar totalValue={blendOfferings.reduce((sum, c) => sum + (c.sellValue || 5), 0)} />

                  {blendError && (
                    <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', marginTop: '12px' }}>
                      {blendError}
                    </p>
                  )}

                  {blendPreview && (
                    <div style={{
                      marginTop: '16px', padding: '14px', borderRadius: '8px',
                      backgroundColor: 'rgba(30,41,59,0.5)', border: '1px solid #334155',
                      textAlign: 'center',
                    }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0' }}>
                        Result:{' '}
                        <span style={{
                          fontWeight: '700',
                          color: EDITION_STYLES[blendPreview.resultEdition]?.labelColor || '#e2e8f0',
                        }}>
                          {EDITION_STYLES[blendPreview.resultEdition]?.label || blendPreview.resultEdition}
                        </span>
                        {' '}Edition (random player &amp; effect)
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                        Sacrificing {blendPreview.cardCount} cards (total value: {blendPreview.totalValue})
                      </p>
                    </div>
                  )}

                  {blendOfferings.length >= 2 && blendPreview && !blendError && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        onClick={handleBlend}
                        disabled={actionLoading}
                        style={{
                          padding: '10px 28px', borderRadius: '8px',
                          backgroundColor: accentColor, border: 'none',
                          color: '#0f172a', fontSize: '13px', fontWeight: '700',
                          cursor: actionLoading ? 'wait' : 'pointer',
                          opacity: actionLoading ? 0.6 : 1,
                          fontFamily: 'pressStart',
                        }}
                      >
                        {actionLoading ? 'Blending...' : 'Blend'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Blender picker overlay */}
              {tab === 'blender' && blendPicking && (
                <CardPicker
                  cards={availableCards}
                  title="Select a card to add"
                  onSelect={(card) => {
                    setBlendOfferings(prev => [...prev, card])
                    setBlendPicking(false)
                  }}
                  onCancel={() => setBlendPicking(false)}
                />
              )}

              {/* ─── TRANSPLANT TAB ─── */}
              {tab === 'transplant' && !transPicking && (
                <div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px', textAlign: 'center' }}>
                    Sacrifice a card to transplant its effect onto another card (costs Floobits)
                  </p>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '24px', flexWrap: 'wrap',
                  }}>
                    <CardSlot
                      label="Sacrifice"
                      subtitle="Destroyed"
                      card={transOffering}
                      onSelect={() => setTransPicking('offering')}
                      onClear={() => { setTransOffering(null); setTransPreview(null); setTransError('') }}
                      accentColor={accentColor}
                      destructive
                    />
                    <ArrowIcon color={accentColor} />
                    <CardSlot
                      label="Receives Effect"
                      subtitle="Keeps this card"
                      card={transTarget}
                      onSelect={() => setTransPicking('target')}
                      onClear={() => { setTransTarget(null); setTransPreview(null); setTransError('') }}
                      accentColor={accentColor}
                    />
                  </div>

                  {transError && (
                    <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', marginTop: '16px' }}>
                      {transError}
                    </p>
                  )}

                  {transPreview && (
                    <div style={{
                      marginTop: '20px', padding: '14px', borderRadius: '8px',
                      backgroundColor: 'rgba(30,41,59,0.5)', border: '1px solid #334155',
                      textAlign: 'center',
                    }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0' }}>
                        {transPreview.currentEffect && (
                          <span style={{ color: '#94a3b8' }}>{transPreview.currentEffect}</span>
                        )}
                        {' '}&rarr;{' '}
                        <span style={{ fontWeight: '700', color: accentColor }}>
                          {transPreview.newEffectDisplayName}
                        </span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                        {transPreview.tooltip}
                      </p>
                      <p style={{
                        margin: '8px 0 0', fontSize: '13px', fontWeight: '700',
                        color: '#eab308',
                      }}>
                        Cost: {transPreview.cost} Floobits
                      </p>
                    </div>
                  )}

                  {transTarget && transOffering && transPreview && !transError && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        onClick={handleTransplant}
                        disabled={actionLoading}
                        style={{
                          padding: '10px 28px', borderRadius: '8px',
                          backgroundColor: accentColor, border: 'none',
                          color: '#0f172a', fontSize: '13px', fontWeight: '700',
                          cursor: actionLoading ? 'wait' : 'pointer',
                          opacity: actionLoading ? 0.6 : 1,
                          fontFamily: 'pressStart',
                        }}
                      >
                        {actionLoading ? 'Transplanting...' : `Transplant (${transPreview.cost} F)`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Transplant picker overlay */}
              {tab === 'transplant' && transPicking && (
                <CardPicker
                  cards={availableCards}
                  title={transPicking === 'target' ? 'Select Target Card' : 'Select Offering Card (different effect)'}
                  filter={transPicking === 'offering' && transTarget
                    ? (c) => {
                      const targetEffect = transTarget.effectConfig?.effectName || transTarget.effectName || ''
                      const cardEffect = c.effectConfig?.effectName || c.effectName || ''
                      return cardEffect !== targetEffect
                    }
                    : undefined
                  }
                  onSelect={(card) => {
                    if (transPicking === 'target') setTransTarget(card)
                    else setTransOffering(card)
                    setTransPicking(null)
                  }}
                  onCancel={() => setTransPicking(null)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
