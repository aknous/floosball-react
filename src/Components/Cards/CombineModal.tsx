import React, { useState, useEffect, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData, EDITION_STYLES } from './TradingCard'
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface CombineModalProps {
  visible: boolean
  onClose: () => void
  onComplete: () => void
  initialCard?: CardData
}

const BLENDER_THRESHOLDS = [
  { min: 300, edition: 'diamond' },
  { min: 175, edition: 'prismatic' },
  { min: 50, edition: 'holographic' },
  { min: 0, edition: 'base' },
]

const editionSort: Record<string, number> = {
  diamond: 0, prismatic: 1, holographic: 2, base: 3,
}

type PositionFilter = 'all' | 1 | 2 | 3 | 4 | 5
type EditionFilter = 'all' | 'base' | 'holographic' | 'prismatic' | 'diamond'
type PickerSortMode = 'value_asc' | 'rating_desc' | 'rarest'

const EDITION_PILL_LABELS: Record<EditionFilter, string> = {
  all: 'All',
  base: 'Base',
  holographic: 'Holo',
  prismatic: 'Prism',
  diamond: 'Diamond',
}

function cardValue(c: CardData): number {
  return c.combineValue || c.sellValue || 0
}

// ─── Sub-component: Card Picker Grid ───────────────────────────────────────

interface CardPickerProps {
  cards: CardData[]
  onConfirm: (selected: CardData[]) => void
  onCancel: () => void
  title: string
  filter?: (card: CardData) => boolean
}

