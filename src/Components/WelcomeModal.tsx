import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CHANGELOG, ChangelogEntry } from '@/data/changelog'

const SECTION_COLORS: Record<string, string> = {
  'New Features': '#22c55e',
  'Changes': '#f59e0b',
  'Fixes': '#3b82f6',
}

const ChangelogItems: React.FC<{ entry: ChangelogEntry; fontSize: string }> = ({ entry, fontSize }) => {
  if (entry.sections && entry.sections.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
        {entry.sections.map((section) => (
          <div key={section.label}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              color: SECTION_COLORS[section.label] || '#94a3b8',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}>
              {section.label}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {section.items.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#475569', fontSize: '10px', flexShrink: 0, marginTop: '4px' }}>&#9679;</span>
                  <span style={{ color: '#94a3b8', fontSize, lineHeight: '1.5' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
      {entry.changes.map((change, i) => (
        <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <span style={{ color: '#475569', fontSize: '10px', flexShrink: 0, marginTop: '4px' }}>&#9679;</span>
          <span style={{ color: '#94a3b8', fontSize, lineHeight: '1.5' }}>{change}</span>
        </li>
      ))}
    </ul>
  )
}

const STORAGE_KEY = 'lastSeenWelcomeSeason'

const WelcomeModal: React.FC = () => {
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const [visible, setVisible] = useState(false)
  const [showAllNotes, setShowAllNotes] = useState(false)

  useEffect(() => {
    const sn = seasonState.seasonNumber
    if (!sn || sn <= 0) return
    const lastSeen = localStorage.getItem(STORAGE_KEY)
    if (lastSeen !== String(sn)) {
      setVisible(true)
    }
  }, [seasonState.seasonNumber])

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
    setShowAllNotes(false)
  }

  if (!visible) return null

  const latest = CHANGELOG[0]

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
          maxWidth: isMobile ? '100%' : '580px',
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
              Welcome to Season {seasonState.seasonNumber}
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

        {/* Scrollable content */}
        <div style={{ padding: '22px 28px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Simulation restart notice */}
          <div style={{
            backgroundColor: 'rgba(245,158,11,0.1)',
            borderRadius: '10px',
            padding: '18px',
            marginBottom: '20px',
            border: '1px solid rgba(245,158,11,0.3)',
          }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', marginBottom: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
              Fresh Start
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              Unfortunately the simulation had to be restarted due to issues that corrupted some data. Everything is starting from scratch. All user accounts and login data have been preserved. Sorry for the inconvenience, and thank you for your patience!
            </p>
          </div>

          {/* Season reminders */}
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '10px',
            padding: '18px',
            marginBottom: '24px',
            border: '1px solid #1e3a5f',
          }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '14px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
              New Season Checklist
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: '#f59e0b', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>!</span>
                <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                  Cards from the previous season have expired. Visit the <strong style={{ color: '#e2e8f0' }}>Shop</strong> to open packs and build a new collection.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: '#f59e0b', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>!</span>
                <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                  Your fantasy roster is empty. Head to <strong style={{ color: '#e2e8f0' }}>Fantasy</strong> to draft new players.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: '#f59e0b', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>!</span>
                <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                  Equip cards to your roster slots in <strong style={{ color: '#e2e8f0' }}>Cards</strong> to earn bonus Fantasy Points during games.
                </span>
              </div>
            </div>
          </div>

          {/* Latest changelog */}
          {latest && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: 0 }}>
                  What's New
                </p>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  backgroundColor: 'rgba(59,130,246,0.15)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}>
                  {latest.version}
                </span>
              </div>
              <ChangelogItems entry={latest} fontSize="13px" />

              {/* View all notes */}
              <button
                onClick={() => setShowAllNotes(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '14px 0 0',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                View all release notes
              </button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <div style={{ padding: '0 28px 28px', flexShrink: 0 }}>
          <button
            onClick={handleDismiss}
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
            Let's Go
          </button>
        </div>
      </div>

      {/* Full release notes overlay */}
      {showAllNotes && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10003,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '24px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAllNotes(false) }}
        >
          <div style={{
            width: '100%',
            maxWidth: isMobile ? '100%' : '620px',
            maxHeight: isMobile ? '90vh' : '80vh',
            backgroundColor: '#1e293b',
            border: isMobile ? 'none' : '1px solid #334155',
            borderRadius: isMobile ? '14px 14px 0 0' : '14px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column' as const,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '22px 28px',
              borderBottom: '1px solid #334155',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>Release Notes</span>
              <button
                onClick={() => setShowAllNotes(false)}
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
            <div style={{ overflowY: 'auto', padding: '22px 28px', flex: 1, minHeight: 0 }}>
              {CHANGELOG.map((entry, idx) => (
                <div key={entry.version} style={{ marginBottom: idx < CHANGELOG.length - 1 ? '28px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: idx === 0 ? '#3b82f6' : '#e2e8f0' }}>
                      {entry.version}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{entry.date}</span>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}>
                        LATEST
                      </span>
                    )}
                  </div>
                  <ChangelogItems entry={entry} fontSize="12px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

export default WelcomeModal
