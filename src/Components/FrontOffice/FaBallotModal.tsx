import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Stars, calcStars } from '@/Components/Stars'
import { GM_FA_BALLOT_MAX_RANKINGS, GM_FA_BALLOT_COST } from '@/types/gm'

const MAX_PICKS_PER_POSITION = 3

interface PlayerStats {
  gamesPlayed: number
  fantasyPoints: number
  passingYards?: number
  passingTds?: number
  passingInts?: number
  rushingYards?: number
  rushingTds?: number
  receivingYards?: number
  receivingTds?: number
  receptions?: number
  fgMade?: number
  fgAttempted?: number
  fgPct?: number
}

export interface ScoutingPlayer {
  id: number
  name: string
  position: string
  rating: number
  tier: string
  performanceRating: number
  ratingDelta: number
  stats: PlayerStats | null
  isRookie?: boolean
  isProspect?: boolean
  // True when the candidate is a rostered player who will likely hit FA —
  // either in their walk year with no resign-vote consensus, OR cut-voted
  // by the board regardless of contract.
  isProjected?: boolean
  // 'walk_year' = contract expiring | 'cut_vote' = board pushing to cut
  projectedReason?: 'walk_year' | 'cut_vote'
  currentTeam?: string  // Set on projected candidates — the team they're leaving from
}

export interface OpenSlot {
  slot: string
  position: string
  // True when this slot is projected to open at season end:
  //   - 'vacant' — actually empty right now
  //   - 'walk_year' — incumbent's contract is expiring, no strong resign vote
  //   - 'cut_vote_likely' — board pushing to cut incumbent regardless of contract
  projected?: boolean
  reason?: 'vacant' | 'walk_year' | 'cut_vote_likely'
  incumbent?: {
    id: number
    name: string
    rating: number
    termRemaining: number
  }
}

interface FaBallotModalProps {
  visible: boolean
  onClose: () => void
  openSlots: OpenSlot[]
  scoutingPlayers: ScoutingPlayer[]
  faWindowEnd: number | null
  onSubmit: (rankings: number[]) => Promise<any>
  submitting: boolean
  existingBallot?: number[] | null
}

