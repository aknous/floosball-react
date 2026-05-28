import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Stars, calcStars } from '@/Components/Stars'
import { GM_FA_BALLOT_MAX_RANKINGS, GM_FA_BALLOT_COST } from '@/types/gm'
import { attitudeTier, resilienceTier, pressureHandlingTier } from '@/utils/mentalProfile'
import HoverTooltip from '@/Components/HoverTooltip'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  // Below 768px the side-by-side ranked/available grid is unusable —
  // each column shrinks to ~180px and player rows can't render. Swap
  // to a tabbed layout that swaps between "Available" and "Your List".
  const isMobile = useIsMobile(768)
  const [mobileView, setMobileView] = useState<'available' | 'ranked'>('available')

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
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '20px',
        fontFamily: 'pressStart',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1040px',
          height: isMobile ? '100vh' : '85vh',
          backgroundColor: '#0f172a',
          border: isMobile ? 'none' : '1px solid #334155',
          borderRadius: isMobile ? 0 : '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '12px 14px' : '18px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Free Agent Requisition
            </div>
            <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#94a3b8', marginTop: '6px' }}>
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
            {!isMobile && (
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
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {faWindowEnd && (
              <div style={{
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '700',
                color: timeLeft.startsWith('0:') ? '#ef4444' : '#f59e0b',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timeLeft}
              </div>
            )}
            {isMobile && (
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', fontFamily: 'inherit',
                  color: '#94a3b8', cursor: 'pointer',
                  fontSize: '24px', padding: '0 4px', lineHeight: 1,
                }}
              >
                &#215;
              </button>
            )}
          </div>
        </div>

        {/* Mobile tab bar — swaps between Available and Your List since the
            side-by-side grid below collapses to ~180px columns on phones. */}
        {isMobile && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setMobileView('available')}
              style={{
                flex: 1, padding: '12px 8px',
                background: mobileView === 'available' ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: 'none', borderBottom: '2px solid ' + (mobileView === 'available' ? '#60a5fa' : 'transparent'),
                fontFamily: 'inherit', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                color: mobileView === 'available' ? '#60a5fa' : '#94a3b8',
              }}
            >
              Available ({prospects.length + others.length})
            </button>
            <button
              onClick={() => setMobileView('ranked')}
              style={{
                flex: 1, padding: '12px 8px',
                background: mobileView === 'ranked' ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: 'none', borderBottom: '2px solid ' + (mobileView === 'ranked' ? '#60a5fa' : 'transparent'),
                fontFamily: 'inherit', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                color: mobileView === 'ranked' ? '#60a5fa' : '#94a3b8',
              }}
            >
              Your List ({ranking.length}/{GM_FA_BALLOT_MAX_RANKINGS})
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : 'minmax(0, 1fr) minmax(0, 1fr)',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* Left: Ranked list — hidden on mobile when 'available' tab is active */}
          <div style={{
            borderRight: isMobile ? 'none' : '1px solid #1e293b',
            display: isMobile && mobileView !== 'ranked' ? 'none' : 'flex',
            flexDirection: 'column', overflow: 'hidden', minWidth: 0,
            flex: isMobile ? 1 : undefined,
          }}>
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
                  {isMobile
                    ? 'Pick players from the Available tab to start your list. Use the arrows to reorder.'
                    : 'Pick players from the right to start your list. Use the arrows to reorder.'}
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
                      <HoverTooltip text="Move up">
                        <button
                          onClick={() => movePlayer(id, -1)}
                          disabled={idx === 0}
                          aria-label="Move up"
                          style={{
                            background: 'none', border: 'none', fontFamily: 'inherit',
                            color: idx === 0 ? '#334155' : '#cbd5e1',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '18px', padding: '2px 6px', lineHeight: 1,
                          }}
                        >
                          ↑
                        </button>
                      </HoverTooltip>
                      <HoverTooltip text="Move down">
                        <button
                          onClick={() => movePlayer(id, 1)}
                          disabled={idx === ranking.length - 1}
                          aria-label="Move down"
                          style={{
                            background: 'none', border: 'none', fontFamily: 'inherit',
                            color: idx === ranking.length - 1 ? '#334155' : '#cbd5e1',
                            cursor: idx === ranking.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '18px', padding: '2px 6px', lineHeight: 1,
                          }}
                        >
                          ↓
                        </button>
                      </HoverTooltip>
                      <HoverTooltip text="Remove">
                        <button
                          onClick={() => removePlayer(id)}
                          aria-label="Remove"
                          style={{
                            background: 'none', border: 'none', fontFamily: 'inherit',
                            color: '#94a3b8', cursor: 'pointer',
                            fontSize: '18px', padding: '2px 6px', lineHeight: 1,
                          }}
                        >
                          &#215;
                        </button>
                      </HoverTooltip>
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

          {/* Right: Available candidates — hidden on mobile when 'ranked' tab is active */}
          <div style={{
            display: isMobile && mobileView !== 'available' ? 'none' : 'flex',
            flexDirection: 'column', overflow: 'hidden', minWidth: 0,
            flex: isMobile ? 1 : undefined,
          }}>
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
          padding: isMobile ? '12px 14px' : '16px 20px',
          borderTop: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#94a3b8' }}>
            {ranking.length} ranked
          </span>
          <button
            onClick={handleSubmit}
            disabled={ranking.length === 0 || submitting}
            style={{
              padding: isMobile ? '14px 24px' : '12px 28px',
              backgroundColor: ranking.length === 0 ? '#1e293b' : '#f59e0b',
              color: ranking.length === 0 ? '#475569' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: '700',
              cursor: ranking.length === 0 ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              minWidth: isMobile ? '140px' : undefined,
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

// Mental signals render as quiet inline labels with a colored value —
// "Presence Toxic" rather than a bordered uppercase chip. Keeps them
// from competing with the headline perf badge for visual weight on a
// dense row.
const MentalLabel: React.FC<{ name: string; value: string; color: string; tip?: string }> = ({ name, value, color, tip }) => {
  const inner = (
    <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
      <span style={{ color: '#64748b' }}>{name} </span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </span>
  )
  if (!tip) return inner
  return <HoverTooltip text={tip} color={color}>{inner}</HoverTooltip>
}

// Middle-tier labels — render nothing when a player is at these tiers
// since "Presence Neutral · Resilience Steady · Pressure Even" on every
// row carries no actionable signal and just clutters the layout. Only
// surface mental data when it's meaningfully above or below average.
const MENTAL_NEUTRAL_LABELS = new Set(['Neutral', 'Steady', 'Even'])

const MentalBadges: React.FC<{ player: ScoutingPlayer }> = ({ player: p }) => {
  const items: React.ReactNode[] = []
  if (p.attitude != null) {
    const t = attitudeTier(p.attitude)
    if (!MENTAL_NEUTRAL_LABELS.has(t.label)) {
      items.push(
        <MentalLabel
          key="attitude"
          name="Presence"
          value={t.label}
          color={t.color}
          tip="Locker-room presence. Toxic players drag the room, Leaders lift it."
        />
      )
    }
  }
  if (p.resilience != null) {
    const t = resilienceTier(p.resilience)
    if (!MENTAL_NEUTRAL_LABELS.has(t.label)) {
      items.push(
        <MentalLabel
          key="resilience"
          name="Resilience"
          value={t.label}
          color={t.color}
          tip="Resilience — how well they shake off bad games."
        />
      )
    }
  }
  if (p.pressureHandling != null) {
    const t = pressureHandlingTier(p.pressureHandling)
    if (!MENTAL_NEUTRAL_LABELS.has(t.label)) {
      items.push(
        <MentalLabel
          key="pressure"
          name="Pressure"
          value={t.label}
          color={t.color}
          tip="Pressure handling — clutch vs. choke under late-game stress."
        />
      )
    }
  }

  if (items.length === 0) return null
  return (
    <div style={{ marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: '#334155', fontSize: '11px' }}>·</span>}
          {item}
        </React.Fragment>
      ))}
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
    {/* Row 1: Position + name + stars + status/perf. Stars sit right after
        the name so they read as the name's rating (eye flow: who they are →
        how good they are → status). */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <PositionChip position={p.position} />
      <span style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: '700', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.name}
      </span>
      {/* The ★ glyph sits visually low in its line-height box because the
          star shape extends below the baseline. Nudge it up 2px so it
          reads centered against the name. */}
      <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', top: '-2px' }}>
        <Stars stars={calcStars(p.rating)} size={22} />
      </span>
      <span style={{ flex: 1 }} />
      {p.isProspect ? (
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Prospect
        </span>
      ) : p.isRookie ? (
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rookie
        </span>
      ) : p.isProjected && p.projectedReason === 'cut_vote' ? (
        // Cut-vote players get a distinct tag — the board is actively
        // pushing them out, which is a stronger signal than a routine
        // walk-year contract expiry. Walk-year FAs render as plain FAs.
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cut Vote
          </span>
          {p.stats && <PerformanceBadge delta={p.ratingDelta} />}
        </span>
      ) : p.stats ? (
        <PerformanceBadge delta={p.ratingDelta} />
      ) : null}
    </div>
    {/* Row 2: stats / context note. Prospects + rookies get a single
        italic note; FAs with stats get the stat line; FAs without
        stats get a quiet "no stats" placeholder. */}
    {p.isProspect ? (
      <div style={{ marginTop: '5px', fontSize: '12px', color: '#a78bfa', fontStyle: 'italic' }}>
        Pipeline prospect. Rank to promote instead of signing a FA.
      </div>
    ) : p.isRookie ? (
      <div style={{ marginTop: '5px', fontSize: '12px', color: '#38bdf8', fontStyle: 'italic' }}>
        No professional record
      </div>
    ) : p.stats ? (
      <div style={{ marginTop: '5px', fontSize: '13px', color: '#cbd5e1', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <StatLine position={p.position} stats={p.stats} />
      </div>
    ) : (
      <div style={{ marginTop: '5px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
        No stats this season
      </div>
    )}
    {/* Row 3: Mental flags — only renders when something's notable
        (Toxic, Leader, Fragile, Ironclad, Choker, Ice, etc). Boring
        middle-tier players don't get a row at all. */}
    <MentalBadges player={p} />
  </div>
)

const PerformanceBadge: React.FC<{ delta: number }> = ({ delta }) => {
  // Mirror the +++ / ++ / + / - / -- / --- convention from the player
  // hover card so fans see the same signal in both places. Hover card
  // renders it as plain text; the ballot uses chip styling for visual
  // weight against the dense row, but the symbol + label + color tiers
  // are identical.
  let symbols = ''
  let label = ''
  let color = ''
  if (delta >= 20)        { symbols = '+++'; label = 'Overperforming';  color = '#22c55e' }
  else if (delta >= 12)   { symbols = '++';  label = 'Overperforming';  color = '#22c55e' }
  else if (delta >= 5)    { symbols = '+';   label = 'Overperforming';  color = '#4ade80' }
  else if (delta <= -20)  { symbols = '---'; label = 'Underperforming'; color = '#ef4444' }
  else if (delta <= -12)  { symbols = '--';  label = 'Underperforming'; color = '#ef4444' }
  else if (delta <= -5)   { symbols = '-';   label = 'Underperforming'; color = '#f87171' }
  else return null  // within normal variance — nothing to flag

  const magnitude = Math.abs(delta)
  const tooltip = delta > 0
    ? `Playing ${magnitude} rating points above their listed rating this season.`
    : `Playing ${magnitude} rating points below their listed rating this season.`
  return (
    <HoverTooltip text={tooltip} color={color}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        fontWeight: 700,
        color,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}55`,
        padding: '2px 9px',
        borderRadius: '4px',
        letterSpacing: '0.04em',
      }}>
        <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{symbols}</span>
        {label}
      </span>
    </HoverTooltip>
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

  return <>{parts.join(' / ')}</>
}

export default FaBallotModal
