import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { Stars, calcStars } from './Stars'
import PlayerHoverCard from './PlayerHoverCard'
import FaBallotModal from './FrontOffice/FaBallotModal'
import type { ScoutingPlayer, OpenSlot } from './FrontOffice/FaBallotModal'
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
import type { GmFaBallotResponse } from '@/types/gm'

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
}

interface Transaction {
  type: 'pick' | 'cut'
  teamName: string
  teamAbbr: string
  playerName: string
  position: string
  rating: number
  tier?: string
}

interface DraftTeam {
  name: string
  city?: string
  abbr: string
  id?: number
  color?: string
  complete?: boolean
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

export const OffseasonPanel: React.FC = () => {
  const { event } = useSeasonWebSocket()
  const { user, getToken, updateFloobits } = useAuth()

  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
  const [draftOrder, setDraftOrder] = useState<DraftTeam[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentTeamAbbr, setCurrentTeamAbbr] = useState<string | null>(null)
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
  const [ballotModalOpen, setBallotModalOpen] = useState(false)
  const [existingBallot, setExistingBallot] = useState<number[] | null>(null)
  const [ballotSubmitting, setBallotSubmitting] = useState(false)
  const [gmResolvedEvents, setGmResolvedEvents] = useState<GmVoteResolvedEvent[]>([])
  const [faDirectives, setFaDirectives] = useState<GmFaDirectivePlayer[]>([])
  const [pickedPlayerNames, setPickedPlayerNames] = useState<Set<string>>(new Set())
  const [rightTab, setRightTab] = useState<'players' | 'directives' | 'transactions'>('players')
  const [tabNotify, setTabNotify] = useState<{ directives: boolean; transactions: boolean }>({ directives: false, transactions: false })
  const [faTimeLeft, setFaTimeLeft] = useState('')
  const [scoutingPlayers, setScoutingPlayers] = useState<ScoutingPlayer[]>([])
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([])

  // Find favorite team's abbr and color from draft order
  const favoriteTeam = useMemo(() => {
    if (!user?.favoriteTeamId) return null
    const team = draftOrder.find(t => t.id === user.favoriteTeamId)
    return team ? { abbr: team.abbr, color: team.color ?? '#f59e0b' } : null
  }, [user?.favoriteTeamId, draftOrder])
  const favoriteTeamAbbr = favoriteTeam?.abbr ?? null
  const favoriteTeamColor = favoriteTeam?.color ?? '#f59e0b'

  const isFavoriteOnClock = favoriteTeamAbbr != null && currentTeamAbbr === favoriteTeamAbbr

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
          setScoutingPlayers(json.data.players || [])
          setOpenSlots(json.data.openSlots || [])
        }
      } catch {
        // silent
      }
    }
    fetchScouting()
  }, [faWindowOpen, getToken])

  const handleSubmitBallot = useCallback(async (rankings: number[]): Promise<GmFaBallotResponse | null> => {
    const tok = await getToken()
    if (!tok) return null
    setBallotSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/gm/fa-ballot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ rankings }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Ballot submission failed' }))
        alert(err.detail || 'Ballot submission failed')
        return null
      }
      const json = await res.json()
      const data: GmFaBallotResponse = json.data ?? json
      setExistingBallot(data.rankings)
      // Refresh balance
      const balRes = await fetch(`${API_BASE}/currency/balance`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (balRes.ok) {
        const bj = await balRes.json()
        updateFloobits(bj.data?.balance ?? 0)
      }
      setBallotModalOpen(false)
      return data
    } catch {
      alert('Ballot submission failed')
      return null
    } finally {
      setBallotSubmitting(false)
    }
  }, [getToken, updateFloobits])

  // Initial load from REST
  useEffect(() => {
    const fetchOffseason = async () => {
      try {
        const token = await getToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE}/offseason`, { headers })
        const data = await res.json()
        setFreeAgents(data.freeAgents || [])
        const order: DraftTeam[] = data.draftOrder || []
        setDraftOrder(order)
        // Restore completed teams from backend state
        const done = new Set<string>(order.filter(t => t.complete).map(t => t.abbr))
        if (done.size > 0) setCompletedTeams(done)
        if (data.transactions?.length > 0) {
          const txs: Transaction[] = data.transactions.map((entry: any) => ({
            type: entry.type as 'pick' | 'cut',
            teamName: entry.team,
            teamAbbr: entry.teamAbbr,
            playerName: entry.player,
            position: entry.position,
            rating: entry.rating,
            tier: entry.tier,
          }))
          setTransactions(txs.reverse())
          if (txs.length > 0) setCurrentTeamAbbr(txs[0].teamAbbr)
        }
        // Restore FA window state if it's currently open
        if (data.faWindowOpen && data.faWindowEnd) {
          setFaWindowOpen(true)
          setFaWindowEnd(data.faWindowEnd * 1000) // backend sends epoch seconds
        }
        // Restore FA pool + ballot + directives for rank markers
        if (data.faPool?.length > 0) setFaPool(data.faPool)
        if (data.existingBallot) setExistingBallot(data.existingBallot)
        if (data.faDirectives?.length > 0) setFaDirectives(data.faDirectives)
      } catch {
        // silent
      }
    }
    fetchOffseason()
  }, [getToken])

  // Auto-fetch roster when a team is expanded and not yet cached
  useEffect(() => {
    if (!expandedTeam) return
    if (rosterCache[expandedTeam] !== undefined) return
    const team = draftOrder.find(t => t.abbr === expandedTeam)
    if (!team?.id) return
    setRosterLoading(prev => new Set([...prev, expandedTeam]))
    fetch(`${API_BASE}/teams/${team.id}`)
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
      setExistingBallot(null)
      setFaPool([])
      setPickedPlayerNames(new Set())
      setGmResolvedEvents([])
      setTabNotify({ directives: false, transactions: false })
      // Seed roster cache from pre-FA snapshots so rosters populate live from picks
      const snapshots = (ev as any).rosterSnapshots as Record<string, TeamRosterData> | undefined
      setRosterCache(snapshots || {})
      // Fetch fresh FA data for the new season
      const token = getToken()
      Promise.resolve(token).then(tok => {
        const headers: Record<string, string> = {}
        if (tok) headers['Authorization'] = `Bearer ${tok}`
        fetch(`${API_BASE}/offseason`, { headers })
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
      const ev = e as OffseasonPickEvent
      setFreeAgents(prev => prev.filter(fa => fa.name !== ev.playerName))
      setPickedPlayerNames(prev => new Set([...prev, ev.playerName]))
      setTransactions(prev => [{
        type: 'pick',
        teamName: ev.teamName,
        teamAbbr: ev.teamAbbr,
        playerName: ev.playerName,
        position: ev.position,
        rating: ev.rating,
        tier: ev.tier,
      }, ...prev])
      setTabNotify(prev => prev.transactions ? prev : { ...prev, transactions: rightTab !== 'transactions' })
      // Add the signed player to the local roster cache (don't re-fetch — API has post-sim state)
      setRosterCache(prev => {
        const existing = prev[ev.teamAbbr]
        if (!existing) return prev
        const updated = { ...existing }
        // Find the first empty slot matching this position
        const posSlotMap: Record<string, string[]> = {
          'QB': ['qb'], 'RB': ['rb'], 'WR': ['wr1', 'wr2'], 'TE': ['te'], 'K': ['k'],
        }
        const slots = posSlotMap[ev.position] || []
        for (const slot of slots) {
          if (!updated[slot]) {
            updated[slot] = { id: 0, name: ev.playerName, position: ev.position, rating: ev.rating, tier: ev.tier, termRemaining: 3 }
            break
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
      fetch(`${API_BASE}/offseason`)
        .then(r => r.json())
        .then(data => setFreeAgents(data.freeAgents || []))
        .catch(() => {})
    } else if (e.event === 'gm_vote_resolved') {
      const ev = e as GmVoteResolvedEvent
      setGmResolvedEvents(prev => [ev, ...prev])
    } else if (e.event === 'gm_fa_window_open') {
      const ev = e as GmFaWindowOpenEvent
      setFaWindowOpen(true)
      setFaPool(ev.faPool)
      setFaWindowEnd(Date.now() + ev.durationSeconds * 1000)
    } else if (e.event === 'gm_fa_window_close') {
      setFaWindowOpen(false)
      // Keep faPool so ballot rank markers persist through the draft
      setFaWindowEnd(null)
      setBallotModalOpen(false)
      // Fetch current FA list + directives so the draft board populates immediately
      const token = getToken()
      Promise.resolve(token).then(tok => {
        const headers: Record<string, string> = {}
        if (tok) headers['Authorization'] = `Bearer ${tok}`
        fetch(`${API_BASE}/offseason`, { headers })
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
      if (!seen.has(t.abbr) && transactions.some(tx => tx.teamAbbr === t.abbr)) {
        seen.add(t.abbr)
        ordered.push({ abbr: t.abbr, name: t.name })
      }
    }
    for (const tx of transactions) {
      if (!seen.has(tx.teamAbbr)) {
        seen.add(tx.teamAbbr)
        ordered.push({ abbr: tx.teamAbbr, name: tx.teamName })
      }
    }
    return ordered
  }, [transactions, draftOrder])

  const filteredTransactions = teamFilter
    ? transactions.filter(tx => tx.teamAbbr === teamFilter)
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
        <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Offseason</h2>
        {isComplete && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e', letterSpacing: '0.06em' }}>
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
          {faWindowOpen && openSlots.length > 0 && (
            <button
              onClick={() => setBallotModalOpen(true)}
              style={{
                padding: '5px 12px',
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {existingBallot ? 'Revise Ballot' : 'Submit Requisition'}
            </button>
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
          <button
            onClick={() => setBallotModalOpen(true)}
            style={{
              padding: '5px 12px',
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {existingBallot ? 'Revise Ballot' : 'Submit Requisition'}
          </button>
          </div>
        </div>
      )}

      {/* Side-by-side: Team Accordion + Tabbed Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Team Accordion */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Teams
            </span>
            {!isComplete && completedTeams.size > 0 && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {completedTeams.size}/{draftOrder.length} done
              </span>
            )}
          </div>

          {cyclicOrder.length === 0 ? (
            <div style={{ padding: '16px 14px', fontSize: '13px', color: '#94a3b8' }}>
              Waiting for free agency to begin…
            </div>
          ) : (
            cyclicOrder.map((team, i) => {
              const isCurrent = team.abbr === currentTeamAbbr && !isComplete
              const isDone = completedTeams.has(team.abbr) || isComplete
              const isExpanded = expandedTeam === team.abbr
              const isFavorite = team.abbr === favoriteTeamAbbr
              const roster = rosterCache[team.abbr]
              const loading = rosterLoading.has(team.abbr)
              const teamTxs = transactions.filter(tx => tx.teamAbbr === team.abbr)
              const signedNames = new Set(teamTxs.filter(tx => tx.type === 'pick').map(tx => tx.playerName))

              return (
                <div key={team.abbr}>

                  {/* Team row (clickable) */}
                  <div
                    onClick={() => setExpandedTeam(prev => prev === team.abbr ? null : team.abbr)}
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
                    <img
                      src={`${API_BASE}/teams/${team.id ?? team.abbr}/avatar?size=24&v=2`}
                      alt={team.abbr}
                      style={{ width: '24px', height: '24px', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span style={{
                      flex: 1,
                      fontSize: '13px',
                      fontWeight: isCurrent || isFavorite ? '600' : '400',
                      color: isDone && !isExpanded && !isFavorite ? '#94a3b8' : isFavorite ? favoriteTeamColor : '#e2e8f0',
                    }}>
                      {team.city ? `${team.city} ${team.name}` : team.name}
                    </span>
                    {isCurrent && (
                      <span style={{
                        fontSize: '9px', fontWeight: '700', color: '#22c55e',
                        letterSpacing: '0.08em', backgroundColor: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.35)', padding: '2px 6px', borderRadius: '3px',
                      }}>
                        ON THE CLOCK
                      </span>
                    )}
                    {isDone && !isCurrent && (
                      <span style={{
                        fontSize: '9px', fontWeight: '700', color: '#94a3b8',
                        letterSpacing: '0.06em', backgroundColor: 'rgba(148,163,184,0.1)',
                        border: '1px solid rgba(148,163,184,0.2)', padding: '2px 6px', borderRadius: '3px',
                      }}>
                        DONE
                      </span>
                    )}
                    <span style={{ fontSize: '9px', color: '#64748b', marginLeft: '2px' }}>
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
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>
                          Roster
                        </div>
                        {loading ? (
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading…</div>
                        ) : roster ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {ROSTER_SLOTS.map(({ key, label }) => {
                              const player = roster[key]
                              if (!player) {
                                return (
                                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', minWidth: '26px' }}>{label}</span>
                                    <span style={{
                                      fontSize: '9px', fontWeight: '700', color: '#ef4444',
                                      backgroundColor: 'rgba(239,68,68,0.25)', padding: '1px 5px', borderRadius: '3px',
                                    }}>OPEN</span>
                                  </div>
                                )
                              }
                              const isNewSigning = signedNames.has(player.name)
                              return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', minWidth: '26px' }}>{label}</span>
                                  <Stars stars={calcStars(player.rating)} size={9} />
                                  <PlayerHoverCard playerId={player.id} playerName={player.name}>
                                    <span style={{ flex: 1, fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>{player.name}</span>
                                  </PlayerHoverCard>
                                  {isNewSigning && (
                                    <span style={{
                                      fontSize: '8px', fontWeight: '700', color: '#22c55e',
                                      backgroundColor: 'rgba(34,197,94,0.25)', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em',
                                    }}>NEW</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Roster unavailable</div>
                        )}
                      </div>

                      {/* Per-team moves */}
                      {teamTxs.length > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            Moves this offseason
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {teamTxs.map((tx, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
                                <span style={{
                                  fontSize: '9px', fontWeight: '700', minWidth: '28px',
                                  color: tx.type === 'pick' ? '#22c55e' : '#ef4444',
                                }}>
                                  {tx.type === 'pick' ? 'SGN' : 'CUT'}
                                </span>
                                {tx.type === 'pick' && (
                                  <Stars stars={calcStars(tx.rating)} size={9} />
                                )}
                                <span style={{ flex: 1, color: '#e2e8f0' }}>{tx.playerName}</span>
                                <span style={{ color: '#64748b', fontSize: '11px' }}>{tx.position}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )
            })
          )}
        </div>

        {/* Right column: Tabbed panel */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #0f172a', display: 'flex', gap: '4px' }}>
            {(['players', 'directives', 'transactions'] as const).map(tab => {
              const isActive = rightTab === tab
              const label = tab === 'players' ? `Players${freeAgents.length > 0 ? ` (${freeAgents.length})` : ''}`
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

          {/* Players tab */}
          {rightTab === 'players' && (
            <>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #0f172a', display: 'flex', gap: '4px' }}>
                {POSITIONS.map(pos => (
                  <button key={pos} style={posPillStyle(pos)} onClick={() => setPosFilter(pos)}>
                    {pos}
                  </button>
                ))}
              </div>
              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '500px', overflowY: 'auto' }}>
                {filteredAgents.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', padding: '10px 6px' }}>
                    {freeAgents.length === 0 ? 'Waiting for free agency…' : 'No players at this position.'}
                  </div>
                ) : (
                  filteredAgents.map((fa, i) => {
                    const posRank = directiveRankMap.get(fa.name) ?? null
                    return (
                      <div
                        key={`${fa.name}-${i}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', padding: '5px 8px', fontSize: '13px' }}
                      >
                        <Stars stars={calcStars(fa.rating)} />
                        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {fa.id ? (
                            <PlayerHoverCard playerId={fa.id} playerName={fa.name}>
                              <span style={{ color: '#e2e8f0', cursor: 'pointer' }}>{fa.name}</span>
                            </PlayerHoverCard>
                          ) : (
                            <span style={{ color: '#e2e8f0' }}>{fa.name}</span>
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
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {/* Board Directives */}
              {faDirectives.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                            <span style={{ fontSize: '12px', color: isPicked ? '#94a3b8' : '#e2e8f0' }}>
                              {p.name}
                            </span>
                            {signedByUs && (
                              <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: '700', letterSpacing: '0.04em' }}>
                                SIGNED
                              </span>
                            )}
                            {takenByOther && (
                              <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: '700', letterSpacing: '0.04em' }}>
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
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                            letterSpacing: '0.04em',
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
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {filteredTransactions.map((tx, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
                          borderBottom: '1px solid #0f172a',
                          backgroundColor: tx.type === 'pick' ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
                        }}
                      >
                        <span style={{
                          fontSize: '9px', fontWeight: '700', letterSpacing: '0.06em', minWidth: '28px',
                          color: tx.type === 'pick' ? '#22c55e' : '#ef4444',
                        }}>
                          {tx.type === 'pick' ? 'SGN' : 'CUT'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', minWidth: '32px' }}>
                          {tx.teamAbbr}
                        </span>
                        <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>{tx.playerName}</span>
                        {tx.type === 'pick' && (
                          <Stars stars={calcStars(tx.rating)} size={13} />
                        )}
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{tx.position}</span>
                      </div>
                    ))}
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

      {/* FA Ballot Modal */}
      <FaBallotModal
        visible={ballotModalOpen}
        onClose={() => setBallotModalOpen(false)}
        openSlots={openSlots}
        scoutingPlayers={scoutingPlayers}
        faWindowEnd={faWindowEnd}
        onSubmit={handleSubmitBallot}
        submitting={ballotSubmitting}
        existingBallot={existingBallot}
      />
    </div>
  )
}
