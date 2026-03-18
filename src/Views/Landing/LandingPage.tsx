import React from 'react'
import { SignIn } from '@clerk/react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

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
        <img
          src={`${API_BASE}/logo?size=56`}
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
