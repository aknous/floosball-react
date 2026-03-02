import React, { useState, useEffect, useMemo } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { Stars, calcStars } from './Stars'
import type {
  OffseasonStartEvent,
  OffseasonPickEvent,
  OffseasonCutEvent,
  OffseasonTeamCompleteEvent,
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

interface FreeAgent {
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
  abbr: string
  id?: number
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

  // Initial load from REST
  useEffect(() => {
    fetch(`${API_BASE}/offseason`)
      .then(r => r.json())
      .then(data => {
        setFreeAgents(data.freeAgents || [])
        setDraftOrder(data.draftOrder || [])
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
      })
      .catch(() => {})
  }, [])

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
      setRosterCache({})
    } else if (e.event === 'offseason_pick') {
      const ev = e as OffseasonPickEvent
      setCurrentTeamAbbr(ev.teamAbbr)
      setFreeAgents(prev => prev.filter(fa => fa.name !== ev.playerName))
      setTransactions(prev => [{
        type: 'pick',
        teamName: ev.teamName,
        teamAbbr: ev.teamAbbr,
        playerName: ev.playerName,
        position: ev.position,
        rating: ev.rating,
        tier: ev.tier,
      }, ...prev])
      setRosterCache(prev => { const n = { ...prev }; delete n[ev.teamAbbr]; return n })
    } else if (e.event === 'offseason_cut') {
      const ev = e as OffseasonCutEvent
      setCurrentTeamAbbr(ev.teamAbbr)
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
    }
  }, [event])

  // Rotate draft order so the "on the clock" team is first
  const cyclicOrder = useMemo(() => {
    if (!currentTeamAbbr || draftOrder.length === 0) return draftOrder
    const idx = draftOrder.findIndex(t => t.abbr === currentTeamAbbr)
    if (idx <= 0) return draftOrder
    return [...draftOrder.slice(idx), ...draftOrder.slice(0, idx)]
  }, [draftOrder, currentTeamAbbr])

  const filteredAgents = posFilter === 'ALL'
    ? freeAgents
    : freeAgents.filter(fa => fa.position === posFilter)

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

      {/* Side-by-side: Team Accordion + Free Agents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Team Accordion */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Teams
            </span>
            {!isComplete && completedTeams.size > 0 && (
              <span style={{ fontSize: '11px', color: '#475569' }}>
                {completedTeams.size}/{draftOrder.length} done
              </span>
            )}
          </div>

          {cyclicOrder.length === 0 ? (
            <div style={{ padding: '16px 14px', fontSize: '13px', color: '#475569' }}>
              Waiting for free agency to begin…
            </div>
          ) : (
            cyclicOrder.map((team, i) => {
              const isCurrent = i === 0 && !isComplete && currentTeamAbbr !== null
              const isDone = completedTeams.has(team.abbr) || isComplete
              const isExpanded = expandedTeam === team.abbr
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
                      borderLeft: isCurrent ? '3px solid #22c55e' : '3px solid transparent',
                      borderBottom: '1px solid #0f172a',
                      backgroundColor: isCurrent
                        ? 'rgba(34,197,94,0.06)'
                        : isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                      opacity: isDone && !isExpanded ? 0.4 : 1,
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
                      fontWeight: isCurrent ? '600' : '400',
                      color: isDone && !isExpanded ? '#475569' : '#e2e8f0',
                    }}>
                      {team.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#475569' }}>{team.abbr}</span>
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
                      <span style={{ fontSize: '10px', color: '#334155', fontWeight: '600' }}>✓</span>
                    )}
                    <span style={{ fontSize: '9px', color: '#334155', marginLeft: '2px' }}>
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
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>
                          Roster
                        </div>
                        {loading ? (
                          <div style={{ fontSize: '12px', color: '#475569' }}>Loading…</div>
                        ) : roster ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {ROSTER_SLOTS.map(({ key, label }) => {
                              const player = roster[key]
                              if (!player) {
                                return (
                                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', minWidth: '26px' }}>{label}</span>
                                    <span style={{
                                      fontSize: '9px', fontWeight: '700', color: '#ef4444',
                                      backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                                      padding: '1px 5px', borderRadius: '3px',
                                    }}>OPEN</span>
                                  </div>
                                )
                              }
                              const isNewSigning = signedNames.has(player.name)
                              const isExpiring = player.termRemaining === 1
                              return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', minWidth: '26px' }}>{label}</span>
                                  <Stars stars={calcStars(player.rating)} size={9} />
                                  <span style={{ flex: 1, fontSize: '12px', color: '#e2e8f0' }}>{player.name}</span>
                                  <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{player.rating}</span>
                                  {isNewSigning && (
                                    <span style={{
                                      fontSize: '8px', fontWeight: '700', color: '#22c55e',
                                      backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                                      padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em',
                                    }}>NEW</span>
                                  )}
                                  {isExpiring && !isNewSigning && (
                                    <span style={{
                                      fontSize: '8px', fontWeight: '700', color: '#f59e0b',
                                      backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                                      padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em',
                                    }}>EXP</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#475569' }}>Roster unavailable</div>
                        )}
                      </div>

                      {/* Per-team moves */}
                      {teamTxs.length > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
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
                                <span style={{ color: '#94a3b8', minWidth: '24px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tx.rating}</span>
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

        {/* Right column: Free Agents + Transactions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Free Agents {freeAgents.length > 0 ? `(${freeAgents.length})` : ''}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {POSITIONS.map(pos => (
                <button key={pos} style={posPillStyle(pos)} onClick={() => setPosFilter(pos)}>
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '400px', overflowY: 'auto' }}>
            {filteredAgents.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '13px', padding: '10px 6px' }}>
                {freeAgents.length === 0 ? 'Waiting for free agency…' : 'No players at this position.'}
              </div>
            ) : (
              filteredAgents.map((fa, i) => (
                <div
                  key={`${fa.name}-${i}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', padding: '5px 8px', fontSize: '13px' }}
                >
                  <Stars stars={calcStars(fa.rating)} />
                  <span style={{ flex: 1, color: '#e2e8f0' }}>{fa.name}</span>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>{fa.position}</span>
                  <span style={{ color: '#94a3b8', minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fa.rating}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transaction feed */}
        {transactions.length > 0 && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
              All Transactions
            </span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button style={teamPillStyle(null)} onClick={() => setTeamFilter(null)}>ALL</button>
              {teamOptions.map(t => (
                <button key={t.abbr} style={teamPillStyle(t.abbr)} onClick={() => setTeamFilter(t.abbr)}>
                  {t.abbr}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#475569', marginLeft: 'auto' }}>
              {filteredTransactions.length} move{filteredTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
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
                <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tx.rating}</span>
              </div>
            ))}
          </div>
        </div>
        )}
        </div>{/* end right column */}

      </div>{/* end side-by-side grid */}

    </div>
  )
}
