import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const STEPS = [
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
          Starting in Week 10, you can issue directives through The Front Office to influence
          your team's coaching and roster decisions.
        </p>
        <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '13px' }}>
          You'll be able to pick your team from the menu after you close this — look for the
          team grid in the dropdown next to your username.
        </p>
      </>
    ),
  },
]

export const OnboardingModal: React.FC = () => {
  const { user, getToken } = useAuth()
  const isMobile = useIsMobile()
  const [step, setStep] = useState(0)
  const [closing, setClosing] = useState(false)

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
    // Force refresh to update user state
    window.location.reload()
  }

  if (!user || user.hasCompletedOnboarding || closing) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

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
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              backgroundColor: i <= step ? '#3b82f6' : '#334155',
              transition: 'background-color 0.3s',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px' }}>
          <h2 style={{
            fontSize: '18px', fontWeight: '700', color: '#e2e8f0',
            marginBottom: '16px',
          }}>
            {current.title}
          </h2>
          <div style={{ fontSize: '14px' }}>
            {current.content}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid #334155',
        }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {step + 1} of {STEPS.length}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 0 && (
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
              onClick={isLast ? handleComplete : () => setStep(s => s + 1)}
              style={{
                padding: '8px 20px', borderRadius: '6px',
                backgroundColor: '#3b82f6', border: 'none',
                color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {isLast ? "Let's Go" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
