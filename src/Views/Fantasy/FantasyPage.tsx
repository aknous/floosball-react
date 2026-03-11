import React, { useState, useEffect } from 'react'
import { FantasyRoster } from '@/Components/Fantasy/FantasyRoster'
import { FantasyLeaderboard } from '@/Components/Fantasy/FantasyLeaderboard'
import CardEquipment from '@/Components/Cards/CardEquipment'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useFloosball } from '@/contexts/FloosballContext'

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
        {/* Lock countdown timer */}
        <LockCountdown />

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
