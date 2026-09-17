import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface TeamBlob {
  id: number
  name: string
  abbr: string
  color: string | null
}

export interface TeamRecord {
  wins: number
  losses: number
  ties: number
}

export interface DraftSlot {
  slot: number
  originalTeam: TeamBlob | null
  /** The team that PICKS. Differs from originalTeam once the pick has been traded. */
  owner: TeamBlob | null
  traded: boolean
  /**
   * The ORIGINAL team's record, which is what put the slot here — the owner's record
   * explains nothing about why the pick sits where it does.
   */
  record: TeamRecord | null
}

export interface CeilingRange {
  low: number
  high: number
  /** Set only when the band has collapsed to a single number. */
  exact: number | null
  band: number
}

export interface Prospect {
  playerId: number
  name: string
  position: string
  /** A fact: what they play at today. */
  rating: number
  tier: string | null
  /** Scouted, and different for every team looking at them. */
  ceilingRange: CeilingRange | null
}

export interface ExpiringPlayer {
  playerId: number
  name: string
  position: string
  rating: number
  team: TeamBlob | null
  /** The team is over its re-sign limit and this is one of the ones it cannot keep. */
  cannotKeep: boolean
}

export interface BlockListing {
  playerId: number
  name: string
  position: string
  rating: number
  team: TeamBlob | null
  reason: string
  ask: number
}

export interface TradeAsset {
  /** 'player' | 'prospect' | 'pick' */
  kind?: string
  id?: number | null
  name?: string
  /** Position for a player, slot for a pick. Whatever identifies it at a glance. */
  detail?: string
  /**
   * Resolved at read time from the live roster, so it is what they are rated NOW rather
   * than at the moment of the trade — nothing snapshots a rating per trade. Absent for
   * picks, and for a player who has since left the league.
   */
  rating?: number
}

export interface TradeRow {
  id: number
  week: number | null
  phase: string
  /** The side that listed the player. `aGave` is what it sent. */
  teamA: TeamBlob | null
  teamB: TeamBlob | null
  aGave: TradeAsset[]
  bGave: TradeAsset[]
  /** The seller's category. Null on trades settled before the column existed. */
  trigger: string | null
  sellerWhy: string | null
  buyerWhy: string | null
}

export interface MoveRow {
  type: string
  team: TeamBlob | { name: string } | null
  playerId: number | null
  player: string | null
  position: string | null
  rating: number | null
  detail: string | null
}

interface UseTransactionsResult {
  loading: boolean
  error: string | null
  season: number
  week: number
  tradingEnabled: boolean
  draftOrder: DraftSlot[]
  prospects: Prospect[]
  expiring: ExpiringPlayer[]
  block: BlockListing[]
  trades: TradeRow[]
  moves: MoveRow[]
  refetch: () => void
}

/**
 * The front-office desk: the draft order, this season's class, who is out of
 * contract, who is available, and everything that has already moved.
 *
 * Two endpoints rather than one because the draft class is scouted PER TEAM —
 * `/api/draft/class` resolves the viewing team's own belief about each prospect's
 * ceiling, so two fans genuinely see different ranges for the same player.
 */
export function useTransactions(): UseTransactionsResult {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState(0)
  const [week, setWeek] = useState(0)
  const [tradingEnabled, setTradingEnabled] = useState(false)
  const [draftOrder, setDraftOrder] = useState<DraftSlot[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [expiring, setExpiring] = useState<ExpiringPlayer[]>([])
  const [block, setBlock] = useState<BlockListing[]>([])
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [moves, setMoves] = useState<MoveRow[]>([])
  const fetchId = useRef(0)

  const fetchAll = useCallback(async () => {
    const id = ++fetchId.current
    try {
      const tok = await getToken().catch(() => null)
      const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
      const [txnRes, classRes] = await Promise.all([
        fetch(`${API_BASE}/transactions`, { headers, cache: 'reload' }),
        fetch(`${API_BASE}/draft/class`, { headers, cache: 'reload' }),
      ])
      // A stale response from an earlier render must never overwrite a newer one.
      if (id !== fetchId.current) return
      if (txnRes.ok) {
        const d = (await txnRes.json()).data
        setSeason(d.season ?? 0)
        setWeek(d.week ?? 0)
        setTradingEnabled(!!d.tradingEnabled)
        setDraftOrder(d.draftOrder ?? [])
        setExpiring(d.expiring ?? [])
        setBlock(d.block ?? [])
        setTrades(d.trades ?? [])
        setMoves(d.moves ?? [])
        setError(null)
      } else {
        setError('The front office is not answering right now.')
      }
      if (classRes.ok) {
        const d = (await classRes.json()).data
        setProspects(d.prospects ?? [])
      }
    } catch {
      if (id === fetchId.current) setError('The front office is not answering right now.')
    } finally {
      if (id === fetchId.current) setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchAll() }, [fetchAll])

  return {
    loading, error, season, week, tradingEnabled,
    draftOrder, prospects, expiring, block, trades, moves,
    refetch: fetchAll,
  }
}
