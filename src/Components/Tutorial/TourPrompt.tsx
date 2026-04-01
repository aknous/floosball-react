import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

interface TourPromptProps {
  onStart: () => void
  onDismiss: () => void
}

export default function TourPrompt({ onStart, onDismiss }: TourPromptProps) {
  const [show, setShow] = useState(false)

  // Slide in after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 600)
    return () => clearTimeout(timer)
  }, [])

  // Auto-dismiss after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 20000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: show ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100px)',
      opacity: show ? 1 : 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 20px',
      backgroundColor: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      transition: 'all 0.4s ease',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      {/* Compass icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>

      <span style={{
        color: '#cbd5e1',
        fontSize: '12px',
        fontFamily: 'pressStart',
        lineHeight: '1.5',
      }}>
        New here? Take a quick tour.
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onStart}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '11px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: 'pressStart',
            fontWeight: '700',
            whiteSpace: 'nowrap',
          }}
        >
          Show Me
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'pressStart',
            padding: '6px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          No Thanks
        </button>
      </div>
    </div>,
    document.body
  )
}
