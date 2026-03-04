import React, { useState, useEffect } from 'react'
import { GameGridNew } from '@/Components/GameGridNew'
import { GameModalNew } from '@/Components/GameModalNew'
import { HighlightFeed } from '@/Components/HighlightFeed'
import { OffseasonPanel } from '@/Components/OffseasonPanel'
import { Standings } from '@/Components/Standings'
import { PlayerLeaders } from '@/Components/PlayerLeaders'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGames } from '@/contexts/GamesContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const DashboardNew: React.FC<{ headerHeight?: number }> = ({ headerHeight = 64 }) => {
  const { seasonState } = useFloosball()
  const { refetch } = useGames()
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const isMobile = useIsMobile()
  const isOffseason = seasonState?.currentWeekText === 'Offseason'

  useEffect(() => { refetch() }, [])

  const handleGameClick = (gameId: number) => setSelectedGameId(gameId)
  const handleCloseModal = () => setSelectedGameId(null)

  if (isMobile) {
    return (
      <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: `calc(100vh - ${headerHeight}px)` }}>
        <div style={{ padding: '16px' }}>

          {/* Games / Offseason — primary content on mobile */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>
              {isOffseason ? 'Offseason' : 'Games'}
            </h2>
            {isOffseason ? <OffseasonPanel /> : <GameGridNew handleClick={handleGameClick} />}
          </section>

          {/* Standings */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Standings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Standings leagueIndex={0} />
              <Standings leagueIndex={1} />
            </div>
          </section>

          {/* Highlights */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Highlights</h2>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
              <HighlightFeed onPlayClick={handleGameClick} />
            </div>
          </section>

          {/* Leaders */}
          <section style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Leaders</h2>
            <PlayerLeaders />
          </section>

        </div>

        {selectedGameId && <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />}
      </div>
    )
  }

  // Desktop layout — 3-column fixed
  return (
    <div style={{ height: `calc(100vh - ${headerHeight}px)`, overflow: 'hidden', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '24px' }}>

        {/* Left Column - Standings */}
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
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Highlights</h2>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              <HighlightFeed onPlayClick={handleGameClick} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Leaders</h3>
            <PlayerLeaders />
          </div>
        </div>

      </div>

      {selectedGameId && <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />}
    </div>
  )
}

export default DashboardNew
