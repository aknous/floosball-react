import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { SignIn } from '@clerk/react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface AuthModalProps {
  visible: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  if (!visible) return null

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '420px',
          maxHeight: isMobile ? '92vh' : '90vh',
          backgroundColor: '#1e293b',
          border: isMobile ? 'none' : '1px solid #334155',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          fontFamily: 'pressStart',
          display: 'flex',
          flexDirection: 'column' as const,
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '16px 16px 8px' : '20px 20px 8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width={isMobile ? 24 : 28} height={isMobile ? 24 : 28} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
              <circle cx="16" cy="16" r="16" fill="#3b82f6" />
              <g transform="rotate(-45 16 16)">
                <ellipse cx="16" cy="16" rx="10" ry="6.5" fill="#e2e8f0" />
                <line x1="6" y1="16" x2="26" y2="16" stroke="#3b82f6" strokeWidth="1.2" />
                <line x1="13" y1="13.2" x2="13" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
                <line x1="16" y1="12.5" x2="16" y2="19.5" stroke="#3b82f6" strokeWidth="1" />
                <line x1="19" y1="13.2" x2="19" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
              </g>
            </svg>
            <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '700', color: '#e2e8f0' }}>
              Floosball
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: '20px', lineHeight: 1,
              padding: '2px 4px', flexShrink: 0,
            }}
            aria-label="Close"
          >&times;</button>
        </div>

        {/* Clerk SignIn — card styling stripped so it blends with our modal */}
        <div style={{ padding: '0 4px 16px', overflowY: 'auto', flex: 1 }}>
          <SignIn
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: {
                  backgroundColor: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  width: '100%',
                },
                cardBox: {
                  boxShadow: 'none',
                  width: '100%',
                },
                header: { display: 'none' },
                footer: {
                  background: 'transparent',
                  '& > div:last-child': { display: 'none' },
                },
              },
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
