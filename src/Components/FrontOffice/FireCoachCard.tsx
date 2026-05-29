import React, { useState, useRef, useEffect } from 'react'
import CoachHoverCard from '@/Components/CoachHoverCard'
import { Stars, calcStars } from '@/Components/Stars'
import ProbabilityMeter from './ProbabilityMeter'
import HoverTooltip from '@/Components/HoverTooltip'
import { getContrastTextColor } from '@/utils/colors'
import type { GmCoachInfo, GmVoteTally } from '@/types/gm'

const CONFIRM_WINDOW_MS = 3000
const CONFIRM_COLOR = '#f59e0b'

interface FireCoachCardProps {
  coach: GmCoachInfo
  availableCoaches: GmCoachInfo[]
  tally: GmVoteTally | null
  teamColor: string
  voting: boolean
  onVote: () => void
  undoing: boolean
  onUndo: () => void
  myVoteCount: number
  lastCost: number
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
  undoing,
  onUndo,
  myVoteCount,
  lastCost,
  disabled,
  votesRemaining,
  nextCost,
  thresholdMet,
}) => {
  const cost = nextCost

  // Two-tap confirm — mirror VoteControls.VoteButton for the full-width button.
  const [armed, setArmed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }
  useEffect(() => clearTimer, [])
  useEffect(() => { if (disabled && armed) { setArmed(false); clearTimer() } }, [disabled, armed])

  const handleVoteClick = () => {
    if (disabled || voting) return
    if (armed) { clearTimer(); setArmed(false); onVote() }
    else { setArmed(true); clearTimer(); timerRef.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS) }
  }

  const btnBg = disabled ? '#1e293b' : armed ? CONFIRM_COLOR : teamColor
  const btnFg = disabled ? '#475569' : armed ? getContrastTextColor(CONFIRM_COLOR) : getContrastTextColor(teamColor)
  const btnText = voting ? 'Filing...' : armed ? `Confirm — ${cost} F` : `File Grievance — ${cost} F`

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

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={handleVoteClick}
          onMouseLeave={() => { if (armed) { setArmed(false); clearTimer() } }}
          disabled={disabled || voting}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: btnBg,
            color: btnFg,
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: voting ? 0.6 : 1,
            transition: 'background-color 0.12s ease, opacity 0.2s',
          }}
        >
          {btnText}
        </button>

        {myVoteCount > 0 && (
          <HoverTooltip text={
            myVoteCount > 1
              ? `Undo your last grievance (${myVoteCount} filed) \u2014 refunds ${lastCost} F`
              : `Undo your grievance \u2014 refunds ${lastCost} F`
          }>
            <button
              onClick={() => { if (!undoing) onUndo() }}
              disabled={undoing}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: undoing ? 'wait' : 'pointer',
                opacity: undoing ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {undoing ? '...' : `Undo${myVoteCount > 1 ? ` (${myVoteCount})` : ''}`}
            </button>
          </HoverTooltip>
        )}
      </div>

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
