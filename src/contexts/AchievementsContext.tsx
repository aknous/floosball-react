import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type {
  Achievement,
  AchievementUnlockedEvent,
  PendingReward,
} from '@/types/achievements'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface AchievementsContextValue {
  achievements: Achievement[]
  pendingRewards: PendingReward[]
  unclaimedCount: number
  currentSeason: number
  currentWeek: number
  loading: boolean
  refetch: () => Promise<void>
  claimReward: (rewardId: number) => Promise<{ kind: string; packName?: string; cards?: any[] } | null>
  deferReward: (rewardId: number) => Promise<void>
  // Unlock toast queue
  latestUnlock: AchievementUnlockedEvent | null
  dismissUnlock: () => void
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null)

export const AchievementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, user, updateFloobits } = useAuth()
  const { subscribe } = useSeasonWebSocket()

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([])
  const [unclaimedCount, setUnclaimedCount] = useState(0)
  const [currentSeason, setCurrentSeason] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [loading, setLoading] = useState(false)
  const [unlockQueue, setUnlockQueue] = useState<AchievementUnlockedEvent[]>([])
  const hasLoadedOnce = useRef(false)

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const tok = await getToken()
    return tok ? { Authorization: `Bearer ${tok}` } : {}
  }, [getToken])

  const fetchAchievements = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers.Authorization) return
    const resp = await fetch(`${API_BASE}/achievements`, { headers })
    if (!resp.ok) return
    const json = await resp.json()
    const data = json.data ?? json
    setAchievements(data.achievements ?? [])
    setUnclaimedCount(data.unclaimedRewards ?? 0)
    setCurrentSeason(data.season ?? 0)
  }, [authHeaders])

  const fetchPendingRewards = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers.Authorization) return
    const resp = await fetch(`${API_BASE}/achievements/pending-rewards`, { headers })
    if (!resp.ok) return
    const json = await resp.json()
    const data = json.data ?? json
    setPendingRewards(data.rewards ?? [])
    if (typeof data.currentWeek === 'number') setCurrentWeek(data.currentWeek)
    if (typeof data.season === 'number') setCurrentSeason(data.season)
  }, [authHeaders])

  const fetchBalance = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers.Authorization) return
    const resp = await fetch(`${API_BASE}/currency/balance`, { headers })
    if (!resp.ok) return
    const json = await resp.json()
    const data = json.data ?? json
    if (typeof data.balance === 'number') updateFloobits(data.balance)
  }, [authHeaders, updateFloobits])

  const refetch = useCallback(async () => {
    await Promise.all([fetchAchievements(), fetchPendingRewards(), fetchBalance()])
  }, [fetchAchievements, fetchPendingRewards, fetchBalance])

  // Initial load + reload whenever user changes
  useEffect(() => {
    if (!user?.id) {
      setAchievements([])
      setPendingRewards([])
      setUnclaimedCount(0)
      hasLoadedOnce.current = false
      return
    }
    if (hasLoadedOnce.current) return
    hasLoadedOnce.current = true
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [user?.id, refetch])

  // Listen for achievement_unlocked events via the per-message subscriber.
  // Using subscribe (not the shared `event` state) ensures that rapid back-to-back
  // unlocks never get dropped by React's state batching — each message fires the
  // handler exactly once.
  useEffect(() => {
    return subscribe((msg) => {
      if ((msg as any)?.event !== 'achievement_unlocked') return
      const unlock = msg as unknown as AchievementUnlockedEvent
      setUnlockQueue(q => [...q, unlock])
      refetch()
    })
  }, [subscribe, refetch])

  const claimReward = useCallback(async (rewardId: number) => {
    const auth = await authHeaders()
    if (!auth.Authorization) throw new Error('Not signed in')
    const headers: Record<string, string> = { ...auth, 'Content-Type': 'application/json' }
    const resp = await fetch(`${API_BASE}/achievements/claim-reward/${rewardId}`, {
      method: 'POST',
      headers,
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => null)
      throw new Error(err?.detail || 'Failed to claim reward')
    }
    const json = await resp.json()
    await refetch()
    return (json.data ?? json) || null
  }, [authHeaders, refetch])

  const deferReward = useCallback(async (rewardId: number) => {
    const auth = await authHeaders()
    if (!auth.Authorization) throw new Error('Not signed in')
    const headers: Record<string, string> = { ...auth, 'Content-Type': 'application/json' }
    const resp = await fetch(`${API_BASE}/achievements/reward/${rewardId}/defer`, {
      method: 'POST',
      headers,
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => null)
      throw new Error(err?.detail || 'Failed to defer reward')
    }
    await refetch()
  }, [authHeaders, refetch])

  const latestUnlock = unlockQueue[0] ?? null
  const dismissUnlock = useCallback(() => {
    setUnlockQueue(q => q.slice(1))
  }, [])

  return (
    <AchievementsContext.Provider value={{
      achievements, pendingRewards, unclaimedCount, currentSeason, currentWeek,
      loading, refetch, claimReward, deferReward,
      latestUnlock, dismissUnlock,
    }}>
      {children}
    </AchievementsContext.Provider>
  )
}

export const useAchievements = () => {
  const ctx = useContext(AchievementsContext)
  if (!ctx) throw new Error('useAchievements must be used within AchievementsProvider')
  return ctx
}
