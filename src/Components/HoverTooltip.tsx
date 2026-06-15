import React, { useState, useRef, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom'

interface HoverTooltipProps {
  text?: string
  content?: React.ReactNode
  color?: string
  children: React.ReactNode
}

const MARGIN = 8

const HoverTooltip: React.FC<HoverTooltipProps> = ({ text, content, color = '#94a3b8', children }) => {
  const [show, setShow] = useState(false)
  const [anchor, setAnchor] = useState({ cx: 0, top: 0, bottom: 0 })
  // Position is resolved after the tooltip mounts (so we can measure it and
  // flip/clamp against the viewport). Hidden until then to avoid a flash.
  const [placed, setPlaced] = useState<{ left: number; top: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const hasContent = !!(text || content)

  const handleEnter = () => {
    if (!ref.current || !hasContent) return
    const rect = ref.current.getBoundingClientRect()
    setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom })
    setPlaced(null)
    setShow(true)
  }

  // Measure the rendered tooltip and position it: prefer above the trigger,
  // flip below when it would clip the top of the viewport; clamp horizontally.
  useLayoutEffect(() => {
    if (!show || !tipRef.current) return
    const { offsetWidth: w, offsetHeight: h } = tipRef.current
    const vw = window.innerWidth
    const fitsAbove = anchor.top - MARGIN - h >= MARGIN
    const top = fitsAbove ? anchor.top - MARGIN - h : anchor.bottom + MARGIN
    const left = Math.max(MARGIN, Math.min(anchor.cx - w / 2, vw - w - MARGIN))
    setPlaced({ left, top })
  }, [show, anchor])

  return (
    <span ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ cursor: hasContent ? 'help' : undefined }}>
      {children}
      {show && hasContent && ReactDOM.createPortal(
        <div ref={tipRef} style={{
          position: 'fixed',
          left: placed ? placed.left : anchor.cx,
          top: placed ? placed.top : anchor.top,
          visibility: placed ? 'visible' : 'hidden',
          backgroundColor: '#0f172a', border: `1px solid ${color}40`,
          borderRadius: '8px', padding: '10px 14px',
          fontSize: '12px', color: '#e2e8f0', lineHeight: '1.55',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10010,
          pointerEvents: 'none', fontFamily: 'pressStart',
          maxWidth: '320px', textAlign: 'center',
        }}>
          {content ?? text}
        </div>,
        document.body
      )}
    </span>
  )
}

export default HoverTooltip
