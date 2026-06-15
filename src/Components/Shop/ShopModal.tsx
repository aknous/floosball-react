import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import TradingCard, { CardData } from '../Cards/TradingCard'
import PackOpeningModal from '../Cards/PackOpeningModal'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTemplateProjections, projectionPillStyle, TemplateProjection } from '@/hooks/useCardProjection'
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
  cardsKept: number | null
  description: string
  dailyLimit: number | null
  remainingToday: number | null
  guaranteedRarity?: string | null
  themeType?: 'position' | 'team' | 'output' | 'champion' | 'allpro' | null
  themeValue?: string | null
}

interface StarterPack extends PackType {
  claimedThisSeason: boolean
}

interface PendingReveal {
  pendingId: number
  packName: string
  cardsPerPack: number
  cardsKept: number | null
  cards: CardData[]
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
  starter: { border: '#22c55e', bg: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', accent: '#86efac' },
  humble: { border: '#475569', bg: '#1e293b', accent: '#94a3b8' },
  grand: { border: '#db2777', bg: 'linear-gradient(135deg, #2e1065 0%, #701a3e 100%)', accent: '#f472b6' },
  exquisite: { border: '#a5f3fc', bg: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 50%, #164e63 100%)', accent: '#67e8f9' },
}

// Themed packs get their accent from the theme dimension so the shop reads
// at-a-glance. Position uses indigo; output type packs key off the currency
// they pay; team packs reuse the neutral slate palette since their identity
// is the team name itself. Champion + All-Pro are the prestige once-per-
// season packs and get distinct flashy palettes (gold + emerald).
const THEMED_PACK_COLORS: Record<string, { border: string; bg: string; accent: string }> = {
  position: { border: '#6366f1', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', accent: '#a5b4fc' },
  team:     { border: '#475569', bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', accent: '#cbd5e1' },
  output_fp:       { border: '#3b82f6', bg: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', accent: '#93c5fd' },
  output_fpx:      { border: '#db2777', bg: 'linear-gradient(135deg, #500724 0%, #831843 100%)', accent: '#f472b6' },
  output_floobits: { border: '#eab308', bg: 'linear-gradient(135deg, #422006 0%, #713f12 100%)', accent: '#facc15' },
  champion: { border: '#f59e0b', bg: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)', accent: '#fcd34d' },
  allpro:   { border: '#10b981', bg: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)', accent: '#6ee7b7' },
}

const themedPackColors = (p: PackType) => {
  if (p.themeType === 'output' && p.themeValue) {
    const key = `output_${p.themeValue}`
    return THEMED_PACK_COLORS[key] || THEMED_PACK_COLORS.position
  }
  if (p.themeType === 'team') return THEMED_PACK_COLORS.team
  if (p.themeType === 'champion') return THEMED_PACK_COLORS.champion
  if (p.themeType === 'allpro') return THEMED_PACK_COLORS.allpro
  return THEMED_PACK_COLORS.position
}

const PACK_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  starter: GiCardDraw,
  humble: GiCardDraw,
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

// ─── Projection pill for shop cards (compact, sm-card-friendly) ─────────

const ShopProjectionPill: React.FC<{ proj: TemplateProjection }> = ({ proj }) => {
  const style = projectionPillStyle(proj)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: '10px', fontWeight: 700,
          color: style.color, backgroundColor: style.bg,
          padding: '2px 8px', borderRadius: '4px',
          border: `1px solid ${style.color}55`,
          fontVariantNumeric: 'tabular-nums' as const,
          whiteSpace: 'nowrap' as const,
        }}
      >
        {style.label}
      </span>
      {style.ceiling && (
        <span style={{
          fontSize: '9px', color: style.color, opacity: 0.8,
          fontVariantNumeric: 'tabular-nums' as const,
          whiteSpace: 'nowrap' as const,
        }}>
          {style.ceiling}
        </span>
      )}
    </div>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
  const { user, getToken, updateFloobits, refetchRoster } = useAuth()
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const contentRef = useRef<HTMLDivElement>(null)

  const [packs, setPacks] = useState<PackType[]>([])
  const [themedPacks, setThemedPacks] = useState<PackType[]>([])
  const [starter, setStarter] = useState<StarterPack | null>(null)
  const [featured, setFeatured] = useState<FeaturedCard[]>([])

  // Project featured-card weekly output against the current user's roster
  // so the shop pill shows expected FP/FPx/Floobits before the user buys.
  const featuredTemplateIds = useMemo(() => featured.map(f => f.templateId), [featured])
  const { byTemplateId: featuredProjections } = useTemplateProjections(featuredTemplateIds)
  const [powerups, setPowerups] = useState<PowerupItem[]>([])
  const [balance, setBalance] = useState(user?.floobits ?? 0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  // openedCards used for starter / legacy free-grant packs (no selection)
  const [openedCards, setOpenedCards] = useState<{ packName: string; cards: CardData[] } | null>(null)
  // pendingReveal used for the new reveal+select flow on purchases
  const [pendingReveal, setPendingReveal] = useState<PendingReveal | null>(null)

  const [rerollCost, setRerollCost] = useState<number>(10)
  const [rerolling, setRerolling] = useState(false)
  const [themedRerollCost, setThemedRerollCost] = useState<number>(30)
  const [themedRerolling, setThemedRerolling] = useState(false)
  const [shopOpen, setShopOpen] = useState(true)
  // Shop-cycle pack cap — surfaced so the UI can show "X of Y packs this cycle"
  // and gray out buy buttons when the user is at the cap.
  const [cycleLimit, setCycleLimit] = useState<number>(0)
  const [cyclePacksOpened, setCyclePacksOpened] = useState<number>(0)
  const cycleRemaining = Math.max(0, cycleLimit - cyclePacksOpened)
  const cycleCapped = cycleLimit > 0 && cycleRemaining <= 0

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const fetchAll = useCallback(async () => {
    if (!isOpen) return
    try {
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers.Authorization = `Bearer ${tok}`

      const [packsRes, featuredRes, balRes, powerupRes, rerollRes, themedRerollRes] = await Promise.all([
        // /packs/types is user-specific (starter.claimedThisSeason +
        // per-pack remainingToday counters) — must pass the token.
        fetch(`${API_BASE}/packs/types`, { headers }),
        tok ? fetch(`${API_BASE}/shop/featured`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/currency/balance`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/shop/powerups`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/shop/reroll-cost`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/shop/themed-pack-reroll-cost`, { headers }) : Promise.resolve(null),
      ])

      if (packsRes.ok) {
        const j = await packsRes.json()
        setPacks(j.data?.packs ?? [])
        setThemedPacks(j.data?.themedPacks ?? [])
        setStarter(j.data?.starter ?? null)
        if (j.data?.shopOpen !== undefined) setShopOpen(j.data.shopOpen)
        if (typeof j.data?.cycleLimit === 'number') setCycleLimit(j.data.cycleLimit)
        if (typeof j.data?.cyclePacksOpened === 'number') setCyclePacksOpened(j.data.cyclePacksOpened)
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
      if (themedRerollRes?.ok) {
        const tj = await themedRerollRes.json()
        setThemedRerollCost(tj.data?.cost ?? 30)
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

  // Re-fetch silently whenever the in-game week ticks while the modal is
  // open. In fast / non-scheduled timing modes, weeks advance rapidly —
  // without this, the rotation, daily limits, and starter-claim status
  // stay stale (e.g. shop says "day 1" even when the sim is at week 15).
  useEffect(() => {
    if (isOpen && !loading) fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonState.currentWeek])

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
      const res = await fetch(`${API_BASE}/packs/reveal`, {
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
      setPendingReveal({
        pendingId: data.pendingId,
        packName: data.packName,
        cardsPerPack: data.cardsPerPack,
        cardsKept: data.cardsKept ?? null,
        cards: data.revealed ?? [],
      })
      // Balance was debited by /reveal — update immediately so the user sees
      // the cost reflected during the selection step.
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

  const handleConfirmSelection = useCallback(async (keptIndices: number[]) => {
    if (!pendingReveal) return
    const tok = await getToken()
    if (!tok) return
    try {
      const res = await fetch(`${API_BASE}/packs/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ pendingId: pendingReveal.pendingId, keptIndices }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to confirm selection' }))
        alert(err.detail || 'Failed to confirm selection')
        return
      }
      // Selection confirmed — refresh shop state (rotation, daily limit, balance)
      setPendingReveal(null)
      fetchAll()
    } catch {
      alert('Failed to confirm selection')
    }
  }, [pendingReveal, getToken, fetchAll])

  const handleClaimStarter = async () => {
    const tok = await getToken()
    if (!tok) return
    setBuying('starter')
    try {
      const res = await fetch(`${API_BASE}/packs/starter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to claim starter pack' }))
        alert(err.detail || 'Failed to claim starter pack')
        return
      }
      const json = await res.json()
      const data = json.data ?? json
      // Starter pack: no selection, immediate reveal of all 5 cards
      setOpenedCards({ packName: data.packName, cards: data.cards })
      fetchAll()
    } catch {
      alert('Failed to claim starter pack')
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

  const handleRerollThemed = async () => {
    const tok = await getToken()
    if (!tok) return
    setThemedRerolling(true)
    try {
      const res = await fetch(`${API_BASE}/shop/reroll-themed-packs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Reroll failed' }))
        alert(err.detail || 'Reroll failed')
        return
      }
      const j = await res.json()
      if (j.data?.themedPacks) setThemedPacks(j.data.themedPacks)
      if (typeof j.data?.newBalance === 'number') {
        setBalance(j.data.newBalance)
        updateFloobits(j.data.newBalance)
      }
      if (typeof j.data?.nextRerollCost === 'number') {
        setThemedRerollCost(j.data.nextRerollCost)
      }
    } catch {
      alert('Reroll failed')
    } finally {
      setThemedRerolling(false)
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
                              {/* Owned badge overlays the card (absolute) so it
                                  doesn't add column height and push the buy
                                  button below its neighbors. */}
                              <div style={{ position: 'relative' }}>
                                <TradingCard
                                  card={{ ...card, id: card.templateId, acquiredAt: null, acquiredVia: '' }}
                                  size="sm"
                                />
                                {(card.ownedEffectCount ?? 0) > 0 && (
                                  <span style={{
                                    position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
                                    fontSize: isMobile ? '9px' : '10px', fontFamily: 'pressStart', fontWeight: 600,
                                    color: '#fbbf24', padding: '1px 6px', borderRadius: '5px',
                                    border: '1px solid rgba(251,191,36,0.4)', background: 'rgba(15,23,42,0.9)',
                                    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 2,
                                  }}>
                                    You own {card.ownedEffectCount}
                                  </span>
                                )}
                              </div>
                              {featuredProjections.get(card.templateId) && (
                                <ShopProjectionPill proj={featuredProjections.get(card.templateId)!} />
                              )}
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

              {/* ── Card Packs — unified section ──
                  Always-visible:    starter (until claimed) + humble
                  Rerollable slots:  3 themed/grand/exquisite picks from a
                                     weighted category pool. Grand and
                                     Exquisite only appear via this rotation. */}
              <div style={{ marginBottom: '28px' }}>
                <SectionHeader
                  title="Card Packs"
                  collapsed={!!collapsed.packs}
                  onToggle={() => toggleSection('packs')}
                />
                {!collapsed.packs && cycleLimit > 0 && (
                  <div style={{
                    fontSize: '11px',
                    color: cycleCapped ? '#ef4444' : '#94a3b8',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}>
                    {cycleCapped
                      ? `Cycle limit reached (${cyclePacksOpened} of ${cycleLimit}). Refreshes next cycle.`
                      : `${cyclePacksOpened} of ${cycleLimit} packs opened this cycle`}
                  </div>
                )}
                {!collapsed.packs && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}>
                    {/* Unclaimed starter renders inline as a free tile.
                        Always available until claimed — not gated by
                        shopOpen so new users can claim during playoffs/offseason. */}
                    {starter && !starter.claimedThisSeason && (() => {
                      const colors = PACK_COLORS.starter
                      const isBuying2 = buying === 'starter'
                      const canBuy = !isBuying2 && !!user
                      return (
                        <div key="starter" style={{
                          width: isMobile ? '100%' : '195px',
                          minHeight: '215px',
                          borderRadius: '8px',
                          background: colors.bg,
                          borderBottom: `2px solid ${colors.border}`,
                          padding: '14px',
                          display: 'flex', flexDirection: 'column', gap: '8px',
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: colors.accent,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minHeight: '38px',
                            lineHeight: 1.25,
                          }}>
                            <div style={{ flexShrink: 0, display: 'flex' }}>
                              <GiCardDraw size={28} color={colors.accent} />
                            </div>
                            <span>{starter.displayName}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, flex: 1 }}>
                            {starter.description}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            5 cards · once per season
                          </div>
                          <button
                            onClick={handleClaimStarter}
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
                            {isBuying2 ? 'Claiming...' : 'Free'}
                          </button>
                        </div>
                      )
                    })()}
                    {[...packs, ...themedPacks].map(pack => {
                      // Standard tier names hit PACK_COLORS; everything else
                      // (themed packs) goes through the theme-color resolver.
                      const colors = PACK_COLORS[pack.name] || themedPackColors(pack)
                      const Icon = PACK_ICONS[pack.name] || GiCardDraw
                      const canAfford = balance >= pack.cost
                      const isBuying2 = buying === `pack_${pack.id}`
                      const canBuy = canAfford && !isBuying2 && !!user && shopOpen && !cycleCapped

                      const themeBadge = pack.themeType === 'position'
                        ? pack.themeValue
                        : pack.themeType === 'output'
                          ? (pack.themeValue === 'fpx' ? 'FPx' : pack.themeValue === 'fp' ? 'FP' : 'Floobits')
                          : pack.themeType === 'team'
                            ? 'Team'
                            : pack.themeType === 'champion'
                              ? 'Champ'
                              : pack.themeType === 'allpro'
                                ? 'All-Pro'
                                : null

                      return (
                        <div key={pack.id} style={{
                          width: isMobile ? '100%' : '195px',
                          minHeight: '215px',
                          borderRadius: '8px',
                          background: colors.bg,
                          borderBottom: `2px solid ${colors.border}`,
                          padding: '14px',
                          display: 'flex', flexDirection: 'column', gap: '8px',
                          position: 'relative',
                        }}>
                          {themeBadge && (
                            <div style={{
                              position: 'absolute',
                              top: '8px', right: '8px',
                              fontSize: '9px',
                              fontFamily: 'pressStart',
                              color: colors.accent,
                              background: `${colors.border}30`,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '4px',
                              padding: '3px 6px',
                              letterSpacing: '0.5px',
                            }}>
                              {themeBadge}
                            </div>
                          )}
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: colors.accent,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            paddingRight: themeBadge ? '50px' : 0,
                            minHeight: '38px',
                            lineHeight: 1.25,
                          }}>
                            <div style={{ flexShrink: 0, display: 'flex' }}>
                              <Icon size={28} color={colors.accent} />
                            </div>
                            <span>{pack.displayName}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, flex: 1 }}>
                            {pack.description}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Reveal {pack.cardsPerPack}
                            {pack.cardsKept != null && pack.cardsKept < pack.cardsPerPack && (
                              <span> · keep {pack.cardsKept}</span>
                            )}
                          </div>
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
                            {isBuying2
                              ? 'Opening...'
                              : cycleCapped
                                ? 'Cycle full'
                                : `${pack.cost} Floobits`}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {!collapsed.packs && !!user && (
                  <div style={{
                    display: 'flex', justifyContent: 'center', marginTop: '14px',
                  }}>
                    <button
                      onClick={handleRerollThemed}
                      disabled={themedRerolling || balance < themedRerollCost || !shopOpen}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '5px',
                        border: `1px solid ${balance >= themedRerollCost && shopOpen ? '#6366f1' : '#334155'}`,
                        backgroundColor: balance >= themedRerollCost && shopOpen ? 'rgba(99,102,241,0.12)' : 'rgba(51,65,85,0.3)',
                        color: balance >= themedRerollCost && shopOpen ? '#a5b4fc' : '#94a3b8',
                        fontSize: '11px', fontWeight: '700',
                        cursor: !themedRerolling && balance >= themedRerollCost && shopOpen ? 'pointer' : 'not-allowed',
                        fontFamily: 'pressStart',
                        opacity: themedRerolling ? 0.6 : 1,
                        transition: 'opacity 0.15s',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                      }}
                      title="Reroll the rotating slots. Cost rises with each reroll this cycle."
                    >
                      <GiPerspectiveDiceSixFacesRandom size={14} />
                      {themedRerolling ? 'Rerolling...' : `Reroll \u00b7 ${themedRerollCost}`}
                    </button>
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

        {/* Pending reveal: reveal animation → user picks which to keep */}
        {pendingReveal && (
          <PackOpeningModal
            packName={pendingReveal.packName}
            cards={pendingReveal.cards}
            pendingId={pendingReveal.pendingId}
            cardsKept={pendingReveal.cardsKept ?? undefined}
            onConfirmSelection={async (keptIndices) => {
              await handleConfirmSelection(keptIndices)
            }}
            onClose={() => { setPendingReveal(null); fetchAll() }}
          />
        )}

        {/* Free-grant modal (starter pack, etc) — no selection */}
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
