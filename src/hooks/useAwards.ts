import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface MvpStat { label: string; value: number | string }

export interface MvpCandidate {
  id: number
  name: string
  position: string
  team: string
  teamAbbr: string
  teamColor: string
  teamId: number | null
  ratingStars: number
  seasonPerformanceRating: number
  seasonWpa: number
  fantasyPoints: number
  gamesPlayed: number
  stats: MvpStat[]
}

export interface HofCandidate {
  playerId: number
  name: string | null
  position: string | null
  teamAbbr: string
  teamId: number | null
  teamColor: string
  ratingStars: number
  seasonsRemaining: number
  firstEligibleSeason: number
  points: number
  case: {
    mvps?: number
    championships?: number
    allPros?: number
    seasons?: number
    careerRecords?: number
    seasonRecords?: number
    gameRecords?: number
  }
}

interface UseAwardsResult {
  loading: boolean
  season: number
  mvpOpen: boolean
  hofOpen: boolean
  anyOpen: boolean
  mvpCandidates: MvpCandidate[]
  myMvpVote: number | null
  hofCandidates: HofCandidate[]
  myApprovals: number[]
  classCap: number
  castMvpVote: (playerId: number) => Promise<void>
  toggleHofApproval: (playerId: number) => Promise<void>
  refetch: () => void
}

export function useAwards(): UseAwardsResult {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState(0)
  const [mvpOpen, setMvpOpen] = useState(false)
  const [hofOpen, setHofOpen] = useState(false)
  const [mvpCandidates, setMvpCandidates] = useState<MvpCandidate[]>([])
  const [myMvpVote, setMyMvpVote] = useState<number | null>(null)
  const [hofCandidates, setHofCandidates] = useState<HofCandidate[]>([])
  const [myApprovals, setMyApprovals] = useState<number[]>([])
  const [classCap, setClassCap] = useState(5)
  const fetchId = useRef(0)

  const fetchAll = useCallback(async () => {
    const id = ++fetchId.current
    try {
      const tok = await getToken().catch(() => null)
      const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
      const [mvpRes, hofRes] = await Promise.all([
        fetch(`${API_BASE}/awards/mvp/ballot`, { headers, cache: 'reload' }),
        fetch(`${API_BASE}/awards/hof/ballot`, { headers, cache: 'reload' }),
      ])
      if (id !== fetchId.current) return
      if (mvpRes.ok) {
        const d = (await mvpRes.json()).data
        setSeason(d.season ?? 0)
        setMvpOpen(!!d.windowOpen)
        setMvpCandidates(d.candidates ?? [])
        setMyMvpVote(d.myVote ?? null)
      }
      if (hofRes.ok) {
        const d = (await hofRes.json()).data
        setHofOpen(!!d.windowOpen)
        setHofCandidates(d.candidates ?? [])
        setMyApprovals(d.myApprovals ?? [])
        setClassCap(d.classCap ?? 5)
      }
    } finally {
      if (id === fetchId.current) setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchAll() }, [fetchAll])

  const castMvpVote = useCallback(async (playerId: number) => {
    const tok = await getToken().catch(() => null)
    if (!tok) return
    // Optimistic — reflect the pick immediately.
    setMyMvpVote(playerId)
    const res = await fetch(`${API_BASE}/awards/mvp/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ playerId }),
    })
    if (!res.ok) fetchAll()  // revert to server truth on failure
  }, [getToken, fetchAll])

  const toggleHofApproval = useCallback(async (playerId: number) => {
    const tok = await getToken().catch(() => null)
    if (!tok) return
    const has = myApprovals.includes(playerId)
    setMyApprovals(prev => has ? prev.filter(p => p !== playerId) : [...prev, playerId])
    const res = await fetch(`${API_BASE}/awards/hof/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ playerId }),
    })
    if (!res.ok) fetchAll()
  }, [getToken, myApprovals, fetchAll])

  return {
    loading, season, mvpOpen, hofOpen, anyOpen: mvpOpen || hofOpen,
    mvpCandidates, myMvpVote, hofCandidates, myApprovals, classCap,
    castMvpVote, toggleHofApproval, refetch: fetchAll,
  }
}
