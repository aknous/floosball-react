import React, { useState, useEffect, useCallback, useRef } from 'react'
import TradingCard, { CardData } from '../Cards/TradingCard'
import PackOpeningModal from '../Cards/PackOpeningModal'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  GiCardDraw, GiCrownCoin, GiGemChain, GiCrystalShine,
  GiSwapBag, GiMagicSwirl, GiFlexibleStar, GiCardPlay, GiPerspectiveDiceSixFacesRandom,
  GiQueenCrown,
} from 'react-icons/gi'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackType {
  id: number
  name: string
  displayName: string
  cost: number
  cardsPerPack: number
  guaranteedRarity: string | null
  description: string
}

interface FeaturedCard extends CardData {
  buyPrice: number
}

interface PowerupItem {
  slug: string
  displayName: string
  description: string
  price: number
  purchased: number
  limit: number
  limitLabel: string
  available: boolean
  durationWeeks?: number
  activeUntilWeek?: number | null
  seasonLimit?: number
}

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Styling ──────────────────────────────────────────────────────────────────

const POWERUP_STYLES: Record<string, { border: string; accent: string; bg: string }> = {
  extra_swap: { border: '#22c55e', accent: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  modifier_nullifier: { border: '#eab308', accent: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  temp_flex: { border: '#a78bfa', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
  temp_card_slot: { border: '#67e8f9', accent: '#67e8f9', bg: 'rgba(103,232,249,0.08)' },
  shop_reroll: { border: '#3b82f6', accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  fortunes_favor: { border: '#f472b6', accent: '#f472b6', bg: 'rgba(244,114,182,0.08)' },
}

const PACK_COLORS: Record<string, { border: string; bg: string; accent: string }> = {
  humble: { border: '#475569', bg: '#1e293b', accent: '#94a3b8' },
  proper: { border: '#a78bfa', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', accent: '#c4b5fd' },
  grand: { border: '#f59e0b', bg: 'linear-gradient(135deg, #422006 0%, #78350f 100%)', accent: '#fbbf24' },
  exquisite: { border: '#a5f3fc', bg: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 50%, #164e63 100%)', accent: '#67e8f9' },
}

const PACK_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  humble: GiCardDraw,
  proper: GiCrownCoin,
  grand: GiGemChain,
  exquisite: GiCrystalShine,
}

const POWERUP_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  extra_swap: GiSwapBag,
  modifier_nullifier: GiMagicSwirl,
  temp_flex: GiFlexibleStar,
  temp_card_slot: GiCardPlay,
  shop_reroll: GiPerspectiveDiceSixFacesRandom,
  fortunes_favor: GiQueenCrown,
}

// ─── Component ────────────────────────────────────────────────────────────────

const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
  const { user, getToken, updateFloobits, refetchRoster } = useAuth()
  const isMobile = useIsMobile()
  const contentRef = useRef<HTMLDivElement>(null)

  const [packs, setPacks] = useState<PackType[]>([])
  const [featured, setFeatured] = useState<FeaturedCard[]>([])
  const [powerups, setPowerups] = useState<PowerupItem[]>([])
  const [balance, setBalance] = useState(user?.floobits ?? 0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [openedCards, setOpenedCards] = useState<{ packName: string; cards: CardData[] } | null>(null)

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const fetchAll = useCallback(async () => {
    if (!isOpen) return
    try {
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers.Authorization = `Bearer ${tok}`

      const [packsRes, featuredRes, balRes, powerupRes] = await Promise.all([
        fetch(`${API_BASE}/packs/types`),
        tok ? fetch(`${API_BASE}/shop/featured`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/currency/balance`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/shop/powerups`, { headers }) : Promise.resolve(null),
      ])

      if (packsRes.ok) {
        const j = await packsRes.json()
        setPacks(j.data?.packs ?? [])
      }
      if (featuredRes?.ok) {
        const j = await featuredRes.json()
        setFeatured(j.data?.cards ?? [])
      }
      if (balRes?.ok) {
        const j = await balRes.json()
        const b = j.data?.balance ?? 0
        setBalance(b)
        updateFloobits(b)
      }
      if (powerupRes?.ok) {
        const pj = await powerupRes.json()
        setPowerups(pj.data?.items ?? [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [isOpen, getToken, updateFloobits])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchAll()
    }
  }, [isOpen, fetchAll])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleBuyPowerup = async (slug: string) => {
    const tok = await getToken()
    if (!tok) return
    setBuying(slug)
    try {
      const res = await fetch(`${API_BASE}/shop/powerups/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ itemSlug: slug }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Purchase failed' }))
        alert(err.detail || 'Purchase failed')
        return
      }
      const j = await res.json()
      const newBal = j.data?.newBalance
      if (typeof newBal === 'number') {
        setBalance(newBal)
        updateFloobits(newBal)
      }
      // If reroll, update featured cards
      if (slug === 'shop_reroll' && j.data?.featuredCards) {
        setFeatured(j.data.featuredCards)
      }
      // Re-fetch powerup state
      const puRes = await fetch(`${API_BASE}/shop/powerups`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (puRes.ok) {
        const pj = await puRes.json()
        setPowerups(pj.data?.items ?? [])
      }
      // If swap purchased, refresh roster so swap count updates immediately
      if (slug === 'extra_swap') refetchRoster()
      // Signal all fantasy snapshot hooks to refetch (updates modifier badge, etc.)
      window.dispatchEvent(new Event('floosball:shop-purchase'))
    } catch {
      alert('Purchase failed')
    } finally {
      setBuying(null)
    }
  }

  const handleOpenPack = async (packTypeId: number) => {
    const tok = await getToken()
    if (!tok) return
    setBuying(`pack_${packTypeId}`)
    try {
      const res = await fetch(`${API_BASE}/packs/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ packTypeId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to open pack' }))
        alert(err.detail || 'Failed to open pack')
        return
      }
      const json = await res.json()
      const data = json.data ?? json
      setOpenedCards({ packName: data.packName, cards: data.cards })
      // Refresh balance
      const balRes = await fetch(`${API_BASE}/currency/balance`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (balRes.ok) {
        const bj = await balRes.json()
        const bal = bj.data?.balance ?? 0
        setBalance(bal)
        updateFloobits(bal)
      }
    } catch {
      alert('Failed to open pack')
    } finally {
      setBuying(null)
    }
  }

  const handleBuyCard = async (templateId: number) => {
    const tok = await getToken()
    if (!tok) return
    setBuying(`card_${templateId}`)
    try {
      const res = await fetch(`${API_BASE}/shop/buy-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ templateId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to buy card' }))
        alert(err.detail || 'Failed to buy card')
        return
      }
      fetchAll()
    } catch {
      alert('Failed to buy card')
    } finally {
      setBuying(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? '96vw' : '920px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'pressStart',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
            Shop
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#eab308' }}>
              {balance.toLocaleString()} Floobits
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              x
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} style={{ overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
              Loading shop...
            </div>
          ) : (
            <>
              {/* ── Featured Cards ── */}
              {featured.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader
                    title="Featured Cards"
                    subtitle="Refreshes daily"
                    collapsed={!!collapsed.featured}
                    onToggle={() => toggleSection('featured')}
                  />
                  {!collapsed.featured && (
                    <div style={{
                      display: 'flex',
                      gap: '14px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}>
                      {featured.map(card => {
                        const canAfford = balance >= card.buyPrice
                        const isBuying3 = buying === `card_${card.templateId}`

                        return (
                          <div key={card.templateId} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          }}>
                            <TradingCard
                              card={{ ...card, id: card.templateId, acquiredAt: null, acquiredVia: '' }}
                              size="sm"
                            />
                            <button
                              onClick={() => handleBuyCard(card.templateId)}
                              disabled={!canAfford || isBuying3 || !user}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '5px',
                                border: `1px solid ${canAfford ? '#eab308' : '#334155'}`,
                                backgroundColor: canAfford ? 'rgba(234,179,8,0.12)' : 'rgba(51,65,85,0.3)',
                                color: canAfford ? '#eab308' : '#94a3b8',
                                fontSize: '12px', fontWeight: '700',
                                cursor: canAfford && !isBuying3 && user ? 'pointer' : 'not-allowed',
                                fontFamily: 'pressStart',
                                opacity: isBuying3 ? 0.6 : 1,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              {isBuying3 ? '...' : `${card.buyPrice}`}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Card Packs ── */}
              <div style={{ marginBottom: '28px' }}>
                <SectionHeader
                  title="Card Packs"
                  collapsed={!!collapsed.packs}
                  onToggle={() => toggleSection('packs')}
                />
                {!collapsed.packs && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}>
                    {packs.map(pack => {
                      const colors = PACK_COLORS[pack.name] || PACK_COLORS.humble
                      const canAfford = balance >= pack.cost
                      const isBuying2 = buying === `pack_${pack.id}`

                      return (
                        <div key={pack.id} style={{
                          width: isMobile ? '100%' : '195px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          background: colors.bg,
                          padding: '14px',
                          display: 'flex', flexDirection: 'column', gap: '8px',
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: colors.accent, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => { const Icon = PACK_ICONS[pack.name]; return Icon ? <Icon size={28} color={colors.accent} /> : null })()}
                            {pack.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, flex: 1 }}>
                            {pack.description}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {pack.cardsPerPack} cards
                            {pack.guaranteedRarity && (
                              <span style={{ color: colors.accent }}> &middot; 1+ {pack.guaranteedRarity}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleOpenPack(pack.id)}
                            disabled={!canAfford || isBuying2 || !user}
                            style={{
                              width: '100%', padding: '8px',
                              borderRadius: '5px',
                              border: `1px solid ${canAfford ? colors.border : '#334155'}`,
                              backgroundColor: canAfford ? `${colors.border}30` : 'rgba(51,65,85,0.3)',
                              color: canAfford ? colors.accent : '#94a3b8',
                              fontSize: '12px', fontWeight: '700',
                              cursor: canAfford && !isBuying2 && user ? 'pointer' : 'not-allowed',
                              fontFamily: 'pressStart',
                              opacity: isBuying2 ? 0.6 : 1,
                              transition: 'opacity 0.15s',
                            }}
                          >
                            {isBuying2 ? 'Opening...' : `${pack.cost} Floobits`}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Power-Ups ── */}
              <div>
                <SectionHeader
                  title="Power-Ups"
                  collapsed={!!collapsed.powerups}
                  onToggle={() => toggleSection('powerups')}
                />
                {!collapsed.powerups && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '10px',
                    maxWidth: '700px',
                    margin: '0 auto',
                  }}>
                    {powerups.map(pu => {
                      const style = POWERUP_STYLES[pu.slug] || POWERUP_STYLES.extra_swap
                      const canAfford = balance >= pu.price
                      const canBuy = pu.available && canAfford && pu.purchased < pu.limit
                      const isBuying = buying === pu.slug
                      const isPurchased = pu.purchased >= pu.limit

                      return (
                        <div key={pu.slug} style={{
                          borderRadius: '8px',
                          border: `1px solid ${isPurchased ? '#334155' : style.border}40`,
                          borderLeft: `3px solid ${isPurchased ? '#475569' : style.border}`,
                          backgroundColor: isPurchased ? '#1e293b' : style.bg,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          opacity: isPurchased ? 0.6 : 1,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: isPurchased ? '#94a3b8' : style.accent, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {(() => { const Icon = POWERUP_ICONS[pu.slug]; return Icon ? <Icon size={24} color={isPurchased ? '#94a3b8' : style.accent} /> : null })()}
                              {pu.displayName}
                            </span>
                            {isPurchased && (
                              <span style={{
                                fontSize: '10px', fontWeight: '700', color: '#22c55e',
                                backgroundColor: 'rgba(34,197,94,0.12)',
                                padding: '2px 6px', borderRadius: '4px',
                              }}>
                                PURCHASED
                              </span>
                            )}
                            {pu.activeUntilWeek && !isPurchased && (
                              <span style={{
                                fontSize: '10px', fontWeight: '700', color: style.accent,
                                backgroundColor: `${style.accent}15`,
                                padding: '2px 6px', borderRadius: '4px',
                              }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                            {pu.description}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {pu.purchased}/{pu.limit} {pu.limitLabel}
                              {pu.durationWeeks ? ` \u00b7 ${pu.durationWeeks}wk` : ''}
                            </span>
                            <button
                              onClick={() => handleBuyPowerup(pu.slug)}
                              disabled={!canBuy || isBuying || !user}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '4px',
                                border: `1px solid ${canBuy ? style.border : '#334155'}`,
                                backgroundColor: canBuy ? `${style.border}20` : 'rgba(51,65,85,0.3)',
                                color: canBuy ? style.accent : '#94a3b8',
                                fontSize: '12px', fontWeight: '700',
                                cursor: canBuy && !isBuying && user ? 'pointer' : 'not-allowed',
                                fontFamily: 'pressStart',
                                opacity: isBuying ? 0.6 : 1,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              {isPurchased ? 'Owned' : isBuying ? '...' : `${pu.price}`}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pack opening modal */}
        {openedCards && (
          <PackOpeningModal
            packName={openedCards.packName}
            cards={openedCards.cards}
            onClose={() => { setOpenedCards(null); fetchAll() }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Section Header ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  title: string
  subtitle?: string
  collapsed: boolean
  onToggle: () => void
}> = ({ title, subtitle, collapsed, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: '10px',
      marginBottom: collapsed ? '0' : '12px',
      cursor: 'pointer',
      userSelect: 'none',
    }}
  >
    <span style={{ fontSize: '18px', color: '#64748b', lineHeight: 1 }}>
      {collapsed ? '+' : '\u2013'}
    </span>
    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
      {title}
    </h3>
    {subtitle && (
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{subtitle}</span>
    )}
  </div>
)

export default ShopModal
