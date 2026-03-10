import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface SnapshotPlayer {
  slot: string
  playerId: number
  playerName: string
  position: string
  teamAbbr: string
  earnedPoints: number
  weekFP: number
}

export interface CardBreakdownEntry {
  slotNumber: number
  playerName: string
  edition: string
  effectName: string
  displayName: string
  detail: string
  category: string
  outputType: string
  primaryFP: number
  primaryMult: number
  primaryXMult: number
  primaryFloobits: number
  preMatchFP: number
  preMatchFloobits: number
  preMatchMult: number
  preMatchXMult: number
  matchMultiplied: boolean
  matchMultiplier: number
  conditionalBonus: number
  conditionalLabel: string | null
  secondaryFP: number
  secondaryFloobits: number
  secondaryMult: number
  secondaryXMult: number
  totalFP: number
  floobitsEarned: number
  playerStatLine: string
  equation: string
}

export interface EquationSummary {
  weekRawFP: number
  totalBonusFP: number
  totalMultBonus: number
  xMultFactors: number[]
}

export interface ModifierInfo {
  name: string
  displayName: string
  description: string
}

export interface SnapshotEntry {
  rank: number
  userId: number
  username: string
  seasonEarnedFP: number
  seasonCardBonus: number
  seasonTotal: number
  weekPlayerFP: number
  weekCardBonus: number
  weekTotal: number
  lockedAt: string | null
  players: SnapshotPlayer[]
  cardBreakdowns: CardBreakdownEntry[]
  equationSummary?: EquationSummary
}

interface SnapshotData {
  season: number | null
  week: number
  gamesActive: boolean
  entries: SnapshotEntry[]
  modifier: ModifierInfo | null
}

interface UseFantasySnapshotResult {
  entries: SnapshotEntry[]
  myEntry: SnapshotEntry | undefined
  season: number | null
  week: number
  gamesActive: boolean
  modifier: ModifierInfo | null
  loading: boolean
}

/**
 * Fetches the fantasy snapshot from REST and keeps it updated via WS events.
 *
 * - On mount: fetches GET /api/fantasy/snapshot
 * - On leaderboard_update WS: converts legacy leaderboard format to snapshot entries
 * - On game_end / week_end / season_end / week_start: re-fetches from REST
 */
export function useFantasySnapshot(userId?: number): UseFantasySnapshotResult {
  const [entries, setEntries] = useState<SnapshotEntry[]>([])
  const [season, setSeason] = useState<number | null>(null)
  const [week, setWeek] = useState(0)
  const [gamesActive, setGamesActive] = useState(false)
  const [modifier, setModifier] = useState<ModifierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const hasLoadedOnce = useRef(false)
  const fetchIdRef = useRef(0)

  const fetchSnapshot = useCallback(async () => {
    const isInitial = !hasLoadedOnce.current
    const fetchId = ++fetchIdRef.current
    try {
      if (isInitial) setLoading(true)
      const resp = await fetch(`${API_BASE}/fantasy/snapshot`)
      const json = await resp.json()
      // Discard stale responses — only apply the most recent fetch
      if (fetchId !== fetchIdRef.current) return
      const data: SnapshotData = json.data ?? json
      setEntries(data.entries ?? [])
      setSeason(data.season ?? null)
      setWeek(data.week ?? 0)
      setGamesActive(data.gamesActive ?? false)
      setModifier(data.modifier ?? null)
      hasLoadedOnce.current = true
    } catch (err) {
      console.error('Error fetching fantasy snapshot:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSnapshot()
  }, [fetchSnapshot])

  // WS-driven updates
  useEffect(() => {
    if (!event) return

    // On week_start: immediately clear previous week's card data, then re-fetch
    if (event.event === 'week_start') {
      const wsWeek = (event as any).weekNumber
      if (wsWeek != null) setWeek(wsWeek)
      setEntries(prev => prev.map(e => ({
        ...e,
        weekPlayerFP: 0,
        weekCardBonus: 0,
        weekTotal: 0,
        cardBreakdowns: [],
        equationSummary: undefined,
        players: e.players.map(p => ({ ...p, weekFP: 0 })),
      })))
      setGamesActive(false)
      fetchSnapshot()
      return
    }

    // Re-fetch on other milestone events
    if (
      event.event === 'game_end' ||
      event.event === 'week_end' ||
      event.event === 'season_end'
    ) {
      fetchSnapshot()
      return
    }

    // Live update from leaderboard_update WS event
    if (event.event === 'leaderboard_update') {
      const lb = (event as any).leaderboard
      const wsSeason = (event as any).season
      if (!Array.isArray(lb)) return

      if (wsSeason != null) setSeason(wsSeason)

      const converted: SnapshotEntry[] = lb.map((e: any) => ({
        rank: e.rank ?? 0,
        userId: e.userId,
        username: e.username,
        seasonEarnedFP: e.rawPoints ?? 0,
        seasonCardBonus: e.cardBonusPoints ?? 0,
        seasonTotal: e.totalPoints ?? 0,
        weekPlayerFP: e.weekPlayerFP ?? 0,
        weekCardBonus: e.weekCardBonus ?? 0,
        weekTotal: Math.round(((e.weekPlayerFP ?? 0) + (e.weekCardBonus ?? 0)) * 10) / 10,
        lockedAt: e.lockedAt ?? null,
        players: (e.players ?? []).map((p: any) => ({
          slot: p.slot,
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position,
          teamAbbr: p.teamAbbr,
          earnedPoints: p.earnedPoints ?? 0,
          weekFP: p.weekFP ?? 0,
        })),
        cardBreakdowns: (e.cardBreakdowns ?? []).map((cb: any) => ({
          slotNumber: cb.slotNumber ?? 0,
          playerName: cb.playerName ?? '',
          edition: cb.edition ?? 'base',
          effectName: cb.effectName ?? '',
          displayName: cb.displayName ?? '',
          detail: cb.detail ?? '',
          category: cb.category ?? '',
          outputType: cb.outputType ?? 'fp',
          primaryFP: cb.primaryFP ?? 0,
          primaryMult: cb.primaryMult ?? 0,
          primaryXMult: cb.primaryXMult ?? 0,
          primaryFloobits: cb.primaryFloobits ?? 0,
          preMatchFP: cb.preMatchFP ?? 0,
          preMatchFloobits: cb.preMatchFloobits ?? 0,
          preMatchMult: cb.preMatchMult ?? 0,
          preMatchXMult: cb.preMatchXMult ?? 0,
          matchMultiplied: cb.matchMultiplied ?? false,
          matchMultiplier: cb.matchMultiplier ?? 1.5,
          conditionalBonus: cb.conditionalBonus ?? 0,
          conditionalLabel: cb.conditionalLabel ?? null,
          secondaryFP: cb.secondaryFP ?? 0,
          secondaryFloobits: cb.secondaryFloobits ?? 0,
          secondaryMult: cb.secondaryMult ?? 0,
          secondaryXMult: cb.secondaryXMult ?? 0,
          totalFP: cb.totalFP ?? 0,
          floobitsEarned: cb.floobitsEarned ?? 0,
          playerStatLine: cb.playerStatLine ?? '',
          equation: cb.equation ?? '',
        })),
        equationSummary: e.equationSummary ?? undefined,
      }))

      setEntries(converted)
      setGamesActive(true)
      setLoading(false)
    }
  }, [event, fetchSnapshot])

  const myEntry = userId != null ? entries.find(e => e.userId === userId) : undefined

  return { entries, myEntry, season, week, gamesActive, modifier, loading }
}
