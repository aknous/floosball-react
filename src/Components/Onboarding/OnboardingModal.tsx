import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// ── Username selection step ────────────────────────────────────────────────

// Mirrors api/auth.validateUsername. Duplicated ON PURPOSE: the server is the authority
// and re-checks everything, but a name typed here should fail as you type rather than on
// submit. Keep the two in step — the server's message wins if they ever disagree.
const NAME_MIN = 3
const NAME_MAX = 20
const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/

const localNameError = (name: string): string | null => {
  const n = name.trim()
  if (!n) return null                     // empty is "not yet", not "wrong"
  if (n.length < NAME_MIN) return `At least ${NAME_MIN} characters`
  if (n.length > NAME_MAX) return `${NAME_MAX} characters or fewer`
  if (!NAME_RE.test(n)) return 'Letters, numbers and underscores, starting with a letter'
  return null
}

const UsernameStep: React.FC<{
  onSelect: (name: string) => void
  getToken: () => Promise<string | null>
}> = ({ onSelect, getToken }) => {
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [ownName, setOwnName] = useState('')
  const ownError = localNameError(ownName)
  // Typing takes precedence over a highlighted suggestion, so the box the user is
  // actively using is the one that wins rather than whichever was touched last.
  const chosen = ownName.trim() ? (ownError ? null : ownName.trim()) : selected
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    setError(null)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/users/me/username-options`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        const data = await res.json()
        setOptions(data.options || [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const handleConfirm = async () => {
    if (!chosen) return
    setSubmitting(true)
    setError(null)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/users/me/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ username: chosen }),
      })
      if (res.ok) {
        onSelect(chosen)
      } else if (res.status === 400) {
        // The server validates independently and its message is the authoritative one.
        setError((await res.json().catch(() => ({}))).detail || 'That name will not work.')
      } else if (res.status === 409) {
        setError(ownName.trim()
          ? 'That name is already taken. Try another.'
          : 'That name was just taken. Here are some new options.')
        setSelected(null)
        if (!ownName.trim()) fetchOptions()
      } else {
        setError('Something went wrong. Try again.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
        Pick a name. This is how other managers will know you.
      </p>
      {loading ? (
        <div style={{ color: '#64748b', fontSize: '13px', padding: '20px 0' }}>Generating names...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {options.map(name => (
            <button
              key={name}
              onClick={() => setSelected(name)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: selected === name ? '2px solid #3b82f6' : '1px solid #334155',
                backgroundColor: selected === name ? '#1e3a5f' : '#0f172a',
                color: selected === name ? '#e2e8f0' : '#cbd5e1',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 10px',
          color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span style={{ flex: 1, height: 1, background: '#1e293b' }} />
          or make your own
          <span style={{ flex: 1, height: 1, background: '#1e293b' }} />
        </div>
        <input
          value={ownName}
          onChange={e => { setOwnName(e.target.value); setSelected(null); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter' && chosen && !submitting) handleConfirm() }}
          placeholder="Your own name"
          maxLength={NAME_MAX}
          spellCheck={false}
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 16px', borderRadius: '8px',
            border: `1px solid ${ownError ? '#b45309' : ownName.trim() ? '#3b82f6' : '#334155'}`,
            backgroundColor: '#0f172a', color: '#e2e8f0',
            fontSize: '15px', fontWeight: 600, outline: 'none',
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '10px',
          fontSize: '11px', marginTop: '5px', minHeight: '15px',
        }}>
          <span style={{ color: ownError ? '#fbbf24' : '#64748b' }}>{ownError || ''}</span>
          <span style={{ color: '#64748b', flexShrink: 0 }}>
            {ownName.length}/{NAME_MAX}
          </span>
        </div>
      </div>
      <button
        onClick={fetchOptions}
        disabled={loading}
        style={{
          background: 'none', border: 'none',
          color: loading ? '#475569' : '#3b82f6',
          fontSize: '13px', fontWeight: '600',
          cursor: loading ? 'default' : 'pointer',
          padding: '4px 0',
        }}
      >
        Re-roll
      </button>
      {error && (
        <div style={{ color: '#f59e0b', fontSize: '13px', marginTop: '8px' }}>{error}</div>
      )}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleConfirm}
          disabled={!chosen || submitting}
          style={{
            padding: '10px 24px', borderRadius: '6px',
            backgroundColor: chosen ? '#3b82f6' : '#334155',
            border: 'none',
            color: chosen ? '#fff' : '#64748b',
            fontSize: '14px', fontWeight: '600',
            cursor: chosen && !submitting ? 'pointer' : 'default',
            width: '100%',
          }}
        >
          {submitting ? 'Claiming...' : chosen ? `I'll go by ${chosen}` : 'Pick or type a name'}
        </button>
      </div>
    </>
  )
}

// ── Info steps ─────────────────────────────────────────────────────────────

