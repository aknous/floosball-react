import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAchievements } from '@/contexts/AchievementsContext'
import { CardData } from './TradingCard'
import PackOpeningModal from './PackOpeningModal'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface PendingPack {
  pendingId: number
  packName: string
  cardsKept: number
  cards: CardData[]
}

/**
 * Resumes a pack reveal that was left unselected — happens when the user
 * pays for or claims a pack, then refreshes before clicking confirm. The
 * PendingPackOpening row persists in the DB, so on next page load we
 * fetch the most recent one and re-open the selection modal globally so
 * the user can finish the flow regardless of which page they land on.
 */
const PendingPackResumer: React.FC = () => {
  const { getToken, user, updateFloobits } = useAuth()
  const { refetch: refetchAchievements } = useAchievements()
  const [pending, setPending] = useState<PendingPack | null>(null)

  const fetchPending = useCallback(async () => {
    const tok = await getToken()
    if (!tok) return
    try {
      const res = await fetch(`${API_BASE}/packs/pending`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json().catch(() => null)
      const data = json?.data
      if (!data) return
      setPending({
        pendingId: data.pendingId,
        packName: data.packName,
        cardsKept: data.cardsKept ?? data.revealed?.length ?? 0,
        cards: data.revealed ?? [],
      })
    } catch {
      // ignore — non-critical
    }
  }, [getToken])

  useEffect(() => {
    if (!user?.id) return
    fetchPending()
  }, [user?.id, fetchPending])

  const handleConfirm = useCallback(async (keptIndices: number[]) => {
    if (!pending) return
    const tok = await getToken()
    if (!tok) return
    try {
      const res = await fetch(`${API_BASE}/packs/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ pendingId: pending.pendingId, keptIndices }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to confirm selection' }))
        alert(err.detail || 'Failed to confirm selection')
        return
      }
      setPending(null)
      // Refresh balance + any pages listening for purchase events
      try {
        const bres = await fetch(`${API_BASE}/currency/balance`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (bres.ok) {
          const bj = await bres.json()
          const bal = bj?.data?.balance ?? 0
          updateFloobits(bal)
        }
      } catch { /* non-critical */ }
      window.dispatchEvent(new Event('floosball:shop-purchase'))
      refetchAchievements()
    } catch {
      alert('Failed to confirm selection')
    }
  }, [pending, getToken, updateFloobits, refetchAchievements])

  if (!pending) return null
  return (
    <PackOpeningModal
      packName={pending.packName}
      cards={pending.cards}
      pendingId={pending.pendingId}
      cardsKept={pending.cardsKept}
      onConfirmSelection={handleConfirm}
      onClose={() => setPending(null)}
    />
  )
}

export default PendingPackResumer
