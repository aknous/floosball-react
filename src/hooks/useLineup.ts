import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { CardData } from '@/Components/Cards/TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Fusion: equipped cards ARE the fantasy roster. Position-locked slots.
export const BASE_SLOTS = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'K'] as const
export const FLEX_SLOT = 'FLEX' as const
export type LineupSlot = typeof BASE_SLOTS[number] | typeof FLEX_SLOT

// slot -> the 1-based CardTemplate.position it accepts (FLEX = any).
export const SLOT_POSITION: Record<string, number | null> = {
  QB: 1, RB: 2, WR1: 3, WR2: 3, TE: 4, K: 5, FLEX: null,
}
// slot -> stable display/order ordinal (mirrors backend SLOT_TO_ORDINAL); used as
// the projection replace_slot when picking a card for a slot.
export const SLOT_ORDINAL: Record<string, number> = {
  QB: 1, RB: 2, WR1: 3, WR2: 4, TE: 5, K: 6, FLEX: 7,
}

export interface EquippedEntry {
  slot: LineupSlot
  slotNumber: number
  card: CardData
  playerId: number
  locked: boolean
}

export interface UseLineupResult {
  bySlot: Record<string, EquippedEntry | undefined>
  hasFlex: boolean
  flexSource: 'mvp' | 'temp_card_slot' | null
  gamesActive: boolean
  locked: boolean
  loading: boolean
  saving: boolean
  error: string | null
  refetch: () => void
  /** Equip a card into a slot (replaces whatever is there); PUTs the full set. */
  equip: (slot: LineupSlot, userCardId: number) => Promise<boolean>
  /** Clear a slot; PUTs the full set. */
  unequip: (slot: LineupSlot) => Promise<boolean>
  /** Cards eligible for a slot: owned, un-equipped, matching position (FLEX = any). */
  fetchCandidates: (slot: LineupSlot) => Promise<CardData[]>
}

export function useLineup(): UseLineupResult {
  const { getToken } = useAuth()
  const { event: wsEvent, connected: wsConnected } = useSeasonWebSocket()
  const { seasonState } = useFloosball()

  const [bySlot, setBySlot] = useState<Record<string, EquippedEntry | undefined>>({})
  const [hasFlex, setHasFlex] = useState(false)
  const [flexSource, setFlexSource] = useState<'mvp' | 'temp_card_slot' | null>(null)
  const [gamesActive, setGamesActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsWasConnected = useRef(false)

  const fetchLineup = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/equipped`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      const equipped: EquippedEntry[] = json.data?.equippedCards ?? []
      setGamesActive(json.data?.gamesActive ?? false)
      setHasFlex(!!json.data?.hasExtraSlot)
      setFlexSource(json.data?.extraSlotSource ?? null)
      const map: Record<string, EquippedEntry | undefined> = {}
      for (const eq of equipped) {
        if (eq.slot) map[eq.slot] = eq
      }
      setBySlot(map)
    } catch {
      // silent — leave prior state
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchLineup() }, [fetchLineup])

  // WS-driven refetch (week rollover, games starting/finishing, reconnect)
  useEffect(() => {
    if (!wsEvent) return
    const e = wsEvent.event
    if (e === 'week_start' || e === 'week_end' || e === 'game_start') fetchLineup()
    if (e === 'game_end' && seasonState.activeGames.length === 0) fetchLineup()
  }, [wsEvent, fetchLineup, seasonState.activeGames.length])

  useEffect(() => {
    if (wsConnected) {
      if (wsWasConnected.current) fetchLineup()
      wsWasConnected.current = true
    }
  }, [wsConnected, fetchLineup])

  useEffect(() => {
    const handler = () => fetchLineup()
    window.addEventListener('floosball:shop-purchase', handler)
    // Keep other useLineup instances (e.g. the scoring preview) in sync when any
    // one of them equips — `put` dispatches 'cards-equipped' after a successful PUT.
    window.addEventListener('cards-equipped', handler)
    return () => {
      window.removeEventListener('floosball:shop-purchase', handler)
      window.removeEventListener('cards-equipped', handler)
    }
  }, [fetchLineup])

  // Any locked equipped card means the whole lineup is frozen for the week.
  const locked = Object.values(bySlot).some(e => e?.locked)

  // Build the {slot,userCardId} set to PUT, applying one mutation.
  const put = useCallback(async (
    mutate: (draft: Record<string, number>) => void,
  ): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const draft: Record<string, number> = {}
      for (const [slot, entry] of Object.entries(bySlot)) {
        if (entry) draft[slot] = entry.card.id
      }
      mutate(draft)
      const cards = Object.entries(draft).map(([slot, userCardId]) => ({ slot, userCardId }))
      const tok = await getToken()
      if (!tok) return false
      const res = await fetch(`${API_BASE}/cards/equipped`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards }),
      })
      if (!res.ok) {
        let detail = 'Could not update your lineup.'
        try { detail = (await res.json()).detail || detail } catch { /* ignore */ }
        setError(detail)
        return false
      }
      await fetchLineup()
      // Keep the rest of the app (leaderboard, collection) in sync.
      window.dispatchEvent(new Event('cards-equipped'))
      return true
    } catch {
      setError('Could not update your lineup.')
      return false
    } finally {
      setSaving(false)
    }
  }, [bySlot, getToken, fetchLineup])

  const equip = useCallback((slot: LineupSlot, userCardId: number) =>
    put(draft => {
      // Drop this card from any other slot it might occupy (no dup card).
      for (const s of Object.keys(draft)) if (draft[s] === userCardId) delete draft[s]
      draft[slot] = userCardId
    }), [put])

  const unequip = useCallback((slot: LineupSlot) =>
    put(draft => { delete draft[slot] }), [put])

  const fetchCandidates = useCallback(async (slot: LineupSlot): Promise<CardData[]> => {
    try {
      const tok = await getToken()
      if (!tok) return []
      const pos = SLOT_POSITION[slot]
      const params = new URLSearchParams({ activeOnly: 'true', vaulted: 'false', equipped: 'false' })
      if (pos != null) params.set('position', String(pos))
      const res = await fetch(`${API_BASE}/cards/collection?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return []
      const json = await res.json()
      return json.data?.cards ?? []
    } catch {
      return []
    }
  }, [getToken])

  return {
    bySlot, hasFlex, flexSource, gamesActive, locked,
    loading, saving, error, refetch: fetchLineup,
    equip, unequip, fetchCandidates,
  }
}