const FaBallotModal: React.FC<FaBallotModalProps> = ({
  visible,
  onClose,
  openSlots,
  scoutingPlayers,
  faWindowEnd,
  onSubmit,
  submitting,
  existingBallot,
}) => {
  // Map: slot key -> ordered array of player IDs (ranked 1st, 2nd, 3rd)
  const [slotRankings, setSlotRankings] = useState<Record<string, number[]>>({})
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('')

  // Initialize from existing ballot + auto-select first slot
  useEffect(() => {
    if (!visible) return
    if (existingBallot && existingBallot.length > 0) {
      // Restore: distribute existing ballot IDs to slots by matching position
      const rankings: Record<string, number[]> = {}
      for (const slot of openSlots) rankings[slot.slot] = []
      const usedIds = new Set<number>()
      for (const slot of openSlots) {
        for (const id of existingBallot) {
          if (usedIds.has(id)) continue
          const p = scoutingPlayers.find(sp => sp.id === id)
          if (p && p.position === slot.position && rankings[slot.slot].length < MAX_PICKS_PER_POSITION) {
            rankings[slot.slot].push(id)
            usedIds.add(id)
          }
        }
      }
      setSlotRankings(rankings)
    } else {
      const empty: Record<string, number[]> = {}
      for (const slot of openSlots) empty[slot.slot] = []
      setSlotRankings(empty)
    }
    if (openSlots.length > 0) setActiveSlot(openSlots[0].slot)
  }, [visible, existingBallot, openSlots, scoutingPlayers])

  // Countdown timer
  useEffect(() => {
    if (!visible || !faWindowEnd) return
    const tick = () => {
      const remaining = Math.max(0, faWindowEnd - Date.now())
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
      if (remaining <= 0) onClose()
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [visible, faWindowEnd, onClose])

  // ESC to close
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const activePosition = useMemo(() => {
    if (!activeSlot) return null
    return openSlots.find(s => s.slot === activeSlot)?.position ?? null
  }, [activeSlot, openSlots])

  // All player IDs selected across all slots
  const allSelectedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const arr of Object.values(slotRankings)) {
      for (const id of arr) ids.add(id)
    }
    return ids
  }, [slotRankings])

  // Available players for the active position (exclude already-selected anywhere).
  // Dedupe by ID defensively — if the backend ever emits a player in multiple
  // categories (FA pool + projected FA, or prospect + FA), the first entry
  // wins. Without this dedupe a stale/inconsistent backend state could result
  // in duplicate rows visible in the ballot picker.
  const availablePlayers = useMemo(() => {
    if (!activePosition) return []
    const seen = new Set<number>()
    const filtered: ScoutingPlayer[] = []
    for (const p of scoutingPlayers) {
      if (p.position !== activePosition) continue
      if (allSelectedIds.has(p.id)) continue
      if (seen.has(p.id)) continue
      seen.add(p.id)
      filtered.push(p)
    }
    filtered.sort((a, b) => b.rating - a.rating)
    return filtered
  }, [scoutingPlayers, activePosition, allSelectedIds])

  const activeRankings = activeSlot ? (slotRankings[activeSlot] || []) : []
  const canAddMore = activeRankings.length < MAX_PICKS_PER_POSITION

  const addPlayer = useCallback((playerId: number) => {
    if (!activeSlot) return
    setSlotRankings(prev => {
      const current = prev[activeSlot] || []
      if (current.length >= MAX_PICKS_PER_POSITION) return prev
      return { ...prev, [activeSlot]: [...current, playerId] }
    })
  }, [activeSlot])

  const removePlayer = useCallback((slot: string, playerId: number) => {
    setSlotRankings(prev => ({
      ...prev,
      [slot]: (prev[slot] || []).filter(id => id !== playerId),
    }))
  }, [])

  const clearSlot = useCallback((slot: string) => {
    setSlotRankings(prev => ({ ...prev, [slot]: [] }))
    setActiveSlot(slot)
  }, [])

  const handleSubmit = async () => {
    // Build flat rankings: concatenate per-slot rankings in slot order
    const rankings: number[] = []
    for (const slot of openSlots) {
      for (const id of (slotRankings[slot.slot] || [])) {
        rankings.push(id)
      }
    }
    if (rankings.length === 0) return
    await onSubmit(rankings)
  }

  const totalPicks = Object.values(slotRankings).reduce((sum, arr) => sum + arr.length, 0)
  const filledSlots = Object.values(slotRankings).filter(arr => arr.length > 0).length
  const isUpdate = existingBallot && existingBallot.length > 0
  const cost = isUpdate ? 0 : GM_FA_BALLOT_COST

  if (!visible) return null

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'pressStart',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '880px',
          maxHeight: '85vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Free Agent Requisition
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
              Rank up to {MAX_PICKS_PER_POSITION} candidates per position.
              {isUpdate ? ' Revisions: complimentary.' : ` First filing: ${GM_FA_BALLOT_COST} Floobits.`}
            </div>
          </div>
          {faWindowEnd && (
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: timeLeft.startsWith('0:') ? '#ef4444' : '#f59e0b',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeLeft}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* Left: Open position slots with ranked picks */}
          <div style={{ borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Positions
              </span>
            </div>
            <div style={{ padding: '8px' }}>
              {openSlots.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '14px', textAlign: 'center' }}>
                  No open positions
                </div>
              ) : openSlots.map(slot => {
                const picks = slotRankings[slot.slot] || []
                const isActive = activeSlot === slot.slot
                return (
                  <div
                    key={slot.slot}
                    onClick={() => setActiveSlot(slot.slot)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      backgroundColor: isActive ? '#1e293b' : 'transparent',
                      border: isActive ? '1px solid #3b82f6' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: picks.length > 0 ? '#22c55e' : (isActive ? '#3b82f6' : '#94a3b8'),
                      }}>
                        {slot.position}
                        {slot.slot.includes('2') && <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>2</span>}
                      </span>
                      {picks.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); clearSlot(slot.slot) }}
                          style={{
                            background: 'none', border: 'none', fontFamily: 'inherit',
                            color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 4px',
                          }}
                        >
                          &#215;
                        </button>
                      )}
                    </div>
                    {picks.length > 0 ? (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {picks.map((id, idx) => {
                          const player = scoutingPlayers.find(p => p.id === id)
                          if (!player) return null
                          return (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#64748b',
                                minWidth: '18px',
                              }}>
                                {idx + 1}.
                              </span>
                              <Stars stars={calcStars(player.rating)} size={11} />
                              <span style={{ fontSize: '12px', color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {player.name}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removePlayer(slot.slot, id) }}
                                style={{
                                  background: 'none', border: 'none', fontFamily: 'inherit',
                                  color: '#64748b', cursor: 'pointer', fontSize: '12px', padding: '0 4px',
                                }}
                              >
                                &#215;
                              </button>
                            </div>
                          )
                        })}
                        {picks.length < MAX_PICKS_PER_POSITION && (
                          <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', paddingLeft: '24px' }}>
                            {MAX_PICKS_PER_POSITION - picks.length} more slot{picks.length < MAX_PICKS_PER_POSITION - 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', fontStyle: 'italic' }}>
                        No candidates ranked
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Available players for active position */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activePosition ? `Available ${activePosition}s` : 'Select a position'}
              </span>
              {activePosition && (
                <span style={{ fontSize: '13px', color: canAddMore ? '#94a3b8' : '#f59e0b' }}>
                  {canAddMore
                    ? `${activeRankings.length}/${MAX_PICKS_PER_POSITION} ranked`
                    : 'Ballot full'}
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
              {!activePosition ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>
                  Select an open position on the left
                </div>
              ) : availablePlayers.length === 0 && !canAddMore ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>
                  Ballot full for {activePosition} — {MAX_PICKS_PER_POSITION} candidates ranked
                </div>
              ) : availablePlayers.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>
                  No available players at {activePosition}
                </div>
              ) : (
                availablePlayers.map(p => (
                  <div
                    key={p.id}
                    onClick={() => canAddMore && addPlayer(p.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '6px',
                      cursor: canAddMore ? 'pointer' : 'not-allowed',
                      marginBottom: '2px',
                      borderBottom: '1px solid #1a2640',
                      opacity: canAddMore ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => { if (canAddMore) e.currentTarget.style.backgroundColor = '#1e293b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    {/* Row 1: Stars + Name + Performance/type indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Stars stars={calcStars(p.rating)} size={14} />
                      <span style={{ flex: 1, fontSize: '14px', color: '#e2e8f0', fontWeight: '600' }}>{p.name}</span>
                      {p.isProspect ? (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Prospect
                        </span>
                      ) : p.isRookie ? (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Rookie
                        </span>
                      ) : p.isProjected ? (
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {p.projectedReason === 'cut_vote' ? 'Cut Vote' : 'Walk Year'}
                        </span>
                      ) : (
                        <PerformanceBadge delta={p.ratingDelta} />
                      )}
                    </div>
                    {/* Row 2: Stat line, prospect note, rookie label, or walk-year context */}
                    {p.isProspect ? (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#a78bfa', fontStyle: 'italic' }}>
                        Pipeline prospect — rank to promote instead of sign a FA
                      </div>
                    ) : p.isRookie ? (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#38bdf8', fontStyle: 'italic' }}>
                        No professional record
                      </div>
                    ) : p.isProjected ? (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#fbbf24', fontStyle: 'italic' }}>
                        {p.currentTeam ? `Currently on ${p.currentTeam} — ` : ''}
                        {p.projectedReason === 'cut_vote'
                          ? 'board pushing to cut'
                          : 'contract expires at season end'}
                      </div>
                    ) : p.stats ? (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <StatLine position={p.position} stats={p.stats} />
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                        No stats recorded
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer: Submit */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {filledSlots}/{openSlots.length} positions filled — {totalPicks} total ranked
          </span>
          <button
            onClick={handleSubmit}
            disabled={totalPicks === 0 || submitting}
            style={{
              padding: '12px 28px',
              backgroundColor: totalPicks === 0 ? '#1e293b' : '#f59e0b',
              color: totalPicks === 0 ? '#475569' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: '700',
              cursor: totalPicks === 0 ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting
              ? 'Submitting...'
              : isUpdate
                ? 'Revise Requisition'
                : `Submit Requisition \u2014 ${cost} F`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Helper components ── */

const PerformanceBadge: React.FC<{ delta: number }> = ({ delta }) => {
  if (delta > 5) {
    return (
      <span style={{ fontSize: '13px', fontWeight: '700', color: '#22c55e' }} title={`+${delta} over expected`}>
        <svg width="12" height="12" viewBox="0 0 10 10" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
          <path d="M5 1 L9 7 L1 7 Z" fill="#22c55e" />
        </svg>
        +{delta}
      </span>
    )
  }
  if (delta < -5) {
    return (
      <span style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }} title={`${delta} under expected`}>
        <svg width="12" height="12" viewBox="0 0 10 10" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
          <path d="M5 9 L9 3 L1 3 Z" fill="#ef4444" />
        </svg>
        {delta}
      </span>
    )
  }
  return (
    <span style={{ fontSize: '13px', color: '#94a3b8' }} title="Performed as expected">
      --
    </span>
  )
}

const StatLine: React.FC<{ position: string; stats: PlayerStats }> = ({ stats, position }) => {
  const parts: string[] = []
  if (position === 'QB') {
    if (stats.passingYards !== undefined) parts.push(`${stats.passingYards.toLocaleString()} yds`)
    if (stats.passingTds !== undefined) parts.push(`${stats.passingTds} TD`)
    if (stats.passingInts !== undefined) parts.push(`${stats.passingInts} INT`)
  } else if (position === 'RB') {
    if (stats.rushingYards !== undefined) parts.push(`${stats.rushingYards.toLocaleString()} yds`)
    if (stats.rushingTds !== undefined) parts.push(`${stats.rushingTds} TD`)
  } else if (position === 'WR' || position === 'TE') {
    if (stats.receptions !== undefined) parts.push(`${stats.receptions} rec`)
    if (stats.receivingYards !== undefined) parts.push(`${stats.receivingYards.toLocaleString()} yds`)
    if (stats.receivingTds !== undefined) parts.push(`${stats.receivingTds} TD`)
  } else if (position === 'K') {
    if (stats.fgMade !== undefined && stats.fgAttempted !== undefined) parts.push(`${stats.fgMade}/${stats.fgAttempted} FG`)
    if (stats.fgPct !== undefined && stats.fgPct > 0) parts.push(`${stats.fgPct}%`)
  }
  if (stats.fantasyPoints) parts.push(`${stats.fantasyPoints} FP`)
  if (stats.gamesPlayed) parts.push(`${stats.gamesPlayed} GP`)

  return <>{parts.join(' / ')}</>
}

export default FaBallotModal
