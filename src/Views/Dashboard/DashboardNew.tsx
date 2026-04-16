import React, { useState, useEffect, useRef } from 'react'
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
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'
import TutorialOverlay from '@/Components/Tutorial/TutorialOverlay'
import TourPrompt from '@/Components/Tutorial/TourPrompt'
import { useTutorial, TutorialStep } from '@/Components/Tutorial/useTutorial'

type StandingsView = 'standings' | 'powerRankings'
type TabView = 'highlights' | 'pickem' | 'standings' | 'leaders'

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

const SubToggle: React.FC<{ tabs: readonly (readonly [string, string])[]; active: string; onChange: (v: any) => void }> = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
    {tabs.map(([key, label]) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        style={{
          flex: 1,
          padding: '6px 0',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: active === key ? '#334155' : 'transparent',
          color: active === key ? '#e2e8f0' : '#94a3b8',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    ))}
  </div>
)

const STANDINGS_TABS = [['standings', 'Standings'], ['powerRankings', 'Power Rankings']] as const
const PANEL_TABS = [['highlights', 'Highlights'], ['pickem', 'Prognosticate'], ['standings', 'Standings'], ['leaders', 'Leaders']] as const

const DASHBOARD_TOUR_STEPS: TutorialStep[] = [
  {
    target: 'dashboard-games',
    title: 'Games',
    content: 'This is the game board. Each card shows a live or upcoming matchup with team names, scores, and a win probability bar that shifts as the game plays out. Tap any game to watch the play-by-play.',
    placement: 'bottom',
  },
  {
    target: 'dashboard-highlights',
    title: 'Highlights',
    content: 'The highlight feed is your live ticker. Touchdowns, field goals, turnovers, and clutch plays appear here as games unfold. Tap a highlight to jump straight into that game.',
    placement: 'left',
    onEnter: () => window.dispatchEvent(new Event('floosball:show-highlights')),
  },
  {
    target: 'dashboard-pickem',
    title: 'Prognosticate',
    content: 'Predict game winners to earn points. Pre-game picks are worth the most, but you can also pick mid-game. Picking underdogs pays a bonus.',
    placement: 'left',
    onEnter: () => window.dispatchEvent(new Event('floosball:show-pickem')),
  },
  {
    target: 'dashboard-standings',
    title: 'Standings',
    content: 'Two leagues each have their own standings table — wins, losses, and playoff positioning. Toggle to Power Rankings to see teams ranked by overall strength instead of record.',
    placement: 'left',
    onEnter: () => window.dispatchEvent(new Event('floosball:show-standings')),
  },
  {
    target: 'dashboard-leaders',
    title: 'Leaders',
    content: 'The MVP rankings and stat leaders show who is dominating in passing, rushing, and receiving — both this week and across the season.',
    placement: 'left',
    onEnter: () => window.dispatchEvent(new Event('floosball:show-leaders')),
  },
]

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
  const [activeTab, setActiveTab] = useState<TabView>('highlights')
  const [showHelp, setShowHelp] = useState(false)
  const isMobile = useIsMobile()
  const isTablet = useIsMobile(1200)
  const isOffseason = seasonState?.currentWeekText === 'Offseason'
  const nextGameCountdown = useNextGameCountdown(seasonState?.nextGameStartTime)
  const tour = useTutorial({ tourId: 'dashboard', steps: DASHBOARD_TOUR_STEPS })

  useEffect(() => { refetch() }, [])

  // Tour tab-switching listeners
  useEffect(() => {
    const showHighlights = () => setActiveTab('highlights')
    const showLeaders = () => setActiveTab('leaders')
    const showPickem = () => setActiveTab('pickem')
    const showStandings = () => setActiveTab('standings')
    window.addEventListener('floosball:show-highlights', showHighlights)
    window.addEventListener('floosball:show-leaders', showLeaders)
    window.addEventListener('floosball:show-pickem', showPickem)
    window.addEventListener('floosball:show-standings', showStandings)
    return () => {
      window.removeEventListener('floosball:show-highlights', showHighlights)
      window.removeEventListener('floosball:show-leaders', showLeaders)
      window.removeEventListener('floosball:show-pickem', showPickem)
      window.removeEventListener('floosball:show-standings', showStandings)
    }
  }, [])

  const handleGameClick = (gameId: number) => setSelectedGameId(gameId)
  const handleCloseModal = () => setSelectedGameId(null)

  const helpButtonClick = () => {
    if (tour.hasCompleted) {
      setShowHelp(true)
    } else {
      tour.startTour()
    }
  }

  // Mobile section refs for jump nav
  const gamesRef = useRef<HTMLElement>(null)
  const standingsRef = useRef<HTMLElement>(null)
  const highlightsRef = useRef<HTMLElement>(null)
  const pickemRef = useRef<HTMLElement>(null)
  const leadersRef = useRef<HTMLElement>(null)

  const MOBILE_SECTIONS = [
    { key: 'games', label: isOffseason ? 'Offseason' : 'Games', ref: gamesRef },
    { key: 'highlights', label: 'Highlights', ref: highlightsRef },
    { key: 'pickem', label: 'Pick-Em', ref: pickemRef },
    { key: 'standings', label: 'Standings', ref: standingsRef },
    { key: 'leaders', label: 'Leaders', ref: leadersRef },
  ] as const

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Shared portal-based components (rendered once, used across all layouts)
  const sharedPortals = (
    <>
      {selectedGameId && <GameModalNew gameId={selectedGameId} onClose={handleCloseModal} />}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
          <button
            onClick={() => { setShowHelp(false); tour.startTour() }}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '11px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: 'pressStart',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8' }}
          >
            Take the Tour
          </button>
        </div>
        <GuideSection title="Games">
          The game grid shows all matchups for the current round. Each card displays team names,
          scores, and a live win probability bar. Tap a game to open the full play-by-play view
          with detailed stats and scoring drives.
        </GuideSection>
        <GuideSection title="Season Structure">
          Each season runs 28 weeks across 4 game days per week, with 7 games per day. Games start
          on the hour. Between rounds, check standings and plan your fantasy lineup.
        </GuideSection>
        <GuideSection title="Highlights">
          The highlight feed streams notable plays in real time — touchdowns, field goals, turnovers,
          clutch moments, and momentum shifts. Each entry is tagged with a badge. Tap any highlight
          to jump into that game.
        </GuideSection>
        <GuideSection title="Prognosticate">
          Predict game winners to earn points and climb the leaderboard. Pre-game picks are worth
          the most, but you can also pick mid-game. Picking underdogs pays a bonus, while favorites
          pay less.
        </GuideSection>
        <GuideSection title="Standings">
          Two leagues each display wins, losses, and current playoff positioning. Toggle to Power
          Rankings to see teams ordered by overall strength rating instead of win-loss record.
        </GuideSection>
        <GuideSection title="Leaders">
          The MVP Rankings show top-performing players this week and across the season. Stat leaders
          break down individual categories — passing yards, rushing yards, touchdowns, and more.
        </GuideSection>
      </HelpModal>

      {tour.shouldPrompt && <TourPrompt onStart={tour.startTour} onDismiss={tour.dismissPrompt} />}
      {tour.isActive && (
        <TutorialOverlay
          steps={DASHBOARD_TOUR_STEPS}
          currentStep={tour.currentStep}
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
          onHelp={() => { tour.skip(); setShowHelp(true) }}
        />
      )}
    </>
  )

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: `calc(100vh - ${headerHeight}px)` }}>

          {/* Sticky section nav */}
          <div style={{
            position: 'sticky', top: headerHeight, zIndex: 20,
            backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b',
            display: 'flex', gap: '0px', overflowX: 'auto',
            padding: '0 16px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}>
            {MOBILE_SECTIONS.map(s => (
              <button key={s.key} onClick={() => scrollToSection(s.ref)} style={{
                flex: 'none', padding: '10px 12px', fontSize: '12px', fontWeight: '600',
                color: '#94a3b8', backgroundColor: 'transparent', border: 'none',
                borderBottom: '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{s.label}</button>
            ))}
          </div>

          <div style={{ padding: '16px' }}>

            {/* Games / Offseason */}
            <section ref={gamesRef} data-tour="dashboard-games" style={{ marginBottom: '32px', scrollMarginTop: `${headerHeight + 42}px` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#cbd5e1' }}>
                  {isOffseason ? 'Offseason' : 'Games'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {nextGameCountdown && !isOffseason && (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      Next game in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{nextGameCountdown}</span>
                    </span>
                  )}
                  <HelpButton onClick={helpButtonClick} size={24} />
                </div>
              </div>
              {isOffseason ? <OffseasonPanel /> : <GameGridNew handleClick={handleGameClick} />}
            </section>

            {/* Highlights */}
            <section ref={highlightsRef} data-tour="dashboard-highlights" style={{ marginBottom: '32px', scrollMarginTop: `${headerHeight + 42}px` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Highlights</h2>
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                <HighlightFeed onPlayClick={handleGameClick} />
              </div>
            </section>

            {/* Pick-Em */}
            <section ref={pickemRef} data-tour="dashboard-pickem" style={{ marginBottom: '32px', scrollMarginTop: `${headerHeight + 42}px` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Prognostications</h2>
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
                <PickEmPanel />
              </div>
            </section>

            {/* Standings */}
            <section ref={standingsRef} data-tour="dashboard-standings" style={{ marginBottom: '32px', scrollMarginTop: `${headerHeight + 42}px` }}>
              <SubToggle tabs={STANDINGS_TABS} active={standingsView} onChange={setStandingsView} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Standings leagueIndex={0} viewMode={standingsView} />
                <Standings leagueIndex={1} viewMode={standingsView} />
              </div>
            </section>

            {/* Leaders */}
            <section ref={leadersRef} data-tour="dashboard-leaders" style={{ marginBottom: '16px', scrollMarginTop: `${headerHeight + 42}px` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>Leaders</h2>
              <MvpRankings />
              <div style={{ marginTop: '12px' }}>
                <PlayerLeaders />
              </div>
            </section>

          </div>
        </div>
        {sharedPortals}
      </>
    )
  }

  // ── Tablet layout ──────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <>
        <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: `calc(100vh - ${headerHeight}px)` }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>

            {/* Games / Offseason — full width */}
            <section data-tour="dashboard-games" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#cbd5e1' }}>
                  {isOffseason ? 'Offseason' : 'Games'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {nextGameCountdown && !isOffseason && (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      Next game in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{nextGameCountdown}</span>
                    </span>
                  )}
                  <HelpButton onClick={helpButtonClick} size={24} />
                </div>
              </div>
              {isOffseason ? <OffseasonPanel /> : <GameGridNew handleClick={handleGameClick} />}
            </section>

            {/* Tabbed panel — full width */}
            <section>
              <TabToggle tabs={PANEL_TABS} active={activeTab} onChange={setActiveTab} />
              <div data-tour="dashboard-highlights" style={{
                ...(activeTab === 'highlights'
                  ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', maxHeight: '500px', overflowY: 'auto' }
                  : { display: 'none' }),
              }}>
                <HighlightFeed onPlayClick={handleGameClick} />
              </div>
              <div data-tour="dashboard-pickem" style={{
                ...(activeTab === 'pickem'
                  ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }
                  : { display: 'none' }),
              }}>
                <PickEmPanel />
              </div>
              <div data-tour="dashboard-standings" style={{
                ...(activeTab === 'standings'
                  ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }
                  : { display: 'none' }),
              }}>
                <SubToggle tabs={STANDINGS_TABS} active={standingsView} onChange={setStandingsView} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Standings leagueIndex={0} viewMode={standingsView} embedded />
                  <Standings leagueIndex={1} viewMode={standingsView} embedded />
                </div>
              </div>
              <div data-tour="dashboard-leaders" style={{
                ...(activeTab === 'leaders'
                  ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '10px 0', overflowY: 'auto' }
                  : { display: 'none' }),
              }}>
                <MvpRankings embedded />
                <div style={{ marginTop: '12px' }}>
                  <PlayerLeaders embedded />
                </div>
              </div>
            </section>
          </div>
        </div>
        {sharedPortals}
      </>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ height: `calc(100vh - ${headerHeight}px - 33px)`, overflow: 'hidden', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '24px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'grid', gridTemplateColumns: '1fr auto 340px', gap: '24px' }}>

          {/* Left Column - reserved */}
          <div />

          {/* Center Column - Games / Offseason */}
          <div data-tour="dashboard-games" style={{ overflowY: 'auto', width: '700px' }}>
            {isOffseason ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <HelpButton onClick={helpButtonClick} />
                </div>
                <OffseasonPanel />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Games</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {nextGameCountdown && (
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        Next game in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{nextGameCountdown}</span>
                      </span>
                    )}
                    <HelpButton onClick={helpButtonClick} />
                  </div>
                </div>
                <GameGridNew handleClick={handleGameClick} />
              </>
            )}
          </div>

          {/* Right Column - Tabbed panel */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <TabToggle tabs={PANEL_TABS} active={activeTab} onChange={setActiveTab} />
            <div data-tour="dashboard-highlights" style={{
              ...(activeTab === 'highlights'
                ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', overflowY: 'auto', flex: 1 }
                : { display: 'none' }),
            }}>
              <HighlightFeed onPlayClick={handleGameClick} />
            </div>
            <div data-tour="dashboard-pickem" style={{
              ...(activeTab === 'pickem'
                ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', overflowY: 'auto', flex: 1 }
                : { display: 'none' }),
            }}>
              <PickEmPanel />
            </div>
            <div data-tour="dashboard-standings" style={{
              ...(activeTab === 'standings'
                ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', overflowY: 'auto', flex: 1 }
                : { display: 'none' }),
            }}>
              <SubToggle tabs={STANDINGS_TABS} active={standingsView} onChange={setStandingsView} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Standings leagueIndex={0} viewMode={standingsView} embedded />
                <Standings leagueIndex={1} viewMode={standingsView} embedded />
              </div>
            </div>
            <div data-tour="dashboard-leaders" style={{
              ...(activeTab === 'leaders'
                ? { backgroundColor: '#1e293b', borderRadius: '8px', padding: '10px 0', overflowY: 'auto', flex: 1 }
                : { display: 'none' }),
            }}>
              <MvpRankings embedded />
              <div style={{ marginTop: '12px' }}>
                <PlayerLeaders embedded />
              </div>
            </div>
          </div>

        </div>
      </div>
      {sharedPortals}
    </>
  )
}

const DashboardWithPickEm: React.FC<{ headerHeight?: number }> = (props) => (
  <PickEmProvider>
    <DashboardNew {...props} />
  </PickEmProvider>
)

export default DashboardWithPickEm
