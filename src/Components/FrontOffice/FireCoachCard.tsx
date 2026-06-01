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
  onVote: (direction: 'yea' | 'nay') => void
  myStance: 'yea' | 'nay' | null
  undoing: boolean
  onUndo: () => void
  myVoteCount: number
  lastCost: number
  disabled: boolean
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
  myStance,
  undoing,
  onUndo,
  myVoteCount,
  lastCost,
  disabled,
  nextCost,
  thresholdMet,
}) => {
  const cost = nextCost
  const OPPOSE_COLOR = '#ef4444'
  // One vote per fan: once they've voted, their pick shows filled and both
  // sides lock — use Undo to change it.
  const voted = myStance !== null
  const forSelected = myStance === 'yea'
  const oppSelected = myStance === 'nay'
  const forDisabled = disabled || voted
  const opposeDisabled = disabled || voted

  // Two-tap confirm for each side — mirrors VoteControls.VoteButton.
  const [armed, setArmed] = useState(false)
  const [armedOppose, setArmedOppose] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const opposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }
  const clearOpposeTimer = () => { if (opposeTimerRef.current) { clearTimeout(opposeTimerRef.current); opposeTimerRef.current = null } }
  useEffect(() => () => { clearTimer(); clearOpposeTimer() }, [])
  useEffect(() => { if (forDisabled && armed) { setArmed(false); clearTimer() } }, [forDisabled, armed])
  useEffect(() => { if (opposeDisabled && armedOppose) { setArmedOppose(false); clearOpposeTimer() } }, [opposeDisabled, armedOppose])

  const handleVoteClick = () => {
    if (forDisabled || voting) return
    if (armed) { clearTimer(); setArmed(false); onVote('yea') }
    else { setArmed(true); clearTimer(); timerRef.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS) }
  }
  const handleOpposeClick = () => {
    if (opposeDisabled || voting) return
    if (armedOppose) { clearOpposeTimer(); setArmedOppose(false); onVote('nay') }
    else { setArmedOppose(true); clearOpposeTimer(); opposeTimerRef.current = setTimeout(() => setArmedOppose(false), CONFIRM_WINDOW_MS) }
  }

  const btnBg = forSelected ? teamColor : forDisabled ? '#1e293b' : armed ? CONFIRM_COLOR : teamColor
  const btnFg = (forSelected || !forDisabled) ? getContrastTextColor(armed && !forSelected ? CONFIRM_COLOR : teamColor) : '#475569'
  const btnText = voting ? '...' : armed ? `Confirm · ${cost} F` : 'Fire'
  const oppBg = oppSelected ? OPPOSE_COLOR : opposeDisabled ? '#1e293b' : armedOppose ? CONFIRM_COLOR : OPPOSE_COLOR
  const oppFg = (oppSelected || !opposeDisabled) ? getContrastTextColor(armedOppose && !oppSelected ? CONFIRM_COLOR : OPPOSE_COLOR) : '#475569'
  const oppText = voting ? '...' : armedOppose ? `Confirm · ${cost} F` : 'Keep'

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
            votesFor={tally.votesFor}
            votesAgainst={tally.votesAgainst}
            threshold={tally.threshold}
            probability={tally.probability}
            accentColor={teamColor}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={handleVoteClick}
          onMouseLeave={() => { if (armed) { setArmed(false); clearTimer() } }}
          disabled={forDisabled || voting}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: btnBg,
            color: btnFg,
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: forSelected ? 'default' : forDisabled ? 'not-allowed' : 'pointer',
            opacity: voting ? 0.6 : 1,
            transition: 'background-color 0.12s ease, opacity 0.2s',
          }}
        >
          {btnText}
        </button>

        <button
          onClick={handleOpposeClick}
          onMouseLeave={() => { if (armedOppose) { setArmedOppose(false); clearOpposeTimer() } }}
          disabled={opposeDisabled || voting}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: oppBg,
            color: oppFg,
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: oppSelected ? 'default' : opposeDisabled ? 'not-allowed' : 'pointer',
            opacity: voting ? 0.6 : 1,
            transition: 'background-color 0.12s ease, opacity 0.2s',
          }}
        >
          {oppText}
        </button>

        {myVoteCount > 0 && (
          <HoverTooltip text={`Take back your vote. Refunds ${lastCost} F`}>
            <button
              onClick={() => { if (!undoing) onUndo() }}
              disabled={undoing}
              style={{
                width: '100%',
                padding: '6px 12px',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '11px',
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
