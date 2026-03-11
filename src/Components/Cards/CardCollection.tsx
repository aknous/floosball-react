import React, { useState, useEffect, useCallback } from 'react'
import TradingCard, { CardData } from './TradingCard'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const EDITIONS = ['all', 'base', 'chrome', 'holographic', 'gold', 'prismatic', 'diamond'] as const
const POSITIONS = [
  { value: 0, label: 'All' },
  { value: 1, label: 'QB' },
  { value: 2, label: 'RB' },
  { value: 3, label: 'WR' },
  { value: 4, label: 'TE' },
  { value: 5, label: 'K' },
]

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: '6px',
  border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
  backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
  color: active ? '#60a5fa' : '#94a3b8',
  fontSize: '11px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'pressStart',
  textTransform: 'capitalize' as const,
})

const CardCollection: React.FC = () => {
  const { getToken, updateFloobits } = useAuth()
  const isMobile = useIsMobile()

  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [editionFilter, setEditionFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState(0)
  const [activeOnly, setActiveOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selling, setSelling] = useState(false)
  const [currentSeason, setCurrentSeason] = useState(0)

  const fetchCards = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const params = new URLSearchParams()
      if (editionFilter !== 'all') params.set('edition', editionFilter)
      if (positionFilter > 0) params.set('position', String(positionFilter))
      if (activeOnly) params.set('activeOnly', 'true')
      const res = await fetch(`${API_BASE}/cards/collection?${params}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setCards(json.data?.cards ?? [])
      setCurrentSeason(json.data?.currentSeason ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [getToken, editionFilter, positionFilter, activeOnly])

  useEffect(() => { fetchCards() }, [fetchCards])

  const equippedIds = new Set(cards.filter(c => c.isEquipped).map(c => c.id))

  const toggleSelect = (id: number) => {
    if (equippedIds.has(id)) return  // Can't select equipped cards
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalSellValue = cards
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.sellValue, 0)

  const handleSell = async () => {
    if (selectedIds.size === 0) return
    setSelling(true)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ userCardIds: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchCards()
        // Update navbar balance
        const balRes = await fetch(`${API_BASE}/currency/balance`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (balRes.ok) {
          const bj = await balRes.json()
          updateFloobits(bj.data?.balance ?? 0)
        }
      }
    } catch {
      // silent
    } finally {
      setSelling(false)
    }
  }

  // Sort: active first, then by edition rarity (diamond first), then rating
  const editionOrder: Record<string, number> = {
    diamond: 0, prismatic: 1, gold: 2, holographic: 3, chrome: 4, base: 5,
  }
  const sorted = [...cards].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    const ea = editionOrder[a.edition] ?? 99
    const eb = editionOrder[b.edition] ?? 99
    if (ea !== eb) return ea - eb
    return b.playerRating - a.playerRating
  })

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '8px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          Collection
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400', marginLeft: '8px' }}>
            {cards.length} cards
          </span>
        </h2>
        {selectedIds.size > 0 && (
          <button
            onClick={handleSell}
            disabled={selling}
            style={{
              padding: '6px 14px', borderRadius: '6px',
              backgroundColor: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)',
              color: '#eab308', fontSize: '12px', fontWeight: '600',
              cursor: selling ? 'not-allowed' : 'pointer', fontFamily: 'pressStart',
              opacity: selling ? 0.6 : 1,
            }}
          >
            Sell {selectedIds.size} for {totalSellValue} Floobits
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {EDITIONS.map(e => (
          <button key={e} onClick={() => setEditionFilter(e)} style={pillStyle(editionFilter === e)}>
            {e}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        {POSITIONS.map(p => (
          <button key={p.value} onClick={() => setPositionFilter(p.value)} style={pillStyle(positionFilter === p.value)}>
            {p.label}
          </button>
        ))}
        <span style={{ width: '1px', height: '20px', backgroundColor: '#334155', margin: '0 4px' }} />
        <button onClick={() => setActiveOnly(!activeOnly)} style={pillStyle(activeOnly)}>
          Active Only
        </button>
      </div>

      {/* Card grid */}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
          Loading collection...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
          No cards found. Open packs in the Shop to get started!
        </div>
      ) : (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '12px',
          justifyContent: isMobile ? 'center' : 'flex-start',
        }}>
          {sorted.map(card => (
            <TradingCard
              key={card.id}
              card={card}
              size={isMobile ? 'sm' : 'md'}
              selected={selectedIds.has(card.id)}
              onSelect={() => toggleSelect(card.id)}
              showSellValue
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CardCollection
