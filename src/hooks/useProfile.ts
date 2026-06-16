import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface OverallLevel {
  level: number
  title: string
  points: number
  pointsThisLevel: number
  pointsToNext: number
  isMax: boolean
}

export interface ActivityRank {
  activity: string
  rankName: string | null   // e.g. "Oracle II"; null = unranked this season
  tier: number              // 0 = unranked
  maxTier: number
  maxed: boolean
}

export interface Trophy {
  type: 'capstone' | 'secret'
  name: string
  season: number
  key: string
}

export interface Profile {
  userId: number
  username: string | null
  favoriteTeamId: number | null
  isSelf: boolean
  season: number
  overall: OverallLevel
  ranks: ActivityRank[]
  trophies: Trophy[]
}

interface UseProfileResult {
  profile: Profile | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// userId omitted = the signed-in user's own profile.
export function useProfile(userId?: string | number): UseProfileResult {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const tok = await getToken().catch(() => null)
      const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
      const url = userId != null ? `${API_BASE}/profile/${userId}` : `${API_BASE}/profile`
      const res = await fetch(url, { headers, cache: 'reload' })
      if (!res.ok) throw new Error('Failed to load profile')
      const json = await res.json()
      setProfile((json && json.data) ? json.data : json)
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [getToken, userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}
