import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export type TradeWindowState = 'open' | 'disabled' | 'early' | 'deadline'

export interface TradeWindow {
  open: boolean
  state: TradeWindowState
  deadlineWeek: number
}

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

/** A player in the offseason's actual free-agent pool (from `/api/offseason`). */
export interface PoolFreeAgent {
  id: number
  name: string
  position: string
  rating: number
  tier: string
  /** No pro season played yet. */
  isNewcomer?: boolean
}

/**
 * ⚠️ THE OFFSEASON PHASES WHERE THE WALK-YEAR LIST IS NEXT YEAR'S. The front-office step
 * decrements every contract and sends this year's walk-years to the pool, so from then on
 * `expiring` (`termRemaining <= 1`) names the players who walk NEXT offseason. `post_bowl`
 * is before that step, so its walk-year list is still this offseason's and stays.
 */
const POOL_PHASES = new Set(['frontoffice', 'rookie_draft', 'pre_fa', 'fa_draft', 'training'])

interface UseTransactionsResult {
  loading: boolean
  error: string | null
  season: number
  week: number
  tradingEnabled: boolean
  /** Why the market is open or shut. The sim owns the rule; this page owns the wording. */
  tradeWindow: TradeWindow
  draftOrder: DraftSlot[]
  prospects: Prospect[]
  expiring: ExpiringPlayer[]
  block: BlockListing[]
  trades: TradeRow[]
  moves: MoveRow[]
  /** True while the offseason is past the front office: show `freeAgentPool`, not `expiring`. */
  showPool: boolean
  freeAgentPool: PoolFreeAgent[]
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
  const { seasonState } = useFloosball()
  const showPool = POOL_PHASES.has(seasonState?.offseasonPhase ?? '')
  const [freeAgentPool, setFreeAgentPool] = useState<PoolFreeAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState(0)
  const [week, setWeek] = useState(0)
  const [tradingEnabled, setTradingEnabled] = useState(false)
  const [tradeWindow, setTradeWindow] = useState<TradeWindow>({ open: false, state: 'disabled', deadlineWeek: 22 })
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
      // ⚠️ limit=200 (the endpoint's max): in pool mode the moves are where each free
      // agent's OLD team comes from, and at the default 60 the free-agent draft's own picks
      // push this offseason's walk-aways off the end.
      const [txnRes, classRes, poolRes] = await Promise.all([
        fetch(`${API_BASE}/transactions?limit=200`, { headers, cache: 'reload' }),
        fetch(`${API_BASE}/draft/class`, { headers, cache: 'reload' }),
        showPool
          ? fetch(`${API_BASE}/offseason?t=${Date.now()}`, { headers }).catch(() => null)
          : Promise.resolve(null),
      ])
      // A stale response from an earlier render must never overwrite a newer one.
      if (id !== fetchId.current) return
      if (txnRes.ok) {
        const d = (await txnRes.json()).data
        setSeason(d.season ?? 0)
        setWeek(d.week ?? 0)
        setTradingEnabled(!!d.tradingEnabled)
        // An older backend sends no window. Fall back to the flag rather than
        // rendering a closed market, which is what this whole field exists to stop.
        setTradeWindow(d.tradeWindow || {
          open: !!d.tradingEnabled, state: d.tradingEnabled ? 'open' : 'disabled', deadlineWeek: 22,
        })
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
      if (poolRes && poolRes.ok) {
        const d = await poolRes.json()
        setFreeAgentPool(d.freeAgents ?? [])
      } else if (!showPool) {
        setFreeAgentPool([])
      }
    } catch {
      if (id === fetchId.current) setError('The front office is not answering right now.')
    } finally {
      if (id === fetchId.current) setLoading(false)
    }
  }, [getToken, showPool])

  useEffect(() => { fetchAll() }, [fetchAll])

  return {
    loading, error, season, week, tradingEnabled, tradeWindow,
    draftOrder, prospects, expiring, block, trades, moves,
    showPool, freeAgentPool,
    refetch: fetchAll,
  }
}
