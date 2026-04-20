import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import CoachAvatar from './CoachAvatar'
import { Stars, calcStars } from './Stars'

export interface CoachHoverData {
  name: string
  overallRating: number
  offensiveMind?: number
  defensiveMind?: number
  adaptability?: number
  aggressiveness?: number
  clockManagement?: number
  playerDevelopment?: number
  scouting?: number
}

// ── Portal card ───────────────────────────────────────────────────────────────

const CARD_WIDTH = 240
const CARD_HEIGHT_EST = 280
const OFFSET = 16

const RatingBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{value}</span>
      </div>
      <div style={{ height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
        <div style={{
          width: `${Math.min(100, value)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '2px',
        }} />
      </div>
    </div>
  )
}

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

  const attrs: { label: string; value: number }[] = []
  if (data.aggressiveness != null) attrs.push({ label: 'Aggressiveness', value: data.aggressiveness })
  if (data.offensiveMind != null) attrs.push({ label: 'Offensive Mind', value: data.offensiveMind })
  if (data.defensiveMind != null) attrs.push({ label: 'Defensive Mind', value: data.defensiveMind })
  if (data.adaptability != null) attrs.push({ label: 'Adaptability', value: data.adaptability })
  if (data.clockManagement != null) attrs.push({ label: 'Clock Mgmt', value: data.clockManagement })
  if (data.playerDevelopment != null) attrs.push({ label: 'Player Dev', value: data.playerDevelopment })
  if (data.scouting != null) attrs.push({ label: 'Scouting', value: data.scouting })

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
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <CoachAvatar name={data.name} size={64} bgColor={teamColor} style={{ border: `2px solid ${color}` }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{data.name}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>Head Coach</div>
            <div style={{ marginTop: '3px' }}><Stars stars={calcStars(data.overallRating)} size={18} /></div>
          </div>
        </div>

        {/* Overall bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Overall</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700' }}>{data.overallRating}</span>
          </div>
          <div style={{ height: '4px', backgroundColor: '#334155', borderRadius: '2px' }}>
            <div style={{
              width: `${Math.min(100, data.overallRating)}%`,
              height: '100%',
              backgroundColor: data.overallRating >= 85 ? '#22c55e' : data.overallRating >= 72 ? '#f59e0b' : '#ef4444',
              borderRadius: '2px',
            }} />
          </div>
        </div>

        {/* Attributes */}
        {attrs.map(a => <RatingBar key={a.label} label={a.label} value={a.value} />)}
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
