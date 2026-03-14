import React, { useState, useEffect, useCallback } from 'react'
import TradingCard, { CardData } from './TradingCard'
import PackOpeningModal from './PackOpeningModal'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

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

const PACK_COLORS: Record<string, { border: string; bg: string; accent: string }> = {
  humble: { border: '#475569', bg: '#1e293b', accent: '#94a3b8' },
  proper: { border: '#a78bfa', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', accent: '#c4b5fd' },
  grand: { border: '#f59e0b', bg: 'linear-gradient(135deg, #422006 0%, #78350f 100%)', accent: '#fbbf24' },
  exquisite: { border: '#a5f3fc', bg: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 50%, #164e63 100%)', accent: '#67e8f9' },
}

const CardShop: React.FC = () => {
  const { user, getToken, updateFloobits } = useAuth()
  const isMobile = useIsMobile()

  const [packs, setPacks] = useState<PackType[]>([])
  const [featured, setFeatured] = useState<FeaturedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<number | null>(null) // packTypeId or templateId being purchased
  const [openedCards, setOpenedCards] = useState<{ packName: string; cards: CardData[] } | null>(null)
  const [balance, setBalance] = useState(user?.floobits ?? 0)

  const fetchShopData = useCallback(async () => {
    try {
      const tok = await getToken()
      const headers: Record<string, string> = {}
      if (tok) headers.Authorization = `Bearer ${tok}`

      const [packsRes, featuredRes, balanceRes] = await Promise.all([
        fetch(`${API_BASE}/packs/types`),
        tok ? fetch(`${API_BASE}/shop/featured`, { headers }) : Promise.resolve(null),
        tok ? fetch(`${API_BASE}/currency/balance`, { headers }) : Promise.resolve(null),
      ])

      if (packsRes.ok) {
        const json = await packsRes.json()
        setPacks(json.data?.packs ?? [])
      }
      if (featuredRes?.ok) {
        const json = await featuredRes.json()
        setFeatured(json.data?.cards ?? [])
      }
      if (balanceRes?.ok) {
        const json = await balanceRes.json()
        const bal = json.data?.balance ?? 0
        setBalance(bal)
        updateFloobits(bal)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [getToken, updateFloobits])

  useEffect(() => { fetchShopData() }, [fetchShopData])

  const handleOpenPack = async (packTypeId: number) => {
    const tok = await getToken()
    if (!tok) return
    setBuying(packTypeId)
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
    setBuying(templateId)
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
      // Refresh featured + balance
      fetchShopData()
    } catch {
      alert('Failed to buy card')
    } finally {
      setBuying(null)
    }
  }

  if (loading) {
    return (
      <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
        Loading shop...
      </div>
    )
  }

  return (
    <div>
      {/* Balance bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', padding: '12px 16px',
        backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155',
      }}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Your Balance</span>
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#eab308' }}>
          {balance.toLocaleString()} Floobits
        </span>
      </div>

      {/* Pack section */}
      <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 14px 0' }}>
        Card Packs
      </h2>
      <div style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap',
        marginBottom: '32px',
        justifyContent: isMobile ? 'center' : 'flex-start',
      }}>
        {packs.map(pack => {
          const colors = PACK_COLORS[pack.name] || PACK_COLORS.humble
          const canAfford = balance >= pack.cost
          const isBuying = buying === pack.id

          return (
            <div key={pack.id} style={{
              width: isMobile ? '100%' : '260px',
              borderRadius: '10px',
              border: `2px solid ${colors.border}`,
              background: colors.bg,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: colors.accent }}>
                {pack.displayName}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                {pack.description}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {pack.cardsPerPack} cards
                {pack.guaranteedRarity && (
                  <span style={{ color: colors.accent }}> &middot; 1+ {pack.guaranteedRarity}</span>
                )}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                <button
                  onClick={() => handleOpenPack(pack.id)}
                  disabled={!canAfford || isBuying || !user}
                  style={{
                    width: '100%', padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${canAfford ? colors.border : '#334155'}`,
                    backgroundColor: canAfford ? `${colors.border}30` : 'rgba(51,65,85,0.3)',
                    color: canAfford ? colors.accent : '#475569',
                    fontSize: '13px', fontWeight: '700',
                    cursor: canAfford && !isBuying && user ? 'pointer' : 'not-allowed',
                    fontFamily: 'pressStart',
                    opacity: isBuying ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isBuying ? 'Opening...' : `${pack.cost} Floobits`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Featured singles */}
      {featured.length > 0 && (
        <>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 6px 0' }}>
            Featured Cards
          </h2>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
            Individual cards for sale &mdash; selection refreshes each visit
          </div>
          <div style={{
            display: 'flex', gap: '16px', flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            {featured.map(card => {
              const canAfford = balance >= card.buyPrice
              const isBuying = buying === card.templateId

              return (
                <div key={card.templateId} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                }}>
                  <TradingCard
                    card={{ ...card, id: card.templateId, acquiredAt: null, acquiredVia: '' }}
                    size={isMobile ? 'sm' : 'md'}
                  />
                  <button
                    onClick={() => handleBuyCard(card.templateId)}
                    disabled={!canAfford || isBuying || !user}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: `1px solid ${canAfford ? '#eab308' : '#334155'}`,
                      backgroundColor: canAfford ? 'rgba(234,179,8,0.12)' : 'rgba(51,65,85,0.3)',
                      color: canAfford ? '#eab308' : '#475569',
                      fontSize: '11px', fontWeight: '700',
                      cursor: canAfford && !isBuying && user ? 'pointer' : 'not-allowed',
                      fontFamily: 'pressStart',
                      opacity: isBuying ? 0.6 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {isBuying ? '...' : `${card.buyPrice} Floobits`}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pack opening modal */}
      {openedCards && (
        <PackOpeningModal
          packName={openedCards.packName}
          cards={openedCards.cards}
          onClose={() => setOpenedCards(null)}
        />
      )}
    </div>
  )
}

export default CardShop
