import React, { useState, useRef, useEffect } from 'react'
import HoverTooltip from '@/Components/HoverTooltip'
import { getContrastTextColor } from '@/utils/colors'

// Window (ms) the armed "Confirm" state stays live before reverting on its own.
const CONFIRM_WINDOW_MS = 3000
const CONFIRM_COLOR = '#f59e0b'

interface VoteButtonProps {
  cost: number
  disabled: boolean
  voting: boolean
  onConfirm: () => void
  teamColor: string
  /** Optional override label for the resting state (defaults to "{cost} F"). */
  label?: string
}

/**
 * Two-tap vote button. First tap arms it ("Confirm · {cost} F"), a second tap
 * within a few seconds casts. Guards against the fat-finger votes that the
 * undo feature otherwise has to clean up. Arming auto-reverts after a beat.
 */
export const VoteButton: React.FC<VoteButtonProps> = ({
  cost, disabled, voting, onConfirm, teamColor, label,
}) => {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  useEffect(() => clearTimer, [])

  // A button that becomes disabled (limit hit, threshold met, broke) should
  // never be left in an armed state.
  useEffect(() => {
    if (disabled && armed) {
      setArmed(false)
      clearTimer()
    }
  }, [disabled, armed])

  const handleClick = () => {
    if (disabled || voting) return
    if (armed) {
      clearTimer()
      setArmed(false)
      onConfirm()
    } else {
      setArmed(true)
      clearTimer()
      timerRef.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS)
    }
  }

  const bg = disabled ? '#1e293b' : armed ? CONFIRM_COLOR : teamColor
  const fg = disabled ? '#475569' : armed ? getContrastTextColor(CONFIRM_COLOR) : getContrastTextColor(teamColor)
  const text = voting ? '...' : armed ? `Confirm · ${cost} F` : (label ?? `${cost} F`)

  return (
    <button
      onClick={handleClick}
      onMouseLeave={() => { if (armed) { setArmed(false); clearTimer() } }}
      disabled={disabled || voting}
      style={{
        padding: '4px 8px',
        backgroundColor: bg,
        color: fg,
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: voting ? 0.6 : 1,
        whiteSpace: 'nowrap',
        transition: 'background-color 0.12s ease',
      }}
    >
      {text}
    </button>
  )
}

interface UndoButtonProps {
  onUndo: () => void
  undoing: boolean
  /** How many votes the user has on this target (shown if > 1). */
  voteCount: number
  refundAmount: number
}

const UndoIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M4 4v3.5h3.5M4.2 7.2A5 5 0 1 1 3.5 10"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

/**
 * Retract-your-last-vote button. Only rendered when the user actually has a
 * vote on the target. Single tap (undo is the safe direction); refunds what
 * was paid for the most-recent vote on this target.
 */
export const UndoButton: React.FC<UndoButtonProps> = ({ onUndo, undoing, voteCount, refundAmount }) => {
  const tip = voteCount > 1
    ? `Undo your last vote here (${voteCount} cast) — refunds ${refundAmount} F`
    : `Undo your vote here — refunds ${refundAmount} F`

  return (
    <HoverTooltip text={tip}>
      <button
        onClick={(e) => { e.stopPropagation(); if (!undoing) onUndo() }}
        disabled={undoing}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          padding: '4px 6px',
          backgroundColor: '#1e293b',
          color: '#cbd5e1',
          border: '1px solid #334155',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 700,
          cursor: undoing ? 'wait' : 'pointer',
          opacity: undoing ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {undoing ? '...' : <UndoIcon color="#cbd5e1" />}
        {voteCount > 1 && !undoing && <span>{voteCount}</span>}
      </button>
    </HoverTooltip>
  )
}

const OPPOSE_COLOR = '#ef4444'

interface StanceControlsProps {
  cost: number
  stance: 'yea' | 'nay' | null
  baseDisabled: boolean   // budget / global / can't-afford — applies to both sides
  voting: boolean
  teamColor: string
  onVote: (direction: 'yea' | 'nay') => void
}

/**
 * Side-by-side For / Against buttons for the threshold directives. A fan holds
 * a single stance per target — the opposite side locks once they've voted
 * (withdraw via the Undo button to switch). Both keep the two-tap confirm.
 * The locked side is wrapped in a span so its tooltip still shows on hover.
 */
export const StanceControls: React.FC<StanceControlsProps> = ({
  cost, stance, baseDisabled, voting, teamColor, onVote,
}) => {
  const forBtn = (
    <VoteButton
      cost={cost}
      disabled={baseDisabled || stance === 'nay'}
      voting={voting}
      onConfirm={() => onVote('yea')}
      teamColor={teamColor}
      label="For"
    />
  )
  const opposeBtn = (
    <VoteButton
      cost={cost}
      disabled={baseDisabled || stance === 'yea'}
      voting={voting}
      onConfirm={() => onVote('nay')}
      teamColor={OPPOSE_COLOR}
      label="Against"
    />
  )
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {stance === 'nay'
        ? <HoverTooltip text="Withdraw your Against vote to switch sides"><span>{forBtn}</span></HoverTooltip>
        : forBtn}
      {stance === 'yea'
        ? <HoverTooltip text="Withdraw your For vote to switch sides"><span>{opposeBtn}</span></HoverTooltip>
        : opposeBtn}
    </div>
  )
}
