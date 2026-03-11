import React from 'react'
import { useClerk } from '@clerk/react'

const BetaBlockedPage: React.FC = () => {
  const { signOut } = useClerk()

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
        <p style={{
          fontSize: '15px',
          color: '#94a3b8',
          lineHeight: '1.6',
          marginBottom: '28px',
        }}>
          Floosball is currently in closed beta. If you believe you should have access,
          check that you're using the email address that was invited.
        </p>
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
  )
}

export default BetaBlockedPage
