import React, { useMemo, useState } from 'react'
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
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'
import { GM_VOTE_COST, GM_VOTES_PER_SEASON, GM_VOTES_PER_TARGET, GM_VOTES_PER_TYPE } from '@/types/gm'

const GM_ACTIVE_WEEK = 10

interface FrontOfficePanelProps {
  teamId: number
  teamColor: string
}

const FrontOfficePanel: React.FC<FrontOfficePanelProps> = ({ teamId, teamColor }) => {
  const { user } = useAuth()
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const gm = useGmData(teamId)

  const currentWeek = seasonState.currentWeek
  const isOffseason = seasonState.currentWeekText === 'Offseason'
  const isActive = currentWeek >= GM_ACTIVE_WEEK || isOffseason

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
          During the offseason, a voting window opens for free agent requisition ballots.
          Rank up to 5 players in order of preference. If your team's ballot achieves quorum
          and is ratified, the front office will prioritize those players during the draft
          using ranked-choice voting.
        </GuideSection>
      </HelpModal>
    </div>
  )
}

export default FrontOfficePanel
