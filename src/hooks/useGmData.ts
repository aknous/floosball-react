import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type {
  GmEligibleTargets,
  GmTeamSummary,
  GmUserVotes,
  GmTeamResults,
  GmCastVoteResponse,
  GmFaBallotResponse,
} from '@/types/gm'
import type {
  GmVoteResolvedEvent,
  GmFaWindowOpenEvent,
} from '@/types/websocket'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface GmData {
  // API state
  eligible: GmEligibleTargets | null
  summary: GmTeamSummary | null
  myVotes: GmUserVotes | null
  results: GmTeamResults | null
  // WebSocket state
  faWindowOpen: boolean
  faPool: Array<{ id: number; name: string; position: string; rating: number; tier: string }>
  faWindowEnd: number | null // timestamp ms
  resolvedEvents: GmVoteResolvedEvent[]
  // Loading
  loading: boolean
  voting: string | null // key of in-flight vote button
  // Actions
  castVote: (voteType: string, targetPlayerId?: number | null) => Promise<GmCastVoteResponse | null>
  submitBallot: (rankings: number[]) => Promise<GmFaBallotResponse | null>
  refetch: () => void
}

export function useGmData(teamId: number | null): GmData {
  const { getToken, updateFloobits } = useAuth()
  const { event } = useSeasonWebSocket()

  const [eligible, setEligible] = useState<GmEligibleTargets | null>(null)
  const [summary, setSummary] = useState<GmTeamSummary | null>(null)
  const [myVotes, setMyVotes] = useState<GmUserVotes | null>(null)
  const [results, setResults] = useState<GmTeamResults | null>(null)

  const [faWindowOpen, setFaWindowOpen] = useState(false)
  const [faPool, setFaPool] = useState<GmData['faPool']>([])
  const [faWindowEnd, setFaWindowEnd] = useState<number | null>(null)
  const [resolvedEvents, setResolvedEvents] = useState<GmVoteResolvedEvent[]>([])

  const [loading, setLoading] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)

  const teamIdRef = useRef(teamId)
  teamIdRef.current = teamId

  // ── Fetch all GM data ──
  const fetchAll = useCallback(async () => {
    if (!teamId) return
    const tok = await getToken()
    if (!tok) return
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${tok}` }
      const [eligRes, summRes, votesRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/gm/team/${teamId}/eligible`, { headers }),
        fetch(`${API_BASE}/gm/team/${teamId}/summary`, { headers }),
        fetch(`${API_BASE}/gm/votes`, { headers }),
        fetch(`${API_BASE}/gm/results`, { headers }),
      ])
      if (eligRes.ok) {
        const j = await eligRes.json()
        setEligible(j.data ?? j)
      }
      if (summRes.ok) {
        const j = await summRes.json()
        setSummary(j.data ?? j)
      }
      if (votesRes.ok) {
        const j = await votesRes.json()
        setMyVotes(j.data ?? j)
      }
      if (resultsRes.ok) {
        const j = await resultsRes.json()
        setResults(j.data ?? j)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [teamId, getToken])

  // Fetch on mount / teamId change
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Refetch summary + myVotes after a vote ──
  const refetch = useCallback(async () => {
    if (!teamId) return
    const tok = await getToken()
    if (!tok) return
    const headers = { Authorization: `Bearer ${tok}` }
    const [summRes, votesRes] = await Promise.all([
      fetch(`${API_BASE}/gm/team/${teamId}/summary`, { headers }),
      fetch(`${API_BASE}/gm/votes`, { headers }),
    ])
    if (summRes.ok) {
      const j = await summRes.json()
      setSummary(j.data ?? j)
    }
    if (votesRes.ok) {
      const j = await votesRes.json()
      setMyVotes(j.data ?? j)
    }
  }, [teamId, getToken])

  // ── Cast a vote ──
  const castVote = useCallback(async (voteType: string, targetPlayerId?: number | null): Promise<GmCastVoteResponse | null> => {
    const tok = await getToken()
    if (!tok) return null
    const key = targetPlayerId != null ? `${voteType}:${targetPlayerId}` : voteType
    setVoting(key)
    try {
      const res = await fetch(`${API_BASE}/gm/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ voteType, targetPlayerId: targetPlayerId ?? null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Vote failed' }))
        alert(err.detail || 'Vote failed')
        return null
      }
      const json = await res.json()
      const data: GmCastVoteResponse = json.data ?? json
      // Update balance in auth context
      updateFloobits(data.remainingBalance)
      // Refetch tallies
      await refetch()
      return data
    } catch {
      alert('Vote failed')
      return null
    } finally {
      setVoting(null)
    }
  }, [getToken, updateFloobits, refetch])

  // ── Submit FA ballot ──
  const submitBallot = useCallback(async (rankings: number[]): Promise<GmFaBallotResponse | null> => {
    const tok = await getToken()
    if (!tok) return null
    setVoting('fa_ballot')
    try {
      const res = await fetch(`${API_BASE}/gm/fa-ballot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ rankings }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Ballot submission failed' }))
        alert(err.detail || 'Ballot submission failed')
        return null
      }
      const json = await res.json()
      const data: GmFaBallotResponse = json.data ?? json
      // Update balance
      const balRes = await fetch(`${API_BASE}/currency/balance`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (balRes.ok) {
        const bj = await balRes.json()
        updateFloobits(bj.data?.balance ?? 0)
      }
      return data
    } catch {
      alert('Ballot submission failed')
      return null
    } finally {
      setVoting(null)
    }
  }, [getToken, updateFloobits])

  // ── WebSocket event handling ──
  useEffect(() => {
    if (!event) return
    const e = event as any

    if (e.event === 'gm_vote_resolved') {
      const ev = e as GmVoteResolvedEvent
      if (teamIdRef.current && ev.teamId === teamIdRef.current) {
        setResolvedEvents(prev => [ev, ...prev])
        refetch()
      }
    } else if (e.event === 'gm_fa_window_open') {
      const ev = e as GmFaWindowOpenEvent
      setFaWindowOpen(true)
      setFaPool(ev.faPool)
      setFaWindowEnd(Date.now() + ev.durationSeconds * 1000)
    } else if (e.event === 'gm_fa_window_close') {
      setFaWindowOpen(false)
      setFaPool([])
      setFaWindowEnd(null)
    }
  }, [event, refetch])

  return {
    eligible,
    summary,
    myVotes,
    results,
    faWindowOpen,
    faPool,
    faWindowEnd,
    resolvedEvents,
    loading,
    voting,
    castVote,
    submitBallot,
    refetch,
  }
}
