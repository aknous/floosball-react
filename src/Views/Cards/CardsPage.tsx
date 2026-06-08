import React, { useState, useEffect } from 'react'
import CardCollection from '@/Components/Cards/CardCollection'
import FeatureAnnounceModal from '@/Components/FeatureAnnounceModal'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { isFeatureSeen, markFeatureSeen, FEATURE_CARDS } from '@/utils/featureAnnounce'

const CardsPage: React.FC = () => {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()

  // One-time "what's new" announcement for the card collection systems.
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  useEffect(() => {
    if (user && !isFeatureSeen(FEATURE_CARDS)) setShowWhatsNew(true)
  }, [user])
  const dismissWhatsNew = () => { markFeatureSeen(FEATURE_CARDS); setShowWhatsNew(false) }

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

      <FeatureAnnounceModal
        open={showWhatsNew}
        onClose={dismissWhatsNew}
        title="Level Up Your Collection"
        intro="Three new ways to build, keep, and show off your cards."
        items={[
          { title: 'Card Upgrades', color: '#fbbf24', body: 'Feed a duplicate plus Floobits to Level Up a card from tier I to IV. Higher tiers pay out more.' },
          { title: 'The Vault', color: '#a5f3fc', body: 'Keep your favorite cards forever. Vaulted cards survive the season and become player keepsakes.' },
          { title: 'The Showcase', color: '#f472b6', body: 'Put your best vaulted cards on display for a season-end Floobit payout, graded F to S.' },
        ]}
      />
    </div>
  )
}

export default CardsPage
