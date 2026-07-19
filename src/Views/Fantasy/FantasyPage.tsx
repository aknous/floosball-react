import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Lineup from '@/Components/Fantasy/Lineup'
import { ScoringPane } from '@/Components/Fantasy/ScoringPane'
import { FantasyLeaderboard } from '@/Components/Fantasy/FantasyLeaderboard'
import ShopModal from '@/Components/Shop/ShopModal'
import HoverTooltip from '@/Components/HoverTooltip'
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'
import TutorialOverlay from '@/Components/Tutorial/TutorialOverlay'
import TourPrompt from '@/Components/Tutorial/TourPrompt'
import { useTutorial, TutorialStep } from '@/Components/Tutorial/useTutorial'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useFloosball } from '@/contexts/FloosballContext'
import { useModifierSchedule } from '@/hooks/useModifierSchedule'

const FANTASY_TOUR_STEPS: TutorialStep[] = [
  {
    target: 'fantasy-roster',
    title: 'Your Roster',
    content: 'These are your players. You draft 5 positions — QB, RB, WR, TE, and K. They earn Fantasy Points from their real game stats each week. Tap a player to see their stats or swap them out between game rounds.',
    placement: 'top',
    onEnter: () => window.dispatchEvent(new Event('floosball:show-roster')),
  },
  {
    target: 'fantasy-breakdown',
    title: 'Score Breakdown',
    content: 'Once games start, switch to the Breakdown tab to see exactly how your weekly score is calculated — player FP, each card effect with its equation, and your combined total.',
    placement: 'top',
    onEnter: () => window.dispatchEvent(new Event('floosball:show-breakdown')),
    onLeave: () => window.dispatchEvent(new Event('floosball:show-roster')),
  },
  {
    target: 'fantasy-cards',
    title: 'Card Slots',
    content: 'These are your card slots. Equip up to 5 trading cards from your collection. Each card adds bonus Fantasy Points through effects like flat bonuses, multipliers, or streaks. Tap an empty slot to equip, or tap an equipped card to remove it.',
    placement: 'bottom',
    onEnter: () => window.dispatchEvent(new Event('floosball:expand-cards')),
  },
  {
    target: 'fantasy-card-read',
    title: 'Card Front',
    content: 'The front shows the player name, team, and their star rating. More stars means stronger effects. The effect name and type badge are at the bottom — color tells you what it produces.',
    placement: 'right',
    onEnter: () => {
      window.dispatchEvent(new Event('floosball:mock-card'))
      window.dispatchEvent(new Event('floosball:unflip-card'))
    },
  },
  {
    target: 'fantasy-card-read',
    title: 'Card Back',
    content: 'Tap a card to flip it. The back shows the full effect description. Green FP = flat bonus points. Pink FPx = a multiplier on your points. Gold F = Floobits currency earned directly.',
    placement: 'right',
    onEnter: () => window.dispatchEvent(new Event('floosball:flip-card')),
    onLeave: () => {
      window.dispatchEvent(new Event('floosball:unflip-card'))
      window.dispatchEvent(new Event('floosball:unmock-card'))
    },
  },
  {
    target: 'fantasy-leaderboard',
    title: 'Leaderboard',
    content: 'This is the leaderboard. It shows weekly and season-long Fantasy Point rankings. Top weekly and season finishers earn Floobits. Your total combines roster FP, card bonuses, and modifier effects.',
    placement: 'top',
  },
  {
    target: 'fantasy-countdown',
    title: 'Lock Countdown',
    content: 'This is the lock timer. Your roster and cards lock when games begin. Make all your changes before this hits zero — once locked, no edits until the next unlock window.',
    placement: 'bottom',
    onEnter: () => window.dispatchEvent(new Event('floosball:mock-countdown')),
    onLeave: () => window.dispatchEvent(new Event('floosball:unmock-countdown')),
  },
  {
    target: 'fantasy-gameinfo',
    title: 'Weekly Modifier & Swaps',
    content: 'These badges show the active weekly modifier and available roster swaps. Each week has a random modifier that changes how scoring works. Hover a badge for details.',
    placement: 'bottom',
  },
  {
    target: 'fantasy-actions',
    title: 'Collection & Shop',
    content: 'These buttons open your card collection and the shop. Browse your cards, buy new packs with Floobits, or grab featured cards from the shop.',
    placement: 'bottom',
  },
]

