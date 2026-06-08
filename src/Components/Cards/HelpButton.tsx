import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

interface HelpButtonProps {
  title: string
  accent?: string
  children: React.ReactNode  // modal body
}

/** A small "?" button that opens a modal with detailed help. */
export default function HelpButton({ title, accent = '#94a3b8', children }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        aria-label="How it works"
        style={{
          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${accent}66`, background: 'rgba(30,41,59,0.6)',
          color: accent, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          fontFamily: 'pressStart', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', lineHeight: 1, padding: 0,
        }}
      >?</button>
      {open && ReactDOM.createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10003,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '520px', maxHeight: '85vh',
              background: '#0f172a', border: `1px solid ${accent}44`, borderRadius: '12px',
              display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'pressStart',
            }}
          >
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #1e293b',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{title}</h2>
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
              }}>x</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/** A titled paragraph block for help-modal bodies. */
export const HelpSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{title}</div>
    <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.7 }}>{children}</div>
  </div>
)
