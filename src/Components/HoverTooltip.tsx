import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'

interface HoverTooltipProps {
  text?: string
  content?: React.ReactNode
  color?: string
  children: React.ReactNode
}

const HoverTooltip: React.FC<HoverTooltipProps> = ({ text, content, color = '#94a3b8', children }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const hasContent = !!(text || content)

  const handleEnter = () => {
    if (!ref.current || !hasContent) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <span ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ cursor: hasContent ? 'help' : undefined }}>
      {children}
      {show && hasContent && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
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
