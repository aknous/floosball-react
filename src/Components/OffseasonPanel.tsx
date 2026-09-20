import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { Stars, calcStars, DualStars } from './Stars'
import PlayerHoverCard from './PlayerHoverCard'
import PlayerLink from './PlayerLink'
import HoverTooltip from './HoverTooltip'
import type {
  OffseasonStartEvent,
  OffseasonPickEvent,
  OffseasonCutEvent,
  OffseasonTeamCompleteEvent,
  GmVoteResolvedEvent,
  GmFaWindowOpenEvent,
  GmFaDirectivesEvent,
  GmFaDirectivePlayer,
} from '@/types/websocket'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K']

const ROSTER_SLOTS = [
  { key: 'qb',  label: 'QB' },
  { key: 'rb',  label: 'RB' },
  { key: 'wr1', label: 'WR' },
  { key: 'wr2', label: 'WR' },
  { key: 'te',  label: 'TE' },
  { key: 'k',   label: 'K'  },
] as const

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface FreeAgent {
  id?: number
  name: string
  position: string
  rating: number
  tier: string
  offensiveRating?: number
  defensiveRating?: number
  /** Never played a pro season. New players enter only through the FA pool
   *  now that there is no rookie draft, so the pool is where they surface. */
  isNewcomer?: boolean
}

type TransactionType = 'pick' | 'cut' | 'expired' | 'rookie_pick' | 'rookie_skip' | 'resign' | 'promotion' | 'trade'

interface Transaction {
  type: TransactionType
  teamName: string
  teamAbbr: string
  playerId?: number | null
  playerName: string
  position: string
  rating: number
  tier?: string
  offensiveRating?: number
  defensiveRating?: number
  // Trades only: the other club, and what each side sent.
  counterpartAbbr?: string
  gave?: string
  got?: string
}

interface SetupPlayer {
  id?: number | null
  name: string
  position: string
  rating: number
  tier: string
  reason?: 'gm_vote' | 'expired'
}

interface TeamSetup {
  resigns: SetupPlayer[]
  cuts: SetupPlayer[]
  promotions: SetupPlayer[]
}


interface DraftTeam {
  name: string
  city?: string
  abbr: string
  id?: number
  color?: string
  complete?: boolean
  appeal?: number
  // Draft position. A club holding a traded pick can appear in more than one slot.
  slot?: number
  traded?: boolean
  // The club whose finish put the pick in this slot, when it has been traded away.
  originalTeam?: { id?: number; name: string; abbr: string }
}

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  tier: string
  termRemaining: number
}

type TeamRosterData = Record<string, RosterPlayer | null>

interface RookieEntry {
  id: number
  name: string
  position: string
  rating: number
  tier?: string | null
}

/** Offseason phases where the board is the ROOKIE draft order, so pick trades apply. */
const ROOKIE_ORDER_PHASES = new Set(['post_bowl', 'frontoffice', 'rookie_draft'])

/** A trade belongs to both clubs in it, so it files under either one. */
const involvesTeam = (tx: Transaction, abbr: string): boolean =>
  tx.teamAbbr === abbr || tx.counterpartAbbr === abbr

/** "sends X to ABC for Y". Rows written before trades carried both sides
 *  fall back to the names the old entry held. */
const tradeSummary = (tx: Transaction, withTeam: boolean): string => {
  const lead = withTeam && tx.teamAbbr ? `${tx.teamAbbr} ` : ''
  if (!tx.counterpartAbbr) return `${lead}traded ${tx.playerName}`
  return `${lead}sends ${tx.gave ?? tx.playerName} to ${tx.counterpartAbbr} for ${tx.got ?? 'nothing'}`
}

