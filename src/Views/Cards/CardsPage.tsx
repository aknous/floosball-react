import React from 'react'
import CardCollection from '@/Components/Cards/CardCollection'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const CardsPage: React.FC = () => {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      fontFamily: 'pressStart',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: isMobile ? '16px' : '24px 16px',
      }}>
        {/* Page header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            Collection
          </h1>
        </div>

        {/* Auth gate */}
        {!user && !authLoading && (
          <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '60px 0' }}>
            Sign in to view your card collection
          </div>
        )}

        {/* Collection content */}
        {user && <CardCollection />}
      </div>
    </div>
  )
}

export default CardsPage
