import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ScoringModel } from '@/utils/displayScore'

// The league's active score DISPLAY model, fetched once from /api/rules and shared
// by every score render site (game card, game bar, game modal, news feed). The
// model changes only at a Cores vote resolution (game-day boundaries), so a slow
// poll is plenty (docs/SCORING_MODEL_PLAN.md).

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const POLL_MS = 60_000

const ScoringModelContext = createContext<ScoringModel>('additive')

export const ScoringModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModel] = useState<ScoringModel>('additive')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/rules`, { cache: 'reload' })
        if (!res.ok) return
        const m = (await res.json())?.data?.rules?.scoringModel
        if (!cancelled && (m === 'additive' || m === 'spread' || m === 'subtractive')) setModel(m)
      } catch {
        /* leave the last-known model in place on a transient failure */
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return (
    <ScoringModelContext.Provider value={model}>
      {children}
    </ScoringModelContext.Provider>
  )
}

export function useScoringModel(): ScoringModel {
  return useContext(ScoringModelContext)
}