const MODIFIER_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  amplify: { color: '#f472b6', icon: (  // FPx → magenta
    // chevrons-up — amplification
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" />
    </svg>
  )},
  cascade: { color: '#f472b6', icon: (  // legacy amplify (FPx) → magenta
    // layers — cascading stacks
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  )},
  frenzy: { color: '#4ade80', icon: (  // +FP → green
    // flame — wild energy
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3.5-7.5 0 0 .5 4 3 5.5 2.77 1.66 4.5 4 4.5 7.5a7 7 0 11-14 0c0-1.15.39-2.26 1.5-3" />
    </svg>
  )},
  overdrive: { color: '#60a5fa', icon: (  // match bonus → blue
    // zap — electric overdrive
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )},
  payday: { color: '#eab308', icon: (  // Floobits → gold
    // dollar-sign — money
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  )},
  longshot: { color: '#60a5fa', icon: (  // conditional → blue
    // crosshair — precision aim
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  )},
  ironclad: { color: '#fb923c', icon: (  // streak → orange
    // shield — defense
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )},
  wildcard: { color: '#60a5fa', icon: (  // treats cards as matched → blue
    // shuffle — randomness
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  )},
  synergy: { color: '#f472b6', icon: (  // FPx → magenta
    // git-merge — connections/synergy
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 009 9" />
    </svg>
  )},
  fortunate: { color: '#c084fc', icon: (  // chance → purple
    // clover — luck
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.67-6-6-6-8a4 4 0 018 0c0 2-4 5.33-6 8z" transform="rotate(0 12 12)" />
      <path d="M12 12c-2-2.67-6-6-6-8a4 4 0 018 0c0 2-4 5.33-6 8z" transform="rotate(90 12 12)" />
      <path d="M12 12c-2-2.67-6-6-6-8a4 4 0 018 0c0 2-4 5.33-6 8z" transform="rotate(180 12 12)" />
      <path d="M12 12c-2-2.67-6-6-6-8a4 4 0 018 0c0 2-4 5.33-6 8z" transform="rotate(270 12 12)" />
      <line x1="12" y1="12" x2="12" y2="22" />
    </svg>
  )},
  steady: { color: '#94a3b8', icon: (
    // minus — no effect
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )},
  grounded: { color: '#f87171', icon: (
    // anchor — grounded/restricted
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" /><line x1="12" y1="22" x2="12" y2="8" /><path d="M5 12H2a10 10 0 0020 0h-3" />
    </svg>
  )},
}

// Swaps badge. The day's modifiers render via DayModifierBadge (active chip
// + click-to-expand dropdown) alongside this in the status bar.
function GameInfoBar() {
  const { fantasyRoster } = useAuth()

  const swapsAvailable = (fantasyRoster?.swapsAvailable ?? 0) + (fantasyRoster?.purchasedSwaps ?? 0)
  const isLocked = fantasyRoster?.isLocked ?? false

  if (!isLocked || swapsAvailable <= 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
    }}>
      {isLocked && swapsAvailable > 0 && (
        <HoverTooltip text={`${swapsAvailable} roster swap${swapsAvailable !== 1 ? 's' : ''} available between games`} color="#38bdf8">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '6px',
            backgroundColor: 'rgba(56,189,248,0.12)',
            cursor: 'default',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3l4 4-4 4" />
              <path d="M20 7H4" />
              <path d="M8 21l-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#38bdf8' }}>
              {swapsAvailable} Swap{swapsAvailable !== 1 ? 's' : ''}
            </span>
          </div>
        </HoverTooltip>
      )}
    </div>
  )
}

