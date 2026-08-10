import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

// One-time announcement shown the first time a user opens the Fantasy page after the
// cards/fantasy fusion. Gated by featureAnnounce (FEATURE_FANTASY_FUSION) upstream; this
// component just renders and calls onClose when dismissed (which marks it seen).

const POINTS: { title: string; body: string; color: string }[] = [
  {
    title: 'Your cards are your lineup',
    body: "Equip one card per position (QB, RB, WR, WR, TE, K). Each card fields its real player, and that player's weekly Fantasy Points power the card.",
    color: '#38bdf8',
  },
  {
    title: 'The power bar',
    body: 'Every card has an FP bar. Its effect turns on once the player fills the bar that week.',
    color: '#22c55e',
  },
  {
    title: 'Chance cards',
    body: "For these, the bar is your trigger odds, filled by the player's FP plus the card's own condition.",
    color: '#f59e0b',
  },
  {
    title: 'New edition names',
    body: 'Base is the plain no-effect card. Metallic is the first effect tier, then Holographic, Prismatic, and Diamond.',
    color: '#a78bfa',
  },
]

const FantasyFusionIntroModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '540px', maxHeight: '85vh',
          backgroundColor: '#0f172a', border: '1px solid #334155',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'pressStart',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e293b',
          display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#38bdf8', letterSpacing: '.14em', textTransform: 'uppercase' }}>
            What's new
          </span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
            Fantasy and your cards are now one
          </span>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          {POINTS.map(p => (
            <div key={p.title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '4px', alignSelf: 'stretch', backgroundColor: p.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', marginBottom: '3px' }}>{p.title}</div>
                <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.6' }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background: '#38bdf8', border: 'none', color: '#0f172a',
              fontSize: '11px', fontWeight: '700', padding: '8px 20px', cursor: 'pointer', fontFamily: 'pressStart',
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

export default FantasyFusionIntroModal
