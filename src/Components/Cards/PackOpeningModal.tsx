import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import TradingCard, { CardData } from './TradingCard'

interface PackOpeningModalProps {
  packName: string
  cards: CardData[]
  onClose: () => void
}

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  chrome: '#d4d4d8',
  holographic: '#c4b5fd',
  gold: '#fbbf24',
  prismatic: '#f9a8d4',
  diamond: '#a5f3fc',
}

const PackOpeningModal: React.FC<PackOpeningModalProps> = ({ packName, cards, onClose }) => {
  const [revealedCount, setRevealedCount] = useState(0)
  const [allRevealed, setAllRevealed] = useState(false)

  // Auto-reveal cards one at a time
  useEffect(() => {
    if (revealedCount >= cards.length) {
      setAllRevealed(true)
      return
    }
    const timer = setTimeout(() => {
      setRevealedCount(prev => prev + 1)
    }, 400)
    return () => clearTimeout(timer)
  }, [revealedCount, cards.length])

  const revealAll = () => {
    setRevealedCount(cards.length)
    setAllRevealed(true)
  }

  return ReactDOM.createPortal(
    <div
      onClick={allRevealed ? onClose : revealAll}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'pressStart', cursor: 'pointer',
      }}
    >
      {/* Prevent clicks on cards from closing */}
      <div onClick={e => e.stopPropagation()} style={{ cursor: 'default' }}>
        {/* Pack name */}
        <div style={{
          fontSize: '18px', fontWeight: '700', color: '#e2e8f0',
          textAlign: 'center', marginBottom: '24px',
        }}>
          {packName}
        </div>

        {/* Cards row */}
        <div style={{
          display: 'flex', gap: '16px', flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'center',
        }}>
          {cards.map((card, i) => {
            const isRevealed = i < revealedCount

            return (
              <div
                key={card.id}
                style={{
                  transition: 'transform 0.5s, opacity 0.5s',
                  transform: isRevealed ? 'rotateY(0deg) scale(1)' : 'rotateY(90deg) scale(0.8)',
                  opacity: isRevealed ? 1 : 0,
                }}
              >
                {isRevealed ? (
                  <TradingCard card={card} size="md" />
                ) : (
                  /* Placeholder back of card */
                  <div style={{
                    width: 180, height: 260, borderRadius: '10px',
                    backgroundColor: '#1e293b', border: '2px solid #334155',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '28px', color: '#334155' }}>?</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Rarity summary */}
        {allRevealed && (
          <div style={{
            marginTop: '20px', textAlign: 'center',
            display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {cards.map((card, i) => (
              <span key={i} style={{
                fontSize: '10px', fontWeight: '600',
                color: EDITION_COLORS[card.edition] || '#94a3b8',
                textTransform: 'uppercase',
              }}>
                {card.edition}
              </span>
            ))}
          </div>
        )}

        {/* Dismiss hint */}
        <div style={{
          marginTop: '24px', fontSize: '11px', color: '#64748b',
          textAlign: 'center',
        }}>
          {allRevealed ? 'Click anywhere to close' : 'Click to reveal all'}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default PackOpeningModal
