import React, { useState, useEffect } from 'react'
import { GameGridNew } from '@/Components/GameGridNew'
import { GameModalNew } from '@/Components/GameModalNew'
import { HighlightFeed } from '@/Components/HighlightFeed'
import { OffseasonPanel } from '@/Components/OffseasonPanel'
import { Standings } from '@/Components/Standings'
import { PlayerLeaders } from '@/Components/PlayerLeaders'
import { MvpRankings } from '@/Components/MvpRankings'
import { PickEmPanel } from '@/Components/PickEm/PickEmPanel'
import { PickEmProvider } from '@/contexts/PickEmContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useGames } from '@/contexts/GamesContext'
import { useIsMobile } from '@/hooks/useIsMobile'

type StandingsView = 'standings' | 'powerRankings'
type RightPanelView = 'highlights' | 'leaders' | 'pickem'

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
const RIGHT_PANEL_TABS = [['highlights', 'Highlights'], ['leaders', 'Leaders'], ['pickem', 'Prognosticate']] as const

const useNextGameCountdown = (nextGameStartTime: string | null) => {
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!nextGameStartTime) { setCountdown(''); return }
    const target = new Date(nextGameStartTime).getTime()
    const tick = () => {
      const remaining = Math.max(0, target - Date.now())
      if (remaining <= 0) { setCountdown(''); return }
      const hrs = Math.floor(remaining / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      if (hrs > 0) {
        setCountdown(`${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
      } else {
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [nextGameStartTime])
  return countdown
}

const DashboardNew: React.FC<{ headerHeight?: number }> = ({ headerHeight = 64 }) => {
  const { seasonState } = useFloosball()
  const { refetch } = useGames()
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [standingsView, setStandingsView] = useState<StandingsView>('standings')
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('highlights')
  const isMobile = useIsMobile()
  const isTablet = useIsMobile(1200)
  const isOffseason = seasonState?.currentWeekText === 'Offseason'
  const nextGameCountdown = useNextGameCountdown(seasonState?.nextGameStartTime)

  useEffect(() => { refetch() }, [])

  const handleGameClick = (gameId: number) => setSelectedGameId(gameId)
  const handleCloseModal = () => setSelectedGameId(null)

  if (isMobile) {
    return (
      <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: `calc(100vh - ${headerHeight}px)` }}>
        <div style={{ padding: '16px' }}>

          {/* Games / Offseason — primary content on mobile */}
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#cbd5e1' }}>
                {isOffseason ? 'Offseason' : 'Games'}
              </h2>
              {nextGameCountdown && !isOffseason && (
                <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                  Next game in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{nextGameCountdown}</span>
                </span>
              )}
            </div>
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

          {/* Pick-Em */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Prognostications</h2>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
              <PickEmPanel />
            </div>
          </section>

          {/* Leaders */}
          <section style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Leaders</h2>
            <MvpRankings />
            <div style={{ marginTop: '12px' }}>
              <PlayerLeaders />
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#cbd5e1' }}>
                {isOffseason ? 'Offseason' : 'Games'}
              </h2>
              {nextGameCountdown && !isOffseason && (
                <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                  Next game in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{nextGameCountdown}</span>
                </span>
              )}
            </div>
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Leaders</h3>
              <MvpRankings />
              <div style={{ marginTop: '12px' }}>
                <PlayerLeaders />
              </div>
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Prognostications</h3>
                <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
                  <PickEmPanel />
                </div>
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Games</h2>
                {nextGameCountdown && (
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    Next game in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{nextGameCountdown}</span>
                  </span>
                )}
              </div>
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
            <>
              <MvpRankings />
              <div style={{ marginTop: '12px' }}>
                <PlayerLeaders />
              </div>
            </>
          )}
          {rightPanelView === 'pickem' && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', overflowY: 'auto', flex: 1 }}>
              <PickEmPanel />
            </div>
          )}
        </div>

      </div>

      {selectedGameId && <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />}
    </div>
  )
}

const DashboardWithPickEm: React.FC<{ headerHeight?: number }> = (props) => (
  <PickEmProvider>
    <DashboardNew {...props} />
  </PickEmProvider>
)

export default DashboardWithPickEm
