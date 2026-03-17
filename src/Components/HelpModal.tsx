import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

// ── Help Button ─────────────────────────────────────────────────────────────

interface HelpButtonProps {
  onClick: () => void
  size?: number
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, size = 28 }) => (
  <button
    onClick={onClick}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: '1px solid #334155',
      backgroundColor: 'transparent',
      color: '#64748b',
      fontSize: `${Math.round(size * 0.5)}px`,
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'border-color 0.15s, color 0.15s',
      fontFamily: 'pressStart',
      padding: 0,
      lineHeight: 1,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = '#94a3b8'
      e.currentTarget.style.color = '#94a3b8'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#334155'
      e.currentTarget.style.color = '#64748b'
    }}
    aria-label="Help"
  >
    ?
  </button>
)

// ── Help Modal ──────────────────────────────────────────────────────────────

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'pressStart',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            x
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          fontSize: '12px',
          color: '#cbd5e1',
          lineHeight: '1.7',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Shared guide section styling ────────────────────────────────────────────

export const GuideSection: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '4px', fontSize: '12px' }}>
      {title}
    </div>
    <div style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.7' }}>
      {children}
    </div>
  </div>
)

export default HelpModal
