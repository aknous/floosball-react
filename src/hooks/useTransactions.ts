import { Projection } from '@/Components/Potential'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'

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
  /** The team whose finish set the slot. With trading off, also the team that picks. */
  originalTeam: TeamBlob | null
  owner: TeamBlob | null
  record: TeamRecord | null
  ownerRecord?: TeamRecord | null
}

export interface Prospect {
  playerId: number
  name: string
  position: string
  /** A fact: what they play at today. */
  rating: number
  tier: string | null
  /** True expected and ceiling. */
  projection: Projection | null
}

export interface ExpiringPlayer {
  playerId: number
  name: string
  position: string
  rating: number
  team: TeamBlob | null
  /** The GM is not projected to re-sign him. A projection: the decision is made at the
   *  start of the offseason. Older backends send only `cannotKeep`. */
  mayLeave?: boolean
  /** @deprecated the old name for `mayLeave`. */
  cannotKeep: boolean
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
  draftOrder: DraftSlot[]
  /** False until the Floos Bowl is played; the playoff slots keep moving until then. */
  draftOrderFinal: boolean
  /** First slot held by a playoff team (17 in a 32-team league). */
  draftPlayoffSlotsFrom: number | null
  prospects: Prospect[]
  expiring: ExpiringPlayer[]
  moves: MoveRow[]
  /** True while the offseason is past the front office: show `freeAgentPool`, not `expiring`. */
  showPool: boolean
  freeAgentPool: PoolFreeAgent[]
  refetch: () => void
}

/**
 * The front-office desk: the draft order, this season's class, who is out of contract,
 * and every signing, cut and promotion. With trading off the backend sends no trades and
 * no trading block, and this page shows neither.
 *
 * The draft class comes from its own endpoint, `/api/draft/class`, with each
 * prospect's true expected and ceiling.
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
  const [draftOrder, setDraftOrder] = useState<DraftSlot[]>([])
  // Missing from an older backend: read as final so no caveat is shown on a guess.
  const [draftOrderFinal, setDraftOrderFinal] = useState(true)
  const [draftPlayoffSlotsFrom, setDraftPlayoffSlotsFrom] = useState<number | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [expiring, setExpiring] = useState<ExpiringPlayer[]>([])
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
        setDraftOrder(d.draftOrder ?? [])
        setDraftOrderFinal(d.draftOrderFinal !== false)
        setDraftPlayoffSlotsFrom(d.draftPlayoffSlotsFrom ?? null)
        setExpiring(d.expiring ?? [])
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
    loading, error, season, week,
    draftOrder, draftOrderFinal, draftPlayoffSlotsFrom, prospects, expiring, moves,
    showPool, freeAgentPool,
    refetch: fetchAll,
  }
}
