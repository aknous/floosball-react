import React, { useState, useEffect } from 'react'
import { SignIn } from '@clerk/react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const LandingPage: React.FC = () => {
  const [mode, setMode] = useState<'request' | 'waitlist' | null>(null)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/beta/access-mode`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.mode) setMode(d.mode) })
      .catch(() => {})
  }, [])

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/beta/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Request failed')
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const isWaitlist = mode === 'waitlist'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'pressStart',
    }}>
      {/* Logo + Title */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <img
          src="/avatars/league_logo.png"
          alt="Floosball"
          width={56}
          height={56}
          style={{ marginBottom: '16px', borderRadius: '50%' }}
        />
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#e2e8f0',
          margin: '0 0 8px',
          letterSpacing: '0.02em',
        }}>
          Floosball
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#94a3b8',
          margin: 0,
        }}>
          A simulated football league you didn't ask for
        </p>
      </div>

      {isWaitlist ? (
        /* Waitlist mode — email form instead of Clerk sign-in */
        <div style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '32px 28px',
          textAlign: 'center',
        }}>
          {submitted ? (
            <>
              <p style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                You're on the list
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                We'll send you an email when access opens up.
              </p>
            </>
          ) : (
            <>
              <p style={{
                fontSize: '14px',
                color: '#94a3b8',
                lineHeight: '1.6',
                marginBottom: '20px',
              }}>
                Floosball isn't accepting new players right now. Join the waitlist to get notified when spots open up.
              </p>
              <form onSubmit={handleWaitlist} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: '#e2e8f0',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                {error && (
                  <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  style={{
                    backgroundColor: submitting ? '#a16207' : '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Join Waitlist'}
                </button>
              </form>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '16px' }}>
                Already have access?{' '}
                <a
                  href="#signin"
                  onClick={(e) => { e.preventDefault(); setMode('request') }}
                  style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}
                >
                  Sign in
                </a>
              </p>
            </>
          )}
        </div>
      ) : (
        /* Normal mode — Clerk Sign In */
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <SignIn
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: {
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  width: '100%',
                },
                cardBox: {
                  boxShadow: 'none',
                  width: '100%',
                },
                footer: {
                  background: 'transparent',
                  '& > div:last-child': { display: 'none' },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  )
}

export default LandingPage