export const OffseasonPanel: React.FC = () => {
  const { event } = useSeasonWebSocket()
  const { user, getToken } = useAuth()
  const { seasonState } = useFloosball()

  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
  const [draftOrder, setDraftOrder] = useState<DraftTeam[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentTeamAbbr, setCurrentTeamAbbr] = useState<string | null>(null)
  // Which phase of the offseason is actively streaming picks. Set by
  // offseason_predraft_start, fa_draft_order_update.
  // Drives the header label, team-row grouping, and right-panel content.
  const [currentPhase, setCurrentPhase] = useState<'predraft' | 'rookie_draft' | 'free_agency' | null>(null)
  // Rookie draft progress, by BOARD ROW rather than by team: a team holding a traded
  // pick has two rows, so "is this team on the clock" cannot tell them apart.
  // `resolved` = rows already picked or skipped; the row on the clock is the next one.
  const [rookieClass, setRookieClass] = useState<RookieEntry[]>([])
  const [rookieResolved, setRookieResolved] = useState(0)
  const [rookieOnClock, setRookieOnClock] = useState(false)
  const rookieResolvedRef = useRef(0)
  const setResolved = (n: number) => { rookieResolvedRef.current = n; setRookieResolved(n) }
  const [predraftSetups, setPredraftSetups] = useState<Record<string, TeamSetup>>({})
  // Once the user manually expands a team, auto-expand during the predraft
  // roll-through stops taking over — they're reading the UI on their terms.
  const userExpandedRef = useRef<boolean>(false)
  const [completedTeams, setCompletedTeams] = useState<Set<string>>(new Set())
  const [posFilter, setPosFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [rosterCache, setRosterCache] = useState<Record<string, TeamRosterData>>({})
  const [rosterLoading, setRosterLoading] = useState<Set<string>>(new Set())

  // GM state
  const [faWindowOpen, setFaWindowOpen] = useState(false)
  const [faPool, setFaPool] = useState<Array<{ id: number; name: string; position: string; rating: number; tier: string }>>([])
  const [faWindowEnd, setFaWindowEnd] = useState<number | null>(null)
  const [gmResolvedEvents, setGmResolvedEvents] = useState<GmVoteResolvedEvent[]>([])
  const [faDirectives, setFaDirectives] = useState<GmFaDirectivePlayer[]>([])
  const [pickedPlayerNames, setPickedPlayerNames] = useState<Set<string>>(new Set())
  const [rightTab, setRightTab] = useState<'players' | 'directives' | 'transactions'>('players')
  const [tabNotify, setTabNotify] = useState<{ directives: boolean; transactions: boolean }>({ directives: false, transactions: false })
  const [faTimeLeft, setFaTimeLeft] = useState('')
  const [openSlots, setOpenSlots] = useState<{ slot: string; position: string }[]>([])

  // Find favorite team's abbr and color from draft order
  const favoriteTeam = useMemo(() => {
    if (!user?.favoriteTeamId) return null
    const team = draftOrder.find(t => t.id === user.favoriteTeamId)
    return team ? { abbr: team.abbr, color: team.color ?? '#f59e0b' } : null
  }, [user?.favoriteTeamId, draftOrder])
  const favoriteTeamAbbr = favoriteTeam?.abbr ?? null
  const favoriteTeamColor = favoriteTeam?.color ?? '#f59e0b'

  const isFavoriteOnClock = favoriteTeamAbbr != null && currentTeamAbbr === favoriteTeamAbbr

  // Phase-aware header content. Two mutually-exclusive surfaces:
  //   • Waiting phases (post_bowl, frontoffice, pre_fa) → countdown to the
  //     next phase. The current phase is implied by what's coming next, so
  //     we don't double-label it.
  //   • Active phases (fa_draft, training) → static label,
  //     no countdown (the panel content itself shows progress).
  const offseasonPhase = seasonState.offseasonPhase
  const offseasonPhaseTargetTime = seasonState.offseasonPhaseTargetTime
  const [phaseCountdown, setPhaseCountdown] = useState('')

  const [phaseLabel, setPhaseLabel] = useState('')
  useEffect(() => {
    const NEXT_LABEL: Record<string, string> = {
      post_bowl: 'Offseason',
      // The front office holds until draft day, and the rookie draft runs first.
      // Matches the Navbar's labels.
      frontoffice: 'Rookie Draft',
      pre_fa: 'Free Agency',
    }
    const ACTIVE_LABEL: Record<string, string> = {
      rookie_draft: 'Rookie Draft',
      fa_draft: 'Free Agency',
      training: 'Offseason Training',
    }
    // Only set an active label for phases that are actually in-flight
    // (picks streaming, training crunching) — waiting phases use the
    // countdown alone so the header doesn't double up.
    if (offseasonPhase && ACTIVE_LABEL[offseasonPhase] && !offseasonPhaseTargetTime) {
      setPhaseLabel(ACTIVE_LABEL[offseasonPhase])
    } else {
      setPhaseLabel('')
    }
    if (!offseasonPhase || !offseasonPhaseTargetTime) {
      setPhaseCountdown('')
      return
    }
    const next = NEXT_LABEL[offseasonPhase]
    if (!next) { setPhaseCountdown(''); return }
    const tick = () => {
      const diff = new Date(offseasonPhaseTargetTime).getTime() - Date.now()
      if (diff <= 0) { setPhaseCountdown(`${next} starting soon`); return }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      if (hours > 0) setPhaseCountdown(`${next} in ${hours}h ${minutes}m`)
      else if (minutes > 0) setPhaseCountdown(`${next} in ${minutes}m`)
      else setPhaseCountdown(`${next} starting soon`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [offseasonPhase, offseasonPhaseTargetTime])

  // FA window countdown timer
  useEffect(() => {
    if (!faWindowOpen || !faWindowEnd) {
      setFaTimeLeft('')
      return
    }
    const tick = () => {
      const remaining = Math.max(0, faWindowEnd - Date.now())
      if (remaining <= 0) {
        setFaTimeLeft('0:00')
        return
      }
      const hrs = Math.floor(remaining / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      if (hrs > 0) {
        setFaTimeLeft(`${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
      } else {
        setFaTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [faWindowOpen, faWindowEnd])

  // Fetch scouting data when FA window opens
  useEffect(() => {
    if (!faWindowOpen) return
    const fetchScouting = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`${API_BASE}/gm/fa-scouting`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (json.success && json.data) {
          setOpenSlots(json.data.openSlots || [])
        }
      } catch {
        // silent
      }
    }
    fetchScouting()
  }, [faWindowOpen, getToken])

  /**
   * ⚠️ TRADED PICKS, FROM THE TRANSACTIONS DESK. `/api/offseason` serves the rookie order
   * as a list of teams in standings order, which cannot say who OWNS each pick; the draft
   * itself hands a traded slot to its buyer. `/api/transactions` already resolves
   * ownership per original team, so the board takes the owner from there. A backend that
   * resolves it itself sends `traded` on each row, and then this does nothing.
   * ⚠️ Only good until the draft starts: the desk ignores picks once they are spent, so a
   * reload mid-draft falls back to standings order. The live on-the-clock events still
   * name the right team.
   */
  const overlayPickOwnership = async (order: DraftTeam[], headers: Record<string, string>): Promise<DraftTeam[]> => {
    const numbered = order.map((r, i) => ({ ...r, slot: r.slot ?? i + 1 }))
    if (order.some(r => r.traded !== undefined)) return numbered
    try {
      const res = await fetch(`${API_BASE}/transactions`, { headers, cache: 'reload' })
      if (!res.ok) return numbered
      const slots: Array<{ originalTeam: { id: number } | null; owner: { id: number; name: string; abbr: string; color: string | null } | null; traded: boolean }> =
        (await res.json()).data?.draftOrder ?? []
      const ownerByOriginal = new Map<number, { id: number; name: string; abbr: string; color: string | null }>()
      for (const s of slots) {
        if (s.traded && s.originalTeam && s.owner) ownerByOriginal.set(s.originalTeam.id, s.owner)
      }
      return numbered.map(r => {
        const owner = r.id != null ? ownerByOriginal.get(r.id) : undefined
        if (!owner) return r
        const ownerRow = order.find(t => t.id === owner.id)
        return {
          ...r,
          id: owner.id, abbr: owner.abbr, name: ownerRow?.name ?? owner.name,
          city: ownerRow?.city ?? '', color: owner.color ?? ownerRow?.color,
          complete: ownerRow?.complete ?? false,
          traded: true,
          originalTeam: { id: r.id, name: r.name, abbr: r.abbr },
        }
      })
    } catch {
      return numbered
    }
  }

  /**
   * ⚠️ THE OFFSEASON'S OWN TRADE ROWS CARRY ONE SIDE AND NO ABBREVIATION, so they read as
   * "traded S7 R1 pick" filed under no club. The transactions desk has the same trades in
   * full — both teams, both sides — so they are matched up by the seller and what it sent.
   * A backend that records both sides itself sends `counterpartAbbr`, and then this leaves
   * the row alone.
   */
  const fillTradeSides = async (txs: Transaction[], headers: Record<string, string>): Promise<Transaction[]> => {
    if (!txs.some(t => t.type === 'trade' && !t.counterpartAbbr)) return txs
    try {
      const res = await fetch(`${API_BASE}/transactions?limit=200`, { headers, cache: 'reload' })
      if (!res.ok) return txs
      const rows: Array<{
        teamA: { name: string; abbr: string } | null
        teamB: { name: string; abbr: string } | null
        aGave: Array<{ name?: string }>
        bGave: Array<{ name?: string }>
      }> = (await res.json()).data?.trades ?? []
      const names = (list: Array<{ name?: string }>) =>
        list.map(a => a.name).filter(Boolean).join(', ')
      const bySeller = new Map<string, { abbr: string; toAbbr: string; gave: string; got: string }>()
      for (const r of rows) {
        if (!r.teamA || !r.teamB) continue
        bySeller.set(`${r.teamA.name}|${names(r.aGave)}`, {
          abbr: r.teamA.abbr, toAbbr: r.teamB.abbr,
          gave: names(r.aGave) || 'nothing', got: names(r.bGave) || 'nothing',
        })
      }
      return txs.map(t => {
        if (t.type !== 'trade' || t.counterpartAbbr) return t
        const hit = bySeller.get(`${t.teamName}|${t.playerName}`)
        if (!hit) return t
        return { ...t, teamAbbr: t.teamAbbr || hit.abbr, counterpartAbbr: hit.toAbbr,
                 gave: hit.gave, got: hit.got }
      })
    } catch {
      return txs
    }
  }

  const offseasonPhaseForBoard = seasonState?.offseasonPhase ?? null

  // Initial load from REST. Re-runs when the offseason phase moves, so the board
  // picks up the order the new phase uses.
  useEffect(() => {
    const fetchOffseason = async () => {
      try {
        const token = await getToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE}/offseason?t=${Date.now()}`, { headers })
        const data = await res.json()
        setFreeAgents(data.freeAgents || [])
        let order: DraftTeam[] = data.draftOrder || []
        if (order.length > 0 && ROOKIE_ORDER_PHASES.has(offseasonPhaseForBoard ?? '')) {
          order = await overlayPickOwnership(order, headers)
        }
        setDraftOrder(order)
        // Restore completed teams from backend state
        const done = new Set<string>(order.filter(t => t.complete).map(t => t.abbr))
        if (done.size > 0) setCompletedTeams(done)
        if (data.transactions?.length > 0) {
          const txs: Transaction[] = []
          const setupMap: Record<string, TeamSetup> = {}
          for (const entry of data.transactions) {
            if (entry.type === 'team_setup') {
              setupMap[entry.teamAbbr] = {
                resigns: entry.resigns || [],
                cuts: entry.cuts || [],
                promotions: entry.promotions || [],
              }
              for (const p of (entry.cuts || []) as SetupPlayer[]) {
                const txType: TransactionType = p.reason === 'expired' ? 'expired' : 'cut'
                txs.push({ type: txType, teamName: entry.team, teamAbbr: entry.teamAbbr,
                  playerId: p.id, playerName: p.name, position: p.position, rating: p.rating, tier: p.tier })
              }
              for (const p of (entry.resigns || []) as SetupPlayer[]) {
                txs.push({ type: 'resign', teamName: entry.team, teamAbbr: entry.teamAbbr,
                  playerId: p.id, playerName: p.name, position: p.position, rating: p.rating, tier: p.tier })
              }
              for (const p of (entry.promotions || []) as SetupPlayer[]) {
                txs.push({ type: 'promotion', teamName: entry.team, teamAbbr: entry.teamAbbr,
                  playerId: p.id, playerName: p.name, position: p.position, rating: p.rating, tier: p.tier })
              }
              continue
            }
            // Promotion picks in the FA draft are yielded as type='pick'
            // with isPromotion=True — surface them as the 'promotion' tx.
            const txType: TransactionType = entry.isPromotion
              ? 'promotion'
              : ((entry.type as TransactionType) ?? 'pick')
            txs.push({
              type: txType,
              teamName: entry.team,
              teamAbbr: entry.teamAbbr,
              playerId: entry.playerId,
              playerName: entry.player,
              position: entry.position,
              rating: entry.rating,
              tier: entry.tier,
              counterpartAbbr: entry.counterpartAbbr,
              gave: entry.gave,
              got: entry.got,
            })
          }
          setPredraftSetups(setupMap)
          setTransactions(await fillTradeSides(txs.reverse(), headers))
          // Only restore "on the clock" highlight if we're in an active
          // draft round-robin. Outside those phases (front-office setup,
          // pre-FA wait, post-draft training) there's no clock running —
          // leaving it on the most-recent transaction's team made the
          // marker stick on whichever team had the last front-office move.
          if (txs.length > 0 && data.phase === 'free_agency') {
            setCurrentTeamAbbr(txs[0].teamAbbr)
          }
        }
        // Restore FA window state if it's currently open
        if (data.faWindowOpen && data.faWindowEnd) {
          setFaWindowOpen(true)
          setFaWindowEnd(data.faWindowEnd * 1000) // backend sends epoch seconds
        }
        // Restore FA pool + ballot + directives for rank markers
        if (data.faPool?.length > 0) setFaPool(data.faPool)
        if (data.faDirectives?.length > 0) setFaDirectives(data.faDirectives)
        if (data.gmResolutions?.length > 0) {
          setGmResolvedEvents(data.gmResolutions as GmVoteResolvedEvent[])
        }
        // Restore the active phase so tier grouping and prospect swap persist
        // across refreshes mid-offseason.
        if (data.phase && (data.phase === 'predraft' || data.phase === 'free_agency')) {
          setCurrentPhase(data.phase)
        }
        if (data.phase === 'rookie_draft') {
          // Mid-draft reload: every pick or skip so far resolved one board row.
          setCurrentPhase('rookie_draft')
          const resolved = (data.transactions || []).filter(
            (t: { type?: string }) => t.type === 'rookie_pick' || t.type === 'rookie_skip').length
          setResolved(resolved)
          // The class list only rides the start event; after a reload, the players
          // still undrafted come from the draft-class endpoint.
          fetch(`${API_BASE}/draft/class`, { headers, cache: 'reload' })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
              const ps = d?.data?.prospects ?? []
              setRookieClass(ps.map((p: { playerId: number; name: string; position: string; rating: number; tier?: string | null }) => (
                { id: p.playerId, name: p.name, position: p.position, rating: p.rating, tier: p.tier })))
            })
            .catch(() => {})
        }
        // If draft already finished, mark complete and clear on-the-clock
        if (data.draftComplete) {
          setIsComplete(true)
          setCurrentTeamAbbr(null)
        }
      } catch {
        // silent
      }
    }
    fetchOffseason()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, offseasonPhaseForBoard])

  // Auto-fetch roster when a team is expanded and not yet cached
  useEffect(() => {
    if (!expandedTeam) return
    if (rosterCache[expandedTeam] !== undefined) return
    const team = draftOrder.find(t => t.abbr === expandedTeam)
    if (!team?.id) return
    setRosterLoading(prev => new Set([...prev, expandedTeam]))
    // Cache-bust the team fetch — the endpoint sets a 2-minute Cache-Control
    // header, which serves stale rosters from the browser cache when the
    // user expands a team right after a sign/cut. The offseason mutates
    // rosters on the order of seconds, not minutes, so we always want fresh
    // data here.
    fetch(`${API_BASE}/teams/${team.id}?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => setRosterCache(prev => ({ ...prev, [expandedTeam]: data.data?.roster || {} })))
      .catch(() => setRosterCache(prev => ({ ...prev, [expandedTeam]: {} })))
      .finally(() => setRosterLoading(prev => { const s = new Set(prev); s.delete(expandedTeam!); return s }))
  }, [expandedTeam, rosterCache, draftOrder])

  // WebSocket events
  useEffect(() => {
    if (!event) return
    const e = event as any

    if (e.event === 'offseason_start') {
      const ev = e as OffseasonStartEvent
      setDraftOrder(ev.draftOrder)
      setTransactions([])
      setCompletedTeams(new Set())
      setCurrentTeamAbbr(null)
      setIsComplete(false)
      setExpandedTeam(null)
      setFaDirectives([])
      setFaPool([])
      setPickedPlayerNames(new Set())
      setGmResolvedEvents([])
      setTabNotify({ directives: false, transactions: false })
      setPredraftSetups({})
      userExpandedRef.current = false
      // Seed roster cache from pre-FA snapshots so rosters populate live from picks
      const snapshots = (ev as any).rosterSnapshots as Record<string, TeamRosterData> | undefined
      setRosterCache(snapshots || {})
      // Fetch fresh FA data for the new season
      const token = getToken()
      Promise.resolve(token).then(tok => {
        const headers: Record<string, string> = {}
        if (tok) headers['Authorization'] = `Bearer ${tok}`
        fetch(`${API_BASE}/offseason?t=${Date.now()}`, { headers })
          .then(r => r.json())
          .then(data => {
            setFreeAgents(data.freeAgents || [])
            if (data.faPool?.length > 0) setFaPool(data.faPool)
          })
          .catch(() => {})
      })
    } else if (e.event === 'offseason_on_clock') {
      setCurrentTeamAbbr(e.teamAbbr)
    } else if (e.event === 'offseason_pick') {
      const ev = e as OffseasonPickEvent & { isPromotion?: boolean }
      // Promotions are prospects moving onto the roster — they were never in
      // the FA pool, so skip the FA-filter step for those.
      if (!ev.isPromotion) {
        setFreeAgents(prev => prev.filter(fa => fa.name !== ev.playerName))
      }
      setPickedPlayerNames(prev => new Set([...prev, ev.playerName]))
      setTransactions(prev => [{
        type: ev.isPromotion ? 'promotion' : 'pick',
        teamName: ev.teamName,
        teamAbbr: ev.teamAbbr,
        playerId: (ev as any).playerId,
        playerName: ev.playerName,
        position: ev.position,
        rating: ev.rating,
        tier: ev.tier,
      }, ...prev])
      setTabNotify(prev => prev.transactions ? prev : { ...prev, transactions: rightTab !== 'transactions' })
      // Add the signed player to the local roster cache. Use the slot the
      // backend tells us was filled (added via `slot` field on the event) —
      // critical for WR signs, where the backend's `_attemptRosterFill`
      // picks wr1/wr2 randomly. Without an explicit slot the frontend would
      // fill wr1 while the backend filled wr2, leaving wr2 stuck on OPEN
      // until a refetch landed.
      setRosterCache(prev => {
        const existing = prev[ev.teamAbbr]
        if (!existing) return prev
        const updated = { ...existing }
        const posSlotMap: Record<string, string[]> = {
          'QB': ['qb'], 'RB': ['rb'], 'WR': ['wr1', 'wr2'], 'TE': ['te'], 'K': ['k'],
        }
        const explicitSlot = (ev as any).slot as string | null | undefined
        const player = { id: (ev as any).playerId ?? 0, name: ev.playerName, position: ev.position, rating: ev.rating, tier: ev.tier, termRemaining: 3 }
        if (explicitSlot && posSlotMap[ev.position]?.includes(explicitSlot)) {
          updated[explicitSlot] = player
        } else {
          // Fallback: first empty slot at this position (legacy path / older events)
          const slots = posSlotMap[ev.position] || []
          for (const slot of slots) {
            if (!updated[slot]) {
              updated[slot] = player
              break
            }
          }
        }
        return { ...prev, [ev.teamAbbr]: updated }
      })
    } else if (e.event === 'offseason_cut') {
      const ev = e as OffseasonCutEvent
      setFreeAgents(prev => {
        const updated = [...prev, { name: ev.playerName, position: ev.position, rating: ev.rating, tier: ev.tier ?? 'TierC' }]
        return updated.sort((a, b) => b.rating - a.rating)
      })
      setTransactions(prev => [{
        type: 'cut',
        teamName: ev.teamName,
        teamAbbr: ev.teamAbbr,
        playerId: (ev as any).playerId,
        playerName: ev.playerName,
        position: ev.position,
        rating: ev.rating,
      }, ...prev])
      setTabNotify(prev => prev.transactions ? prev : { ...prev, transactions: rightTab !== 'transactions' })
      setRosterCache(prev => { const n = { ...prev }; delete n[ev.teamAbbr]; return n })
    } else if (e.event === 'offseason_team_complete') {
      const ev = e as OffseasonTeamCompleteEvent
      setCompletedTeams(prev => new Set([...prev, ev.teamAbbr]))
    } else if (e.event === 'offseason_complete') {
      setIsComplete(true)
      setCurrentTeamAbbr(null)
      setCurrentPhase(null)
      fetch(`${API_BASE}/offseason`)
        .then(r => r.json())
        .then(data => setFreeAgents(data.freeAgents || []))
        .catch(() => {})
    } else if (e.event === 'offseason_predraft_start') {
      setCurrentPhase('predraft')
      setCurrentTeamAbbr(null)
      setPredraftSetups({})
    } else if (e.event === 'offseason_team_setup') {
      const ev = e as {
        teamName: string; teamAbbr: string; teamId: number;
        resigns: SetupPlayer[]; cuts: SetupPlayer[]; promotions: SetupPlayer[];
      }
      setPredraftSetups(prev => ({
        ...prev,
        [ev.teamAbbr]: {
          resigns: ev.resigns || [],
          cuts: ev.cuts || [],
          promotions: ev.promotions || [],
        },
      }))
      const hasMoves = (ev.resigns?.length ?? 0) + (ev.cuts?.length ?? 0) + (ev.promotions?.length ?? 0) > 0
      if (hasMoves && !userExpandedRef.current) setExpandedTeam(ev.teamAbbr)
      // Merge setup items into the transactions stream so the
      // Transactions tab and Moves-this-offseason block reflect them.
      const setupTxs: Transaction[] = []
      for (const p of ev.cuts || []) {
        const txType: TransactionType = p.reason === 'expired' ? 'expired' : 'cut'
        setupTxs.push({ type: txType, teamName: ev.teamName, teamAbbr: ev.teamAbbr,
          playerId: p.id, playerName: p.name, position: p.position, rating: p.rating, tier: p.tier })
      }
      for (const p of ev.resigns || []) {
        setupTxs.push({ type: 'resign', teamName: ev.teamName, teamAbbr: ev.teamAbbr,
          playerId: p.id, playerName: p.name, position: p.position, rating: p.rating, tier: p.tier })
      }
      for (const p of ev.promotions || []) {
        setupTxs.push({ type: 'promotion', teamName: ev.teamName, teamAbbr: ev.teamAbbr,
          playerId: p.id, playerName: p.name, position: p.position, rating: p.rating, tier: p.tier })
      }
      if (setupTxs.length > 0) {
        setTransactions(prev => [...setupTxs, ...prev])
        // Cuts + promotions both mutate the local roster cache so the
        // dashboard panel reflects empty slots without needing a page
        // refresh. Cuts clear the slot whose occupant matches by name;
        // promotions fill the first empty slot at their position.
        if (ev.cuts?.length || ev.promotions?.length) {
          setRosterCache(prev => {
            const existing = prev[ev.teamAbbr]
            if (!existing) return prev
            const updated = { ...existing }
            // Clear cut players from their slots
            const cutNames = new Set((ev.cuts || []).map(c => c.name))
            if (cutNames.size > 0) {
              for (const slot of Object.keys(updated)) {
                const occupant = updated[slot]
                if (occupant && cutNames.has(occupant.name)) {
                  updated[slot] = null
                }
              }
            }
            const posSlotMap: Record<string, string[]> = {
              'QB': ['qb'], 'RB': ['rb'], 'WR': ['wr1', 'wr2'], 'TE': ['te'], 'K': ['k'],
            }
            for (const promo of (ev.promotions || [])) {
              const slots = posSlotMap[promo.position] || []
              for (const slot of slots) {
                if (!updated[slot]) {
                  updated[slot] = { id: 0, name: promo.name, position: promo.position,
                    rating: promo.rating, tier: promo.tier, termRemaining: 3 }
                  break
                }
              }
            }
            return { ...prev, [ev.teamAbbr]: updated }
          })
        }
      }
    } else if (e.event === 'rookie_draft_start') {
      const ev = e as { rookies?: RookieEntry[] }
      setCurrentPhase('rookie_draft')
      setRookieClass(ev.rookies || [])
      setResolved(0)
      setRookieOnClock(false)
      setCurrentTeamAbbr(null)
      setIsComplete(false)
    } else if (e.event === 'rookie_draft_on_clock') {
      const ev = e as { teamAbbr: string }
      setCurrentPhase('rookie_draft')
      setRookieOnClock(true)
      setCurrentTeamAbbr(ev.teamAbbr)
    } else if (e.event === 'rookie_draft_pick') {
      const ev = e as { team: string; teamAbbr: string; playerId?: number; player: string; position: string; rating: number; tier?: string }
      setTransactions(prev => [{
        type: 'rookie_pick', teamName: ev.team, teamAbbr: ev.teamAbbr,
        playerId: ev.playerId, playerName: ev.player, position: ev.position,
        rating: ev.rating, tier: ev.tier,
      }, ...prev])
      setTabNotify(prev => prev.transactions ? prev : { ...prev, transactions: rightTab !== 'transactions' })
      setResolved(rookieResolvedRef.current + 1)
      setRookieOnClock(false)
    } else if (e.event === 'rookie_draft_skip') {
      const ev = e as { team: string; teamAbbr: string; reason?: string }
      setTransactions(prev => [{
        type: 'rookie_skip', teamName: ev.team, teamAbbr: ev.teamAbbr,
        playerName: ev.reason === 'pipeline_full' ? '(pipeline full, forfeited pick)' : '(no eligible rookies)',
        position: '—', rating: 0,
      }, ...prev])
      setResolved(rookieResolvedRef.current + 1)
      setRookieOnClock(false)
    } else if (e.event === 'rookie_draft_pick_traded') {
      // A team that could not use its slot sold it mid-draft. The buyer picks from the
      // same row, so the row changes hands rather than resolving.
      const ev = e as { team: string; teamAbbr: string; to: string; toAbbr: string; forSeason: number }
      setTransactions(prev => [{
        type: 'trade', teamName: ev.team, teamAbbr: ev.teamAbbr, counterpartAbbr: ev.toAbbr,
        gave: 'their draft slot', got: `a Season ${ev.forSeason} pick`,
        playerName: 'their draft slot', position: '—', rating: 0,
      }, ...prev])
      setTabNotify(prev => prev.transactions ? prev : { ...prev, transactions: rightTab !== 'transactions' })
      const rowIdx = rookieResolvedRef.current
      setDraftOrder(prev => {
        const row = prev[rowIdx]
        if (!row) return prev
        const buyer = prev.find(t => t.abbr === ev.toAbbr)
        const next = [...prev]
        next[rowIdx] = {
          ...row,
          id: buyer?.id, name: buyer?.name ?? ev.to, city: buyer?.city ?? '',
          abbr: ev.toAbbr, color: buyer?.color,
          traded: true,
          originalTeam: row.originalTeam ?? { id: row.id, name: row.name, abbr: row.abbr },
        }
        return next
      })
      setCurrentTeamAbbr(ev.toAbbr)
    } else if (e.event === 'rookie_draft_complete') {
      setResolved(Number.MAX_SAFE_INTEGER)
      setRookieOnClock(false)
      setCurrentTeamAbbr(null)
    } else if (e.event === 'offseason_predraft_complete') {
      setCurrentPhase(null)
      setCurrentTeamAbbr(null)
      setExpandedTeam(null)
    } else if (e.event === 'fa_draft_order_update') {
      // FA phase preview: replace the draft order with the tier-sorted list
      // and populate the FA pool. Fires during the pre-FA wait so the team
      // board switches to tier groupings and the FA list populates *before*
      // picks start streaming, not at the moment of the first pick. Keep
      // accumulated transactions/rosters intact (unlike offseason_start,
      // which resets everything for the whole offseason).
      const ev = e as { draftOrder: DraftTeam[]; faPool?: FreeAgent[] | null }
      setDraftOrder(ev.draftOrder)
      setCurrentPhase('free_agency')
      setCurrentTeamAbbr(null)
      if (ev.faPool && Array.isArray(ev.faPool)) {
        setFreeAgents(ev.faPool)
        setFaPool(ev.faPool.filter(p => p.id != null) as Array<{ id: number; name: string; position: string; rating: number; tier: string }>)
      }
    } else if (e.event === 'gm_vote_resolved') {
      const ev = e as GmVoteResolvedEvent
      setGmResolvedEvents(prev => [ev, ...prev])
      setTabNotify(prev => prev.directives ? prev : { ...prev, directives: rightTab !== 'directives' })
    } else if (e.event === 'gm_fa_window_open') {
      const ev = e as GmFaWindowOpenEvent
      setFaWindowOpen(true)
      setFaPool(ev.faPool)
      setFaWindowEnd(Date.now() + ev.durationSeconds * 1000)
    } else if (e.event === 'gm_fa_window_close') {
      setFaWindowOpen(false)
      // Keep faPool so ballot rank markers persist through the draft
      setFaWindowEnd(null)
      // Fetch current FA list + directives so the draft board populates immediately
      const token = getToken()
      Promise.resolve(token).then(tok => {
        const headers: Record<string, string> = {}
        if (tok) headers['Authorization'] = `Bearer ${tok}`
        fetch(`${API_BASE}/offseason?t=${Date.now()}`, { headers })
          .then(r => r.json())
          .then(data => {
            setFreeAgents(data.freeAgents || [])
            if (data.draftOrder?.length > 0) {
              const order: DraftTeam[] = data.draftOrder
              setDraftOrder(order)
              const done = new Set<string>(order.filter(t => t.complete).map(t => t.abbr))
              if (done.size > 0) setCompletedTeams(done)
            }
            if (data.faDirectives?.length > 0) setFaDirectives(data.faDirectives)
          })
          .catch(() => {})
      })
    } else if (e.event === 'gm_fa_directives') {
      const ev = e as GmFaDirectivesEvent
      // Store directives for the user's favorite team
      if (user?.favoriteTeamId && ev.directives[user.favoriteTeamId]) {
        setFaDirectives(ev.directives[user.favoriteTeamId])
        setTabNotify(prev => ({ ...prev, directives: rightTab !== 'directives' }))
      }
    }
  }, [event])

  // Rotate draft order so the "on the clock" team is first
  // Static order — no reordering, just highlight the "on the clock" team
  const cyclicOrder = draftOrder

  // The board renders in the backend's draft order, which is worst-first
  // (weakest teams by record pick first). No tier grouping — Appeal no longer
  // determines the FA draft order.
  const teamGroups = useMemo(
    () => [{ tier: null as string | null, teams: cyclicOrder }],
    [cyclicOrder]
  )

  // Rookie class, best first, with who took each one (from the live pick stream).
  const draftedBy = useMemo(() => {
    const m = new Map<number, string>()
    for (const tx of transactions) {
      if (tx.type === 'rookie_pick' && tx.playerId != null) m.set(tx.playerId, tx.teamAbbr)
    }
    return m
  }, [transactions])
  const filteredRookies = useMemo(() => {
    const list = posFilter === 'ALL' ? rookieClass : rookieClass.filter(r => r.position === posFilter)
    return [...list].sort((a, b) => b.rating - a.rating)
  }, [rookieClass, posFilter])

  const filteredAgents = posFilter === 'ALL'
    ? freeAgents
    : freeAgents.filter(fa => fa.position === posFilter)

  // Build per-position directive rank map: playerName -> rank (1-3)
  // Shows which players the team will target (votes passed threshold)
  const directiveRankMap = useMemo(() => {
    const map = new Map<string, number>()
    if (faDirectives.length === 0) return map
    const positionCounters = new Map<string, number>()
    for (const p of faDirectives) {
      const count = (positionCounters.get(p.position) || 0) + 1
      positionCounters.set(p.position, count)
      map.set(p.name, count)
    }
    return map
  }, [faDirectives])

  // Unique teams from transactions in draft order
  const teamOptions = useMemo(() => {
    const seen = new Set<string>()
    const ordered: { abbr: string; name: string }[] = []
    for (const t of draftOrder) {
      if (!seen.has(t.abbr) && transactions.some(tx => involvesTeam(tx, t.abbr))) {
        seen.add(t.abbr)
        ordered.push({ abbr: t.abbr, name: t.name })
      }
    }
    for (const tx of transactions) {
      if (tx.teamAbbr && !seen.has(tx.teamAbbr)) {
        seen.add(tx.teamAbbr)
        ordered.push({ abbr: tx.teamAbbr, name: tx.teamName })
      }
      if (tx.counterpartAbbr && !seen.has(tx.counterpartAbbr)) {
        seen.add(tx.counterpartAbbr)
        ordered.push({ abbr: tx.counterpartAbbr, name: tx.counterpartAbbr })
      }
    }
    return ordered
  }, [transactions, draftOrder])

  const filteredTransactions = teamFilter
    ? transactions.filter(tx => involvesTeam(tx, teamFilter))
    : transactions

  const posPillStyle = (pos: string): React.CSSProperties => ({
    fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '4px',
    cursor: 'pointer', border: 'none',
    backgroundColor: posFilter === pos ? '#475569' : '#1e293b',
    color: posFilter === pos ? '#e2e8f0' : '#64748b',
  })

  const teamPillStyle = (abbr: string | null): React.CSSProperties => ({
    fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '4px',
    cursor: 'pointer', border: 'none',
    backgroundColor: teamFilter === abbr ? '#475569' : '#1e293b',
    color: teamFilter === abbr ? '#e2e8f0' : '#64748b',
  })

  return (
    <div style={{ color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' as const }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Offseason</h2>
          {currentPhase && (
            <span style={{
              fontSize: '12px', fontWeight: '700',
              color: currentPhase === 'predraft' ? '#38bdf8' : currentPhase === 'rookie_draft' ? '#a78bfa' : '#f59e0b',
              letterSpacing: '0.02em', textTransform: 'uppercase' as const,
            }}>
              · {currentPhase === 'predraft' ? 'Team Setup' : currentPhase === 'rookie_draft' ? 'Rookie Draft' : 'Free Agency'}
            </span>
          )}
          {!currentPhase && phaseLabel && (
            <span style={{
              fontSize: '12px', fontWeight: '700', color: '#f59e0b',
              letterSpacing: '0.02em', textTransform: 'uppercase' as const,
            }}>
              · {phaseLabel}
            </span>
          )}
          {phaseCountdown && (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {phaseCountdown}
            </span>
          )}
        </div>
        {isComplete && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e', letterSpacing: '0.02em' }}>
            FREE AGENCY COMPLETE
          </span>
        )}
      </div>

      {/* GM: Favorite team on the clock banner */}
      {isFavoriteOnClock && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '12px',
          backgroundColor: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#22c55e' }}>
            Your team is on the clock! {faWindowOpen ? 'Submit your ballot to influence the pick.' : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {faWindowOpen && faTimeLeft && (
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#f59e0b',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            }}>
              {faTimeLeft}
            </span>
          )}
          </div>
        </div>
      )}

      {/* GM: FA window open banner (not on clock, but window is open) */}
      {faWindowOpen && !isFavoriteOnClock && user?.favoriteTeamId && openSlots.length > 0 && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '12px',
          backgroundColor: 'rgba(245,158,11,0.10)',
          borderBottom: '2px solid rgba(245,158,11,0.5)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', color: '#f59e0b' }}>
            FA voting window is open. Submit your requisition ballot.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {faTimeLeft && (
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#f59e0b',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            }}>
              {faTimeLeft}
            </span>
          )}
          </div>
        </div>
      )}

      {/* Side-by-side: Team Accordion + Tabbed Panel.
          Both columns share a fixed max height so the whole offseason
          component doesn't grow with the team list — the team accordion
          scrolls its content within the shared height, and the right
          panel's internal lists already scroll within their own caps. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Team Accordion */}
        <div style={{
          backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden',
          maxHeight: '720px', display: 'flex', flexDirection: 'column' as const,
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Teams
            </span>
            {currentPhase === 'rookie_draft' ? (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {Math.min(rookieResolved, draftOrder.length)}/{draftOrder.length} picks
              </span>
            ) : !isComplete && completedTeams.size > 0 && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {completedTeams.size}/{draftOrder.length} done
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' as const }}>
          {cyclicOrder.length === 0 ? (
            <div style={{ padding: '16px 14px', fontSize: '13px', color: '#94a3b8' }}>
              {phaseCountdown ? (
                <>
                  Front office decisions are in.{' '}
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>{phaseCountdown}</span>
                </>
              ) : (
                <>Waiting for the offseason to begin…</>
              )}
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                Coach decisions, re-signs, cuts, and the FA pool have been resolved. The rookie draft is next, then free agency.
              </div>
            </div>
          ) : (
            teamGroups.map(group => (
              <React.Fragment key={group.tier ?? 'flat'}>
                {group.teams.map((team, i) => {
              const inRookieDraft = currentPhase === 'rookie_draft'
              const isCurrent = inRookieDraft
                ? rookieOnClock && i === rookieResolved
                : team.abbr === currentTeamAbbr && !isComplete
              const isDone = inRookieDraft
                ? i < rookieResolved
                : completedTeams.has(team.abbr) || isComplete
              // A club holding a traded pick has more than one row. Expansion is
              // keyed by club, so only its first row opens.
              const isExpanded = expandedTeam === team.abbr
                && group.teams.findIndex(t => t.abbr === team.abbr) === i
              const isFavorite = team.abbr === favoriteTeamAbbr
              const roster = rosterCache[team.abbr]
              const loading = rosterLoading.has(team.abbr)
              const teamTxs = transactions.filter(tx => involvesTeam(tx, team.abbr))
              // Map player name → most-recent transaction type so the
              // roster slot badge reflects the latest action. transactions
              // is stored newest-first (new entries are prepended), so we
              // iterate in reverse here — that way the *newest* tx for a
              // given player ends up as the final Map.set call and wins.
              // Without the reverse, a draft-then-promote sequence would
              // show DRAFTED because rookie_pick (older) was iterated last
              // and clobbered the promotion entry.
              const txByName = new Map<string, string>()
              for (let i = teamTxs.length - 1; i >= 0; i--) {
                const tx = teamTxs[i]
                if (tx.type === 'cut' || tx.type === 'expired') continue
                txByName.set(tx.playerName, tx.type)
              }

              return (
                <div key={`${team.slot ?? i}-${team.abbr}`}>

                  {/* Team row (clickable) */}
                  <div
                    onClick={() => {
                      userExpandedRef.current = true
                      setExpandedTeam(prev => prev === team.abbr ? null : team.abbr)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '7px 14px 7px 11px',
                      borderLeft: isCurrent ? '3px solid #22c55e' : isFavorite ? `3px solid ${favoriteTeamColor}` : '3px solid transparent',
                      borderBottom: '1px solid #0f172a',
                      backgroundColor: isCurrent
                        ? 'rgba(34,197,94,0.06)'
                        : isFavorite && !isDone ? hexToRgba(favoriteTeamColor, 0.06)
                        : isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                      opacity: isDone && !isExpanded && !isFavorite ? 0.4 : 1,
                      cursor: 'pointer',
                      transition: 'opacity 0.4s ease',
                      userSelect: 'none',
                    }}
                  >
                    {team.slot != null && (
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', minWidth: '18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {team.slot}
                      </span>
                    )}
                    <img
                      src={`/avatars/${team.id ?? team.abbr}.png`}
                      alt={team.abbr}
                      style={{ width: '24px', height: '24px', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: isCurrent || isFavorite ? '600' : '400',
                      color: isDone && !isExpanded && !isFavorite ? '#94a3b8' : isFavorite ? favoriteTeamColor : '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      minWidth: 0,
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {team.city ? `${team.city} ${team.name}` : team.name}
                      </span>
                      {team.traded && team.originalTeam && (
                        <span style={{
                          fontSize: '10px', fontWeight: '700', color: '#2dd4bf', flexShrink: 0,
                          backgroundColor: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)',
                          padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.02em',
                        }}>
                          VIA {team.originalTeam.abbr}
                        </span>
                      )}
                    </span>
                    {isCurrent && (
                      <span style={{
                        fontSize: '10px', fontWeight: '700', color: '#22c55e',
                        letterSpacing: '0.02em', backgroundColor: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.35)', padding: '3px 7px', borderRadius: '3px',
                      }}>
                        ON THE CLOCK
                      </span>
                    )}
                    {isDone && !isCurrent && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700', color: '#94a3b8',
                        letterSpacing: '0.02em', backgroundColor: 'rgba(148,163,184,0.1)',
                        border: '1px solid rgba(148,163,184,0.2)', padding: '3px 7px', borderRadius: '3px',
                      }}>
                        DONE
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '2px' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div style={{
                      backgroundColor: '#0f1e30',
                      borderBottom: '1px solid #0f172a',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>

                      {/* Roster */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '8px' }}>
                          Roster
                        </div>
                        {loading ? (
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Loading…</div>
                        ) : roster ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {ROSTER_SLOTS.map(({ key, label }) => {
                              const player = roster[key]
                              if (!player) {
                                return (
                                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', minWidth: '28px' }}>{label}</span>
                                    <span style={{
                                      fontSize: '10px', fontWeight: '700', color: '#ef4444',
                                      backgroundColor: 'rgba(239,68,68,0.25)', padding: '2px 6px', borderRadius: '3px',
                                    }}>OPEN</span>
                                  </div>
                                )
                              }
                              const txType = txByName.get(player.name)
                              const slotBadge = txType === 'promotion'
                                ? { label: 'PROMOTED', color: '#f59e0b', bg: 'rgba(245,158,11,0.22)' }
                                : txType === 'resign'
                                  ? { label: 'RESIGNED', color: '#38bdf8', bg: 'rgba(56,189,248,0.22)' }
                                  : txType === 'rookie_pick'
                                    ? { label: 'DRAFTED', color: '#a78bfa', bg: 'rgba(167,139,250,0.22)' }
                                    : txType === 'pick'
                                      ? { label: 'SIGNED', color: '#22c55e', bg: 'rgba(34,197,94,0.22)' }
                                      : null
                              return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', minWidth: '28px' }}>{label}</span>
                                  <Stars stars={calcStars(player.rating)} size={10} />
                                  <PlayerLink
                                    playerId={player.id}
                                    playerName={player.name}
                                    style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}
                                  />
                                  {slotBadge && (
                                    <span style={{
                                      fontSize: '10px', fontWeight: '700', color: slotBadge.color,
                                      backgroundColor: slotBadge.bg, padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.02em',
                                    }}>{slotBadge.label}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Roster unavailable</div>
                        )}
                      </div>

                      {/* Per-team moves */}
                      {teamTxs.length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '7px' }}>
                            Moves this offseason
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {teamTxs.map((tx, idx) => {
                              const badge = tx.type === 'trade' ? { label: 'TRADE', color: '#2dd4bf' }
                                : tx.type === 'cut' ? { label: 'CUT', color: '#ef4444' }
                                : tx.type === 'expired' ? { label: 'TO FA', color: '#a16207' }
                                : tx.type === 'rookie_skip' ? { label: 'SKIP', color: '#64748b' }
                                : tx.type === 'rookie_pick' ? { label: 'DRAFT', color: '#a78bfa' }
                                : tx.type === 'promotion' ? { label: 'PROMOTED', color: '#f59e0b' }
                                : tx.type === 'resign' ? { label: 'RE-SIGN', color: '#38bdf8' }
                                : { label: 'SIGN', color: '#22c55e' }
                              const showStars = tx.type !== 'rookie_skip' && tx.type !== 'trade'
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px' }}>
                                  <span style={{
                                    fontSize: '10px', fontWeight: '700', minWidth: '62px',
                                    color: badge.color,
                                  }}>
                                    {badge.label}
                                  </span>
                                  {showStars && (
                                    tx.offensiveRating != null && tx.defensiveRating != null ? (
                                      <DualStars offensiveStars={calcStars(tx.offensiveRating)} defensiveStars={calcStars(tx.defensiveRating)} size={9} />
                                    ) : (
                                      <Stars stars={calcStars(tx.rating)} size={10} />
                                    )
                                  )}
                                  {tx.type === 'trade' ? (
                                    <span style={{ flex: 1, color: '#e2e8f0' }}>{tradeSummary(tx, true)}</span>
                                  ) : (
                                    <>
                                      <PlayerLink
                                        playerId={tx.playerId}
                                        playerName={tx.playerName}
                                        style={{ flex: 1, color: '#e2e8f0' }}
                                      />
                                      <span style={{ color: '#64748b', fontSize: '12px' }}>{tx.position}</span>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )
            })}
              </React.Fragment>
            ))
          )}
          </div>
        </div>

        {/* Right column: Tabbed panel */}
        <div style={{
          backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', minWidth: 0,
          maxHeight: '720px', display: 'flex', flexDirection: 'column' as const,
        }}>
          {/* Tab bar */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #0f172a', display: 'flex', gap: '4px', flexShrink: 0 }}>
            {(['players', 'directives', 'transactions'] as const).map(tab => {
              const isActive = rightTab === tab
              const playersLabel = currentPhase === 'rookie_draft'
                ? `Rookies${rookieClass.length > 0 ? ` (${rookieClass.length})` : ''}`
                : `Players${freeAgents.length > 0 ? ` (${freeAgents.length})` : ''}`
              const label = tab === 'players' ? playersLabel
                : tab === 'directives' ? 'Directives'
                : `Transactions${transactions.length > 0 ? ` (${transactions.length})` : ''}`
              const hasNotify = tab !== 'players' && tabNotify[tab as 'directives' | 'transactions']
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setRightTab(tab)
                    if (tab !== 'players') setTabNotify(prev => ({ ...prev, [tab]: false }))
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: isActive ? '#e2e8f0' : '#64748b',
                    position: 'relative',
                  }}
                >
                  {label}
                  {hasNotify && (
                    <span style={{
                      position: 'absolute', top: '2px', right: '2px',
                      width: '6px', height: '6px', borderRadius: '50%',
                      backgroundColor: tab === 'directives' ? '#f59e0b' : '#22c55e',
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Players tab during the rookie draft: the class, with who took each rookie */}
          {rightTab === 'players' && currentPhase === 'rookie_draft' && (
            <>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #0f172a', display: 'flex', gap: '4px' }}>
                {POSITIONS.map(pos => (
                  <button key={pos} style={posPillStyle(pos)} onClick={() => setPosFilter(pos)}>
                    {pos}
                  </button>
                ))}
              </div>
              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '640px', overflowY: 'auto' }}>
                {filteredRookies.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', padding: '10px 6px' }}>
                    {rookieClass.length === 0 ? 'The rookie class appears here when the draft starts.' : 'No rookies at this position.'}
                  </div>
                ) : (
                  filteredRookies.map((r, i) => {
                    const takenBy = draftedBy.get(r.id) ?? null
                    return (
                      <div
                        key={`${r.id}-${i}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', padding: '5px 8px', fontSize: '13px', opacity: takenBy ? 0.5 : 1 }}
                      >
                        <Stars stars={calcStars(r.rating)} />
                        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <PlayerLink playerId={r.id} playerName={r.name} style={{ color: '#e2e8f0' }} />
                        </span>
                        {takenBy && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', color: '#a78bfa',
                            backgroundColor: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
                            padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.02em', flexShrink: 0,
                          }}>
                            {takenBy}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: '#64748b', minWidth: '22px', textAlign: 'right' }}>{r.position}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}

          {/* Players tab — the free agent pool */}
          {rightTab === 'players' && currentPhase !== 'rookie_draft' && (
            <>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #0f172a', display: 'flex', gap: '4px' }}>
                {POSITIONS.map(pos => (
                  <button key={pos} style={posPillStyle(pos)} onClick={() => setPosFilter(pos)}>
                    {pos}
                  </button>
                ))}
              </div>
              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '640px', overflowY: 'auto' }}>
                {filteredAgents.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', padding: '10px 6px' }}>
                    {freeAgents.length === 0
                      ? (currentPhase === 'predraft' ? 'Team setup in progress…'
                        : currentPhase === 'free_agency' ? 'Free agency complete.'
                        : 'Waiting for the offseason to begin…')
                      : 'No players at this position.'}
                  </div>
                ) : (
                  filteredAgents.map((fa, i) => {
                    const posRank = directiveRankMap.get(fa.name) ?? null
                    return (
                      <div
                        key={`${fa.name}-${i}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', padding: '5px 8px', fontSize: '13px' }}
                      >
                        {fa.offensiveRating != null && fa.defensiveRating != null ? (
                          <DualStars offensiveStars={calcStars(fa.offensiveRating)} defensiveStars={calcStars(fa.defensiveRating)} size={10} />
                        ) : (
                          <Stars stars={calcStars(fa.rating)} />
                        )}
                        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <PlayerLink
                            playerId={fa.id}
                            playerName={fa.name}
                            style={{ color: '#e2e8f0' }}
                          />
                          {fa.isNewcomer && (
                            <HoverTooltip text="New to the league. Has not played a pro season." color="#7dd3fc">
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                color: '#7dd3fc',
                                backgroundColor: 'rgba(125,211,252,0.12)',
                                border: '1px solid rgba(125,211,252,0.30)',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                              }}
                            >
                              New
                            </span>
                            </HoverTooltip>
                          )}
                          {posRank != null && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              color: posRank === 1 ? '#f59e0b' : posRank === 2 ? '#94a3b8' : '#64748b',
                              backgroundColor: posRank === 1 ? 'rgba(245,158,11,0.30)' : 'rgba(148,163,184,0.15)',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              minWidth: '20px',
                              textAlign: 'center',
                            }}>
                              #{posRank}
                            </span>
                          )}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>{fa.position}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}

          {/* Directives tab */}
          {rightTab === 'directives' && (
            <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
              {/* Board Directives */}
              {faDirectives.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Board Directives
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>
                      Players the front office has been directed to pursue
                    </span>
                  </div>
                  <div style={{ padding: '6px 14px' }}>
                    {faDirectives.map((p, i) => {
                      const pickTx = transactions.find(tx => tx.type === 'pick' && tx.playerName === p.name)
                      const signedByUs = pickTx && pickTx.teamAbbr === favoriteTeamAbbr
                      const takenByOther = pickTx && !signedByUs
                      const isPicked = !!pickTx
                      return (
                        <div key={p.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 0',
                          borderBottom: i < faDirectives.length - 1 ? '1px solid #0f172a' : 'none',
                          opacity: isPicked ? 0.55 : 1,
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: signedByUs ? '#22c55e' : isPicked ? '#94a3b8' : '#f59e0b',
                            minWidth: '18px',
                          }}>
                            {i + 1}.
                          </span>
                          <Stars stars={calcStars(p.rating)} size={10} />
                          <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PlayerLink
                              playerId={p.id}
                              playerName={p.name}
                              style={{ fontSize: '13px', color: isPicked ? '#94a3b8' : '#e2e8f0' }}
                            />
                            {signedByUs && (
                              <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '700', letterSpacing: '0.02em' }}>
                                SIGNED
                              </span>
                            )}
                            {takenByOther && (
                              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700', letterSpacing: '0.02em' }}>
                                TAKEN
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                            {p.position}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Board Resolutions */}
              {gmResolvedEvents.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a', borderTop: faDirectives.length > 0 ? '1px solid #0f172a' : 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Board Resolutions
                    </span>
                  </div>
                  <div style={{ padding: '4px 14px' }}>
                    {gmResolvedEvents.map((ev, i) => {
                      const isSuccess = ev.outcome === 'success'
                      return (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 0',
                          borderBottom: i < gmResolvedEvents.length - 1 ? '1px solid #0f172a' : 'none',
                          fontSize: '11px',
                        }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '800',
                            color: isSuccess ? '#22c55e' : ev.outcome === 'below_threshold' ? '#64748b' : '#f59e0b',
                            minWidth: '100px',
                            letterSpacing: '0.02em',
                          }}>
                            {isSuccess ? 'RATIFIED' : ev.outcome === 'below_threshold' ? 'NO QUORUM' : 'DENIED'}
                          </span>
                          <span style={{ color: '#94a3b8' }}>{ev.teamName}</span>
                          <span style={{ color: '#64748b' }}>{ev.voteType.replace(/_/g, ' ')}</span>
                          {ev.targetPlayerName && (
                            <span style={{ color: '#e2e8f0' }}>{ev.targetPlayerName}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {faDirectives.length === 0 && gmResolvedEvents.length === 0 && (
                <div style={{ padding: '16px 14px', fontSize: '13px', color: '#94a3b8' }}>
                  No directives or resolutions yet.
                </div>
              )}
            </div>
          )}

          {/* Transactions tab */}
          {rightTab === 'transactions' && (
            <>
              {transactions.length > 0 ? (
                <>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button style={teamPillStyle(null)} onClick={() => setTeamFilter(null)}>ALL</button>
                      {teamOptions.map(t => (
                        <button key={t.abbr} style={teamPillStyle(t.abbr)} onClick={() => setTeamFilter(t.abbr)}>
                          {t.abbr}
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
                      {filteredTransactions.length} move{filteredTransactions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
                    {filteredTransactions.map((tx, i) => {
                      const badge = tx.type === 'trade' ? { label: 'TRADE', color: '#2dd4bf', bg: 'rgba(45,212,191,0.05)' }
                        : tx.type === 'cut' ? { label: 'CUT', color: '#ef4444', bg: 'rgba(239,68,68,0.04)' }
                        : tx.type === 'expired' ? { label: 'TO FA', color: '#a16207', bg: 'rgba(161,98,7,0.05)' }
                        : tx.type === 'rookie_skip' ? { label: 'SKIP', color: '#64748b', bg: 'transparent' }
                        : tx.type === 'rookie_pick' ? { label: 'DRAFT', color: '#a78bfa', bg: 'rgba(167,139,250,0.05)' }
                        : tx.type === 'promotion' ? { label: 'PROMOTED', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' }
                        : tx.type === 'resign' ? { label: 'RE-SIGN', color: '#38bdf8', bg: 'rgba(56,189,248,0.05)' }
                        : { label: 'SIGN', color: '#22c55e', bg: 'rgba(34,197,94,0.04)' }
                      const showStars = tx.type !== 'rookie_skip' && tx.type !== 'trade'
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
                            borderBottom: '1px solid #0f172a',
                            backgroundColor: badge.bg,
                          }}
                        >
                          <span style={{
                            fontSize: '10px', fontWeight: '700', letterSpacing: '0.02em', minWidth: '62px',
                            color: badge.color,
                          }}>
                            {badge.label}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', minWidth: '34px' }}>
                            {tx.teamAbbr}
                          </span>
                          {tx.type === 'trade' ? (
                            <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>{tradeSummary(tx, false)}</span>
                          ) : (
                            <PlayerLink
                              playerId={tx.playerId}
                              playerName={tx.playerName}
                              style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}
                            />
                          )}
                          {showStars && (
                            tx.offensiveRating != null && tx.defensiveRating != null ? (
                              <DualStars offensiveStars={calcStars(tx.offensiveRating)} defensiveStars={calcStars(tx.defensiveRating)} size={10} />
                            ) : (
                              <Stars stars={calcStars(tx.rating)} size={13} />
                            )
                          )}
                          {tx.type !== 'trade' && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{tx.position}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px 14px', fontSize: '13px', color: '#94a3b8' }}>
                  No transactions yet.
                </div>
              )}
            </>
          )}
        </div>{/* end right column */}

      </div>{/* end side-by-side grid */}

    </div>
  )
}
