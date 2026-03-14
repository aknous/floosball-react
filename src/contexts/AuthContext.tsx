import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface AuthUser {
  id: number
  email: string
  username: string | null
  favoriteTeamId: number | null
  pendingFavoriteTeamId: number | null
  favoriteTeamLockedSeason: number | null
  floobits: number
  hasCompletedOnboarding: boolean
  emailOptOut: boolean
}

export interface FantasyRosterPlayer {
  slot: string
  playerId: number
  playerName: string
  position: string
  teamId: number | null
  teamName: string
  teamAbbr: string
  teamColor: string
  ratingStars: number
  pointsAtLock: number
  seasonFantasyPoints: number
  currentFantasyPoints: number
  earnedPoints: number
}

export interface FantasyRosterData {
  id: number
  season: number
  isLocked: boolean
  lockedAt: string | null
  totalPoints: number
  cardBonusPoints: number
  swapsAvailable: number
  purchasedSwaps: number
  players: FantasyRosterPlayer[]
}

interface AuthContextType {
  user: AuthUser | null
  getToken: () => Promise<string | null>
  loading: boolean
  betaBlocked: boolean
  fantasyPlayerIds: Set<number>
  fantasyRoster: FantasyRosterData | null
  logout: () => void
  setFavoriteTeam: (teamId: number) => Promise<void>
  refetchRoster: () => Promise<void>
  refetchUser: () => Promise<void>
  updateFloobits: (balance: number) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken, signOut } = useClerkAuth()
  const [appUser, setAppUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [betaBlocked, setBetaBlocked] = useState(false)
  const [fantasyRoster, setFantasyRoster] = useState<FantasyRosterData | null>(null)

  // Wrap Clerk's getToken so consumers get null when not signed in
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null
    return await getToken()
  }, [isSignedIn, getToken])

  // Derive fantasyPlayerIds from roster data
  const fantasyPlayerIds = React.useMemo(() => {
    if (!fantasyRoster?.players) return new Set<number>()
    return new Set(fantasyRoster.players.map(p => p.playerId))
  }, [fantasyRoster])

  // Fetch fantasy roster from REST (no polling — called once + on events)
  const refetchRoster = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/fantasy/roster`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      const roster = json?.data?.roster || json?.roster
      setFantasyRoster(roster ?? null)
    } catch {
      // silent
    }
  }, [getToken])

  const refetchUser = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        setBetaBlocked(false)
        setAppUser(await res.json())
      } else if (res.status === 403) {
        setBetaBlocked(true)
      }
    } catch {
      // silent
    }
  }, [getToken])

  // When Clerk auth state changes, fetch/create local user profile + roster
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setAppUser(null)
      setFantasyRoster(null)
      setLoading(false)
      return
    }
    refetchUser().finally(() => setLoading(false))
    refetchRoster()
  }, [isSignedIn, isLoaded, refetchUser, refetchRoster])

  const logout = useCallback(() => {
    signOut()
    setAppUser(null)
    setFantasyRoster(null)
  }, [signOut])

  const updateFloobits = useCallback((balance: number) => {
    setAppUser(prev => prev ? { ...prev, floobits: balance } : prev)
  }, [])

  const setFavoriteTeam = useCallback(async (teamId: number) => {
    const tok = await getToken()
    if (!tok) return
    const res = await fetch(`${API_BASE}/user/favorite-team`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tok}`,
      },
      body: JSON.stringify({ teamId }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.isPending) {
        setAppUser(prev => prev ? { ...prev, pendingFavoriteTeamId: data.pendingFavoriteTeamId } : prev)
      } else {
        setAppUser(prev => prev ? {
          ...prev,
          favoriteTeamId: teamId,
          pendingFavoriteTeamId: null,
          favoriteTeamLockedSeason: data.favoriteTeamLockedSeason ?? prev.favoriteTeamLockedSeason,
        } : prev)
      }
    }
  }, [getToken])

  return (
    <AuthContext.Provider value={{
      user: appUser, getToken: getFreshToken, loading, betaBlocked, fantasyPlayerIds,
      fantasyRoster, logout, setFavoriteTeam, refetchRoster, refetchUser, updateFloobits,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
