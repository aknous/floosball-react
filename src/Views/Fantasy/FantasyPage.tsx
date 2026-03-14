import React, { useState, useEffect } from 'react'
import { FantasyRoster } from '@/Components/Fantasy/FantasyRoster'
import { FantasyLeaderboard } from '@/Components/Fantasy/FantasyLeaderboard'
import CardEquipment from '@/Components/Cards/CardEquipment'
import ShopModal from '@/Components/Shop/ShopModal'
import HoverTooltip from '@/Components/HoverTooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useFloosball } from '@/contexts/FloosballContext'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'

const MODIFIER_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  amplify: { color: '#4ade80', icon: (
    // chevrons-up — amplification
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" />
    </svg>
  )},
  cascade: { color: '#4ade80', icon: (
    // layers — cascading stacks
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  )},
  frenzy: { color: '#4ade80', icon: (
    // flame — wild energy
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3.5-7.5 0 0 .5 4 3 5.5 2.77 1.66 4.5 4 4.5 7.5a7 7 0 11-14 0c0-1.15.39-2.26 1.5-3" />
    </svg>
  )},
  overdrive: { color: '#4ade80', icon: (
    // zap — electric overdrive
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )},
  payday: { color: '#4ade80', icon: (
    // dollar-sign — money
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  )},
  longshot: { color: '#4ade80', icon: (
    // crosshair — precision aim
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  )},
  ironclad: { color: '#fbbf24', icon: (
    // shield — defense
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )},
  wildcard: { color: '#fbbf24', icon: (
    // shuffle — randomness
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  )},
  synergy: { color: '#4ade80', icon: (
    // git-merge — connections/synergy
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 009 9" />
    </svg>
  )},
  fortunate: { color: '#4ade80', icon: (
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

function GameInfoBar() {
  const { user, fantasyRoster } = useAuth()
  const { modifier } = useFantasySnapshot(user?.id)

  const swapsAvailable = (fantasyRoster?.swapsAvailable ?? 0) + (fantasyRoster?.purchasedSwaps ?? 0)
  const isLocked = fantasyRoster?.isLocked ?? false

  if (!modifier && !isLocked) return null

  const modStyle = modifier ? (MODIFIER_STYLES[modifier.name] ?? MODIFIER_STYLES.steady) : MODIFIER_STYLES.steady
  const modColor = modStyle.color

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
    }}>
      {modifier && (
        <HoverTooltip text={modifier.description} color={modColor}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '7px 14px', borderRadius: '8px',
            backgroundColor: `${modColor}14`, border: `1px solid ${modColor}40`,
            color: modColor,
          }}>
            {modStyle.icon}
            <span style={{ fontSize: '12px', fontWeight: '700' }}>
              {modifier.displayName}
            </span>
          </div>
        </HoverTooltip>
      )}
      {isLocked && swapsAvailable > 0 && (
        <HoverTooltip text={`${swapsAvailable} roster swap${swapsAvailable !== 1 ? 's' : ''} available between games`} color="#38bdf8">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '7px 14px', borderRadius: '8px',
            backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3l4 4-4 4" />
              <path d="M20 7H4" />
              <path d="M8 21l-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8' }}>
              {swapsAvailable} Swap{swapsAvailable !== 1 ? 's' : ''}
            </span>
          </div>
        </HoverTooltip>
      )}
    </div>
  )
}

function LockCountdown() {
  const { seasonState } = useFloosball()
  const { nextGameStartTime } = seasonState
  const [remaining, setRemaining] = useState<number | null>(null)

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

  if (remaining == null || remaining <= 0) return null

  const hrs = Math.floor(remaining / 3600)
  const mins = Math.floor((remaining % 3600) / 60)
  const secs = remaining % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  const timeStr = hrs > 0
    ? `${hrs}:${pad(mins)}:${pad(secs)}`
    : `${mins}:${pad(secs)}`

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '10px 16px',
      backgroundColor: 'rgba(59,130,246,0.08)',
      border: '1px solid rgba(59,130,246,0.2)',
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
  const [showShop, setShowShop] = useState(false)

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
        {/* Status bar: countdown + modifier + swaps + shop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <LockCountdown />
          <GameInfoBar />
          <div style={{ flex: 1 }} />
          {user && (
            <button
              onClick={() => setShowShop(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #eab30840',
                backgroundColor: 'rgba(234,179,8,0.08)',
                color: '#eab308',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'pressStart',
                transition: 'border-color 0.15s, background-color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#eab30880'
                e.currentTarget.style.backgroundColor = 'rgba(234,179,8,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#eab30840'
                e.currentTarget.style.backgroundColor = 'rgba(234,179,8,0.08)'
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

      {/* Shop modal */}
      <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />
    </div>
  )
}

export default FantasyPage
