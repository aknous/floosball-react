import React, { useState, useEffect } from 'react'
import { GameGridNew } from '@/Components/GameGridNew'
import { GameModalNew } from '@/Components/GameModalNew'
import { HighlightFeed } from '@/Components/HighlightFeed'
import { OffseasonPanel } from '@/Components/OffseasonPanel'
import { Standings } from '@/Components/Standings'
import { PlayerLeaders } from '@/Components/PlayerLeaders'
import { MvpRankings } from '@/Components/MvpRankings'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGames } from '@/contexts/GamesContext'
import { useIsMobile } from '@/hooks/useIsMobile'

type StandingsView = 'standings' | 'powerRankings'
type RightPanelView = 'highlights' | 'leaders' | 'mvp'

const TabToggle: React.FC<{ tabs: readonly (readonly [string, string])[]; active: string; onChange: (v: any) => void }> = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: '0px', marginBottom: '12px' }}>
    {tabs.map(([key, label]) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        style={{
          flex: 1,
          padding: '7px 0',
          fontSize: '12px',
          fontWeight: '600',
          color: active === key ? '#e2e8f0' : '#64748b',
          backgroundColor: active === key ? '#1e293b' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderBottom: active === key ? '2px solid #3b82f6' : '2px solid #334155',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    ))}
  </div>
)

const STANDINGS_TABS = [['standings', 'Standings'], ['powerRankings', 'Power Rankings']] as const
const RIGHT_PANEL_TABS = [['highlights', 'Highlights'], ['leaders', 'Leaders'], ['mvp', 'MVP Race']] as const

const DashboardNew: React.FC<{ headerHeight?: number }> = ({ headerHeight = 64 }) => {
  const { seasonState } = useFloosball()
  const { refetch } = useGames()
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [standingsView, setStandingsView] = useState<StandingsView>('standings')
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('highlights')
  const isMobile = useIsMobile()
  const isTablet = useIsMobile(1200)
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
            <TabToggle tabs={STANDINGS_TABS} active={standingsView} onChange={setStandingsView} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Standings leagueIndex={0} viewMode={standingsView} />
              <Standings leagueIndex={1} viewMode={standingsView} />
            </div>
          </section>

          {/* Highlights */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Highlights</h2>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
              <HighlightFeed onPlayClick={handleGameClick} />
            </div>
          </section>

          {/* MVP Race */}
          <section style={{ marginBottom: '32px' }}>
            <MvpRankings />
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

  // Tablet layout — 2-column, scrollable
  if (isTablet) {
    return (
      <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: `calc(100vh - ${headerHeight}px)` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>

          {/* Games / Offseason — full width */}
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>
              {isOffseason ? 'Offseason' : 'Games'}
            </h2>
            {isOffseason ? <OffseasonPanel /> : <GameGridNew handleClick={handleGameClick} />}
          </section>

          {/* Two columns: Standings | Highlights & Leaders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            <section>
              <TabToggle tabs={STANDINGS_TABS} active={standingsView} onChange={setStandingsView} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Standings leagueIndex={0} viewMode={standingsView} />
                <Standings leagueIndex={1} viewMode={standingsView} />
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Highlights</h2>
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
                <HighlightFeed onPlayClick={handleGameClick} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <MvpRankings />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Leaders</h3>
              <PlayerLeaders />
            </section>
          </div>
        </div>

        {selectedGameId && <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />}
      </div>
    )
  }

  // Desktop layout — 3-column fixed
  return (
    <div style={{ height: `calc(100vh - ${headerHeight}px - 33px)`, overflow: 'hidden', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '24px' }}>

        {/* Left Column - Standings / Power Rankings */}
        <div style={{ overflowY: 'auto' }}>
          <TabToggle tabs={STANDINGS_TABS} active={standingsView} onChange={setStandingsView} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Standings leagueIndex={0} viewMode={standingsView} />
            <Standings leagueIndex={1} viewMode={standingsView} />
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

        {/* Right Column - Highlights / Leaders / MVP */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <TabToggle tabs={RIGHT_PANEL_TABS} active={rightPanelView} onChange={setRightPanelView} />
          {rightPanelView === 'highlights' && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', overflowY: 'auto', flex: 1 }}>
              <HighlightFeed onPlayClick={handleGameClick} />
            </div>
          )}
          {rightPanelView === 'leaders' && (
            <PlayerLeaders />
          )}
          {rightPanelView === 'mvp' && (
            <MvpRankings />
          )}
        </div>

      </div>

      {selectedGameId && <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />}
    </div>
  )
}

export default DashboardNew
