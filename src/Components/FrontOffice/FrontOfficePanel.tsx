import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGmData } from '@/hooks/useGmData'
import { useIsMobile } from '@/hooks/useIsMobile'
import VoteBudgetBar from './VoteBudgetBar'
import FireCoachCard from './FireCoachCard'
import HireCoachCard from './HireCoachCard'
import CutPlayerCard from './CutPlayerCard'
import ResignPlayerCard from './ResignPlayerCard'
import VoteResultsBanner from './VoteResultsBanner'
import FaBallotModal, { ScoutingPlayer, OpenSlot, StatLine } from './FaBallotModal'
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'
import { Stars, calcStars } from '@/Components/Stars'
import { GM_VOTE_COST, GM_VOTES_PER_SEASON, GM_VOTES_PER_TARGET, GM_VOTES_PER_TYPE } from '@/types/gm'

const GM_ACTIVE_WEEK = 22
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface FrontOfficePanelProps {
  teamId: number
  teamColor: string
}

const FrontOfficePanel: React.FC<FrontOfficePanelProps> = ({ teamId, teamColor }) => {
  const { user, getToken, refetchUser, updateFloobits } = useAuth()
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const gm = useGmData(teamId)

  const currentWeek = seasonState.currentWeek
  const isOffseason = seasonState.currentWeekText === 'Offseason'
  const isActive = currentWeek >= GM_ACTIVE_WEEK || isOffseason

  // FA Requisition — year-round ballot targeting the team's projected walk-year
  // FAs + current prospects. The same modal used during the offseason FA window,
  // surfaced here so fans can influence signings before the window closes.
  const [faScoutingPlayers, setFaScoutingPlayers] = useState<ScoutingPlayer[]>([])
  const [faOpenSlots, setFaOpenSlots] = useState<OpenSlot[]>([])
  const [existingFaBallot, setExistingFaBallot] = useState<number[] | null>(null)
  const [faModalOpen, setFaModalOpen] = useState(false)
  const [faBallotSubmitting, setFaBallotSubmitting] = useState(false)
  const [faWindowEnd, setFaWindowEnd] = useState<number | null>(null)
  const [poolPreviewOpen, setPoolPreviewOpen] = useState(false)
  const [poolPositionFilter, setPoolPositionFilter] = useState<'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K'>('ALL')

  // Refetch scouting whenever the user's vote counts change — a fresh
  // cut/resign vote can push a slot's likelyCut/likelyResigned flag over
  // quorum, opening (or closing) an FA requisition slot. Without this the
  // openSlots count would stay frozen at mount-time values.
  const gmVoteSignature = gm.myVotes?.counts.total ?? 0
  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    const load = async () => {
      try {
        const tok = await getToken()
        if (!tok) return
        const [scoutRes, ofsRes] = await Promise.all([
          fetch(`${API_BASE}/gm/fa-scouting`, { headers: { Authorization: `Bearer ${tok}` } }),
          fetch(`${API_BASE}/offseason`, { headers: { Authorization: `Bearer ${tok}` } }),
        ])
        const scoutJson = await scoutRes.json().catch(() => null)
        if (!cancelled && scoutJson?.success && scoutJson.data) {
          setFaScoutingPlayers(scoutJson.data.players || [])
          setFaOpenSlots(scoutJson.data.openSlots || [])
        }
        const ofsJson = await ofsRes.json().catch(() => null)
        if (!cancelled && ofsJson) {
          if (ofsJson.existingBallot) setExistingFaBallot(ofsJson.existingBallot)
          if (ofsJson.faWindowEnd) setFaWindowEnd(ofsJson.faWindowEnd * 1000)
        }
      } catch { /* silent */ }
    }
    load()
    return () => { cancelled = true }
  }, [isActive, getToken, gmVoteSignature])

  const handleSubmitFaBallot = useCallback(async (rankings: number[]) => {
    const tok = await getToken()
    if (!tok) return null
    setFaBallotSubmitting(true)
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
      const data = json.data ?? json
      setExistingFaBallot(data.rankings)
      const balRes = await fetch(`${API_BASE}/currency/balance`, { headers: { Authorization: `Bearer ${tok}` } })
      if (balRes.ok) {
        const bj = await balRes.json()
        updateFloobits(bj.data?.balance ?? 0)
      }
      await refetchUser()
      setFaModalOpen(false)
      return data
    } catch {
      alert('Ballot submission failed')
      return null
    } finally {
      setFaBallotSubmitting(false)
    }
  }, [getToken, updateFloobits, refetchUser])

  // Compute disabled vote targets based on user's vote counts
  const disabledCutIds = useMemo(() => {
    const ids = new Set<number>()
    if (!gm.myVotes) return ids
    const { perType, perTarget } = gm.myVotes.counts
    // Global type limit
    if ((perType['cut_player'] ?? 0) >= GM_VOTES_PER_TYPE) {
      gm.eligible?.rosteredPlayers.forEach(p => ids.add(p.id))
      return ids
    }
    // Per-target limit
    for (const [key, count] of Object.entries(perTarget)) {
      if (key.startsWith('cut_player:') && count >= GM_VOTES_PER_TARGET) {
        const pid = parseInt(key.split(':')[1])
        if (!isNaN(pid)) ids.add(pid)
      }
    }
    return ids
  }, [gm.myVotes, gm.eligible])

  const disabledResignIds = useMemo(() => {
    const ids = new Set<number>()
    if (!gm.myVotes) return ids
    const { perType, perTarget } = gm.myVotes.counts
    if ((perType['resign_player'] ?? 0) >= GM_VOTES_PER_TYPE) {
      gm.eligible?.expiringPlayers.forEach(p => ids.add(p.id))
      return ids
    }
    for (const [key, count] of Object.entries(perTarget)) {
      if (key.startsWith('resign_player:') && count >= GM_VOTES_PER_TARGET) {
        const pid = parseInt(key.split(':')[1])
        if (!isNaN(pid)) ids.add(pid)
      }
    }
    return ids
  }, [gm.myVotes, gm.eligible])

  const fireCoachDisabled = useMemo(() => {
    if (!gm.myVotes) return false
    const { perType } = gm.myVotes.counts
    return (perType['fire_coach'] ?? 0) >= GM_VOTES_PER_TYPE
  }, [gm.myVotes])

  const disabledHireCoachIds = useMemo(() => {
    const ids = new Set<number>()
    if (!gm.myVotes) return ids
    const { perType, perTarget } = gm.myVotes.counts
    if ((perType['hire_coach'] ?? 0) >= GM_VOTES_PER_TYPE) {
      gm.eligible?.availableCoaches.forEach(c => { if (c.id !== null) ids.add(c.id) })
      return ids
    }
    for (const [key, count] of Object.entries(perTarget)) {
      if (key.startsWith('hire_coach:') && count >= GM_VOTES_PER_TARGET) {
        const cid = parseInt(key.split(':')[1])
        if (!isNaN(cid)) ids.add(cid)
      }
    }
    return ids
  }, [gm.myVotes, gm.eligible])

  const globalDisabled = useMemo(() => {
    if (!gm.myVotes) return false
    return gm.myVotes.counts.total >= 20
  }, [gm.myVotes])

  const coachTally = gm.summary?.tallies.find(t => t.voteType === 'fire_coach') ?? null
  const [showHelp, setShowHelp] = useState(false)

  // Remaining votes per directive type
  const votesUsed = gm.myVotes?.counts.perType ?? {}
  const remainingByType = {
    fire_coach: GM_VOTES_PER_TYPE - (votesUsed['fire_coach'] ?? 0),
    hire_coach: GM_VOTES_PER_TYPE - (votesUsed['hire_coach'] ?? 0),
    cut_player: GM_VOTES_PER_TYPE - (votesUsed['cut_player'] ?? 0),
    resign_player: GM_VOTES_PER_TYPE - (votesUsed['resign_player'] ?? 0),
  }

  // Escalating cost: base * 2^(votes already cast for this specific target)
  const balance = user?.floobits ?? 0
  const targetVotesUsed = gm.myVotes?.counts.perTarget ?? {}
  const nextTargetCost = (type: string, targetId?: number) => {
    const base = GM_VOTE_COST[type] ?? 10
    const targetKey = `${type}:${targetId ?? 'none'}`
    const used = targetVotesUsed[targetKey] ?? 0
    return base * Math.pow(2, used)
  }
  // For single-target directives (fire_coach), use the target cost directly
  const nextCostByType = {
    fire_coach: nextTargetCost('fire_coach'),
    hire_coach: nextTargetCost('hire_coach'),
    cut_player: nextTargetCost('cut_player'),
    resign_player: nextTargetCost('resign_player'),
  }

  // Section header matching TeamPage pattern
  const sectionHeader = (label: string, withHelp?: boolean) => (
    <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      {withHelp && <HelpButton onClick={() => setShowHelp(true)} size={22} />}
    </div>
  )

  // Offseason: show results banner — no active voting during free agency
  if (isOffseason) {
    const hasResults = gm.results && gm.results.results.length > 0
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        {sectionHeader('The Front Office')}
        <div style={{ padding: '14px' }}>
          {hasResults ? (
            <VoteResultsBanner results={gm.results!.results} teamColor={teamColor} />
          ) : (
            <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
              FA ballots are tallied when the voting window closes. Use the offseason panel to submit your ballot.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Dormant state: before Week 10
  if (!isActive) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        {sectionHeader('The Front Office')}
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            The Board of Directors convenes in Week {GM_ACTIVE_WEEK}. Until then, they are merely... observing.
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (gm.loading && !gm.eligible) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        {sectionHeader('The Front Office')}
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Convening the board...</div>
        </div>
      </div>
    )
  }

  if (!gm.eligible) return null

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
      {sectionHeader('The Front Office', true)}

      {/* Vote budget bar */}
      <VoteBudgetBar
        totalVotes={gm.myVotes?.counts.total ?? 0}
        floobits={user?.floobits ?? 0}
      />

      {/* FA Requisition — always visible when the board is active so fans can
          find the ballot. When there are no projected openings, we explain
          why voting isn't available rather than hiding the section entirely. */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '2px' }}>
            Free Agent Requisition
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {faOpenSlots.length > 0
              ? <>{faOpenSlots.length} slot{faOpenSlots.length !== 1 ? 's' : ''} projected to open · {existingFaBallot ? `ballot submitted (${existingFaBallot.length} ranked)` : 'no ballot on file'}</>
              : <>No roster openings projected — the board will vote on vacancies once cut/resign motions settle or contracts expire</>
            }
          </div>
        </div>
        <button
          onClick={() => setFaModalOpen(true)}
          disabled={faOpenSlots.length === 0}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            border: `1px solid ${faOpenSlots.length === 0 ? '#334155' : teamColor}`,
            backgroundColor: faOpenSlots.length === 0 ? 'transparent' : `${teamColor}20`,
            color: faOpenSlots.length === 0 ? '#475569' : '#e2e8f0',
            cursor: faOpenSlots.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {existingFaBallot ? 'Revise Ballot' : 'Open Ballot'}
        </button>
      </div>

      {/* FA Pool Preview — lets fans see every player projected to be
          available this offseason so they can make informed cut/resign
          decisions. Includes current free agents, walk-year players from
          other teams, and cut-vote likely players. Collapsed by default. */}
      <FaPoolPreview
        players={faScoutingPlayers}
        open={poolPreviewOpen}
        onToggle={() => setPoolPreviewOpen(v => !v)}
        positionFilter={poolPositionFilter}
        onPositionFilter={setPoolPositionFilter}
      />

      <div style={{ padding: '14px' }}>
        {/* Two-column layout: Coaching (left) | Roster (right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}>
          {/* Left column: Coaching */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {gm.eligible.coach && (
              <FireCoachCard
                coach={gm.eligible.coach}
                availableCoaches={gm.eligible.availableCoaches}
                tally={coachTally}
                teamColor={teamColor}
                voting={gm.voting === 'fire_coach'}
                onVote={() => gm.castVote('fire_coach')}
                disabled={globalDisabled || fireCoachDisabled || balance < nextCostByType.fire_coach}
                votesRemaining={remainingByType.fire_coach}
                nextCost={nextCostByType.fire_coach}
                thresholdMet={!!coachTally && coachTally.votes >= coachTally.threshold}
              />
            )}

            {gm.eligible.availableCoaches.length > 0 && coachTally && coachTally.votes >= coachTally.threshold && (
              <HireCoachCard
                availableCoaches={gm.eligible.availableCoaches}
                tallies={gm.summary?.tallies ?? []}
                teamColor={teamColor}
                voting={gm.voting}
                onVote={(coachId) => gm.castVote('hire_coach', coachId)}
                disabledIds={disabledHireCoachIds}
                globalDisabled={globalDisabled}
                balance={balance}
                votesRemaining={remainingByType.hire_coach}
                getCost={(coachId) => nextTargetCost('hire_coach', coachId)}
              />
            )}
          </div>

          {/* Right column: Roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ResignPlayerCard
              players={gm.eligible.expiringPlayers}
              tallies={gm.summary?.tallies ?? []}
              teamColor={teamColor}
              voting={gm.voting}
              onVote={(playerId) => gm.castVote('resign_player', playerId)}
              disabledIds={disabledResignIds}
              globalDisabled={globalDisabled}
              balance={balance}
              votesRemaining={remainingByType.resign_player}
              getCost={(playerId) => nextTargetCost('resign_player', playerId)}
            />

            <CutPlayerCard
              players={gm.eligible.rosteredPlayers.filter(p => p.termRemaining > 1)}
              tallies={gm.summary?.tallies ?? []}
              teamColor={teamColor}
              voting={gm.voting}
              onVote={(playerId) => gm.castVote('cut_player', playerId)}
              disabledIds={disabledCutIds}
              globalDisabled={globalDisabled}
              balance={balance}
              votesRemaining={remainingByType.cut_player}
              getCost={(playerId) => nextTargetCost('cut_player', playerId)}
            />
          </div>
        </div>

        {/* Resolved events from WebSocket during this session */}
        {gm.resolvedEvents.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}>
              Live Resolutions
            </div>
            {gm.resolvedEvents.map((ev, i) => {
              const isSuccess = ev.outcome === 'success'
              return (
                <div key={i} style={{
                  fontSize: '11px',
                  color: isSuccess ? '#22c55e' : '#f59e0b',
                  padding: '3px 0',
                }}>
                  {isSuccess ? 'RATIFIED' : ev.outcome === 'below_threshold' ? 'INSUFFICIENT QUORUM' : 'MOTION DENIED'}
                  {' \u2014 '}
                  <span style={{ color: '#94a3b8' }}>
                    {ev.voteType.replace('_', ' ')}{ev.targetPlayerName ? `: ${ev.targetPlayerName}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}

      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="The Front Office">
        <GuideSection title="Directives">
          As a board member, you may issue directives to influence your team's decisions.
          Each directive costs Floobits, with the cost doubling for each subsequent directive
          of the same category. You may file up to {GM_VOTES_PER_TYPE} directives per
          category and {GM_VOTES_PER_TARGET} per individual target, with a seasonal
          allowance of {GM_VOTES_PER_SEASON} total.
        </GuideSection>
        <GuideSection title="Quorum & Ratification">
          Each motion requires a minimum number of directives (the quorum) before it
          can be considered for ratification. The quorum scales with the number of
          active board members — fans of this team who have issued at least one directive
          this season. Once quorum is met, there is a base 45% likelihood of ratification,
          increasing to 95% as directives accumulate to double the quorum.
        </GuideSection>
        <GuideSection title="Resolution">
          All motions are resolved at the end of the season during the offseason proceedings.
          Outcomes are: <span style={{ color: '#22c55e' }}>RATIFIED</span> (motion passes),{' '}
          <span style={{ color: '#f59e0b' }}>MOTION DENIED</span> (quorum met but ratification
          failed), or <span style={{ color: '#94a3b8' }}>INSUFFICIENT QUORUM</span> (not
          enough directives filed).
        </GuideSection>
        <GuideSection title="Coaching Appointments">
          If a grievance against the head coach is ratified, the board may also nominate a
          preferred replacement from the available coaching pool. The nominee with the most
          votes (meeting quorum) is appointed. If no nominee achieves quorum, a coach is
          appointed at random.
        </GuideSection>
        <GuideSection title="Free Agent Requisitions">
          Rank up to 5 replacements for projected roster openings — walk-year players, cut-vote
          targets, and current prospects all appear on the same ballot. Submit any time once the
          board convenes (Week {GM_ACTIVE_WEEK}). If the ballot achieves quorum and is ratified,
          the front office will prioritize those names during the draft using ranked-choice voting.
        </GuideSection>
      </HelpModal>

      <FaBallotModal
        visible={faModalOpen}
        onClose={() => setFaModalOpen(false)}
        openSlots={faOpenSlots}
        scoutingPlayers={faScoutingPlayers}
        faWindowEnd={faWindowEnd}
        onSubmit={handleSubmitFaBallot}
        submitting={faBallotSubmitting}
        existingBallot={existingFaBallot}
      />
    </div>
  )
}

// Collapsible panel that lists every player projected to be available in
// the upcoming FA draft: current free agents + walk-year players on other
// teams + cut-vote likely players. Prospects are filtered out since they're
// not really "available to sign" — they belong to their drafting team.
const POOL_POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'] as const
type PoolPosition = typeof POOL_POSITIONS[number]

const FaPoolPreview: React.FC<{
  players: ScoutingPlayer[]
  open: boolean
  onToggle: () => void
  positionFilter: PoolPosition
  onPositionFilter: (pos: PoolPosition) => void
}> = ({ players, open, onToggle, positionFilter, onPositionFilter }) => {
  const pool = React.useMemo(
    () => players
      .filter(p => !p.isProspect)
      .filter(p => positionFilter === 'ALL' || p.position === positionFilter)
      .sort((a, b) => b.rating - a.rating),
    [players, positionFilter]
  )

  const totalCount = players.filter(p => !p.isProspect).length

  const sourceBadge = (p: ScoutingPlayer) => {
    if (!p.isProjected) return { label: 'FA', color: '#22c55e' }
    if (p.projectedReason === 'cut_vote') return { label: 'Cut Vote', color: '#ef4444' }
    return { label: 'Walk Year', color: '#f59e0b' }
  }

  return (
    <div style={{ borderBottom: '1px solid #334155' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#e2e8f0',
          textAlign: 'left' as const,
        }}
      >
        <span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
            Projected FA Pool
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
            {totalCount} player{totalCount !== 1 ? 's' : ''} available this offseason
          </span>
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ padding: '4px 14px 14px' }}>
          {/* Position filter pills */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const, marginBottom: '10px' }}>
            {POOL_POSITIONS.map(pos => {
              const active = positionFilter === pos
              return (
                <button
                  key={pos}
                  onClick={() => onPositionFilter(pos)}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '3px',
                    border: `1px solid ${active ? '#334155' : 'transparent'}`,
                    backgroundColor: active ? '#1e293b' : 'transparent',
                    color: active ? '#e2e8f0' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {pos}
                </button>
              )
            })}
          </div>

          {/* Player list */}
          {pool.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' as const, padding: '8px 0' }}>
              No players match this filter yet.
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {pool.map(p => {
                const badge = sourceBadge(p)
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#0f172a',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr auto 72px',
                      gap: '10px',
                      alignItems: 'center',
                    }}>
                      <span style={{ color: '#64748b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' as const }}>
                        {p.position}
                      </span>
                      <span style={{ color: '#e2e8f0' }}>
                        {p.name}
                        {p.currentTeam && (
                          <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px' }}>
                            ({p.currentTeam})
                          </span>
                        )}
                      </span>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
                        color: badge.color, padding: '1px 6px', borderRadius: '3px',
                        backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}40`,
                        whiteSpace: 'nowrap' as const,
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Stars stars={calcStars(p.rating)} size={11} />
                      </span>
                    </div>
                    {p.stats ? (
                      <div style={{
                        marginTop: '4px',
                        paddingLeft: '42px',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}>
                        <StatLine position={p.position} stats={p.stats} />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FrontOfficePanel
