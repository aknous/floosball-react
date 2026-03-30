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
  dailyLimit: number | null
  remainingToday: number | null
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

const POWERUP_STYLES: Record<string, { accent: string }> = {
  extra_swap: { accent: '#22c55e' },
  modifier_nullifier: { accent: '#eab308' },
  temp_flex: { accent: '#a78bfa' },
  temp_card_slot: { accent: '#67e8f9' },
  fortunes_favor: { accent: '#f472b6' },
  income_boost: { accent: '#fbbf24' },
}

const PACK_COLORS: Record<string, { border: string; bg: string; accent: string }> = {
  humble: { border: '#475569', bg: '#1e293b', accent: '#94a3b8' },
  proper: { border: '#a78bfa', bg: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)', accent: '#c4b5fd' },
  grand: { border: '#db2777', bg: 'linear-gradient(135deg, #2e1065 0%, #701a3e 100%)', accent: '#f472b6' },
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
  fortunes_favor: GiQueenCrown,
  income_boost: GiCrownCoin,
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

  const [rerollCost, setRerollCost] = useState<number>(10)
  const [rerolling, setRerolling] = useState(false)
  const [shopOpen, setShopOpen] = useState(true)

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const fetchAll = useCallback(async () => {
    if (!isOpen) return
    try {
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers.Authorization = `Bearer ${tok}`

      const [packsRes, featuredRes, balRes, powerupRes, rerollRes] = await Promise.all([
        fetch(`${API_BASE}/packs/types`),
        tok ? fetch(`${API_BASE}/shop/featured`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/currency/balance`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/shop/powerups`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/shop/reroll-cost`, { headers }) : Promise.resolve(null),
      ])

      if (packsRes.ok) {
        const j = await packsRes.json()
        setPacks(j.data?.packs ?? [])
        if (j.data?.shopOpen !== undefined) setShopOpen(j.data.shopOpen)
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
      if (rerollRes?.ok) {
        const rj = await rerollRes.json()
        setRerollCost(rj.data?.cost ?? 10)
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
      // Refresh balance and pack remaining counts
      const authHeaders = { Authorization: `Bearer ${tok}` }
      const [balRes, packsRefresh] = await Promise.all([
        fetch(`${API_BASE}/currency/balance`, { headers: authHeaders }),
        fetch(`${API_BASE}/packs/types`, { headers: authHeaders }),
      ])
      if (balRes.ok) {
        const bj = await balRes.json()
        const bal = bj.data?.balance ?? 0
        setBalance(bal)
        updateFloobits(bal)
      }
      if (packsRefresh.ok) {
        const pj = await packsRefresh.json()
        setPacks(pj.data?.packs ?? [])
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

  const handleReroll = async () => {
    const tok = await getToken()
    if (!tok) return
    setRerolling(true)
    try {
      const res = await fetch(`${API_BASE}/shop/reroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Reroll failed' }))
        alert(err.detail || 'Reroll failed')
        return
      }
      const j = await res.json()
      if (j.data?.featuredCards) setFeatured(j.data.featuredCards)
      if (typeof j.data?.newBalance === 'number') {
        setBalance(j.data.newBalance)
        updateFloobits(j.data.newBalance)
      }
      if (typeof j.data?.nextRerollCost === 'number') {
        setRerollCost(j.data.nextRerollCost)
      }
    } catch {
      alert('Reroll failed')
    } finally {
      setRerolling(false)
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
        <div ref={contentRef} style={{ overflowY: 'auto', padding: isMobile ? '12px 12px' : '16px 20px' }}>
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
              Loading shop...
            </div>
          ) : (
            <>
              {!shopOpen && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  textAlign: 'center',
                }}>
                  The shop is closed for the season. Cards expire at season end, so purchases are disabled during playoffs and offseason.
                </div>
              )}
              {/* ── Daily Selection ── */}
              {featured.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader
                    title="Daily Selection"
                    collapsed={!!collapsed.featured}
                    onToggle={() => toggleSection('featured')}
                  />
                  {!collapsed.featured && (
                    <>
                      <div style={{
                        display: 'flex',
                        gap: isMobile ? '8px' : '14px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}>
                        {featured.map(card => {
                          const canAfford = balance >= card.buyPrice
                          const isBuying3 = buying === `card_${card.templateId}`

                          return (
                            <div key={card.templateId} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '4px' : '6px',
                            }}>
                              <TradingCard
                                card={{ ...card, id: card.templateId, acquiredAt: null, acquiredVia: '' }}
                                size="sm"
                              />
                              <button
                                onClick={() => handleBuyCard(card.templateId)}
                                disabled={!canAfford || isBuying3 || !user || !shopOpen}
                                style={{
                                  padding: isMobile ? '4px 8px' : '5px 12px',
                                  borderRadius: '5px',
                                  border: `1px solid ${canAfford && shopOpen ? '#eab308' : '#334155'}`,
                                  backgroundColor: canAfford && shopOpen ? 'rgba(234,179,8,0.12)' : 'rgba(51,65,85,0.3)',
                                  color: canAfford && shopOpen ? '#eab308' : '#94a3b8',
                                  fontSize: isMobile ? '10px' : '12px', fontWeight: '700',
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
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                        <button
                          onClick={handleReroll}
                          disabled={rerolling || balance < rerollCost || !user || !shopOpen}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '5px',
                            border: `1px solid ${balance >= rerollCost && shopOpen ? '#a78bfa' : '#334155'}`,
                            backgroundColor: balance >= rerollCost && shopOpen ? 'rgba(167,139,250,0.12)' : 'rgba(51,65,85,0.3)',
                            color: balance >= rerollCost && shopOpen ? '#a78bfa' : '#94a3b8',
                            fontSize: '11px', fontWeight: '700',
                            cursor: !rerolling && balance >= rerollCost && user && shopOpen ? 'pointer' : 'not-allowed',
                            fontFamily: 'pressStart',
                            opacity: rerolling ? 0.6 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          <GiPerspectiveDiceSixFacesRandom size={16} />
                          {rerolling ? 'Rerolling...' : `Reroll \u00b7 ${rerollCost}`}
                        </button>
                      </div>
                    </>
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
                      const soldOut = pack.remainingToday !== null && pack.remainingToday <= 0
                      const canBuy = canAfford && !isBuying2 && !soldOut && !!user && shopOpen

                      return (
                        <div key={pack.id} style={{
                          width: isMobile ? '100%' : '195px',
                          borderRadius: '8px',
                          background: colors.bg,
                          borderBottom: `2px solid ${colors.border}`,
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
                          {pack.dailyLimit != null && (
                            <div style={{ fontSize: '11px', color: soldOut ? '#ef4444' : '#94a3b8' }}>
                              {soldOut
                                ? 'Sold out today'
                                : pack.remainingToday != null
                                  ? `${pack.remainingToday} of ${pack.dailyLimit} remaining today`
                                  : `Limit ${pack.dailyLimit} per day`}
                            </div>
                          )}
                          <button
                            onClick={() => handleOpenPack(pack.id)}
                            disabled={!canBuy}
                            style={{
                              width: '100%', padding: '8px',
                              borderRadius: '5px',
                              border: 'none',
                              backgroundColor: canBuy ? `${colors.accent}20` : 'rgba(51,65,85,0.3)',
                              color: canBuy ? colors.accent : '#94a3b8',
                              fontSize: '12px', fontWeight: '700',
                              cursor: canBuy ? 'pointer' : 'not-allowed',
                              fontFamily: 'pressStart',
                              opacity: isBuying2 ? 0.6 : 1,
                              transition: 'opacity 0.15s',
                            }}
                          >
                            {isBuying2 ? 'Opening...' : soldOut ? 'Sold Out' : `${pack.cost} Floobits`}
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
                      const canBuy = pu.available && canAfford && pu.purchased < pu.limit && shopOpen
                      const isBuying = buying === pu.slug
                      const isPurchased = pu.purchased >= pu.limit

                      return (
                        <div key={pu.slug} style={{
                          borderRadius: '8px',
                          backgroundColor: '#1e293b',
                          borderBottom: `2px solid ${isPurchased ? '#334155' : style.accent}50`,
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
                                backgroundColor: 'rgba(34,197,94,0.25)',
                                padding: '2px 6px', borderRadius: '4px',
                              }}>
                                PURCHASED
                              </span>
                            )}
                            {pu.activeUntilWeek && !isPurchased && (
                              <span style={{
                                fontSize: '10px', fontWeight: '700', color: style.accent,
                                backgroundColor: `${style.accent}30`,
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
                                border: 'none',
                                backgroundColor: canBuy ? `${style.accent}20` : 'rgba(51,65,85,0.3)',
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
