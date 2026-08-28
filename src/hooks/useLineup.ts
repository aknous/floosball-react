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

/** What a slot is filled with. `userCardId` for a card the user owns; `templateId` for
 *  a floor print taken from the universal base pool, which has no `UserCard` row until
 *  it is fielded — the server materializes it at equip time. Exactly one is set. */
export type LineupPick = { userCardId?: number; templateId?: number }

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
  /** Equip a card into a slot (replaces whatever is there); PUTs the full set.
   *  Accepts a number for an owned card, or `{templateId}` for one taken from the
   *  BASE POOL — those have no `UserCard` row until the server materializes one. */
  equip: (slot: LineupSlot, pick: number | LineupPick) => Promise<boolean>
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
    mutate: (draft: Record<string, LineupPick>) => void,
  ): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      // ⚠️ THE DRAFT CARRIES A PICK, NOT A BARE ID. A pool card has no `UserCard` row
      // yet, so the whole set has to be expressible as "either an owned card or a
      // template" — and the PUT rewrites every slot, so an already-equipped pool card
      // has to survive the round trip too. It does: once fielded it HAS a UserCard row
      // and comes back from the server as an ordinary `card.id` like anything else.
      const draft: Record<string, LineupPick> = {}
      for (const [slot, entry] of Object.entries(bySlot)) {
        if (entry) draft[slot] = { userCardId: entry.card.id }
      }
      mutate(draft)
      const cards = Object.entries(draft).map(([slot, pick]) => ({ slot, ...pick }))
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

  const equip = useCallback((slot: LineupSlot, pick: number | LineupPick) =>
    put(draft => {
      const p: LineupPick = typeof pick === 'number' ? { userCardId: pick } : pick
      // Drop this card from any other slot it might occupy (no dup card). ⚠️ Compare on
      // BOTH keys: two slots naming the same pool template resolve server-side to one
      // `UserCard` through get-or-create, so leaving a duplicate `templateId` in the
      // draft earns a 400 rather than silently working.
      for (const s of Object.keys(draft)) {
        const d = draft[s]
        if ((p.userCardId != null && d.userCardId === p.userCardId)
            || (p.templateId != null && d.templateId === p.templateId)) delete draft[s]
      }
      draft[slot] = p
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
