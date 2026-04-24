import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useFloosball } from '@/contexts/FloosballContext'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const GM_ACTIVE_WEEK = 22
const STORAGE_KEY = 'lastSeenFrontOfficeSeason'

const FrontOfficeModal: React.FC = () => {
  const { seasonState } = useFloosball()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const sn = seasonState.seasonNumber
    const week = seasonState.currentWeek
    if (!sn || sn <= 0 || week < GM_ACTIVE_WEEK) return
    const lastSeen = localStorage.getItem(STORAGE_KEY)
    if (lastSeen !== String(sn)) {
      setVisible(true)
    }
  }, [seasonState.seasonNumber, seasonState.currentWeek])

  useEffect(() => {
    if (!visible) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible])

  const handleDismiss = () => {
    const sn = seasonState.seasonNumber
    if (sn && sn > 0) {
      localStorage.setItem(STORAGE_KEY, String(sn))
    }
    setVisible(false)
  }

  const handleVisitFrontOffice = () => {
    handleDismiss()
    // Team Management is where the Front Office / Markets / Rookie ballot
    // all live now. Route there with a hash so the page auto-scrolls to
    // (and switches to) the Front Office tab.
    window.location.href = '/front-office'
  }

  if (!visible) return null

  const hasFavoriteTeam = !!(user?.favoriteTeamId)

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        fontFamily: 'pressStart, monospace',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '520px',
          maxHeight: isMobile ? '85vh' : '80vh',
          backgroundColor: '#1e293b',
          border: isMobile ? 'none' : '1px solid #334155',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column' as const,
        }}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
              The Front Office Is Open
            </h2>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              x
            </button>
          </div>
          <div style={{
            width: '100%',
            height: '1px',
            backgroundColor: '#334155',
            marginTop: '18px',
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '22px 28px 28px', overflowY: 'auto', flex: 1 }}>
          <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6', margin: '0 0 20px' }}>
            {hasFavoriteTeam
              ? 'The GM voting system is now active on the Front Office tab of your Team Management page. Issue directives to shape your team\'s roster heading into the offseason.'
              : 'The GM voting system is now active. Pick a favorite team to start issuing directives and shape its roster heading into the offseason.'}
          </p>

          {/* What you can do */}
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '10px',
            padding: '18px',
            border: '1px solid #1e3a5f',
          }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', marginBottom: '14px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
              Board Directives
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              {[
                { label: 'Fire Coach', desc: 'Remove the current head coach' },
                { label: 'Hire Coach', desc: 'Bring in a new head coach' },
                { label: 'Cut Player', desc: 'Release a player from the roster' },
                { label: 'Re-sign Player', desc: 'Lock in a player before free agency' },
                { label: 'Sign Free Agent', desc: 'Rank free agents the front office should pursue in the offseason draft' },
                { label: 'Promote Prospect', desc: 'Rank a team prospect on the same ballot — they move up from the pipeline if they win enough votes' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#3b82f6', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>&#9654;</span>
                  <span style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.5' }}>
                    <strong style={{ color: '#e2e8f0' }}>{item.label}</strong> — {item.desc}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '14px', lineHeight: '1.5' }}>
              Each vote costs Floobits. You have a budget of 20 votes per season.
            </p>
          </div>
        </div>

        {/* CTA button */}
        <div style={{ padding: '0 28px 28px', flexShrink: 0 }}>
          <button
            onClick={hasFavoriteTeam ? handleVisitFrontOffice : handleDismiss}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            {hasFavoriteTeam ? 'Visit Front Office' : 'Got It'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default FrontOfficeModal
