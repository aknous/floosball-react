import React from 'react'
import CoachAvatar from '@/Components/CoachAvatar'
import CoachHoverCard from '@/Components/CoachHoverCard'
import { Stars, calcStars } from '@/Components/Stars'
import ProbabilityMeter from './ProbabilityMeter'
import type { GmCoachInfo, GmVoteTally } from '@/types/gm'

interface HireCoachCardProps {
  availableCoaches: GmCoachInfo[]
  tallies: GmVoteTally[]
  teamColor: string
  voting: string | null
  onVote: (coachId: number) => void
  disabledIds: Set<number>
  globalDisabled: boolean
  votesRemaining: number
  nextCost: number
}

const HireCoachCard: React.FC<HireCoachCardProps> = ({
  availableCoaches,
  tallies,
  teamColor,
  voting,
  onVote,
  disabledIds,
  globalDisabled,
  votesRemaining,
  nextCost,
}) => {
  const cost = nextCost

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
          <span>Coaching Appointments</span>
          <span style={{ fontWeight: '600', color: votesRemaining > 0 ? '#94a3b8' : '#ef4444', textTransform: 'none' }}>
            {votesRemaining} remaining
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          No candidates in the coaching pool.
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
        <span>Coaching Appointments</span>
        <span style={{ fontWeight: '600', color: votesRemaining > 0 ? '#94a3b8' : '#ef4444', textTransform: 'none' }}>
          {votesRemaining} remaining
        </span>
      </div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
        Should the grievance succeed, nominate a preferred replacement.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {availableCoaches.map(c => {
          const coachId = c.id
          if (coachId === null) return null
          const tally = tallies.find(
            t => t.voteType === 'hire_coach' && t.targetPlayerId === coachId
          )
          const isVoting = voting === `hire_coach:${coachId}`
          const isDisabled = globalDisabled || disabledIds.has(coachId)

          return (
            <div key={coachId} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
            }}>
              <CoachHoverCard coach={c} teamColor={teamColor}>
                <CoachAvatar name={c.name} size={32} bgColor={teamColor} />
              </CoachHoverCard>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CoachHoverCard coach={c} teamColor={teamColor}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', cursor: 'default' }}>
                      {c.name}
                    </span>
                  </CoachHoverCard>
                  <Stars stars={calcStars(c.overallRating)} size={12} />
                </div>
                {tally && (
                  <div style={{ marginTop: '3px' }}>
                    <ProbabilityMeter
                      votes={tally.votes}
                      threshold={tally.threshold}
                      probability={tally.probability}
                      compact
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => onVote(coachId)}
                disabled={isDisabled || isVoting}
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  backgroundColor: isDisabled ? '#1e293b' : teamColor,
                  color: isDisabled ? '#475569' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isVoting ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {isVoting ? '...' : `Nominate \u2014 ${cost} F`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HireCoachCard
