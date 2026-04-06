import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Link } from 'react-router-dom'
import PlayerAvatar from './PlayerAvatar'
import { Stars } from './Stars'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface PlayerDetail {
  id: number
  name: string
  position: string
  team: string | null
  teamCity: string | null
  teamColor: string | null
  teamId: number | null
  teamAbbr: string | null
  playerRating: number
  ratingStars: number
  attributes: {
    att1?: string; att1Value?: number; att1stars?: number
    att2?: string; att2Value?: number; att2stars?: number
    att3?: string; att3Value?: number; att3stars?: number
    playmakingStars?: number; playmakingValue?: number
    xFactorStars?: number; xFactorValue?: number
    seasonPerformanceRating?: number
    fatigue?: number
  }
}

const POSITION_FULL: Record<string, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', K: 'Kicker',
}

// ── Portal card ───────────────────────────────────────────────────────────────

interface CardProps {
  data: PlayerDetail
  mouseX: number
  mouseY: number
}

const CARD_WIDTH = 260
const CARD_HEIGHT_EST = 340
const OFFSET = 16

const Card: React.FC<CardProps> = ({ data, mouseX, mouseY }) => {
  // Place to the right of cursor; flip left if not enough room
  const left = mouseX + OFFSET + CARD_WIDTH > window.innerWidth - 8
    ? mouseX - CARD_WIDTH - OFFSET
    : mouseX + OFFSET

  // Place below cursor; flip up if not enough room
  let top = mouseY + OFFSET
  if (top + CARD_HEIGHT_EST > window.innerHeight - 8) top = mouseY - CARD_HEIGHT_EST - OFFSET
  top = Math.max(8, top)

  const { attributes: att } = data
  const skills: { label: string; value: number; stars: number }[] = []
  if (att) {
    if (att.att1 && att.att1Value != null) skills.push({ label: att.att1, value: att.att1Value, stars: att.att1stars ?? 1 })
    if (att.att2 && att.att2Value != null) skills.push({ label: att.att2, value: att.att2Value, stars: att.att2stars ?? 1 })
    if (att.att3 && att.att3Value != null) skills.push({ label: att.att3, value: att.att3Value, stars: att.att3stars ?? 1 })
    if (att.playmakingValue != null)       skills.push({ label: 'Playmaking', value: att.playmakingValue, stars: att.playmakingStars ?? 1 })
    if (att.xFactorValue != null)          skills.push({ label: 'X-Factor', value: att.xFactorValue, stars: att.xFactorStars ?? 1 })
  }

  const color = data.teamColor || '#64748b'

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
      <div style={{
        height: '4px',
        backgroundColor: color,
      }} />

      <div style={{ padding: '14px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <PlayerAvatar name={data.name} size={72} bgColor={data.teamColor} style={{ border: `2px solid ${color}` }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{data.name}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              {POSITION_FULL[data.position] ?? data.position}
            </div>
            <div style={{ marginTop: '3px' }}><Stars stars={data.ratingStars} size={20} /></div>
          </div>
        </div>

        {/* Team */}
        {data.teamId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <img src={`${API_BASE}/teams/${data.teamId}/avatar?size=16&v=2`} alt=""
              style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color, fontWeight: '600' }}>
              {data.teamCity} {data.team}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: '#475569', marginBottom: '12px' }}>Free Agent</div>
        )}

        {/* Rating bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Overall</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700' }}>{data.playerRating}</span>
          </div>
          <div style={{ height: '4px', backgroundColor: '#334155', borderRadius: '2px' }}>
            <div style={{ width: `${Math.min(100, data.playerRating)}%`, height: '100%', backgroundColor: data.playerRating >= 85 ? '#22c55e' : data.playerRating >= 72 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Performance indicator */}
        {(() => {
          const perfRating = data.attributes?.seasonPerformanceRating
          if (perfRating == null || perfRating === 0) return null
          const delta = perfRating - data.playerRating
          let symbols = ''
          let label = ''
          let indicatorColor = ''
          if (delta >= 20) { symbols = '+++'; label = 'Overperforming'; indicatorColor = '#22c55e' }
          else if (delta >= 12) { symbols = '++'; label = 'Overperforming'; indicatorColor = '#22c55e' }
          else if (delta >= 5) { symbols = '+'; label = 'Overperforming'; indicatorColor = '#4ade80' }
          else if (delta <= -20) { symbols = '---'; label = 'Underperforming'; indicatorColor = '#ef4444' }
          else if (delta <= -12) { symbols = '--'; label = 'Underperforming'; indicatorColor = '#ef4444' }
          else if (delta <= -5) { symbols = '-'; label = 'Underperforming'; indicatorColor = '#f87171' }
          else return null
          return (
            <div style={{ fontSize: '12px', color: indicatorColor, fontWeight: '600', marginBottom: '10px' }}>
              {symbols} {label}
            </div>
          )
        })()}

        {/* Fatigue indicator */}
        {att?.fatigue != null && att.fatigue > 0 && (() => {
          const f = att.fatigue
          const fColor = f < 5 ? '#4ade80' : f < 10 ? '#eab308' : f < 15 ? '#f97316' : '#ef4444'
          return (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Fatigue</span>
                <span style={{ fontSize: '12px', color: fColor, fontWeight: '600' }}>{f.toFixed(1)}%</span>
              </div>
              <div style={{ height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
                <div style={{ width: `${Math.min(f / 20 * 100, 100)}%`, height: '100%', backgroundColor: fColor, borderRadius: '2px' }} />
              </div>
            </div>
          )
        })()}

        {/* Skills */}
        {skills.map(s => (
          <div key={s.label} style={{ marginBottom: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{s.label}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{s.value}</span>
            </div>
            <div style={{ height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
              <div style={{ width: `${Math.min(100, s.value)}%`, height: '100%', backgroundColor: s.value >= 85 ? '#22c55e' : s.value >= 72 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface PlayerHoverCardProps {
  playerId: number
  playerName: string
  children: React.ReactNode
}

const PlayerHoverCard: React.FC<PlayerHoverCardProps> = ({ playerId, playerName, children }) => {
  const [data, setData] = useState<PlayerDetail | null>(null)
  const [visible, setVisible] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchedRef = useRef<number | null>(null)

  const fetchData = useCallback(async (id: number) => {
    if (fetchedRef.current === id) return
    fetchedRef.current = id
    try {
      const res = await fetch(`${API_BASE}/players/${id}`)
      const json = await res.json()
      if (json.success && json.data) setData(json.data)
    } catch {}
  }, [])

  const handleMouseEnter = (e: React.MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    timerRef.current = setTimeout(() => {
      setMousePos({ x, y })
      setVisible(true)
      fetchData(playerId)
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
      {visible && mousePos && data && (
        <Card data={data} mouseX={mousePos.x} mouseY={mousePos.y} />
      )}
    </span>
  )
}

export default PlayerHoverCard
