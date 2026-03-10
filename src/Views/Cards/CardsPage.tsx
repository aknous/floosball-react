import React, { useState } from 'react'
import CardCollection from '@/Components/Cards/CardCollection'
import CardShop from '@/Components/Cards/CardShop'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const TABS = ['Collection', 'Shop'] as const
type Tab = typeof TABS[number]

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '6px',
  border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
  backgroundColor: active ? 'rgba(59,130,246,0.12)' : 'transparent',
  color: active ? '#60a5fa' : '#94a3b8',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'pressStart',
})

const CardsPage: React.FC = () => {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Collection')

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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            Cards
          </h1>
          {user && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auth gate */}
        {!user && !authLoading && (
          <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '60px 0' }}>
            Sign in to view your card collection
          </div>
        )}

        {/* Tab content */}
        {user && activeTab === 'Collection' && <CardCollection />}
        {user && activeTab === 'Shop' && <CardShop />}
      </div>
    </div>
  )
}

export default CardsPage
