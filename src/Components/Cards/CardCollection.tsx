import React, { useState, useEffect, useCallback, useRef } from 'react'
import TradingCard, { CardData } from './TradingCard'
import CombineModal from './CombineModal'
import LevelUpModal from './LevelUpModal'
import VaultConfirmModal from './VaultConfirmModal'
import TrashConfirmModal from './TrashConfirmModal'
import ShowcaseView from './ShowcaseView'
import HelpButton, { HelpSection } from './HelpButton'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// 1x1 transparent gif used to suppress the native drag ghost so we can render
// our own card overlay that tracks the cursor precisely.
const EMPTY_DRAG_IMG = typeof Image !== 'undefined' ? (() => {
  const img = new Image()
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  return img
})() : null

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
  { value: 'team', label: 'Team' },
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
  const [trashTarget, setTrashTarget] = useState<CardData | null>(null)
  const [draggingCard, setDraggingCard] = useState<CardData | null>(null)
  const dragIndex = useRef<number | null>(null)
  const grabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const inVault = view === 'vault'
  const canReorder = inVault && sortBy === 'manual'

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

  // Clear selection on view switch, and default the sort to each view's natural
  // order (Vault opens in manual/arrangeable order; Collection in newest-first).
  useEffect(() => {
    setSelectedIds(new Set())
    if (view === 'vault') setSortBy('manual')
    else if (view === 'collection') setSortBy('recent')
  }, [view])

  // Drag-to-reorder (Vault, manual sort only): reorder locally then persist.
  const persistOrder = async (ordered: CardData[]) => {
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API_BASE}/cards/vault/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ orderedCardIds: ordered.map(c => c.id) }),
      })
    } catch {
      // silent — local order already reflects the intent
    }
  }
  const handleDrop = (targetIdx: number) => {
    const from = dragIndex.current
    dragIndex.current = null
    if (from === null || from === targetIdx) return
    const next = [...cards]
    const [moved] = next.splice(from, 1)
    next.splice(targetIdx, 0, moved)
    setCards(next)
    persistOrder(next)
  }
  // Custom drag overlay: suppress the native ghost and render our own card that
  // follows the cursor exactly (native setDragImage is unreliable across browsers).
  const startDrag = (e: React.DragEvent, idx: number, card: CardData) => {
    dragIndex.current = idx
    const src = (e.currentTarget.firstElementChild as HTMLElement) || null
    const rect = src ? src.getBoundingClientRect() : null
    grabOffset.current = rect
      ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
      : { x: 0, y: 0 }
    lastPointer.current = { x: e.clientX, y: e.clientY }
    if (EMPTY_DRAG_IMG) e.dataTransfer.setDragImage(EMPTY_DRAG_IMG, 0, 0)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(card.id))  // required for Firefox
    setDraggingCard(card)
  }
  const endDrag = () => {
    dragIndex.current = null
    setDraggingCard(null)
  }
  // Move the overlay with the cursor while dragging (direct style write, no re-render).
  useEffect(() => {
    if (!draggingCard) return
    const place = (x: number, y: number) => {
      const el = overlayRef.current
      if (el) el.style.transform = `translate(${x - grabOffset.current.x}px, ${y - grabOffset.current.y}px)`
    }
    place(lastPointer.current.x, lastPointer.current.y)
    const move = (ev: DragEvent) => {
      if (!ev.clientX && !ev.clientY) return  // ignore spurious 0,0 (e.g. drop/end)
      lastPointer.current = { x: ev.clientX, y: ev.clientY }
      place(ev.clientX, ev.clientY)
    }
    window.addEventListener('dragover', move)
    return () => window.removeEventListener('dragover', move)
  }, [draggingCard])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            {inVault ? 'The Vault' : 'Collection'}
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400', marginLeft: '8px' }}>
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>
          </h2>
          {inVault && (
            <HelpButton title="The Vault" accent="#fbbf24">
              <HelpSection title="Forever keepsakes">
                Vaulting moves a card into your permanent collection. It stays even after
                the season ends, when normal cards expire.
              </HelpSection>
              <HelpSection title="It's permanent">
                Once vaulted, a card can no longer be equipped, sold, or used in The
                Combine. Vault the cards you want to keep, not the ones you want to play.
              </HelpSection>
              <HelpSection title="A new look">
                A vaulted card drops its effect and shows the player's stats from that
                season instead.
              </HelpSection>
              <HelpSection title="Show them off">
                Feature vaulted cards in your Showcase to earn a payout at season end.
              </HelpSection>
              <HelpSection title="Arrange and remove">
                Switch to Manual sort to drag cards into any order. Removing a card from
                the Vault trashes it for good, with no Floobit return.
              </HelpSection>
            </HelpButton>
          )}
          {!inVault && (
            <HelpButton title="Upgrading Cards" accent="#fbbf24">
              <HelpSection title="Level Up">
                Hover a card and hit Level Up to make it stronger. It costs Floobits plus
                one duplicate of the same effect, which is consumed.
              </HelpSection>
              <HelpSection title="Tiers I to IV">
                Each level raises the card's tier, shown as a roman numeral on the card
                and in your box score. Higher tiers pay out more (FP, FPx, or Floobits)
                and the card is worth more.
              </HelpSection>
              <HelpSection title="Finding duplicates">
                Duplicates come from packs and The Combine. Since effects are locked to one
                edition, any duplicate of the effect already matches the rarity you need.
              </HelpSection>
              <HelpSection title="Tiers are seasonal">
                A card's tier lasts the season, like the card itself. Vault the card to
                keep its tier for good and feed it into your Showcase.
              </HelpSection>
              <HelpSection title="The Combine vs Level Up">
                The Combine fuses cards into a higher edition. Level Up raises one card's
                tier. Two different ways to spend duplicates.
              </HelpSection>
            </HelpButton>
          )}
        </div>
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
          {inVault && <option value="manual">Manual</option>}
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
        <>
        {canReorder && (
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', fontFamily: 'pressStart' }}>
            Drag cards to arrange your Vault
          </div>
        )}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '12px',
          justifyContent: isMobile ? 'center' : 'flex-start',
        }}>
          {cards.map((card, idx) => (
            <div
              key={card.id}
              draggable={canReorder}
              onDragStart={canReorder ? (e) => startDrag(e, idx, card) : undefined}
              onDragEnd={canReorder ? endDrag : undefined}
              onDragOver={canReorder ? (e) => e.preventDefault() : undefined}
              onDrop={canReorder ? () => handleDrop(idx) : undefined}
              style={{
                cursor: canReorder ? 'grab' : undefined, alignSelf: 'flex-start',
                opacity: draggingCard?.id === card.id ? 0.35 : 1,
                transition: 'opacity 0.1s',
              }}
            >
              <TradingCard
                card={card}
                size={isMobile ? 'sm' : 'md'}
                selected={!inVault && selectedIds.has(card.id)}
                onSelect={inVault ? undefined : () => toggleSelect(card.id)}
                onLevelUp={inVault ? undefined : () => setLevelUpCard(card)}
                onTrash={inVault ? () => setTrashTarget(card) : undefined}
                noHoverLift={canReorder}
                showSellValue={!inVault}
              />
            </div>
          ))}
        </div>
        </>
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

      <TrashConfirmModal
        card={trashTarget}
        onClose={() => setTrashTarget(null)}
        onComplete={() => fetchCards()}
      />

      {/* Cursor-following drag overlay (vault reorder) */}
      {draggingCard && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed', top: 0, left: 0, zIndex: 10050,
            pointerEvents: 'none', opacity: 0.92, willChange: 'transform',
          }}
        >
          <TradingCard card={draggingCard} size={isMobile ? 'sm' : 'md'} noHoverLift />
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default CardCollection
