import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

const GRADE_COLORS: Record<string, string> = {
  F: '#64748b', D: '#94a3b8', C: '#60a5fa', B: '#4ade80', A: '#a78bfa', S: '#fbbf24',
}
const GOLD = '#fbbf24'

interface ShowcaseResult { season: number; grade: string | null; total: number; weeksPaid: number }

interface ShowcaseResultModalProps {
  result: ShowcaseResult | null   // null = closed
  onClose: () => void
}

/** End-of-season recap: the grade your showcase finished on and the total
 *  weekly dividends it paid across the season. */
export default function ShowcaseResultModal({ result, onClose }: ShowcaseResultModalProps) {
  useEffect(() => {
    if (!result) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [result, onClose])

  if (!result) return null
  const gradeColor = GRADE_COLORS[result.grade ?? 'F'] || '#94a3b8'

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10005,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px', borderRadius: '16px', overflow: 'hidden',
          fontFamily: 'pressStart', textAlign: 'center', padding: '28px 24px',
          background: `radial-gradient(ellipse 90% 60% at 50% 0%, ${gradeColor}1f, transparent 70%), linear-gradient(180deg, #141b30 0%, #0a0e1a 100%)`,
          border: `1px solid ${gradeColor}55`,
        }}
      >
        <div style={{
          fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
          color: '#94a3b8', marginBottom: '18px',
        }}>
          Season {result.season} Showcase
        </div>

        <div style={{
          width: '96px', height: '96px', borderRadius: '50%', margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 35% 30%, ${gradeColor}33, ${gradeColor}10)`,
          border: `3px solid ${gradeColor}`, color: gradeColor,
          fontSize: '52px', fontWeight: 800,
          boxShadow: `0 0 26px ${gradeColor}66, inset 0 0 22px ${gradeColor}22`,
        }}>
          {result.grade ?? '—'}
        </div>

        <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
          Your collection finished <span style={{ color: gradeColor, fontWeight: 700 }}>{result.grade}</span>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: GOLD, marginBottom: '6px' }}>
          +{result.total} Floobits
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '22px' }}>
          paid across {result.weeksPaid} {result.weeksPaid === 1 ? 'week' : 'weeks'}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
            background: `linear-gradient(135deg, ${GOLD}, #d97706)`,
            color: '#1a1206', fontFamily: 'pressStart', fontWeight: 800, fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Nice
        </button>
      </div>
    </div>,
    document.body
  )
}
