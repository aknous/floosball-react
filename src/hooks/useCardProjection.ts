import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface AmplifierStatus {
  description: string   // e.g. "Boosts chance cards +25%" / "No effect — no chance cards equipped"
  active: boolean       // whether the required companion cards are present
}

export interface CardProjection {
  slotNumber: number
  effectName: string
  displayName: string
  kind: 'output' | 'amplifier'
  outputType: 'fp' | 'mult' | 'floobits'
  projectedFP: number
  projectedFloobits: number
  projectedMult: number
  // Realistic ceiling — the output on a hot week (inflated stats,
  // chance cards triggering, team winning). When this diverges from
  // the expected value the pill shows "est. X · up to Y" so the
  // upside is visible for scaling cards (Odometer, Avalanche, etc.).
  bestCaseFP: number
  bestCaseFloobits: number
  bestCaseMult: number
  isMatch: boolean
  amplifier: AmplifierStatus | null
  estimated: boolean
}

export interface CandidateProjection extends CardProjection {
  userCardId: number
  replacesSlot?: number
  replacesEffect?: string
}

export interface EquippedProjections {
  cards: CardProjection[]
  totalBonusFP: number
  totalFloobits: number
  multFactors: number[]
  projectedRosterFP: number
  projectedTotalFP: number
  bestCaseTotalFP: number
  opponent: string
  winProbability: number
}

interface UseCardProjectionResult {
  equipped: EquippedProjections | null
  candidates: CandidateProjection[]
  candidatesByUserCardId: Map<number, CandidateProjection>
  loading: boolean
  refetch: () => void
}

export function useCardProjection(
  includeCandidates: boolean = false,
  replaceSlot: number | null = null,
): UseCardProjectionResult {
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
        if (!tok) { setLoading(false); return }
        const params = new URLSearchParams()
        if (includeCandidates) params.set('include_candidates', 'true')
        if (replaceSlot != null) params.set('replace_slot', String(replaceSlot))
        const qs = params.toString()
        const url = `${API_BASE}/fantasy/card-projection${qs ? `?${qs}` : ''}`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
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
  }, [getToken, includeCandidates, replaceSlot, token])

  const candidatesByUserCardId = new Map<number, CandidateProjection>()
  for (const c of candidates) candidatesByUserCardId.set(c.userCardId, c)
  return { equipped, candidates, candidatesByUserCardId, loading, refetch }
}


/**
 * Render-ready description of what a projection pill should show.
 *   label    — the primary pill text (expected value / tier status)
 *   ceiling  — optional secondary label shown below the pill when the
 *              card has meaningful upside ("up to +Y FP"). Kept out of
 *              the pill body so the primary pill width stays consistent.
 *   color    — foreground text / icon color
 *   bg       — pill background color
 */
export interface PillStyle {
  label: string
  ceiling?: string
  color: string
  bg: string
}

// Output-type colors. Pill color communicates the kind of output the
// card produces rather than how "strong" the number is — green for FP,
// pink for FPx, gold for Floobits. Red is reserved for genuinely dead
// projections (no output and nothing to amplify).
const FP_COLOR       = { color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  }
const FPX_COLOR      = { color: '#ec4899', bg: 'rgba(236,72,153,0.15)' }
const FLOOBITS_COLOR = { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' }
const AMPLIFIER_COLOR = { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' }
const DEAD_COLOR     = { color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  }


/**
 * Derives a pill label + color from a projection.
 *   Output cards → value formatted + color of the output type
 *   Amplifier active → descriptive status in amplifier purple
 *   Amplifier inactive → descriptive status in red (dead effect)
 *   Output card with zero projected output → red (dead)
 */
export function projectionPillStyle(proj: CardProjection): PillStyle {
  if (proj.kind === 'amplifier' && proj.amplifier) {
    const c = proj.amplifier.active ? AMPLIFIER_COLOR : DEAD_COLOR
    return { label: proj.amplifier.description, color: c.color, bg: c.bg }
  }

  const hasOutput = (
    proj.projectedFP > 0.05
    || proj.projectedFloobits > 0
    || proj.projectedMult > 1.0
  )
  const { primary, ceiling } = formatOutput(proj)
  const label = proj.estimated && hasOutput ? `est. ${primary}` : primary
  if (!hasOutput) {
    return { label: primary, color: DEAD_COLOR.color, bg: DEAD_COLOR.bg }
  }
  const c =
    proj.outputType === 'mult'     ? FPX_COLOR :
    proj.outputType === 'floobits' ? FLOOBITS_COLOR :
                                     FP_COLOR
  return { label, ceiling, color: c.color, bg: c.bg }
}


function formatOutput(proj: CardProjection): { primary: string; ceiling?: string } {
  if (proj.outputType === 'mult') {
    const m = proj.projectedMult > 0 ? proj.projectedMult : 1
    const ceil = proj.bestCaseMult > 0 ? proj.bestCaseMult : m
    const out: { primary: string; ceiling?: string } = { primary: `×${m.toFixed(2)}` }
    if (ceil - m >= 0.05) out.ceiling = `up to ×${ceil.toFixed(2)}`
    return out
  }
  if (proj.outputType === 'floobits') {
    const v = Math.max(0, proj.projectedFloobits)
    const ceil = Math.max(v, proj.bestCaseFloobits)
    const out: { primary: string; ceiling?: string } = { primary: `+${v}F` }
    if (ceil - v >= 1) out.ceiling = `up to +${ceil}F`
    return out
  }
  const v = proj.projectedFP
  const ceil = Math.max(v, proj.bestCaseFP)
  const out: { primary: string; ceiling?: string } = {
    primary: `${v > 0 ? '+' : ''}${v.toFixed(1)} FP`,
  }
  if (ceil - v >= 0.5) out.ceiling = `up to +${ceil.toFixed(1)} FP`
  return out
}
