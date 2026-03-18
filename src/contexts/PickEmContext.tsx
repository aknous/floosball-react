import React, { createContext, useContext } from 'react'
import { usePickEm as usePickEmHook } from '@/hooks/usePickEm'
import type {
  PickEmGame,
  PickEmWeekSummary,
  PickEmLeaderboardEntry,
} from '@/types/pickem'

interface PickEmContextValue {
  picks: Map<number, number>
  results: Map<number, boolean | null>
  games: PickEmGame[]
  weekSummary: PickEmWeekSummary | null
  season: number
  week: number
  seasonLeaderboard: PickEmLeaderboardEntry[]
  weekLeaderboard: PickEmLeaderboardEntry[]
  loading: boolean
  submitPick: (gameIndex: number, teamId: number) => Promise<void>
  refetch: () => void
}

const PickEmContext = createContext<PickEmContextValue | null>(null)

export const PickEmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = usePickEmHook()
  return <PickEmContext.Provider value={value}>{children}</PickEmContext.Provider>
}

export function usePickEm(): PickEmContextValue {
  const ctx = useContext(PickEmContext)
  if (!ctx) throw new Error('usePickEm must be used within a PickEmProvider')
  return ctx
}
