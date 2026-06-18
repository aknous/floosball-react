import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Stars, calcStars } from '@/Components/Stars'
import ArchetypeBadge from '@/Components/ArchetypeBadge'
import { GM_FA_BALLOT_MAX_RANKINGS, GM_FA_BALLOT_COST } from '@/types/gm'
import { attitudeTier } from '@/utils/mentalProfile'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import { useIsMobile } from '@/hooks/useIsMobile'
import PositionChip from '@/Components/FrontOffice/PositionChip'

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
  // Split offense/defense ratings drive the sword/shield dual-star display.
  // Optional: older API responses omit them and the row falls back to a
  // single overall star rating.
  offensiveRating?: number
  defensiveRating?: number
  // Career-arc stage so fans can weigh a player's runway, not just rating.
  // Anchored to the sim's real peakSeason. Optional: older API responses omit
  // it and the row simply shows no stage badge.
  careerStage?: 'developing' | 'prime' | 'aging' | 'near_retirement' | 'retiring'
  // Two-way identity (sword/shield) — only set for 4+ star offense/defense
  // players, matching the hover card. Null/undefined → no icons.
  archetype?: string | null
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
  /** Render inline (in a tab) instead of as a modal overlay: no backdrop,
   *  portal, or close button. `visible`/`onClose` are ignored in this mode. */
  inline?: boolean
}

// ── Candidate sorting ────────────────────────────────────────────────────────
type SortKey = 'rating' | 'performance' | 'fantasy' | 'stage'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'performance', label: 'Performance' },
  { key: 'fantasy', label: 'Fantasy Pts' },
  { key: 'stage', label: 'Career' },
]

// Career-stage sort puts the strongest outlook first: at-peak, then rising,
// then the declining tiers. Within a stage, fall back to overall rating.
const STAGE_RANK: Record<string, number> = {
  prime: 0, developing: 1, aging: 2, near_retirement: 3, retiring: 4,
}

