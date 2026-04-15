import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CHANGELOG, ChangelogEntry } from '@/data/changelog'

const SECTION_COLORS: Record<string, string> = {
  'New Features': '#22c55e',
  'Changes': '#f59e0b',
  'Fixes': '#3b82f6',
}

const FooterChangelogItems: React.FC<{ entry: ChangelogEntry }> = ({ entry }) => {
  if (entry.sections && entry.sections.length > 0) {
    return (
      <>
        {entry.sections.map((section) => (
          <div key={section.label} style={{ marginBottom: '10px' }}>
            <p style={{
              fontSize: '10px',
              fontWeight: '700',
              color: SECTION_COLORS[section.label] || '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              {section.label}
            </p>
            <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'none' }}>
              {section.items.map((item, i) => (
                <li key={i} style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  lineHeight: '1.6',
                  position: 'relative',
                  paddingLeft: '8px',
                }}>
                  <span style={{ position: 'absolute', left: '-8px', color: '#64748b' }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </>
    )
  }
  return (
    <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'none' }}>
      {entry.changes.map((change, i) => (
        <li key={i} style={{
          fontSize: '12px',
          color: '#94a3b8',
          lineHeight: '1.6',
          position: 'relative',
          paddingLeft: '8px',
        }}>
          <span style={{ position: 'absolute', left: '-8px', color: '#64748b' }}>•</span>
          {change}
        </li>
      ))}
    </ul>
  )
}

const APP_VERSION = process.env.REACT_APP_VERSION || '0.8.1'

export const Footer: React.FC = () => {
  const [showChangelog, setShowChangelog] = useState(false)
  const [showAllNotes, setShowAllNotes] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const latest = CHANGELOG[0]

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
        padding: isMobile ? '10px 16px' : '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NavLink
            to="/about"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            About
          </NavLink>
          <a
            href="https://discord.gg/b4DZn3mVfP"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            Discord
          </a>
          <a
            href="https://forms.gle/6f79nmjqcknTjHSf6"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            Feedback
          </a>
        </div>

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
              fontSize: '13px',
              color: '#94a3b8',
              fontWeight: '600',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#cbd5e1' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
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
                maxHeight: '60vh',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
                zIndex: 100,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column' as const,
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                fontSize: '13px',
                fontWeight: '700',
                color: '#e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                What's New
                <span style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8' }}>{latest.date}</span>
              </div>
              <div style={{ padding: '12px 16px', overflowY: 'auto' as const, flex: 1, minHeight: 0 }}>
                <FooterChangelogItems entry={latest} />
              </div>
              {CHANGELOG.length > 1 && (
                <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #334155', flexShrink: 0 }}>
                  <button
                    onClick={() => { setShowChangelog(false); setShowAllNotes(true) }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3b82f6')}
                  >
                    View all release notes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full release notes modal — portalled to body so footer CSS can't interfere */}
      {showAllNotes && ReactDOM.createPortal(
        <div
          onClick={() => setShowAllNotes(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.6)',
            fontFamily: 'pressStart, monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: isMobile ? '92vw' : '480px',
              maxHeight: '80vh',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column' as const,
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>Release Notes</span>
              <button
                onClick={() => setShowAllNotes(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
              >
                ×
              </button>
            </div>
            <div style={{ overflowY: 'auto' as const, padding: '4px 0', flex: 1, minHeight: 0 }}>
              {CHANGELOG.map((entry, idx) => (
                <div key={entry.version} style={{
                  padding: '16px 20px',
                  borderBottom: idx < CHANGELOG.length - 1 ? '1px solid #334155' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: idx === 0 ? '#3b82f6' : '#64748b',
                    }}>
                      {entry.version}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{entry.date}</span>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.12)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>LATEST</span>
                    )}
                  </div>
                  <FooterChangelogItems entry={entry} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </footer>
  )
}
