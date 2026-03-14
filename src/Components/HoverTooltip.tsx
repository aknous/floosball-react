import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'

const HoverTooltip: React.FC<{ text: string; color?: string; children: React.ReactNode }> = ({ text, color = '#94a3b8', children }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (!ref.current || !text) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <span ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ cursor: text ? 'help' : undefined }}>
      {children}
      {show && text && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a', border: `1px solid ${color}40`,
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '10px', color: '#e2e8f0', lineHeight: '1.5',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10010,
          pointerEvents: 'none', fontFamily: 'pressStart',
          maxWidth: '280px', textAlign: 'center',
        }}>
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}

export default HoverTooltip
