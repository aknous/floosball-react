import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

export interface FeatureItem {
  title: string
  body: string
  color?: string
}

interface FeatureAnnounceModalProps {
  open: boolean
  title: string
  intro?: string
  items: FeatureItem[]
  accent?: string
  onClose: () => void
}

/** A one-time "what's new" modal: a header, a few feature blurbs, and a dismiss. */
export default function FeatureAnnounceModal({
  open, title, intro, items, accent = '#fbbf24', onClose,
}: FeatureAnnounceModalProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10006,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRadius: '14px', fontFamily: 'pressStart',
          border: `1px solid ${accent}55`,
          background: `radial-gradient(ellipse 90% 50% at 50% 0%, ${accent}1f, transparent 70%), linear-gradient(180deg, #131a2e 0%, #0b0f1d 100%)`,
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 22px 14px', textAlign: 'center' }}>
          <div style={{
            fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase',
            color: accent, fontWeight: 700, marginBottom: '8px',
          }}>New</div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#e2e8f0' }}>{title}</h2>
          {intro && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>{intro}</p>
          )}
        </div>

        {/* Feature blurbs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((it, i) => (
            <div key={i} style={{
              padding: '11px 14px', borderRadius: '9px',
              background: 'rgba(30,41,59,0.45)',
              borderLeft: `3px solid ${it.color || accent}`,
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: it.color || '#e2e8f0', marginBottom: '4px' }}>
                {it.title}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>{it.body}</div>
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div style={{ padding: '16px 22px 20px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
              background: `linear-gradient(135deg, ${accent}, #d97706)`,
              color: '#1a1206', fontFamily: 'pressStart', fontWeight: 800, fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
