import React, { useState } from 'react'
import { useClerk, useUser } from '@clerk/react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const BetaBlockedPage: React.FC = () => {
  const { signOut } = useClerk()
  const { user: clerkUser } = useUser()
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? ''

  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleRequest = async () => {
    if (!email) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/beta/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Request failed')
      }
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #334155',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#e2e8f0',
          marginBottom: '12px',
        }}>
          Closed Beta
        </h1>

        {submitted ? (
          <>
            <p style={{
              fontSize: '15px',
              color: '#94a3b8',
              lineHeight: '1.6',
              marginBottom: '8px',
            }}>
              Your request has been submitted. You'll receive an email at
            </p>
            <p style={{
              fontSize: '14px',
              color: '#e2e8f0',
              fontWeight: '600',
              marginBottom: '20px',
            }}>
              {email}
            </p>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              marginBottom: '28px',
            }}>
              if your access is approved.
            </p>
          </>
        ) : (
          <p style={{
            fontSize: '15px',
            color: '#94a3b8',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}>
            Floosball is currently in closed beta. If you believe you should have access,
            check that you're using the email address that was invited, or request access below.
            Note: season data may be reset periodically as we fix bugs and improve the game.
          </p>
        )}

        {error && (
          <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {!submitted && (
            <button
              onClick={handleRequest}
              disabled={submitting || !email}
              style={{
                backgroundColor: submitting ? '#1e40af' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Request Access'}
            </button>
          )}
          <button
            onClick={() => signOut()}
            style={{
              backgroundColor: '#334155',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default BetaBlockedPage
