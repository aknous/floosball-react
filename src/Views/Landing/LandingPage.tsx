import React from 'react'
import { SignIn } from '@clerk/react'

const LandingPage: React.FC = () => {
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
        <svg width="56" height="56" viewBox="0 0 32 32" style={{ marginBottom: '16px' }}>
          <circle cx="16" cy="16" r="16" fill="#3b82f6" />
          <g transform="rotate(-45 16 16)">
            <ellipse cx="16" cy="16" rx="10" ry="6.5" fill="#e2e8f0" />
            <line x1="6" y1="16" x2="26" y2="16" stroke="#3b82f6" strokeWidth="1.2" />
            <line x1="13" y1="13.2" x2="13" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
            <line x1="16" y1="12.5" x2="16" y2="19.5" stroke="#3b82f6" strokeWidth="1" />
            <line x1="19" y1="13.2" x2="19" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
          </g>
        </svg>
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
          color: '#64748b',
          margin: 0,
        }}>
          A simulated football league you didn't ask for
        </p>
      </div>

      {/* Clerk Sign In */}
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
    </div>
  )
}

export default LandingPage
