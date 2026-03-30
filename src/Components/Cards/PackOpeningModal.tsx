import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import TradingCard, { CardData } from './TradingCard'

interface PackOpeningModalProps {
  packName: string
  cards: CardData[]
  onClose: () => void
}

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  holographic: '#c4b5fd',
  prismatic: '#f9a8d4',
  diamond: '#a5f3fc',
}

const EDITION_RANK: Record<string, number> = {
  base: 0,
  holographic: 1,
  prismatic: 2,
  diamond: 3,
}

// Delay before revealing each edition (rarer = longer anticipation)
const EDITION_DELAY: Record<string, number> = {
  base: 250,
  holographic: 300,
  prismatic: 400,
  diamond: 600,
}

// Glow burst config per edition
const EDITION_GLOW: Record<string, { color: string; size: number; duration: number }> = {
  base: { color: 'rgba(148,163,184,0.3)', size: 60, duration: 300 },
  holographic: { color: 'rgba(167,139,250,0.4)', size: 80, duration: 400 },
  prismatic: { color: 'rgba(244,114,182,0.6)', size: 140, duration: 600 },
  diamond: { color: 'rgba(103,232,249,0.7)', size: 200, duration: 800 },
}

// ─── Particle burst for prismatic/diamond ─────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  size: number
  color: string
  life: number
}

const ParticleBurst: React.FC<{ edition: string; active: boolean }> = ({ edition, active }) => {
  const [particles, setParticles] = useState<Particle[]>([])
  const frameRef = useRef<number>()
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    if (edition !== 'prismatic' && edition !== 'diamond') return

    const count = edition === 'diamond' ? 24 : 14
    const colors = edition === 'diamond'
      ? ['#a5f3fc', '#ffffff', '#67e8f9', '#22d3ee', '#ecfeff']
      : ['#f9a8d4', '#fce7f3', '#f472b6', '#ffffff', '#c084fc']

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
      speed: 1.5 + Math.random() * 2.5,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }))
    setParticles(newParticles)
    startRef.current = Date.now()

    const duration = edition === 'diamond' ? 900 : 700
    const animate = () => {
      const elapsed = Date.now() - startRef.current
      const progress = Math.min(1, elapsed / duration)
      setParticles(prev => prev.map(p => ({
        ...p,
        x: Math.cos(p.angle) * p.speed * progress * 80,
        y: Math.sin(p.angle) * p.speed * progress * 80 - progress * 20,
        life: 1 - progress,
      })))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [active, edition])

  if (particles.length === 0) return null

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            backgroundColor: p.color,
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.life * 0.9,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Screen flash for diamond ───────────────────────────────────────────────

const ScreenFlash: React.FC<{ active: boolean }> = ({ active }) => {
  const [phase, setPhase] = useState<'idle' | 'flash' | 'fade'>('idle')

  useEffect(() => {
    if (!active) return
    setPhase('flash')
    const t1 = setTimeout(() => setPhase('fade'), 50)
    const t2 = setTimeout(() => setPhase('idle'), 450)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [active])

  if (phase === 'idle') return null

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000,
      backgroundColor: '#a5f3fc',
      opacity: phase === 'flash' ? 0.35 : 0,
      transition: phase === 'fade' ? 'opacity 0.4s ease-out' : 'none',
    }} />
  )
}

// ─── Main Modal ────────────────────────────────────────────────────────────

const PackOpeningModal: React.FC<PackOpeningModalProps> = ({ packName, cards, onClose }) => {
  const [revealedCount, setRevealedCount] = useState(0)
  const [allRevealed, setAllRevealed] = useState(false)
  const [glowStates, setGlowStates] = useState<Map<number, boolean>>(new Map())
  const [diamondFlash, setDiamondFlash] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Sort cards: base first, diamond last (rarest revealed last for drama)
  const sortedCards = [...cards].sort(
    (a, b) => (EDITION_RANK[a.edition] ?? 0) - (EDITION_RANK[b.edition] ?? 0)
  )

  const triggerGlow = useCallback((index: number) => {
    setGlowStates(prev => new Map(prev).set(index, true))
    setTimeout(() => {
      setGlowStates(prev => new Map(prev).set(index, false))
    }, (EDITION_GLOW[sortedCards[index]?.edition]?.duration ?? 300) + 200)
  }, [sortedCards])

  // Auto-reveal cards one at a time with edition-appropriate pacing
  useEffect(() => {
    if (revealedCount >= sortedCards.length) {
      setAllRevealed(true)
      return
    }
    const nextEdition = sortedCards[revealedCount]?.edition ?? 'base'
    const delay = EDITION_DELAY[nextEdition] ?? 350

    // Diamond gets a pre-reveal flash
    if (nextEdition === 'diamond') {
      timerRef.current = setTimeout(() => {
        setDiamondFlash(true)
        setTimeout(() => {
          setDiamondFlash(false)
          triggerGlow(revealedCount)
          setRevealedCount(prev => prev + 1)
        }, 250)
      }, delay)
    } else {
      timerRef.current = setTimeout(() => {
        triggerGlow(revealedCount)
        setRevealedCount(prev => prev + 1)
      }, delay)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [revealedCount, sortedCards, triggerGlow])

  const revealAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setRevealedCount(sortedCards.length)
    setAllRevealed(true)
  }

  return ReactDOM.createPortal(
    <>
      <ScreenFlash active={diamondFlash} />
      <div
        onClick={allRevealed ? onClose : revealAll}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.85)',
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
            {sortedCards.map((card, i) => {
              const isRevealed = i < revealedCount
              const edition = card.edition
              const glow = EDITION_GLOW[edition] ?? EDITION_GLOW.base
              const isGlowing = glowStates.get(i) ?? false

              return (
                <div
                  key={card.id}
                  style={{
                    position: 'relative',
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s',
                    transform: isRevealed
                      ? (isGlowing && edition !== 'base' ? 'scale(1.06)' : 'scale(1)')
                      : 'rotateY(90deg) scale(0.8)',
                    opacity: isRevealed ? 1 : 0,
                  }}
                >
                  {/* Glow burst behind card */}
                  <div style={{
                    position: 'absolute',
                    inset: '-30px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${glow.color} 0%, transparent 70%)`,
                    opacity: isGlowing ? 1 : 0,
                    transition: `opacity ${glow.duration}ms ease-out`,
                    pointerEvents: 'none',
                    filter: `blur(${glow.size / 4}px)`,
                    zIndex: -1,
                  }} />

                  {/* Particle burst */}
                  <ParticleBurst edition={edition} active={isGlowing} />

                  {isRevealed ? (
                    <TradingCard card={card} size="md" />
                  ) : (
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
              {sortedCards.map((card, i) => (
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
      </div>
    </>,
    document.body
  )
}

export default PackOpeningModal
