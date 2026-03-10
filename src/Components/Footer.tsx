import React, { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

const APP_VERSION = process.env.REACT_APP_VERSION || '0.2.0'

const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: 'v0.2.0',
    date: '2026-03-06',
    changes: [
      'Trading card system with 6 editions (Base → Diamond)',
      'Balatro-inspired card effect pools with synergies',
      'Card equipment slots with draft mode and weekly locking',
      'Two-pass card bonus calculator with modifier cards',
      'Smart coaching with halftime gameplan adjustments',
      'Live card bonus tracking and per-card breakdowns',
      'Fantasy leaderboard with accurate live scoring',
      'Offseason system and admin portal',
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-03-05',
    changes: [
      'Initial release of Floosball simulation',
      'Live play-by-play with Big Play, Clutch, and Choke indicators',
      'Full season simulation with playoffs and Floosbowl',
      'Fantasy mode with live scoring',
      'Team and player management with procedural generation',
      'Coaching system with halftime adjustments',
      'Win probability and pressure-based gameplay',
    ],
  },
]

export const Footer: React.FC = () => {
  const [showChangelog, setShowChangelog] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!showChangelog) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        badgeRef.current && !badgeRef.current.contains(e.target as Node)
      ) {
        setShowChangelog(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showChangelog])

  return (
    <footer style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      backgroundColor: '#0f172a',
      borderTop: '1px solid #334155',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '8px 16px' : '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <NavLink
          to="/about"
          style={{
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          About
        </NavLink>

        <div ref={badgeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowChangelog(o => !o)}
            style={{
              background: 'none',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: '600',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
          >
            v{APP_VERSION}
          </button>

          {showChangelog && (
            <div
              ref={panelRef}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                right: 0,
                width: isMobile ? '280px' : '340px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                fontSize: '13px',
                fontWeight: '700',
                color: '#e2e8f0',
              }}>
                Changelog
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '4px 0' }}>
                {CHANGELOG.map((entry) => (
                  <div key={entry.version} style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#3b82f6',
                      }}>
                        {entry.version}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}>
                        {entry.date}
                      </span>
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '16px',
                      listStyle: 'none',
                    }}>
                      {entry.changes.map((change, i) => (
                        <li key={i} style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          lineHeight: '1.6',
                          position: 'relative',
                          paddingLeft: '8px',
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: '-8px',
                            color: '#64748b',
                          }}>•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
