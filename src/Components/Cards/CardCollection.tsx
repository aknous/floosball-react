import React, { useState, useEffect, useCallback } from 'react'
import TradingCard, { CardData } from './TradingCard'
import CombineModal from './CombineModal'
import LevelUpModal from './LevelUpModal'
import VaultConfirmModal from './VaultConfirmModal'
import ShowcaseView from './ShowcaseView'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

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

// Server-side sort keys (must match the collection endpoint's `sort` param)
const SORTS = [
  { value: 'recent', label: 'Newest' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'rating', label: 'Rating' },
  { value: 'tier', label: 'Tier' },
  { value: 'name', label: 'Name' },
  { value: 'position', label: 'Position' },
] as const

type ViewMode = 'collection' | 'vault' | 'showcase'

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

  const [view, setView] = useState<ViewMode>('collection')
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [editionFilter, setEditionFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState(0)
  const [activeOnly, setActiveOnly] = useState(false)
  const [sortBy, setSortBy] = useState<string>('recent')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selling, setSelling] = useState(false)
  const [currentSeason, setCurrentSeason] = useState(0)
  const [showCombine, setShowCombine] = useState(false)
  const [levelUpCard, setLevelUpCard] = useState<CardData | null>(null)
  const [vaultCards, setVaultCards] = useState<CardData[]>([])

  const inVault = view === 'vault'

  const fetchCards = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const params = new URLSearchParams()
      if (editionFilter !== 'all') params.set('edition', editionFilter)
      if (positionFilter > 0) params.set('position', String(positionFilter))
      if (activeOnly) params.set('activeOnly', 'true')
      params.set('vaulted', inVault ? 'true' : 'false')
      params.set('sort', sortBy)
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
  }, [getToken, editionFilter, positionFilter, activeOnly, sortBy, inVault])

  useEffect(() => { setLoading(true); fetchCards() }, [fetchCards])

  // Clear selection whenever we switch views
  useEffect(() => { setSelectedIds(new Set()) }, [view])

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

  const selectedCards = cards.filter(c => selectedIds.has(c.id))
  const totalSellValue = selectedCards.reduce((sum, c) => sum + c.sellValue, 0)

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

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        <button onClick={() => setView('collection')} style={{
          ...pillStyle(view === 'collection'), padding: '6px 14px', fontSize: '12px',
        }}>
          Collection
        </button>
        <button onClick={() => setView('vault')} style={{
          ...pillStyle(view === 'vault'), padding: '6px 14px', fontSize: '12px',
          ...(view === 'vault' ? {
            borderColor: '#fbbf24', color: '#fbbf24',
            backgroundColor: 'rgba(251,191,36,0.12)',
          } : {}),
        }}>
          Vault
        </button>
        <button onClick={() => setView('showcase')} style={{
          ...pillStyle(view === 'showcase'), padding: '6px 14px', fontSize: '12px',
          ...(view === 'showcase' ? {
            borderColor: '#fbbf24', color: '#fbbf24',
            backgroundColor: 'rgba(251,191,36,0.12)',
          } : {}),
        }}>
          Showcase
        </button>
      </div>

      {view === 'showcase' && <ShowcaseView />}
      {view !== 'showcase' && (
      <>
      {/* collection / vault content */}

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '8px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          {inVault ? 'The Vault' : 'Collection'}
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400', marginLeft: '8px' }}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!inVault && (
            <button
              onClick={() => setShowCombine(true)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'rgba(96,165,250,0.15)',
                border: 'none',
                color: '#93bbfc', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', fontFamily: 'pressStart',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(167,139,250,0.25))'
                e.currentTarget.style.borderColor = 'rgba(96,165,250,0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))'
                e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#93bbfc" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="#93bbfc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
              The Combine
            </button>
          )}
          {!inVault && selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setVaultCards(selectedCards)}
                style={{
                  padding: '6px 14px', borderRadius: '6px',
                  backgroundColor: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'pressStart',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10.5" width="16" height="11" rx="2" stroke="#fbbf24" strokeWidth="2"/>
                  <path d="M8 10.5V7a4 4 0 018 0v3.5" stroke="#fbbf24" strokeWidth="2"/>
                </svg>
                Vault {selectedIds.size}
              </button>
              <button
                onClick={handleSell}
                disabled={selling}
                style={{
                  padding: '6px 14px', borderRadius: '6px',
                  backgroundColor: 'rgba(234,179,8,0.15)', border: 'none',
                  color: '#eab308', fontSize: '12px', fontWeight: '600',
                  cursor: selling ? 'not-allowed' : 'pointer', fontFamily: 'pressStart',
                  opacity: selling ? 0.6 : 1,
                }}
              >
                Sell {selectedIds.size} for {totalSellValue} Floobits
              </button>
            </>
          )}
        </div>
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
        {!inVault && (
          <>
            <span style={{ width: '1px', height: '20px', backgroundColor: '#334155', margin: '0 4px' }} />
            <button onClick={() => setActiveOnly(!activeOnly)} style={pillStyle(activeOnly)}>
              Active Only
            </button>
          </>
        )}
        {/* Sort control */}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'pressStart' }}>Sort</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '4px 8px', borderRadius: '6px',
            border: '1px solid #334155', backgroundColor: '#1e293b',
            color: '#cbd5e1', fontSize: '11px', fontFamily: 'pressStart',
            cursor: 'pointer',
          }}
        >
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Card grid */}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
          Loading {inVault ? 'vault' : 'collection'}...
        </div>
      ) : cards.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0', textAlign: 'center', lineHeight: 1.7 }}>
          {inVault
            ? 'Your Vault is empty. Vault cards from your collection to keep them forever and chase collection goals.'
            : 'No cards found. Open packs in the Shop to get started!'}
        </div>
      ) : (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '12px',
          justifyContent: isMobile ? 'center' : 'flex-start',
        }}>
          {cards.map(card => (
            <TradingCard
              key={card.id}
              card={card}
              size={isMobile ? 'sm' : 'md'}
              selected={!inVault && selectedIds.has(card.id)}
              onSelect={inVault ? undefined : () => toggleSelect(card.id)}
              onLevelUp={inVault ? undefined : () => setLevelUpCard(card)}
              showSellValue={!inVault}
            />
          ))}
        </div>
      )}

      <CombineModal
        visible={showCombine}
        onClose={() => setShowCombine(false)}
        onComplete={() => fetchCards()}
      />

      <LevelUpModal
        card={levelUpCard}
        onClose={() => setLevelUpCard(null)}
        onComplete={() => fetchCards()}
      />

      <VaultConfirmModal
        cards={vaultCards}
        onClose={() => setVaultCards([])}
        onComplete={() => { setSelectedIds(new Set()); fetchCards() }}
      />
      </>
      )}
    </div>
  )
}

export default CardCollection