function CardPicker({ cards, onConfirm, onCancel, title, filter }: CardPickerProps) {
  const [query, setQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all')
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all')
  const [sortMode, setSortMode] = useState<PickerSortMode>('value_asc')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = filter ? cards.filter(filter) : cards
    if (q) {
      out = out.filter(c =>
        c.playerName.toLowerCase().includes(q) ||
        (c.displayName || '').toLowerCase().includes(q) ||
        (c.effectName || '').toLowerCase().includes(q)
      )
    }
    if (positionFilter !== 'all') {
      out = out.filter(c => c.position === positionFilter)
    }
    if (editionFilter !== 'all') {
      out = out.filter(c => c.edition === editionFilter)
    }
    const sorted = [...out]
    switch (sortMode) {
      case 'rating_desc':
        sorted.sort((a, b) => b.playerRating - a.playerRating)
        break
      case 'rarest':
        sorted.sort((a, b) => {
          const ea = editionSort[a.edition] ?? 99
          const eb = editionSort[b.edition] ?? 99
          if (ea !== eb) return ea - eb
          return b.playerRating - a.playerRating
        })
        break
      case 'value_asc':
      default:
        sorted.sort((a, b) => {
          const va = cardValue(a)
          const vb = cardValue(b)
          if (va !== vb) return va - vb
          return a.playerRating - b.playerRating
        })
    }
    return sorted
  }, [cards, filter, query, positionFilter, editionFilter, sortMode])

  const rawCount = filter ? cards.filter(filter).length : cards.length

  const toggleCard = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCards = useMemo(
    () => cards.filter(c => selectedIds.has(c.id)),
    [cards, selectedIds]
  )
  const selectedCount = selectedCards.length
  const selectedValue = selectedCards.reduce((sum, c) => sum + cardValue(c), 0)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 2,
      backgroundColor: '#0f172a', borderRadius: '12px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px 10px', borderBottom: '1px solid #1e293b',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>{title}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
            {displayed.length} of {rawCount} cards
            {selectedCount > 0 && ` \u00b7 ${selectedCount} selected`}
          </div>
        </div>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', color: '#64748b',
          fontSize: '18px', cursor: 'pointer', padding: '4px',
        }}>x</button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search player or effect..."
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '12px',
            fontFamily: 'inherit',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '6px',
            outline: 'none',
            marginBottom: '8px',
          }}
        />
        <CombinePillRow
          label="Position"
          options={[
            { value: 'all', label: 'All' },
            { value: 1, label: 'QB' },
            { value: 2, label: 'RB' },
            { value: 3, label: 'WR' },
            { value: 4, label: 'TE' },
            { value: 5, label: 'K' },
          ]}
          value={positionFilter}
          onChange={(v) => setPositionFilter(v as PositionFilter)}
        />
        <div style={{ height: '6px' }} />
        <CombinePillRow
          label="Edition"
          options={(['all', 'base', 'holographic', 'prismatic', 'diamond'] as EditionFilter[]).map(e => ({
            value: e,
            label: EDITION_PILL_LABELS[e],
          }))}
          value={editionFilter}
          onChange={(v) => setEditionFilter(v as EditionFilter)}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px',
        }}>
          <span style={{
            fontSize: '10px', color: '#94a3b8', fontWeight: 600,
            textTransform: 'uppercase' as const, letterSpacing: '0.05em',
          }}>Sort</span>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as PickerSortMode)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontFamily: 'inherit',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '4px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="value_asc">Lowest value</option>
            <option value="rating_desc">Highest rated</option>
            <option value="rarest">Rarest first</option>
          </select>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexWrap: 'wrap', gap: '12px',
        justifyContent: 'center', alignContent: 'flex-start',
      }}>
        {displayed.length === 0 ? (
          <span style={{ color: '#94a3b8', fontSize: '13px', marginTop: '40px' }}>
            {rawCount === 0 ? 'No eligible cards available' : 'No cards match your filters'}
          </span>
        ) : displayed.map(card => {
          const isSelected = selectedIds.has(card.id)
          return (
            <div
              key={card.id}
              onClick={() => toggleCard(card.id)}
              style={{
                cursor: 'pointer',
                position: 'relative',
                outline: isSelected ? '3px solid #f59e0b' : 'none',
                outlineOffset: '2px',
                borderRadius: '12px',
                transform: isSelected ? 'scale(0.96)' : 'none',
                transition: 'transform 0.12s, outline-color 0.12s',
              }}
            >
              <TradingCard card={card} size="sm" />
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '6px', right: '6px',
                  width: '22px', height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 800,
                  border: '2px solid #0f172a',
                  zIndex: 2,
                }}>
                  &#10003;
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: confirm / cancel */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '10px', padding: '12px 16px', borderTop: '1px solid #1e293b',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          {selectedCount > 0
            ? `${selectedCount} card${selectedCount === 1 ? '' : 's'} \u00b7 value ${selectedValue}`
            : 'Click cards to select'}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: '6px',
              backgroundColor: 'transparent', border: '1px solid #334155',
              color: '#94a3b8', fontSize: '11px', fontWeight: 700,
              fontFamily: 'pressStart', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedCards)}
            disabled={selectedCount === 0}
            style={{
              padding: '8px 18px', borderRadius: '6px',
              backgroundColor: selectedCount === 0 ? '#334155' : '#f59e0b',
              border: 'none',
              color: selectedCount === 0 ? '#64748b' : '#0f172a',
              fontSize: '11px', fontWeight: 700, fontFamily: 'pressStart',
              cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {selectedCount === 0 ? 'Add Cards' : `Add ${selectedCount} Card${selectedCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact filter pill row used by the picker toolbar.
function CombinePillRow<T extends string | number>({
  label, options, value, onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '10px', color: '#94a3b8', fontWeight: 600,
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
        minWidth: '52px',
      }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {options.map(opt => {
          const active = opt.value === value
          return (
            <button
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '3px 10px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'inherit',
                border: `1px solid ${active ? '#f59e0b' : '#334155'}`,
                backgroundColor: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: active ? '#f59e0b' : '#94a3b8',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
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
    { value: 50, label: 'Holo', color: EDITION_STYLES.holographic?.borderColor || '#f472b6' },
    { value: 175, label: 'Prismatic', color: EDITION_STYLES.prismatic?.borderColor || '#db2777' },
    { value: 300, label: 'Diamond', color: EDITION_STYLES.diamond?.borderColor || '#67e8f9' },
  ]

  const editionStyle = EDITION_STYLES[currentEdition]

  return (
    <div style={{ width: '100%', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Value: {totalValue}</span>
        <span style={{
          fontSize: '12px', fontWeight: '700',
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
            transform: 'translateX(-50%)', fontSize: '10px',
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

// ─── Main Component ────────────────────────────────────────────────────────

export default function CombineModal({ visible, onClose, onComplete }: CombineModalProps) {
  const { getToken } = useAuth()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)

  // Blender state
  const [blendOfferings, setBlendOfferings] = useState<CardData[]>([])
  const [blendPicking, setBlendPicking] = useState(false)
  const [blendPreview, setBlendPreview] = useState<any>(null)
  const [blendError, setBlendError] = useState('')

  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const accentColor = '#f59e0b'

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
    }
  }, [visible, fetchCards])

  // ESC to close
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (blendPicking) setBlendPicking(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, blendPicking, onClose])

  // IDs already used in the current operation (can't double-select)
  const usedIds = useMemo(() => {
    const ids = new Set<number>()
    blendOfferings.forEach(c => ids.add(c.id))
    return ids
  }, [blendOfferings])

  // ─── Preview fetcher ────────────────────────────────────────────────

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

  // Auto-preview when 2+ cards selected
  useEffect(() => {
    if (blendOfferings.length >= 2) fetchBlendPreview(blendOfferings)
    else setBlendPreview(null)
  }, [blendOfferings, fetchBlendPreview])

  // ─── Action handler ─────────────────────────────────────────────────

  const handleBlend = async () => {
    if (blendOfferings.length < 2) return
    setActionLoading(true)
    setBlendError('')
    const tok = await getToken()
    if (!tok) { setActionLoading(false); return }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10000)
    try {
      const res = await fetch(`${API_BASE}/cards/blend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ offeringCardIds: blendOfferings.map(c => c.id) }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const json = await res.json()
      if (!res.ok) { setBlendError(json.detail || 'Blend failed'); setActionLoading(false); return }
      const resultCard = json.data
      setSuccessMessage(`New ${resultCard?.edition || ''} card created!`)
      setBlendOfferings([]); setBlendPreview(null)
      onComplete()
      fetchCards()
    } catch {
      clearTimeout(timer)
      setBlendError('Request timed out — games may be in progress. Try again.')
    }
    setActionLoading(false)
  }

  // ─── Available card filter ──────────────────────────────────────────

  const availableCards = useMemo(() =>
    cards.filter(c => !usedIds.has(c.id)),
    [cards, usedIds]
  )

  if (!visible) return null

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
          width: '100%', maxWidth: '800px',
          // Fixed height so the panel doesn't resize as offerings are added
          // or the picker overlays open. Inner regions scroll as needed.
          height: '90vh',
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
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Throw cards in, see what comes out
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpButton onClick={() => setShowHelp(true)} size={24} />
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#64748b',
              fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
            }}>x</button>
          </div>
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
          position: 'relative',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '13px' }}>
              Loading cards...
            </div>
          ) : (
            <>
              {/* ─── BLENDER ─── */}
              {!blendPicking && (
                <div>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 16px', textAlign: 'center' }}>
                    Sacrifice 2 or more cards to create a new one. Edition is based on total card value.
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
                        <span style={{ fontSize: '11px', color: EDITION_STYLES[card.edition]?.labelColor || '#94a3b8' }}>
                          {EDITION_STYLES[card.edition]?.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{card.playerName}</span>
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
                      <span style={{ color: '#94a3b8', fontSize: '12px', alignSelf: 'center' }}>
                        No cards added yet
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
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
                    {blendOfferings.length > 0 && (
                      <button
                        onClick={() => { setBlendOfferings([]); setBlendPreview(null); setBlendError('') }}
                        style={{
                          padding: '6px 16px', borderRadius: '6px',
                          backgroundColor: 'transparent',
                          border: '1px solid #ef444460',
                          color: '#ef4444', fontSize: '11px', fontWeight: '600',
                          cursor: 'pointer', fontFamily: 'pressStart',
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <BlenderBar totalValue={blendOfferings.reduce((sum, c) => sum + (c.combineValue || c.sellValue || 5), 0)} />

                  {blendError && (
                    <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>
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
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
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
              {blendPicking && (
                <CardPicker
                  cards={availableCards}
                  title="Select cards to add"
                  onConfirm={(picked) => {
                    if (picked.length > 0) {
                      setBlendOfferings(prev => [...prev, ...picked])
                    }
                    setBlendPicking(false)
                  }}
                  onCancel={() => setBlendPicking(false)}
                />
              )}
            </>
          )}
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="The Combine">
        <GuideSection title="How It Works">
          Throw in 2 or more cards — they are all destroyed and a single new card is created.
          The resulting edition depends on the total combined value of the sacrificed cards.
          Higher total value yields a better edition. The new card's player and effect are
          randomly assigned.
        </GuideSection>
        <GuideSection title="Tips">
          Cards must be unequipped before they can be used in The Combine. Higher-edition cards
          have greater sell value, which determines your result. Stack up low-value cards to
          reach higher edition thresholds.
        </GuideSection>
      </HelpModal>
    </div>,
    document.body
  )
}
