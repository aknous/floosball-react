import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface AuthUser {
  id: number
  email: string
  username: string | null
  favoriteTeamId: number | null
  pendingFavoriteTeamId: number | null
  favoriteTeamLockedSeason: number | null
  /** False once week 1 has kicked off: a switch is then booked for next season. */
  canChangeFavoriteTeam?: boolean
  /** True while the username is still the one auto-assigned at signup. */
  usernameIsGenerated?: boolean
  floobits: number
  hasCompletedOnboarding: boolean
  emailOptOut: boolean
  emailDayReport: boolean
  emailSeasonReport: boolean
  teamFundingPct: number
  isAdmin: boolean
  autoPickMode: 'off' | 'favorites' | 'underdogs' | 'random'
  /** Loyalty override: the auto-picker never calls against your own club. */
  autoPickNeverAgainstFavorite?: boolean
  followedPlayerIds: number[]
}

interface AuthContextType {
  user: AuthUser | null
  getToken: () => Promise<string | null>
  loading: boolean
  betaBlocked: boolean
  // Player IDs depicted by the user's equipped cards (fusion: the equipped
  // lineup IS the fantasy roster). Drives roster-match highlighting across the
  // app (card equipment, player leaders, highlight feed).
  fantasyPlayerIds: Set<number>
  followedPlayerIds: Set<number>
  // True when any equipped card is locked (games running → lineup frozen).
  fantasyLineupLocked: boolean
  logout: () => void
  setFavoriteTeam: (teamId: number) => Promise<void>
  refetchLineup: () => Promise<void>
  /** Resolves true when the user was loaded (or definitively refused). */
  refetchUser: () => Promise<boolean>
  updateFloobits: (balance: number) => void
  followPlayer: (playerId: number) => Promise<void>
  unfollowPlayer: (playerId: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken, signOut } = useClerkAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const [appUser, setAppUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [betaBlocked, setBetaBlocked] = useState(false)
  const [fantasyPlayerIds, setFantasyPlayerIds] = useState<Set<number>>(new Set())
  const [fantasyLineupLocked, setFantasyLineupLocked] = useState(false)

  // Wrap Clerk's getToken so consumers get null when not signed in
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null
    return await getTokenRef.current()
  }, [isSignedIn])

  // Fetch the equipped lineup (fusion: equipped cards ARE the fantasy roster) and
  // derive the depicted-player set + locked state. No polling — called once + on
  // events. Superseded the deleted /fantasy/roster endpoint.
  const refetchLineup = useCallback(async () => {
    try {
      const tok = await getTokenRef.current()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/equipped`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      const equipped: Array<{ playerId: number; locked?: boolean }> = json?.data?.equippedCards ?? []
      setFantasyPlayerIds(new Set(equipped.map(e => e.playerId).filter((id): id is number => id != null)))
      setFantasyLineupLocked(equipped.some(e => e.locked))
    } catch {
      // silent
    }
  }, [])

  /**
   * Load the app-side user for the current Clerk session.
   *
   * ⚠️ Returns whether it SUCCEEDED. It used to swallow everything and return
   * nothing, which meant the caller could not tell a real "no user" from a failed
   * request — and paired with the one-shot guard below, a single bad response left
   * the app permanently rendering its signed-out state to a signed-in reader. A
   * dead SIGN IN button on the front page is what that looks like from outside:
   * Clerk still has the session, so pressing it does nothing at all.
   */
  const refetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const tok = await getTokenRef.current()
      if (!tok) return false
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        setBetaBlocked(false)
        setAppUser(await res.json())
        return true
      }
      if (res.status === 403) {
        setBetaBlocked(true)
        return true   // a real answer, not a failure to get one
      }
      return false
    } catch {
      return false
    }
  }, [])

  // When Clerk auth state changes, fetch/create local user profile + lineup
  const didFetchRef = useRef(false)
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      didFetchRef.current = false
      setAppUser(null)
      setFantasyPlayerIds(new Set())
      setFantasyLineupLocked(false)
      setBetaBlocked(false)
      setLoading(false)
      return
    }
    if (didFetchRef.current) return
    didFetchRef.current = true
    setLoading(true)

    // ⚠️ RETRY. The guard above fires once per session, so without this a single
    // failed load (a backend restarting under an open tab is the ordinary case)
    // stranded the app until someone reloaded by hand. Backs off, gives up after a
    // handful, and never blocks the first paint.
    let cancelled = false
    const attempt = async (n: number): Promise<void> => {
      const ok = await refetchUser()
      if (ok || cancelled || n >= 4) return
      await new Promise(r => setTimeout(r, Math.min(8000, 700 * 2 ** n)))
      if (!cancelled) return attempt(n + 1)
    }
    attempt(0).finally(() => { if (!cancelled) setLoading(false) })
    refetchLineup()
    return () => { cancelled = true }
  }, [isSignedIn, isLoaded, refetchUser, refetchLineup])

  // Refresh the lineup on card equip/unequip so every consumer (roster-match
  // highlighting, the locked indicator) stays in sync without each wiring its
  // own listener. useLineup.put dispatches 'cards-equipped' after a PUT.
  useEffect(() => {
    if (!isSignedIn) return
    const handler = () => { refetchLineup() }
    window.addEventListener('cards-equipped', handler)
    return () => window.removeEventListener('cards-equipped', handler)
  }, [isSignedIn, refetchLineup])

  const logout = useCallback(() => {
    signOut()
    setAppUser(null)
    setFantasyPlayerIds(new Set())
    setFantasyLineupLocked(false)
  }, [signOut])

  const updateFloobits = useCallback((balance: number) => {
    setAppUser(prev => prev ? { ...prev, floobits: balance } : prev)
  }, [])

  const followedPlayerIds = React.useMemo(() => {
    return new Set<number>(appUser?.followedPlayerIds ?? [])
  }, [appUser?.followedPlayerIds])

  const followPlayer = useCallback(async (playerId: number) => {
    const tok = await getTokenRef.current()
    if (!tok) return
    const res = await fetch(`${API_BASE}/players/${playerId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      setAppUser(prev => prev ? {
        ...prev,
        followedPlayerIds: prev.followedPlayerIds.includes(playerId)
          ? prev.followedPlayerIds
          : [...prev.followedPlayerIds, playerId],
      } : prev)
    }
  }, [])

  const unfollowPlayer = useCallback(async (playerId: number) => {
    const tok = await getTokenRef.current()
    if (!tok) return
    const res = await fetch(`${API_BASE}/players/${playerId}/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      setAppUser(prev => prev ? {
        ...prev,
        followedPlayerIds: prev.followedPlayerIds.filter(id => id !== playerId),
      } : prev)
    }
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
          canChangeFavoriteTeam: data.canChangeNow ?? prev.canChangeFavoriteTeam,
        } : prev)
      }
    }
  }, [getToken])

  return (
    <AuthContext.Provider value={{
      user: appUser, getToken: getFreshToken, loading, betaBlocked, fantasyPlayerIds,
      followedPlayerIds,
      fantasyLineupLocked, logout, setFavoriteTeam, refetchLineup, refetchUser, updateFloobits,
      followPlayer, unfollowPlayer,
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