// All comparators sort "best first" (descending) so the toggle direction is
// consistent across options. Players missing a value sink to the bottom.
function compareCandidates(sortBy: SortKey, a: ScoutingPlayer, b: ScoutingPlayer): number {
  switch (sortBy) {
    case 'performance':
      return (b.performanceRating ?? 0) - (a.performanceRating ?? 0) || b.rating - a.rating
    case 'fantasy':
      return (b.stats?.fantasyPoints ?? -1) - (a.stats?.fantasyPoints ?? -1) || b.rating - a.rating
    case 'stage': {
      const ra = STAGE_RANK[a.careerStage ?? ''] ?? 99
      const rb = STAGE_RANK[b.careerStage ?? ''] ?? 99
      return ra - rb || b.rating - a.rating
    }
    case 'rating':
    default:
      return b.rating - a.rating
  }
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
  inline = false,
}) => {
  const [ranking, setRanking] = useState<number[]>([])
  const [posFilter, setPosFilter] = useState<'ALL' | string>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('rating')
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
    prospectList.sort((a, b) => compareCandidates(sortBy, a, b))
    otherList.sort((a, b) => compareCandidates(sortBy, a, b))
    return { prospects: prospectList, others: otherList }
  }, [scoutingPlayers, openPositionSet, rankedSet, posFilter, sortBy])

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

  if (!visible && !inline) return null

  // Position filter chips: ALL + every distinct open position.
  const posFilterOptions: string[] = ['ALL', ...Array.from(openPositionSet).sort()]

  const tree = (
    <div
      onClick={inline ? undefined : onClose}
      style={inline
        ? { fontFamily: 'pressStart' }
        : {
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
          maxWidth: inline ? '100%' : '1040px',
          height: inline ? '70vh' : (isMobile ? '100vh' : '85vh'),
          backgroundColor: '#0f172a',
          border: (isMobile && !inline) ? 'none' : '1px solid #334155',
          borderRadius: (isMobile && !inline) ? 0 : '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '10px 12px' : '12px 16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Free Agent Requisition
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
              Front office signs top-down from your #1.
              {isUpdate ? ' Revisions are free.' : ` First ballot: ${GM_FA_BALLOT_COST} Floobits.`}
            </div>
            {openSlots.length > 0 && (
              <div style={{
                fontSize: '12px', color: '#cbd5e1', marginTop: '6px',
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
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {faWindowEnd && (
              <div style={{
                fontSize: isMobile ? '13px' : '15px',
                fontWeight: '700',
                color: timeLeft.startsWith('0:') ? '#ef4444' : '#f59e0b',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timeLeft}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={ranking.length === 0 || submitting}
              style={{
                padding: '8px 16px',
                backgroundColor: ranking.length === 0 ? '#1e293b' : '#f59e0b',
                color: ranking.length === 0 ? '#475569' : '#0f172a',
                border: 'none', borderRadius: '6px', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap',
                cursor: ranking.length === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting
                ? 'Submitting...'
                : isUpdate
                  ? 'Revise'
                  : `Submit (${ranking.length}) · ${cost} F`}
            </button>
            {isMobile && !inline && (
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
                        color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : '#94a3b8',
                        minWidth: '24px',
                      }}>
                        {idx + 1}.
                      </span>
                      <PositionChip position={player.position} />
                      <PlayerHoverCard playerId={player.id} playerName={player.name}>
                        <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help', minWidth: 0 }}>
                          {player.name}
                        </span>
                      </PlayerHoverCard>
                      <Stars stars={calcStars(player.rating)} size={20} />
                      <ArchetypeBadge archetype={player.archetype} size={14} />
                      <div style={{ flex: 1 }} />
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
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '12px', color: '#64748b', marginRight: '4px' }}>Sort:</span>
              {SORT_OPTIONS.map(opt => {
                const active = sortBy === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
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
                    {opt.label}
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

      </div>
    </div>
  )

  return inline ? tree : ReactDOM.createPortal(tree, document.body)
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

// Neutral attitude tiers carry no actionable signal, so PresenceChip renders
// nothing for them.
const MENTAL_NEUTRAL_LABELS = new Set(['Neutral', 'Steady', 'Even'])

// Career-stage badge — surfaces where a signable player sits on their arc so
// fans can weigh runway, not just rating, and avoid stacking an already-old
// roster. Anchored to the sim's real peakSeason (backend computeCareerStage).
// A 'developing' rookie/prospect already carries its own Rookie/Prospect tag,
// so the stage chip is suppressed there to avoid a redundant double-label.
const CAREER_BADGE: Record<string, { label: string; color: string; tip: string }> = {
  developing:      { label: 'Developing',      color: '#38bdf8', tip: 'Still climbing toward their peak.' },
  prime:           { label: 'Prime',           color: '#4ade80', tip: 'In their peak seasons.' },
  aging:           { label: 'Aging',           color: '#facc15', tip: 'Past their peak and gradually declining.' },
  near_retirement: { label: 'Near Retirement', color: '#f87171', tip: 'At the end of their longevity. Could retire soon.' },
  retiring:        { label: 'Retiring',        color: '#ef4444', tip: 'Set to retire after this season.' },
}

const CareerBadge: React.FC<{ stage?: string; suppressDeveloping?: boolean }> = ({ stage, suppressDeveloping }) => {
  if (stage === 'developing' && suppressDeveloping) return null
  const cfg = stage ? CAREER_BADGE[stage] : undefined
  if (!cfg) return null
  return (
    <HoverTooltip text={cfg.tip} color={cfg.color}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        {cfg.label}
      </span>
    </HoverTooltip>
  )
}

// Presence chip — the locker-room signal fans care most about (spot a Toxic
// player fast). Just the attitude tier word, colored; hidden when neutral.
// Resilience / pressure-handling move to the player hover card to keep the row
// tight.
const PresenceChip: React.FC<{ attitude?: number }> = ({ attitude }) => {
  if (attitude == null) return null
  const t = attitudeTier(attitude)
  if (MENTAL_NEUTRAL_LABELS.has(t.label)) return null
  return (
    <HoverTooltip text="Locker-room presence. Toxic players drag the room, Leaders lift it." color={t.color}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {t.label}
      </span>
    </HoverTooltip>
  )
}

// Performance — +/- symbols plus the Over/Underperforming label, styled to sit
// in the right-hand signal column alongside career stage + presence. Same
// tiers/colors as the hover card; hidden within normal variance.
const CompactPerf: React.FC<{ delta: number }> = ({ delta }) => {
  let symbols = '', color = '', label = ''
  if (delta >= 20)       { symbols = '+++'; color = '#22c55e'; label = 'Overperforming' }
  else if (delta >= 12)  { symbols = '++';  color = '#22c55e'; label = 'Overperforming' }
  else if (delta >= 5)   { symbols = '+';   color = '#4ade80'; label = 'Overperforming' }
  else if (delta <= -20) { symbols = '---'; color = '#ef4444'; label = 'Underperforming' }
  else if (delta <= -12) { symbols = '--';  color = '#ef4444'; label = 'Underperforming' }
  else if (delta <= -5)  { symbols = '-';   color = '#f87171'; label = 'Underperforming' }
  else return null
  const mag = Math.abs(delta)
  return (
    <HoverTooltip text={`Playing ${mag} rating points ${delta > 0 ? 'above' : 'below'} their listed rating this season.`} color={color}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{symbols}</span>
        {label}
      </span>
    </HoverTooltip>
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
      padding: '8px 12px',
      borderRadius: '6px',
      cursor: canAddMore ? 'pointer' : 'not-allowed',
      borderBottom: '1px solid #334155',
      opacity: canAddMore ? 1 : 0.5,
    }}
    onMouseEnter={(e) => { if (canAddMore) e.currentTarget.style.backgroundColor = '#1e293b' }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
  >
    {/* Two columns so the right-hand signals (up to three stacked) don't inflate
        the name line: left holds name + rating on top and the stat line below;
        right holds the signals fans rank on (career stage, presence, +/-). */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* position + name + the overall rating with offense/defense icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <PositionChip position={p.position} />
          <PlayerHoverCard playerId={p.id} playerName={p.name}>
            <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {p.name}
            </span>
          </PlayerHoverCard>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', flexShrink: 0, position: 'relative', top: '-1px' }}>
            <Stars stars={calcStars(p.rating)} size={20} />
            <ArchetypeBadge archetype={p.archetype} size={14} />
          </span>
        </div>
        {/* the stat line (or a context note) */}
        <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
          {p.isProspect ? (
            <span style={{ color: '#a78bfa', fontStyle: 'italic' }}>Pipeline prospect. Rank to promote instead of signing a FA.</span>
          ) : p.isRookie ? (
            <span style={{ color: '#38bdf8', fontStyle: 'italic' }}>No professional record</span>
          ) : p.stats ? (
            <span style={{ color: '#cbd5e1', display: 'inline-flex', gap: '10px', flexWrap: 'wrap' }}><StatLine position={p.position} stats={p.stats} /></span>
          ) : (
            <span style={{ fontStyle: 'italic' }}>No stats this season</span>
          )}
        </div>
      </div>
      {/* Signals stacked as a right-aligned column: career stage, presence,
          performance (each only when it has something to say). */}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0, lineHeight: 1.1 }}>
        {p.isProspect ? (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prospect</span>
        ) : p.isRookie ? (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rookie</span>
        ) : (
          <CareerBadge stage={p.careerStage} />
        )}
        <PresenceChip attitude={p.attitude} />
        {p.isProjected && p.projectedReason === 'cut_vote' && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cut Vote</span>
        )}
        {p.stats && <CompactPerf delta={p.ratingDelta} />}
      </span>
    </div>
  </div>
)


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
