import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useRuleVote, fmtRuleValue } from '@/contexts/RuleVoteContext'
import { CoreIcon, coreColor } from '@/utils/coresVisual'

// The Cores rule-change vote — an in-voice exchange with the Core running it.
// Aris asks which rule to bend (change); Pyre asks which to put back (revert).
// The Core reacts live to the user's pick. Countdown + running totals shown.

const NONE_KEY = 'none'

function useCountdown(closesAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!closesAt) return null
  const ms = new Date(closesAt).getTime() - now
  if (ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

const RuleVoteModal: React.FC = () => {
  const isMobile = useIsMobile()
  const rv = useRuleVote()
  const {
    open, modalOpen, closeModal, kind, core, coreDisplayName,
    prompt, reactPick, reactNone, options, totals, myPick, votingOpen, castVote,
    multiSelect, myPicks, toggleRevert,
  } = rv
  const accent = coreColor(core || undefined)
  const countdown = useCountdown(rv.closesAt)

  const onEsc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }, [closeModal])
  useEffect(() => {
    if (!modalOpen) return
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [modalOpen, onEsc])

  if (!open || !modalOpen) return null

  const isRevert = kind === 'revert'
  const title = isRevert ? 'Rule Revert Vote' : 'Rule Change Vote'
  // Multi-select revert: reaction keys off "has any pick"; single-pick keys off myPick.
  const reaction = multiSelect
    ? (myPicks.length > 0 ? reactPick : reactNone)
    : (myPick == null ? null : (myPick === NONE_KEY ? reactNone : reactPick))
  const noneVotes = totals[NONE_KEY] ?? 0

  const optionRow = (
    key: string, label: string, sub: string | null, selected: boolean, count: number,
    onClick: () => void, checkbox: boolean = false,
  ) => (
    <button
      key={key}
      onClick={votingOpen ? onClick : undefined}
      disabled={!votingOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
        padding: '11px 13px', borderRadius: '8px', textAlign: 'left',
        cursor: votingOpen ? 'pointer' : 'default',
        background: selected ? `${accent}22` : '#0f172a',
        border: `1px solid ${selected ? accent : '#334155'}`,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <span style={{
        width: '16px', height: '16px', borderRadius: checkbox ? '4px' : '50%', flexShrink: 0,
        border: `2px solid ${selected ? accent : '#475569'}`,
        background: selected ? accent : 'transparent',
      }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '15px', color: '#e2e8f0', fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginTop: '3px' }}>{sub}</span>}
      </span>
      <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700, minWidth: '54px', textAlign: 'right' }}>
        {count} {count === 1 ? 'vote' : 'votes'}
      </span>
    </button>
  )

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? '0' : '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
    >
      <div style={{
        width: '100%', maxWidth: isMobile ? '100%' : '560px', maxHeight: '90vh',
        backgroundColor: '#1e293b',
        fontFamily: 'pressStart, monospace',
        border: isMobile ? 'none' : `1px solid ${accent}55`,
        borderRadius: isMobile ? '14px 14px 0 0' : '14px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <span style={{
            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}22`, border: `1px solid ${accent}66`,
          }}>
            <CoreIcon core={core || undefined} color={accent} size={18} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: accent }}>{coreDisplayName || 'The Cores'}</span>
            <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
          </span>
          {votingOpen && countdown && countdown !== '0:00' && (
            <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              closes {countdown}
            </span>
          )}
          <button onClick={closeModal} aria-label="Close" style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '0 2px', lineHeight: 1,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >x</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto' }}>
          {/* Core prompt (the ask) */}
          {prompt && (
            <div style={{
              fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic',
              padding: '11px 13px', borderRadius: '8px', marginBottom: '16px',
              background: `${accent}14`, borderLeft: `3px solid ${accent}`,
            }}>
              {prompt}
            </div>
          )}

          {/* Options — multi-select (revert) shows checkboxes and no "none" row;
              the empty set already means "leave the rules as they are". */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {multiSelect
              ? options.map(o => optionRow(
                  o.key, o.label,
                  o.description ?? `${fmtRuleValue(o.current)} → ${fmtRuleValue(o.proposed)}`,
                  myPicks.includes(o.key), totals[o.key] ?? 0, () => toggleRevert(o.key), true,
                ))
              : (<>
                  {options.map(o => optionRow(
                    o.key, o.label,
                    o.description ?? `${fmtRuleValue(o.current)} → ${fmtRuleValue(o.proposed)}`,
                    myPick === o.key, totals[o.key] ?? 0, () => castVote(o.key),
                  ))}
                  {optionRow(
                    NONE_KEY, 'Change nothing',
                    null, myPick === NONE_KEY, noneVotes, () => castVote(NONE_KEY),
                  )}
                </>)}
          </div>

          {/* Core reaction to the live pick */}
          {reaction && (
            <div style={{
              marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '9px',
            }}>
              <CoreIcon core={core || undefined} color={accent} size={15} />
              <span style={{ fontSize: '14px', color: accent, lineHeight: 1.5, fontStyle: 'italic' }}>{reaction}</span>
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '16px', lineHeight: 1.5 }}>
            {multiSelect
              ? 'Check every rule you want put back. Any rule approved on at least half the ballots is reverted before the day\'s games.'
              : 'The most-voted option wins, effective before the day\'s games. It lasts until it\'s voted back or the season ends, when all rules reset to standard.'}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default RuleVoteModal
