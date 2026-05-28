import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Stars, calcStars } from '@/Components/Stars'
import { GM_FA_BALLOT_MAX_RANKINGS, GM_FA_BALLOT_COST } from '@/types/gm'
import { attitudeTier, resilienceTier, pressureHandlingTier } from '@/utils/mentalProfile'

export interface PlayerStats {
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
  isProjected?: boolean
  projectedReason?: 'walk_year' | 'cut_vote'
  currentTeam?: string
  // Mental snapshot — surfaced as badges so fans can spot toxic personalities
  // before ranking them. Optional: legacy ballot rows from older API versions
  // can omit these without breaking the row layout.
  attitude?: number
  mood?: string
  moodTier?: string
  resilience?: number
  pressureHandling?: number
}

export interface OpenSlot {
  slot: string
  position: string
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

const POS_CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  QB: { bg: 'rgba(59,130,246,0.18)', fg: '#60a5fa' },
  RB: { bg: 'rgba(34,197,94,0.18)', fg: '#4ade80' },
  WR: { bg: 'rgba(245,158,11,0.18)', fg: '#fbbf24' },
  TE: { bg: 'rgba(168,85,247,0.18)', fg: '#c084fc' },
  K: { bg: 'rgba(148,163,184,0.18)', fg: '#cbd5e1' },
}

