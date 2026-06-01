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
  /** The user's cast pick on this side — shows filled and locks the button. */
  selected?: boolean
  /** Optional label shown when selected (defaults to `label`, then "Voted"). */
  selectedLabel?: string
}

/**
 * Two-tap vote button. First tap arms it ("Confirm · {cost} F"), a second tap
 * within a few seconds casts. Guards against the fat-finger votes that the
 * undo feature otherwise has to clean up. Arming auto-reverts after a beat.
 */
export const VoteButton: React.FC<VoteButtonProps> = ({
  cost, disabled, voting, onConfirm, teamColor, label, selected = false, selectedLabel,
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

  // selected = the user's cast pick on this side: filled + locked (no re-vote).
  const bg = selected ? teamColor : disabled ? '#1e293b' : armed ? CONFIRM_COLOR : teamColor
  const fg = selected || !disabled
    ? getContrastTextColor(armed && !selected ? CONFIRM_COLOR : teamColor)
    : '#475569'
  const text = voting ? '...' : selected ? (selectedLabel ?? label ?? 'Voted') : armed ? `Confirm · ${cost} F` : (label ?? `${cost} F`)
  const inert = disabled || voting || selected

  return (
    <button
      onClick={handleClick}
      onMouseLeave={() => { if (armed) { setArmed(false); clearTimer() } }}
      disabled={inert}
      style={{
        padding: '4px 8px',
        backgroundColor: bg,
        color: fg,
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: selected ? 'default' : disabled ? 'not-allowed' : 'pointer',
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
    ? `Take back your last vote here (${voteCount} cast). Refunds ${refundAmount} F`
    : `Take back your vote here. Refunds ${refundAmount} F`

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
  baseDisabled: boolean   // budget / global / can't-afford, applies to both sides
  voting: boolean
  teamColor: string
  supportLabel: string    // the take-the-action verb (e.g. Release, Renew)
  opposeLabel: string     // the opposite verb (e.g. Keep)
  onVote: (direction: 'yea' | 'nay') => void
}

/**
 * Side-by-side action buttons for the threshold directives (e.g. Release/Keep,
 * Renew/Release). One vote per fan per target: once they've voted, their pick
 * shows filled and both sides lock — use the Undo button to change it. Both
 * keep the two-tap confirm.
 */
export const StanceControls: React.FC<StanceControlsProps> = ({
  cost, stance, baseDisabled, voting, teamColor, supportLabel, opposeLabel, onVote,
}) => {
  const voted = stance !== null
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <VoteButton
        cost={cost}
        disabled={baseDisabled || voted}
        selected={stance === 'yea'}
        voting={voting}
        onConfirm={() => onVote('yea')}
        teamColor={teamColor}
        label={supportLabel}
      />
      <VoteButton
        cost={cost}
        disabled={baseDisabled || voted}
        selected={stance === 'nay'}
        voting={voting}
        onConfirm={() => onVote('nay')}
        teamColor={OPPOSE_COLOR}
        label={opposeLabel}
      />
    </div>
  )
}
