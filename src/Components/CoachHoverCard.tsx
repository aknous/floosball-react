import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { CoachProfileTags, CoachTraitList, CoachProfileData } from './CoachProfile'

export interface CoachHoverData {
  name: string
  /** Archetypes + qualitative bands only — no coach rating numbers are sent. */
  profile?: CoachProfileData | null
  seasonsCoached?: number
}

// ── Portal card ───────────────────────────────────────────────────────────────

const CARD_WIDTH = 240
const CARD_HEIGHT_EST = 280
const OFFSET = 16

interface CardProps {
  data: CoachHoverData
  teamColor?: string
  mouseX: number
  mouseY: number
}

const Card: React.FC<CardProps> = ({ data, teamColor, mouseX, mouseY }) => {
  const left = mouseX + OFFSET + CARD_WIDTH > window.innerWidth - 8
    ? mouseX - CARD_WIDTH - OFFSET
    : mouseX + OFFSET

  let top = mouseY + OFFSET
  if (top + CARD_HEIGHT_EST > window.innerHeight - 8) top = mouseY - CARD_HEIGHT_EST - OFFSET
  top = Math.max(8, top)

  const color = teamColor || '#64748b'

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top, left,
      width: CARD_WIDTH,
      fontFamily: 'pressStart',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: 20000,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Header strip */}
      <div style={{ height: '4px', backgroundColor: color }} />

      <div style={{ padding: '14px' }}>
        {/* Name + role (avatar dropped — team identity carried by the
            color stripe at the top of the card). */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{data.name}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>Head Coach</div>
          <div style={{ marginTop: '6px' }}><CoachProfileTags profile={data.profile} /></div>
        </div>

        {/* Qualitative attribute read — bands, never numbers */}
        <CoachTraitList traits={data.profile?.traits} />
      </div>
    </div>,
    document.body
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface CoachHoverCardProps {
  coach: CoachHoverData
  teamColor?: string
  children: React.ReactNode
}

const CoachHoverCard: React.FC<CoachHoverCardProps> = ({ coach, teamColor, children }) => {
  const [visible, setVisible] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (e: React.MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    timerRef.current = setTimeout(() => {
      setMousePos({ x, y })
      setVisible(true)
    }, 180)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      style={{ display: 'contents' }}>
      {children}
      {visible && mousePos && (
        <Card data={coach} teamColor={teamColor} mouseX={mousePos.x} mouseY={mousePos.y} />
      )}
    </span>
  )
}

export default CoachHoverCard
