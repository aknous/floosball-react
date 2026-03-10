import React from 'react'
import { FantasyRoster } from '@/Components/Fantasy/FantasyRoster'
import { FantasyLeaderboard } from '@/Components/Fantasy/FantasyLeaderboard'
import CardEquipment from '@/Components/Cards/CardEquipment'
import { useIsMobile } from '@/hooks/useIsMobile'

const FantasyPage: React.FC = () => {
  const isMobile = useIsMobile()

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      fontFamily: 'pressStart',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: isMobile ? '10px' : '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Card slots — full width at top */}
        <CardEquipment />

        {/* Roster + Leaderboard side by side */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          alignItems: 'start',
        }}>
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
            <FantasyRoster />
          </div>
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
            <FantasyLeaderboard />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FantasyPage
