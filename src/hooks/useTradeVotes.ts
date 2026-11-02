import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface VoteTeam {
  id: number
  name: string
  abbr: string
  color: string | null
}

export interface VoteAsset {
  kind: 'player' | 'prospect' | 'pick'
  id: number | null
  name: string
  detail?: string
  rating?: number
  originalTeam?: { id: number; name: string } | null
}

export interface TeamTally {
  /** Active fans: signed in within the last two weeks, or voted on this trade. */
  fans: number
  need: number
  yes: number
  no: number
}

export interface TradeProposal {
  id: number
  season: number
  week: number
  phase: 'in_season' | 'offseason' | 'post_fa'
  status: 'open' | 'approved' | 'rejected' | 'failed'
  closeKind: 'deadline' | 'rookie_draft' | 'season_start'
  closesAt: string | null
  resolvedAt: string | null
  teamA: VoteTeam | null
  teamB: VoteTeam | null
  aGave: VoteAsset[]
  bGave: VoteAsset[]
  sellerWhy: string | null
  buyerWhy: string | null
  tally: {
    yes: number
    no: number
    passing: boolean
    reason: 'no_votes' | 'league_no' | 'team_veto' | 'team_quorum' | null
    teamA: TeamTally
    teamB: TeamTally
  }
  note: string | null
  myVote: boolean | null
}

/** Fan approval votes on trades (backend `managers/tradeVotes.py`). */
export function useTradeVotes() {
  const { getToken } = useAuth()
  const { seasonState, lastEvent } = useFloosball()
  const [open, setOpen] = useState<TradeProposal[]>([])
  const [closed, setClosed] = useState<TradeProposal[]>([])
  const [enabled, setEnabled] = useState(false)
  const [voting, setVoting] = useState<number | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const fetchId = useRef(0)

  const refetch = useCallback(async () => {
    const id = ++fetchId.current
    try {
      const tok = await getToken().catch(() => null)
      const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
      // ⚠️ no-store: the body carries the caller's own vote, and a cached copy from
      // before they voted would show the vote undone.
      const res = await fetch(`${API_BASE}/trade-votes`, { headers, cache: 'no-store' })
      if (id !== fetchId.current || !res.ok) return
      const d = (await res.json()).data
      setOpen(d.open ?? [])
      setClosed(d.closed ?? [])
      setEnabled(!!d.enabled)
    } catch {
      // Leave what is on screen; the next refresh tries again.
    }
  }, [getToken])

  // Week and offseason phase changes are when votes open and close.
  useEffect(() => { refetch() }, [refetch, seasonState?.currentWeek, seasonState?.offseasonPhase])

  // New votes announced over the socket show up without a reload.
  useEffect(() => {
    if ((lastEvent as { event?: string } | null)?.event === 'trade_votes_open') refetch()
  }, [lastEvent, refetch])

  // While a vote is open, keep the tally current.
  useEffect(() => {
    if (open.length === 0) return
    const t = setInterval(refetch, 60_000)
    return () => clearInterval(t)
  }, [open.length, refetch])

  const vote = useCallback(async (proposalId: number, approve: boolean | null) => {
    setVoting(proposalId)
    setVoteError(null)
    try {
      const tok = await getToken().catch(() => null)
      if (!tok) {
        setVoteError('Sign in to vote.')
        return
      }
      const res = await fetch(`${API_BASE}/trade-votes/${proposalId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      })
      if (!res.ok) {
        setVoteError(res.status === 409 ? 'This vote has closed.' : 'Your vote did not go through.')
      }
      await refetch()
    } catch {
      setVoteError('Your vote did not go through.')
    } finally {
      setVoting(null)
    }
  }, [getToken, refetch])

  return { open, closed, enabled, vote, voting, voteError, refetch }
}
