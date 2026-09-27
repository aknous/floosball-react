import { useState, useEffect } from 'react'
import { Projection } from '@/Components/Potential'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface TeamProspect {
  playerId: number
  name: string
  position: string
  /** What they play at today. A fact. */
  rating: number
  tier: string | null
  prospectSeasons: number
  /** Windows left before they walk. 0 means this is their last chance. */
  seasonsRemaining: number
  draftSeason: number | null
  isUndrafted: boolean
  ratingHistory: { season: number; rating: number }[]
  /** True expected and ceiling. */
  projection: Projection | null
}

interface UseTeamProspectsResult {
  loading: boolean
  prospects: TeamProspect[]
  developmentWindow: number
  promotionThreshold: number
  slotCapPerPosition: number
}

/** The pipeline behind a team's roster: who is stashed, and how long they have. */
export function useTeamProspects(teamId: number | null | undefined): UseTeamProspectsResult {
  const [loading, setLoading] = useState(true)
  const [prospects, setProspects] = useState<TeamProspect[]>([])
  const [developmentWindow, setDevelopmentWindow] = useState(0)
  const [promotionThreshold, setPromotionThreshold] = useState(0)
  const [slotCapPerPosition, setSlotCapPerPosition] = useState(0)

  useEffect(() => {
    if (!teamId) { setLoading(false); return }
    let live = true
    setLoading(true)
    fetch(`${API_BASE}/teams/${teamId}/prospects`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!live || !j) return
        const d = j.data || {}
        setProspects(d.prospects ?? [])
        setDevelopmentWindow(d.developmentWindow ?? 0)
        setPromotionThreshold(d.promotionThreshold ?? 0)
        setSlotCapPerPosition(d.slotCapPerPosition ?? 0)
      })
      .catch(() => { /* the pipeline block simply does not render */ })
      .finally(() => { if (live) setLoading(false) })
    // ⚠️ Cancel on team change: clicking through the team strip fires these in
    // sequence and a slow earlier response would otherwise land on a later team.
    return () => { live = false }
  }, [teamId])

  return { loading, prospects, developmentWindow, promotionThreshold, slotCapPerPosition }
}
