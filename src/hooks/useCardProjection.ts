import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export type ProjectionTier = 'strong' | 'good' | 'moderate' | 'variable' | 'nullified'

export interface EquippedCardProjection {
  slotNumber: number
  effectName: string
  displayName: string
  projectedFP: number
  projectedFloobits: number
  projectedMult: number
  isMatch: boolean
  tier: ProjectionTier
  equation: string
  outputType: 'fp' | 'mult' | 'floobits'
}

export interface EquippedProjections {
  cards: EquippedCardProjection[]
  totalBonusFP: number
  totalFloobits: number
  multFactors: number[]
  projectedRosterFP: number
  projectedTotalFP: number
  opponent: string
  winProbability: number
}

export interface CandidateProjection {
  userCardId: number
  effectName: string
  displayName: string
  projectedFP: number
  projectedFloobits: number
  projectedMult: number
  isMatch: boolean
  tier: ProjectionTier
  outputType: 'fp' | 'mult' | 'floobits'
  equation: string
}

interface UseCardProjectionResult {
  equipped: EquippedProjections | null
  candidates: CandidateProjection[]
  candidatesByUserCardId: Map<number, CandidateProjection>
  loading: boolean
  refetch: () => void
}

/**
 * Fetches per-card payout projections for the current user for the upcoming
 * week. When includeCandidates is true the payload also carries solo
 * projections for every card in the user's collection — used to power the
 * effectiveness chips in the card picker modal.
 */
export function useCardProjection(includeCandidates: boolean = false): UseCardProjectionResult {
  const { getToken } = useAuth()
  const [equipped, setEquipped] = useState<EquippedProjections | null>(null)
  const [candidates, setCandidates] = useState<CandidateProjection[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(0)

  const refetch = useCallback(() => setToken(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const tok = await getToken()
        if (!tok) {
          setLoading(false)
          return
        }
        const url = `${API_BASE}/fantasy/card-projection${includeCandidates ? '?include_candidates=true' : ''}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const json = await res.json().catch(() => null)
        if (cancelled) return
        if (json?.success && json.data) {
          setEquipped(json.data.equipped ?? null)
          setCandidates(json.data.candidates ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getToken, includeCandidates, token])

  const candidatesByUserCardId = new Map<number, CandidateProjection>()
  for (const c of candidates) candidatesByUserCardId.set(c.userCardId, c)

  return { equipped, candidates, candidatesByUserCardId, loading, refetch }
}

/**
 * Tier display config — shared across all surfaces so colors stay
 * consistent between Fantasy breakdown, equipped slots, and the
 * picker modal.
 */
export const TIER_STYLES: Record<ProjectionTier, { label: string; color: string; bg: string; short: string }> = {
  strong:    { label: 'Strong',    short: '++', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  good:      { label: 'Good',      short: '+',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  moderate:  { label: 'Moderate',  short: '=',  color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
  variable:  { label: 'Variable',  short: '?',  color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  nullified: { label: 'No effect', short: '×',  color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
}
