import React, { useState, useEffect } from 'react'
import { GameGridNew } from '@/Components/GameGridNew'
import { GameModalNew } from '@/Components/GameModalNew'
import { HighlightFeed } from '@/Components/HighlightFeed'
import { OffseasonPanel } from '@/Components/OffseasonPanel'
import { Standings } from '@/Components/Standings'
import { PlayerLeaders } from '@/Components/PlayerLeaders'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGames } from '@/contexts/GamesContext'

const DashboardNew: React.FC<{ headerHeight?: number }> = ({ headerHeight = 64 }) => {
  const { seasonState } = useFloosball()
  const { refetch } = useGames()
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const isOffseason = seasonState?.currentWeekText === 'Offseason'

  useEffect(() => { refetch() }, [])

  const handleGameClick = (gameId: number) => {
    setSelectedGameId(gameId)
  }

  const handleCloseModal = () => {
    setSelectedGameId(null)
  }

  return (
    <div style={{ height: `calc(100vh - ${headerHeight}px)`, overflow: 'hidden', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '24px', boxSizing: 'border-box' }}>

      {/* Main Grid - 3 Columns, full viewport height */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '24px' }}>

        {/* Left Column - Standings: grid cell stretches to full height, scrolls independently */}
        <div style={{ overflowY: 'auto' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Standings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Standings leagueIndex={0} />
            <Standings leagueIndex={1} />
          </div>
        </div>

        {/* Center Column - Games / Offseason */}
        <div style={{ overflowY: 'auto' }}>
          {isOffseason ? (
            <OffseasonPanel />
          ) : (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Games</h2>
              <GameGridNew handleClick={handleGameClick} />
            </>
          )}
        </div>

        {/* Right Column - Highlights & Leaderboards */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Highlights */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Highlights</h2>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              <HighlightFeed onPlayClick={handleGameClick} />
            </div>
          </div>

          {/* Player Leaders */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Leaders</h3>
            <PlayerLeaders />
          </div>

        </div>
      </div>

      {/* Game Modal */}
      {selectedGameId && (
        <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />
      )}

    </div>
  )
}

export default DashboardNew