// The active weekly modifier as a compact chip; click to reveal the rest of
// the day's slate (so users can plan cards/rosters ahead) without crowding the
// status bar. Regular season only — the schedule endpoint returns empty otherwise.
function DayModifierBadge() {
  const { slots, active, day } = useModifierSchedule()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (slots.length === 0 || !active) return null

  const activeStyle = MODIFIER_STYLES[active.modifier] ?? MODIFIER_STYLES.steady
  const c = activeStyle.color

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '5px 10px', borderRadius: '6px',
          backgroundColor: `${c}15`,
          border: open ? `1px solid ${c}` : '1px solid transparent',
          color: c, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}
      >
        {activeStyle.icon}
        <span style={{ fontSize: '11px', fontWeight: 600 }}>{active.displayName}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.7 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20000,
          minWidth: '230px',
          backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '8px',
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#94a3b8',
            letterSpacing: '0.04em', padding: '2px 4px 6px',
          }}>
            {day != null ? `DAY ${day + 1} MODIFIERS` : "TODAY'S MODIFIERS"}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {slots.map(s => {
              const style = MODIFIER_STYLES[s.modifier] ?? MODIFIER_STYLES.steady
              const sc = style.color
              return (
                <div key={s.week} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px', borderRadius: '6px',
                  backgroundColor: s.isActive ? `${sc}1a` : 'transparent',
                  opacity: s.isPast ? 0.5 : 1,
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', width: '24px', flexShrink: 0 }}>
                    W{s.week}
                  </span>
                  <span style={{ color: sc, display: 'flex', flexShrink: 0 }}>{style.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: sc }}>{s.displayName}</span>
                      {s.isActive && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: sc, letterSpacing: '0.05em' }}>NOW</span>
                      )}
                      {s.isNext && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>NEXT</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.35 }}>{s.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function LockCountdown() {
  const { seasonState } = useFloosball()
  const { nextGameStartTime } = seasonState
  const [remaining, setRemaining] = useState<number | null>(null)
  const [mockMode, setMockMode] = useState(false)

  useEffect(() => {
    if (!nextGameStartTime) {
      setRemaining(null)
      return
    }
    const target = new Date(nextGameStartTime).getTime()

    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextGameStartTime])

  // Tutorial mock mode — show a fake countdown when real one isn't visible
  useEffect(() => {
    const showMock = () => setMockMode(true)
    const hideMock = () => setMockMode(false)
    window.addEventListener('floosball:mock-countdown', showMock)
    window.addEventListener('floosball:unmock-countdown', hideMock)
    return () => {
      window.removeEventListener('floosball:mock-countdown', showMock)
      window.removeEventListener('floosball:unmock-countdown', hideMock)
    }
  }, [])

  const showReal = remaining != null && remaining > 0
  if (!showReal && !mockMode) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  let timeStr: string
  if (showReal) {
    const hrs = Math.floor(remaining! / 3600)
    const mins = Math.floor((remaining! % 3600) / 60)
    const secs = remaining! % 60
    timeStr = hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`
  } else {
    timeStr = '2:15:30'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '10px 16px',
      backgroundColor: 'rgba(59,130,246,0.10)',
      borderBottom: '2px solid rgba(59,130,246,0.5)',
      borderRadius: '8px',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
        Cards & rosters lock in
      </span>
      <span style={{
        fontSize: '13px',
        color: '#60a5fa',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: '600',
        letterSpacing: '0.5px',
      }}>
        {timeStr}
      </span>
    </div>
  )
}

const FantasyPage: React.FC = () => {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { seasonState } = useFloosball()
  const [showShop, setShowShop] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const tour = useTutorial({ tourId: 'fantasy', steps: FANTASY_TOUR_STEPS })

  const seasonOver = seasonState.regularSeasonOver || seasonState.seasonComplete

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      fontFamily: 'pressStart',
    }}>
      <div style={{
        maxWidth: seasonOver ? '1100px' : '1280px',
        margin: '0 auto',
        padding: isMobile ? '10px' : '14px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {seasonOver ? (
          <>
            {/* Season-over banner */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '8px', padding: '20px 16px',
              backgroundColor: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '10px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7" />
                <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                <path d="M18 2H6v7a6 6 0 0012 0V2Z" />
              </svg>
              <span style={{ color: '#c7d2fe', fontSize: '13px', fontWeight: '700' }}>
                The regular season has concluded
              </span>
              <span style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'center', lineHeight: '1.5' }}>
                Fantasy rosters and cards are locked. Season leaderboard prizes have been awarded.
              </span>
            </div>

            {/* Season leaderboard only */}
            <div style={{ maxWidth: '550px', margin: '0 auto', width: '100%' }}>
              <FantasyLeaderboard seasonOnly />
            </div>
          </>
        ) : (
          <>
            {/* Status bar: countdown + modifier badge + swaps + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div data-tour="fantasy-countdown"><LockCountdown /></div>
              <div data-tour="fantasy-gameinfo" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <DayModifierBadge />
                <GameInfoBar />
              </div>
              <div style={{ flex: 1 }} />
              {/* Actions + help grouped so the ? never orphans onto its own row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div data-tour="fantasy-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {user && (
                  <Link
                    to="/cards"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'rgba(148,163,184,0.10)',
                      color: '#94a3b8',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      fontFamily: 'pressStart',
                      transition: 'background-color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(148,163,184,0.18)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(148,163,184,0.10)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M12 4v16" />
                    </svg>
                    Collection
                  </Link>
                )}
                {user && (
                  <button
                    onClick={() => setShowShop(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'rgba(234,179,8,0.12)',
                      color: '#eab308',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontFamily: 'pressStart',
                      transition: 'background-color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(234,179,8,0.20)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(234,179,8,0.12)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                    Shop
                  </button>
                )}
              </div>
              <HelpButton onClick={() => {
                if (tour.hasCompleted) {
                  setShowHelp(true)
                } else {
                  tour.startTour()
                }
              }} />
              </div>
            </div>

            {/* Fusion dashboard: the position-locked lineup rail on top (equipped
                cards ARE the roster), then scoring + leaderboard side by side. */}
            <div data-tour="fantasy-cards">
              <Lineup />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '16px',
              alignItems: 'flex-start',
            }}>
              <div data-tour="fantasy-breakdown" style={{ flex: isMobile ? undefined : '1 1 0', width: isMobile ? '100%' : undefined, minWidth: 0 }}>
                <ScoringPane />
              </div>
              <div data-tour="fantasy-leaderboard" style={{ flex: isMobile ? undefined : '1 1 0', width: isMobile ? '100%' : undefined, minWidth: 0 }}>
                <FantasyLeaderboard />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Shop modal */}
      {!seasonOver && <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />}

      {/* Help modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Fantasy Floosball">
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
        <GuideSection title="Your Roster">
          Draft 5 players — one QB, RB, WR, TE, and K — each season. You earn Fantasy Points (FP)
          based on their live in-game performance. Your FP update in real time as games are played.
        </GuideSection>
        <GuideSection title="Scoring">
          Your total weekly FP is calculated as: (roster FP + card bonus FP) multiplied by any
          multiplier bonuses from equipped cards. The weekly modifier (shown in the status bar)
          can also affect your score.
        </GuideSection>
        <GuideSection title="Trading Cards">
          Equip up to 5 cards in any combination — slots are not position-locked. Card effects
          are calculated each week alongside your roster. Cards lock when your roster locks at
          the start of each game round.
        </GuideSection>
        <GuideSection title="Card Effect Types">
          Cards can have any effect regardless of the player's position. Effects fall into
          several output types:
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            {[
              { label: 'Flat FP', desc: 'Unconditional bonus Fantasy Points each week', color: '#4ade80' },
              { label: 'Multiplier', desc: 'Multiplies your total FP: roster FP plus flat card bonuses (e.g. 1.05x)', color: '#60a5fa' },
              { label: 'Floobits', desc: 'Earns bonus Floobits currency each week', color: '#eab308' },
              { label: 'Conditional', desc: 'Triggers when the card player hits a stat threshold', color: '#60a5fa' },
              { label: 'Streak', desc: 'Grows stronger over consecutive weeks when its condition is met', color: '#fb923c' },
              { label: 'Chance', desc: 'Probability-based bonus that rolls at the end of each week', color: '#c084fc' },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: c.color, fontWeight: '600', fontSize: '11px', minWidth: '80px' }}>
                  {c.label}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </GuideSection>
        <GuideSection title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Streak Cards <span style={{ fontSize: '10px', color: '#fb923c', backgroundColor: '#fb923c18', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fb923c40', fontWeight: '600' }}>STRK</span></span>}>
          Streak cards carry a counter that grows each week the streak condition is met (e.g.
          the card's player's team wins, your roster scores a TD, a kicker makes a 35+ yard
          FG). If the condition is not met, the streak resets. The card's bonus scales with
          the streak count — longer streaks yield larger rewards. Equipping multiple streak
          cards provides a synergy bonus: each additional active streak contributes extra
          growth to the others.
        </GuideSection>
        <GuideSection title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Chance Cards <span style={{ fontSize: '10px', color: '#c084fc', backgroundColor: '#c084fc18', padding: '1px 5px', borderRadius: '3px', border: '1px solid #c084fc40', fontWeight: '600' }}>CHC</span></span>}>
          Chance cards have a base probability of triggering each week. Some scale their odds
          with game context (e.g. more underperforming roster players increases the chance).
          The roll is resolved after games complete. Equipping multiple chance cards provides
          an innate synergy — each additional chance card slightly boosts the odds of every
          other chance card in your hand.
        </GuideSection>
        <GuideSection title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Conditional Cards <span style={{ fontSize: '10px', color: '#60a5fa', backgroundColor: '#60a5fa18', padding: '1px 5px', borderRadius: '3px', border: '1px solid #60a5fa40', fontWeight: '600' }}>CND</span></span>}>
          Conditional cards trigger their bonus when a specific stat threshold is met during a
          game (e.g. a QB throws for 250+ yards, a RB rushes for 100+ yards). The bonus is
          all-or-nothing — if the condition is met, you receive the full effect; otherwise,
          nothing. Unlike streak cards, there is no carryover between weeks.
        </GuideSection>
        <GuideSection title="Match Bonus">
          When a card's player is also on your fantasy roster, the card's primary effect
          receives a 1.5x boost.
        </GuideSection>
        <GuideSection title="Roster Swaps">
          Your roster swap replenishes each week. Between game rounds, you can swap one player
          for a new one starting at 15 Floobits. Each additional swap in the same slot costs 15 more
          (15, 30, 45, ...). Your previous player's FP are banked and you begin earning with the replacement.
        </GuideSection>
        <GuideSection title="Modifiers">
          Each week a random modifier changes how your equipped cards score: doubling multipliers,
          tripling card Floobits, protecting streaks, treating all cards as matched, and other twists.
          It has no effect if you have no cards equipped. The active modifier is displayed in the
          status bar above your roster.
        </GuideSection>
        <GuideSection title="Leaderboard">
          Weekly and season leaderboard rankings determine Floobit payouts. Top finishers each
          week and at season end earn bonus Floobits.
        </GuideSection>
      </HelpModal>

      {/* Tutorial */}
      {tour.shouldPrompt && !seasonOver && (
        <TourPrompt onStart={tour.startTour} onDismiss={tour.dismissPrompt} />
      )}
      {tour.isActive && (
        <TutorialOverlay
          steps={FANTASY_TOUR_STEPS}
          currentStep={tour.currentStep}
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
          onHelp={() => { tour.skip(); setShowHelp(true) }}
        />
      )}
    </div>
  )
}

export default FantasyPage