const INFO_STEPS = [
  {
    title: 'Welcome to the Closed Beta',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          Floosball is a simulated football league that runs on its own. Teams play weekly games,
          seasons progress through playoffs to the Floosbowl, and players develop over time.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          Your dashboard shows live games, standings, and league news. Check in whenever you want to
          see what's happening.
        </p>
        <p style={{ color: '#f59e0b', lineHeight: '1.6', fontSize: '13px' }}>
          This is a closed beta — features are actively being developed and things may change.
          Season data (fantasy points, cards, floobits) may occasionally be reset as we fix bugs and improve the game.
          Your feedback is welcome and appreciated. Join the{' '}
          <a
            href="https://discord.gg/b4DZn3mVfP"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}
          >Discord server</a>{' '}
          to report bugs and request features.
        </p>
      </>
    ),
  },
  {
    title: 'Fantasy & Trading Cards',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          <span style={{ color: '#4ade80', fontWeight: '600' }}>Fantasy Roster</span> — Draft 5 players
          (QB, RB, WR, TE, K) each season. They earn Fantasy Points based on their live game stats.
          Swap players between games each week.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          <span style={{ color: '#eab308', fontWeight: '600' }}>Trading Cards</span> — Collect player cards
          from packs or the shop. Equip cards to boost your fantasy score with effects like bonus FP,
          multipliers, streaks, and more. Upgrade cards in The Combine.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '13px' }}>
          <span style={{ color: '#60a5fa', fontWeight: '600' }}>Floobits</span> — Earn currency from leaderboard
          finishes, correct predictions, team achievements, and season payouts. Spend them on card packs,
          upgrades, and directives.
        </p>
      </>
    ),
  },
  {
    title: 'Pick a Favorite Team',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          Choose a favorite team to earn bonus Floobits when they win, make the playoffs,
          or win the Floosbowl. You can change your team during the offseason.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          Starting in Week 22, you can issue directives through The Front Office to influence
          your team's coaching and roster decisions.
        </p>
        <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '13px' }}>
          You'll be able to pick your team from the menu after you close this — look for the
          team grid in the dropdown next to your username.
        </p>
      </>
    ),
  },
  {
    title: 'Rookie Goals',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '14px' }}>
          Get started with six one-time goals. Each pays out Floobits when you complete it
          and the Achievements page tracks your progress.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px 0', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
          <li style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
            <span style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>New Fan</span> — pick a favorite team
            </span>
          </li>
          <li style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
            <span style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Prognosticator</span> — submit your first pick-em prediction
            </span>
          </li>
          <li style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
            <span style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Pack Popper</span> — open your first card pack
            </span>
          </li>
          <li style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
            <span style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Field General</span> — set your first fantasy roster
            </span>
          </li>
          <li style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
            <span style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Deck Builder</span> — equip a card to your roster
            </span>
          </li>
          <li style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
            <span style={{ color: '#cbd5e1' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Patron</span> — contribute Floobits to your team
            </span>
          </li>
        </ul>
        <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '13px' }}>
          Find step-by-step instructions and track everything from the{' '}
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Achievements</span> tab in the sidebar.
          Each season you'll also unlock recurring Season Goals with bigger rewards.
        </p>
      </>
    ),
  },
]

// Total steps = username (step 0) + INFO_STEPS
const TOTAL_STEPS = 1 + INFO_STEPS.length

// ── Main modal ─────────────────────────────────────────────────────────────

export const OnboardingModal: React.FC = () => {
  const { user, getToken, refetchUser } = useAuth()
  const isMobile = useIsMobile()
  const [step, setStep] = useState(0)
  const [closing, setClosing] = useState(false)
  const [usernameChosen, setUsernameChosen] = useState(false)

  // If user already has a username (existing user), skip the username step
  const needsUsername = user && !user.username
  const effectiveStep = needsUsername && !usernameChosen ? 0 : step

  const handleUsernameSelected = (name: string) => {
    setUsernameChosen(true)
    setStep(1)
    refetchUser()
  }

  const handleComplete = async () => {
    setClosing(true)
    try {
      const tok = await getToken()
      if (tok) {
        await fetch(`${API_BASE}/users/me/onboarding-complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}` },
        })
      }
    } catch { /* silent */ }
    window.location.reload()
  }

  if (!user || user.hasCompletedOnboarding || closing) return null

  // Username step
  const isUsernameStep = needsUsername && !usernameChosen
  // Info step index (0-based within INFO_STEPS)
  const infoIndex = step - 1
  const isLastInfoStep = infoIndex === INFO_STEPS.length - 1

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      backgroundColor: 'rgba(0,0,0,0.8)',
      fontFamily: 'pressStart, monospace',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: isMobile ? '0' : '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '480px',
        backgroundColor: '#1e293b',
        border: isMobile ? 'none' : '1px solid #334155',
        borderRadius: isMobile ? '14px 14px 0 0' : '14px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>
        {/* Step indicator */}
        <div style={{
          display: 'flex', gap: '6px',
          padding: '20px 24px 0',
        }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              backgroundColor: i <= (isUsernameStep ? 0 : step) ? '#3b82f6' : '#334155',
              transition: 'background-color 0.3s',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px' }}>
          {isUsernameStep ? (
            <>
              <h2 style={{
                fontSize: '18px', fontWeight: '700', color: '#e2e8f0',
                marginBottom: '16px',
              }}>
                Choose Your Name
              </h2>
              <UsernameStep onSelect={handleUsernameSelected} getToken={getToken} />
            </>
          ) : (
            <>
              <h2 style={{
                fontSize: '18px', fontWeight: '700', color: '#e2e8f0',
                marginBottom: '16px',
              }}>
                {INFO_STEPS[infoIndex].title}
              </h2>
              <div style={{ fontSize: '14px' }}>
                {INFO_STEPS[infoIndex].content}
              </div>
            </>
          )}
        </div>

        {/* Footer (only for info steps) */}
        {!isUsernameStep && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid #334155',
          }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {step} of {TOTAL_STEPS}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {infoIndex > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  style={{
                    padding: '8px 16px', borderRadius: '6px',
                    backgroundColor: 'transparent', border: '1px solid #475569',
                    color: '#94a3b8', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={isLastInfoStep ? handleComplete : () => setStep(s => s + 1)}
                style={{
                  padding: '8px 20px', borderRadius: '6px',
                  backgroundColor: '#3b82f6', border: 'none',
                  color: '#fff', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {isLastInfoStep ? "Let's Go" : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
