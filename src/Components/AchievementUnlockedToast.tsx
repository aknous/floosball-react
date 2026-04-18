import React, { useEffect } from 'react'
import { useAchievements } from '@/contexts/AchievementsContext'

const packLabel = (slug: string) => {
  const map: Record<string, string> = {
    humble: 'Humble Pack',
    proper: 'Proper Pack',
    grand: 'Grand Pack',
    exquisite: 'Exquisite Pack',
  }
  return map[slug] ?? slug
}

const packColor = (slug: string) => {
  const map: Record<string, string> = {
    humble: '#94a3b8',
    proper: '#c4b5fd',
    grand: '#f472b6',
    exquisite: '#67e8f9',
  }
  return map[slug] ?? '#a78bfa'
}

const powerupLabel = (slug: string) => {
  if (slug === 'random') return 'Random Powerup'
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const AchievementUnlockedToast: React.FC = () => {
  const { latestUnlock, dismissUnlock } = useAchievements()

  useEffect(() => {
    if (!latestUnlock) return
    const timer = setTimeout(() => dismissUnlock(), 7000)
    return () => clearTimeout(timer)
  }, [latestUnlock, dismissUnlock])

  if (!latestUnlock) return null

  const { name, description, rewardConfig, deferredRelease } = latestUnlock
  const floobits = rewardConfig.floobits ?? 0
  const packs = rewardConfig.packs ?? []
  const powerups = rewardConfig.powerups ?? []

  return (
    <div
      role="status"
      aria-live="polite"
      className="font-pixel"
      style={{
        position: 'fixed',
        bottom: '60px',
        right: '24px',
        width: '340px',
        zIndex: 9999,
        backgroundColor: '#1e2d3d',
        border: '1px solid #f59e0b',
        borderRadius: '10px',
        padding: '14px 16px',
        color: '#e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        animation: 'slide-in 0.25s ease-out',
      }}
    >
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(245,158,11,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a1 1 0 011 1v1h3a1 1 0 011 1v2a4 4 0 01-3.528 3.971A4.002 4.002 0 0111 14.874V16h2a1 1 0 110 2H7a1 1 0 110-2h2v-1.126A4.002 4.002 0 015.528 10.97 4 4 0 012 7V5a1 1 0 011-1h3V3a1 1 0 011-1h3zM4 6v1a2 2 0 001.26 1.857A6 6 0 016 7V6H4zm12 0h-2v1c0 .3.022.593.06.878A2 2 0 0016 7V6z" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#f59e0b',
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            {deferredRelease ? 'Reward Available' : 'Achievement Unlocked'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.45 }}>
            {description}
          </div>

          {(floobits > 0 || packs.length > 0 || powerups.length > 0) && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {floobits > 0 && (
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>+{floobits}</span> Floobits
                </span>
              )}
              {packs.map((p, i) => (
                <span key={`pack-${i}`} style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  <span style={{ color: packColor(p), fontWeight: 600 }}>{packLabel(p)}</span>
                </span>
              ))}
              {powerups.map((p, i) => (
                <span key={`pu-${i}`} style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  <span style={{ color: '#06b6d4', fontWeight: 600 }}>{powerupLabel(p)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={dismissUnlock}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px',
            lineHeight: 1,
            fontSize: '16px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default AchievementUnlockedToast