const PositionChip: React.FC<{ position: string }> = ({ position }) => {
  const c = POS_CHIP_COLORS[position] || { bg: '#1e293b', fg: '#94a3b8' }
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700,
      color: c.fg, backgroundColor: c.bg,
      padding: '2px 6px', borderRadius: '4px',
      letterSpacing: '0.04em',
      minWidth: 28, textAlign: 'center' as const,
    }}>
      {position}
    </span>
  )
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
  const [ranking, setRanking] = useState<number[]>([])
  const [posFilter, setPosFilter] = useState<'ALL' | string>('ALL')
  const [timeLeft, setTimeLeft] = useState('')

  // Set of positions that have at least one open slot.
  const openPositionSet = useMemo(() => {
    const s = new Set<string>()
    for (const slot of openSlots) s.add(slot.position)
    return s
  }, [openSlots])

  // Slot count per position so the header can show "QB ×1 · WR ×2".
  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const slot of openSlots) {
      counts[slot.position] = (counts[slot.position] || 0) + 1
    }
    return counts
  }, [openSlots])

  // Initialize ranking from existing ballot, filtered to currently-open positions.
  useEffect(() => {
    if (!visible) return
    if (existingBallot && existingBallot.length > 0) {
      const valid = existingBallot.filter(id => {
        const p = scoutingPlayers.find(sp => sp.id === id)
        return p && openPositionSet.has(p.position)
      })
      setRanking(valid)
    } else {
      setRanking([])
    }
  }, [visible, existingBallot, scoutingPlayers, openPositionSet])

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

  const rankedSet = useMemo(() => new Set(ranking), [ranking])

  // Available candidates: open positions only, not already ranked, optional
  // user-applied position filter. Prospects up top, FAs below.
  const { prospects, others } = useMemo(() => {
    const seen = new Set<number>()
    const prospectList: ScoutingPlayer[] = []
    const otherList: ScoutingPlayer[] = []
    for (const p of scoutingPlayers) {
      if (!openPositionSet.has(p.position)) continue
      if (rankedSet.has(p.id)) continue
      if (posFilter !== 'ALL' && p.position !== posFilter) continue
      if (seen.has(p.id)) continue
      seen.add(p.id)
      if (p.isProspect) prospectList.push(p)
      else otherList.push(p)
    }
    prospectList.sort((a, b) => b.rating - a.rating)
    otherList.sort((a, b) => b.rating - a.rating)
    return { prospects: prospectList, others: otherList }
  }, [scoutingPlayers, openPositionSet, rankedSet, posFilter])

  const canAddMore = ranking.length < GM_FA_BALLOT_MAX_RANKINGS

  const addPlayer = useCallback((playerId: number) => {
    setRanking(prev => {
      if (prev.includes(playerId)) return prev
      if (prev.length >= GM_FA_BALLOT_MAX_RANKINGS) return prev
      return [...prev, playerId]
    })
  }, [])

  const removePlayer = useCallback((playerId: number) => {
    setRanking(prev => prev.filter(id => id !== playerId))
  }, [])

  const movePlayer = useCallback((playerId: number, direction: -1 | 1) => {
    setRanking(prev => {
      const idx = prev.indexOf(playerId)
      if (idx < 0) return prev
      const swapIdx = idx + direction
      if (swapIdx < 0 || swapIdx >= prev.length) return prev
      const next = prev.slice()
      next[idx] = prev[swapIdx]
      next[swapIdx] = prev[idx]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setRanking([]), [])

  const handleSubmit = async () => {
    if (ranking.length === 0) return
    await onSubmit(ranking)
  }

  const isUpdate = existingBallot && existingBallot.length > 0
  const cost = isUpdate ? 0 : GM_FA_BALLOT_COST

  if (!visible) return null

  // Position filter chips: ALL + every distinct open position.
  const posFilterOptions: string[] = ['ALL', ...Array.from(openPositionSet).sort()]

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
          maxWidth: '1040px',
          height: '85vh',
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
              Rank the players you want signed. Front office goes after #1 first, works down the list.
              {isUpdate ? ' Revisions are free.' : ` First ballot costs ${GM_FA_BALLOT_COST} Floobits.`}
            </div>
            {openSlots.length > 0 && (
              <div style={{
                fontSize: '12px', color: '#cbd5e1', marginTop: '8px',
                display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
              }}>
                <span style={{ color: '#94a3b8' }}>Open slots:</span>
                {Object.entries(slotCounts).map(([pos, n]) => (
                  <span key={pos} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <PositionChip position={pos} />
                    {n > 1 && <span style={{ color: '#94a3b8' }}>×{n}</span>}
                  </span>
                ))}
              </div>
            )}
            <div style={{
              fontSize: '12px', color: '#cbd5e1', marginTop: '10px',
              padding: '8px 10px', backgroundColor: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.25)', borderRadius: '6px',
              lineHeight: 1.5,
            }}>
              <div style={{ marginBottom: '4px' }}>
                The team works your list top-down. Once a position fills up, anyone else you ranked there gets skipped.
              </div>
              <div>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>No ballot:</span>{' '}
                the team signs the best available player at any open slot.
              </div>
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
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* Left: Ranked list */}
          <div style={{ borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Priority
              </span>
              <span style={{ fontSize: '12px', color: canAddMore ? '#94a3b8' : '#f59e0b' }}>
                {ranking.length}/{GM_FA_BALLOT_MAX_RANKINGS}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {ranking.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748b', padding: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                  Pick players from the right to start your list. Use the arrows to reorder.
                </div>
              ) : (
                ranking.map((id, idx) => {
                  const player = scoutingPlayers.find(p => p.id === id)
                  if (!player) return null
                  return (
                    <div key={id} style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      marginBottom: '5px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : '#64748b',
                        minWidth: '24px',
                      }}>
                        {idx + 1}.
                      </span>
                      <PositionChip position={player.position} />
                      <Stars stars={calcStars(player.rating)} size={18} />
                      <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.name}
                      </span>
                      <button
                        onClick={() => movePlayer(id, -1)}
                        disabled={idx === 0}
                        title="Move up"
                        style={{
                          background: 'none', border: 'none', fontFamily: 'inherit',
                          color: idx === 0 ? '#334155' : '#cbd5e1',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '18px', padding: '2px 6px', lineHeight: 1,
                        }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => movePlayer(id, 1)}
                        disabled={idx === ranking.length - 1}
                        title="Move down"
                        style={{
                          background: 'none', border: 'none', fontFamily: 'inherit',
                          color: idx === ranking.length - 1 ? '#334155' : '#cbd5e1',
                          cursor: idx === ranking.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '18px', padding: '2px 6px', lineHeight: 1,
                        }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removePlayer(id)}
                        title="Remove"
                        style={{
                          background: 'none', border: 'none', fontFamily: 'inherit',
                          color: '#94a3b8', cursor: 'pointer',
                          fontSize: '18px', padding: '2px 6px', lineHeight: 1,
                        }}
                      >
                        &#215;
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            {ranking.length > 0 && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #1e293b', flexShrink: 0 }}>
                <button
                  onClick={clearAll}
                  style={{
                    background: 'none', border: 'none', color: '#ef4444',
                    fontFamily: 'inherit', fontSize: '11px', cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Right: Available candidates */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '12px', color: '#64748b', marginRight: '4px' }}>Filter:</span>
              {posFilterOptions.map(opt => {
                const active = posFilter === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setPosFilter(opt as any)}
                    style={{
                      fontSize: '11px', fontWeight: '600',
                      padding: '3px 8px', borderRadius: '4px',
                      backgroundColor: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                      color: active ? '#60a5fa' : '#94a3b8',
                      border: '1px solid ' + (active ? 'rgba(59,130,246,0.4)' : '#334155'),
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
              {openSlots.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>
                  No open positions to vote on
                </div>
              ) : prospects.length + others.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>
                  {canAddMore ? 'No more candidates available' : 'Ballot full'}
                </div>
              ) : (
                <>
                  {prospects.length > 0 && (
                    <>
                      <SectionDivider label="Prospects" count={prospects.length} color="#a78bfa" />
                      {prospects.map(p => (
                        <PlayerRow
                          key={p.id}
                          player={p}
                          canAddMore={canAddMore}
                          onClick={() => canAddMore && addPlayer(p.id)}
                        />
                      ))}
                    </>
                  )}
                  {others.length > 0 && (
                    <>
                      <SectionDivider label="Free Agents" count={others.length} color="#22c55e" />
                      {others.map(p => (
                        <PlayerRow
                          key={p.id}
                          player={p}
                          canAddMore={canAddMore}
                          onClick={() => canAddMore && addPlayer(p.id)}
                        />
                      ))}
                    </>
                  )}
                </>
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
            {ranking.length} ranked
          </span>
          <button
            onClick={handleSubmit}
            disabled={ranking.length === 0 || submitting}
            style={{
              padding: '12px 28px',
              backgroundColor: ranking.length === 0 ? '#1e293b' : '#f59e0b',
              color: ranking.length === 0 ? '#475569' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: '700',
              cursor: ranking.length === 0 ? 'not-allowed' : 'pointer',
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

const SectionDivider: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 4px 6px',
  }}>
    <span style={{
      fontSize: '11px',
      fontWeight: 700,
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}>
      {label}
    </span>
    <span style={{ fontSize: '11px', color: '#64748b' }}>
      {count}
    </span>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }} />
  </div>
)

const MentalPill: React.FC<{ label: string; color: string; title?: string }> = ({ label, color, title }) => (
  <span
    title={title}
    style={{
      fontSize: '10px',
      fontWeight: 700,
      color,
      backgroundColor: `${color}1f`,
      padding: '1px 6px',
      borderRadius: '4px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
)

const MentalBadges: React.FC<{ player: ScoutingPlayer }> = ({ player: p }) => {
  // Skip the row entirely when the backend didn't ship any mental data —
  // older API versions, or generated rows that lack a personality.
  const hasAny = p.attitude != null || p.resilience != null || p.pressureHandling != null
  if (!hasAny) return null

  const pills: React.ReactNode[] = []
  if (p.attitude != null) {
    const t = attitudeTier(p.attitude)
    pills.push(
      <MentalPill
        key="attitude"
        label={`Presence: ${t.label}`}
        color={t.color}
        title="Locker-room presence. Toxic players drag the room, Leaders lift it."
      />
    )
  }
  if (p.resilience != null) {
    const t = resilienceTier(p.resilience)
    // Only surface resilience when it's at the extremes — the middle tiers
    // ('Steady') are the norm and add noise to the row.
    if (p.resilience >= 80 || p.resilience < 65) {
      pills.push(
        <MentalPill
          key="resilience"
          label={t.label}
          color={t.color}
          title="Resilience — how well they shake off bad games."
        />
      )
    }
  }
  if (p.pressureHandling != null && (p.pressureHandling >= 2 || p.pressureHandling < -1)) {
    const t = pressureHandlingTier(p.pressureHandling)
    pills.push(
      <MentalPill
        key="pressure"
        label={t.label}
        color={t.color}
        title="Pressure handling — clutch vs. choke under late-game stress."
      />
    )
  }

  return (
    <div style={{ marginTop: '5px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {pills}
    </div>
  )
}

const PlayerRow: React.FC<{
  player: ScoutingPlayer
  canAddMore: boolean
  onClick: () => void
}> = ({ player: p, canAddMore, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '10px 12px',
      borderRadius: '6px',
      cursor: canAddMore ? 'pointer' : 'not-allowed',
      marginBottom: '2px',
      borderBottom: '1px solid #1a2640',
      opacity: canAddMore ? 1 : 0.5,
    }}
    onMouseEnter={(e) => { if (canAddMore) e.currentTarget.style.backgroundColor = '#1e293b' }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
  >
    {/* Row 1: Position + Stars + Name + Performance/type indicator */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <PositionChip position={p.position} />
      <Stars stars={calcStars(p.rating)} size={18} />
      <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>{p.name}</span>
      {p.isProspect ? (
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Prospect
        </span>
      ) : p.isRookie ? (
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rookie
        </span>
      ) : p.isProjected ? (
        // Projected FAs (walk-year / cut-vote rostered players on other
        // teams) are still playing this season — show both the status
        // tag AND their performance delta so fans can read "starter on
        // a contending team, over-performing his rating" at a glance.
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {p.projectedReason === 'cut_vote' ? 'Cut Vote' : 'Walk Year'}
          </span>
          {p.stats && <PerformanceBadge delta={p.ratingDelta} />}
        </span>
      ) : p.stats ? (
        <PerformanceBadge delta={p.ratingDelta} />
      ) : null}
    </div>
    {/* Row 2: Mental snapshot — presence (attitude), mood, plus optional
        resilience/pressure highlights. Lets fans spot toxic personalities
        before ranking them. Hidden when the backend ships no mental data. */}
    <MentalBadges player={p} />
    {/* Row 3: Stat line, prospect note, rookie label, or walk-year context. */}
    {p.isProspect ? (
      <div style={{ marginTop: '5px', fontSize: '11px', color: '#a78bfa', fontStyle: 'italic' }}>
        Pipeline prospect. Rank to promote instead of signing a FA.
      </div>
    ) : p.isRookie ? (
      <div style={{ marginTop: '5px', fontSize: '11px', color: '#38bdf8', fontStyle: 'italic' }}>
        No professional record
      </div>
    ) : (
      <>
        {p.isProjected && (
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#fbbf24', fontStyle: 'italic' }}>
            {p.currentTeam ? `Currently on ${p.currentTeam}. ` : ''}
            {p.projectedReason === 'cut_vote'
              ? 'Board pushing to cut.'
              : 'Contract expires at season end.'}
          </div>
        )}
        {p.stats ? (
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StatLine position={p.position} stats={p.stats} />
          </div>
        ) : (
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            No stats this season
          </div>
        )}
      </>
    )}
  </div>
)

const PerformanceBadge: React.FC<{ delta: number }> = ({ delta }) => {
  if (delta > 5) {
    return (
      <span style={{ fontSize: '12px', fontWeight: '700', color: '#22c55e' }} title={`+${delta} over expected`}>
        <svg width="11" height="11" viewBox="0 0 10 10" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
          <path d="M5 1 L9 7 L1 7 Z" fill="#22c55e" />
        </svg>
        +{delta}
      </span>
    )
  }
  if (delta < -5) {
    return (
      <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444' }} title={`${delta} under expected`}>
        <svg width="11" height="11" viewBox="0 0 10 10" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
          <path d="M5 9 L9 3 L1 3 Z" fill="#ef4444" />
        </svg>
        {delta}
      </span>
    )
  }
  return (
    <span style={{ fontSize: '12px', color: '#94a3b8' }} title="Performed as expected">
      --
    </span>
  )
}

export const StatLine: React.FC<{ position: string; stats: PlayerStats }> = ({ stats, position }) => {
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
