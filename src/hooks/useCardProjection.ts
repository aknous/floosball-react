import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export type ProjectionTier = 'strong' | 'good' | 'moderate' | 'variable' | 'nullified'
export type ProjectionCertainty = 'exact' | 'estimated' | 'contingent'

export interface ProjectionRange {
  min: number
  max: number
  triggerChance: number | null
  outputType: 'fp' | 'mult' | 'floobits'
  // How the range was derived — drives tooltip wording.
  source?: 'chance' | 'random_roll' | 'stats_estimate'
}

export interface ProjectionOdds {
  probability: number         // 0-1 chance of the upside path hitting
  ifHitsFP: number
  ifHitsFloobits: number
  ifHitsMult: number
  outputType: 'fp' | 'mult' | 'floobits'
}

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
  range?: ProjectionRange | null
  odds?: ProjectionOdds | null
  certainty?: ProjectionCertainty
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
  range?: ProjectionRange | null
  odds?: ProjectionOdds | null
  certainty?: ProjectionCertainty
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
  strong:    { label: 'Strong',        short: '++', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  good:      { label: 'Good',          short: '+',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  moderate:  { label: 'Light',         short: '=',  color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
  variable:  { label: 'Might trigger', short: '?',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  nullified: { label: "Won't trigger", short: '×',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

/**
 * Shared formatter for projection output — produces a concise label like
 * "+3.5 FP", "×1.40", "+25F". Handles the three output types uniformly.
 * For zero-output cards the number is still rendered ("×1.00", "+0.0 FP")
 * so deterministic baselines (Vagabond with 0 swaps, Opulence with no
 * floobits) read as concrete state instead of "???".
 */
export function formatProjectionOutput(proj: {
  projectedFP: number
  projectedFloobits: number
  projectedMult: number
  outputType: 'fp' | 'mult' | 'floobits'
}): string {
  if (proj.outputType === 'mult') {
    const m = proj.projectedMult > 0 ? proj.projectedMult : 1
    return `×${m.toFixed(2)}`
  }
  if (proj.outputType === 'floobits') {
    return `+${Math.max(0, proj.projectedFloobits)}F`
  }
  return `${proj.projectedFP > 0 ? '+' : ''}${proj.projectedFP.toFixed(1)} FP`
}

/**
 * Format a range as a compact "+min to +max FP" label. Used by cards
 * that produce genuine output variance (RNG rolls, chance cards with
 * base/enhanced split, stat-estimated FP bands).
 */
export function formatRangeLabel(range: ProjectionRange): string {
  if (range.outputType === 'mult') {
    return `×${range.min.toFixed(2)}–${range.max.toFixed(2)}`
  }
  if (range.outputType === 'floobits') {
    return `+${Math.round(range.min)}–${Math.round(range.max)}F`
  }
  return `+${range.min.toFixed(1)} to +${range.max.toFixed(1)} FP`
}

/**
 * Tooltip hint describing why a range exists. Omitted for cards without
 * a range (single deterministic value).
 */
export function rangeSourceHint(range: ProjectionRange): string {
  switch (range.source) {
    case 'random_roll':    return 'Random roll between these bounds'
    case 'chance':         return 'Base value + chance to upgrade'
    case 'stats_estimate': return 'Estimate from season averages (±25%)'
    default:               return ''
  }
}

/**
 * Formats an odds payload for display: "40% · +12 FP" — probability of
 * the upside path plus what the card outputs if it hits. More concrete
 * than a generic "might trigger" badge.
 */
export function formatProjectionOdds(odds: ProjectionOdds): string {
  const pct = Math.round(odds.probability * 100)
  let ifHits: string
  if (odds.outputType === 'mult' && odds.ifHitsMult > 1) {
    ifHits = `×${odds.ifHitsMult.toFixed(2)}`
  } else if (odds.outputType === 'floobits' && odds.ifHitsFloobits > 0) {
    ifHits = `+${odds.ifHitsFloobits}F`
  } else {
    ifHits = `${odds.ifHitsFP > 0 ? '+' : ''}${odds.ifHitsFP.toFixed(1)} FP`
  }
  return `${pct}% · ${ifHits}`
}

/**
 * Formats a projection range for display. Returns a compact "a–b" with
 * trigger chance when relevant. Only defined for cards where a range
 * actually exists (chance cards with distinct base / enhanced values).
 */
export function formatProjectionRange(range: ProjectionRange): string {
  const unit = range.outputType === 'mult' ? '×' : range.outputType === 'floobits' ? 'F' : ' FP'
  const fmt = (v: number) => (range.outputType === 'mult' ? v.toFixed(2) : v.toFixed(1))
  const prefix = range.outputType === 'mult' ? '' : (range.min >= 0 ? '+' : '')
  const base = `${prefix}${fmt(range.min)}–${fmt(range.max)}${unit}`
  if (range.triggerChance != null) {
    return `${base} · ${Math.round(range.triggerChance * 100)}% trigger`
  }
  return base
}
