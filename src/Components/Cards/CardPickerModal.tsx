import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import TradingCard, { CardData } from './TradingCard'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const PickerCard: React.FC<{
  card: CardData
  isMatch: boolean
  onSelect: (card: CardData) => void
}> = ({ card, isMatch, onSelect }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '14px',
        transition: 'transform 0.15s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: isMatch ? '0 0 0 2px #22c55e, 0 0 12px rgba(34,197,94,0.3)' : 'none',
      }}
      onClick={() => onSelect(card)}
    >
      <TradingCard
        card={card}
        size="sm"
        noHoverLift
        onHoverChange={setHovered}
      />
      {isMatch && (
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          fontSize: '9px', color: '#22c55e', fontWeight: '700',
          backgroundColor: 'rgba(34,197,94,0.15)',
          padding: '2px 5px', borderRadius: '4px',
          border: '1px solid rgba(34,197,94,0.3)',
          zIndex: 1,
        }}>
          MATCH
        </div>
      )}
    </div>
  )
}

interface CardPickerModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (card: CardData) => void
  excludeCardIds: number[]  // user_card IDs already equipped in other slots
  rosterPlayerIds: Set<number>
}

const CardPickerModal: React.FC<CardPickerModalProps> = ({
  visible, onClose, onSelect, excludeCardIds, rosterPlayerIds,
}) => {
  const { getToken } = useAuth()
  const isMobile = useIsMobile()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const fetchCards = async () => {
      try {
        const tok = await getToken()
        if (!tok) return
        const res = await fetch(`${API_BASE}/cards/collection?activeOnly=true`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) return
        const json = await res.json()
        const all: CardData[] = json.data?.cards ?? []
        setCards(all.filter(c => !excludeCardIds.includes(c.id)))
      } catch {
        setCards([])
      } finally {
        setLoading(false)
      }
    }
    fetchCards()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, getToken, excludeCardIds.join(',')])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  if (!visible) return null

  // Sort: matching cards first, then by edition rarity, then rating
  const editionOrder: Record<string, number> = {
    diamond: 0, prismatic: 1, gold: 2, holographic: 3, chrome: 4, base: 5,
  }
  const sorted = [...cards].sort((a, b) => {
    const aMatch = rosterPlayerIds.has(a.playerId) ? 0 : 1
    const bMatch = rosterPlayerIds.has(b.playerId) ? 0 : 1
    if (aMatch !== bMatch) return aMatch - bMatch
    const ea = editionOrder[a.edition] ?? 99
    const eb = editionOrder[b.edition] ?? 99
    if (ea !== eb) return ea - eb
    return b.playerRating - a.playerRating
  })

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '700px', maxHeight: '85vh',
          backgroundColor: '#1e293b', border: '1px solid #334155',
          borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          fontFamily: 'pressStart', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #475569', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                Select Card
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Matching roster players shown first
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '22px', padding: '2px 6px' }}
            >x</button>
          </div>
        </div>

        {/* Card grid */}
        <div style={{ overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Loading...</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
              No active cards available. Open packs in the Shop!
            </div>
          ) : (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '12px',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              {sorted.map(card => {
                const isMatch = rosterPlayerIds.has(card.playerId)
                return (
                  <PickerCard key={card.id} card={card} isMatch={isMatch} onSelect={onSelect} />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CardPickerModal
