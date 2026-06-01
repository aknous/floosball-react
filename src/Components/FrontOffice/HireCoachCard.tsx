import React from 'react'
import CoachHoverCard from '@/Components/CoachHoverCard'
import { Stars, calcStars } from '@/Components/Stars'
import { VoteButton, UndoButton } from './VoteControls'
import { getContrastTextColor } from '@/utils/colors'
import type { GmCoachInfo, GmVoteTally } from '@/types/gm'

interface HireCoachCardProps {
  availableCoaches: GmCoachInfo[]
  tallies: GmVoteTally[]
  teamColor: string
  voting: string | null
  onVote: (coachId: number) => void
  undoing: string | null
  onUndo: (coachId: number) => void
  myVoteCount: (coachId: number) => number
  disabledIds: Set<number>
  globalDisabled: boolean
  balance: number
  getCost: (coachId: number) => number
  lastCost: (coachId: number) => number
}

const HireCoachCard: React.FC<HireCoachCardProps> = ({
  availableCoaches,
  tallies,
  teamColor,
  voting,
  onVote,
  undoing,
  onUndo,
  myVoteCount,
  disabledIds,
  globalDisabled,
  balance,
  getCost,
  lastCost,
}) => {

  if (availableCoaches.length === 0) {
    return (
      <div style={{ flex: 1, minWidth: '240px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontWeight: '700',
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '10px',
        }}>
          <span>Coaching Candidates</span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          Candidates appear once the current coach is fired or retires.
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minWidth: '240px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '10px',
      }}>
        <span>Coaching Candidates</span>
      </div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
        Three candidates, one job. Most votes hires. If no one votes, the highest-rated one signs.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {(() => {
          const hireTallies = tallies.filter(
            t => t.voteType === 'hire_coach' && t.targetPlayerId !== null && t.targetPlayerId !== undefined
          )
          const maxVotes = hireTallies.reduce((m, t) => Math.max(m, t.votes), 0)
          const leaderCount = maxVotes > 0
            ? hireTallies.filter(t => t.votes === maxVotes).length
            : 0
          return availableCoaches.map(c => {
            const coachId = c.id
            if (coachId === null) return null
            const tally = tallies.find(
              t => t.voteType === 'hire_coach' && t.targetPlayerId === coachId
            )
            const votes = tally?.votes ?? 0
            const isLeader = votes > 0 && votes === maxVotes
            const isSoleLeader = isLeader && leaderCount === 1
            const isVoting = voting === `hire_coach:${coachId}`
            const isUndoing = undoing === `hire_coach:${coachId}`
            const cost = getCost(coachId)
            const myVotes = myVoteCount(coachId)
            const isDisabled = globalDisabled || disabledIds.has(coachId) || balance < cost

            return (
              <div key={coachId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: '#0f172a',
                border: isSoleLeader ? `1px solid ${teamColor}` : '1px solid transparent',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <CoachHoverCard coach={c} teamColor={teamColor}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', cursor: 'default' }}>
                        {c.name}
                      </span>
                    </CoachHoverCard>
                    <Stars stars={calcStars(c.overallRating)} size={12} />
                    {isSoleLeader && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: getContrastTextColor(teamColor),
                        backgroundColor: teamColor,
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}>
                        LEADING
                      </span>
                    )}
                    {isLeader && !isSoleLeader && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#f59e0b',
                        backgroundColor: 'rgba(245,158,11,0.15)',
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}>
                        TIED
                      </span>
                    )}
                  </div>
                  <div style={{
                    marginTop: '2px',
                    fontSize: '11px',
                    color: isLeader ? '#cbd5e1' : '#94a3b8',
                    fontWeight: isLeader ? 600 : 400,
                  }}>
                    {votes} {votes === 1 ? 'vote' : 'votes'}
                  </div>
                </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {myVotes > 0 && (
                  <UndoButton
                    onUndo={() => onUndo(coachId)}
                    undoing={isUndoing}
                    voteCount={myVotes}
                    refundAmount={lastCost(coachId)}
                  />
                )}
                <VoteButton
                  cost={cost}
                  disabled={isDisabled}
                  selected={myVotes > 0}
                  voting={isVoting}
                  onConfirm={() => onVote(coachId)}
                  teamColor={teamColor}
                  label={`Nominate · ${cost} F`}
                  selectedLabel="Nominated"
                />
              </div>
            </div>
          )
          })
        })()}
      </div>
    </div>
  )
}

export default HireCoachCard
