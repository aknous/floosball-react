import React from 'react'
import CoachAvatar from '@/Components/CoachAvatar'
import CoachHoverCard from '@/Components/CoachHoverCard'
import { Stars, calcStars } from '@/Components/Stars'
import ProbabilityMeter from './ProbabilityMeter'
import type { GmCoachInfo, GmVoteTally } from '@/types/gm'

interface FireCoachCardProps {
  coach: GmCoachInfo
  availableCoaches: GmCoachInfo[]
  tally: GmVoteTally | null
  teamColor: string
  voting: boolean
  onVote: () => void
  disabled: boolean
  votesRemaining: number
  nextCost: number
  thresholdMet: boolean
}

const FireCoachCard: React.FC<FireCoachCardProps> = ({
  coach,
  availableCoaches,
  tally,
  teamColor,
  voting,
  onVote,
  disabled,
  votesRemaining,
  nextCost,
  thresholdMet,
}) => {
  const cost = nextCost

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
        <span>File Grievance</span>
        <span style={{ fontWeight: '600', color: votesRemaining > 0 ? '#94a3b8' : '#ef4444', textTransform: 'none' }}>
          {votesRemaining} remaining
        </span>
      </div>

      <CoachHoverCard coach={coach} teamColor={teamColor}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'default' }}>
          <CoachAvatar name={coach.name} size={48} bgColor={teamColor} style={{ border: `2px solid ${teamColor}` }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>{coach.name}</div>
            <div style={{ marginTop: '2px' }}>
              <Stars stars={calcStars(coach.overallRating)} size={11} />
            </div>
          </div>
        </div>
      </CoachHoverCard>

      {tally && (
        <div style={{ marginBottom: '10px' }}>
          <ProbabilityMeter
            votes={tally.votes}
            threshold={tally.threshold}
            probability={tally.probability}
            accentColor={teamColor}
          />
        </div>
      )}

      <button
        onClick={onVote}
        disabled={disabled || voting}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: disabled ? '#1e293b' : teamColor,
          color: disabled ? '#475569' : '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '700',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: voting ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {voting ? 'Filing...' : `File Grievance \u2014 ${cost} F`}
      </button>

      {!thresholdMet && availableCoaches.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}>
            Available Replacements
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {availableCoaches.slice(0, 3).map(c => (
              <CoachHoverCard key={c.name} coach={c} teamColor={teamColor}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  cursor: 'default',
                }}>
                  <Stars stars={calcStars(c.overallRating)} size={11} />
                  <span>{c.name}</span>
                </div>
              </CoachHoverCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FireCoachCard
