import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface TeamDetail {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string
  wins: number
  losses: number
  winPerc: string
  overallRating: number
  offenseRating: number
  defenseRunCoverageRating: number
  defensePassCoverageRating: number
  elo: number
  winningStreak: boolean
  streak: number
  clinchedPlayoffs: boolean
  clinchedTopSeed: boolean
  leagueChampion: boolean
  league: string
}

const CARD_WIDTH = 260
const CARD_HEIGHT_EST = 310
const OFFSET = 16

const RatingBar: React.FC<{ label: string; value: number; color: string; bold?: boolean }> = ({ label, value, color, bold }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
      <span style={{ fontSize: '13px', color: bold ? '#cbd5e1' : '#94a3b8', fontWeight: bold ? '700' : '400' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700' }}>{Math.round(value)}</span>
    </div>
    <div style={{ height: bold ? '4px' : '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', backgroundColor: bold ? color : `${color}55`, borderRadius: '2px' }} />
    </div>
  </div>
)

const Card: React.FC<{ data: TeamDetail; mouseX: number; mouseY: number }> = ({ data, mouseX, mouseY }) => {
  const left = mouseX + OFFSET + CARD_WIDTH > window.innerWidth - 8
    ? mouseX - CARD_WIDTH - OFFSET
    : mouseX + OFFSET
  let top = mouseY + OFFSET
  if (top + CARD_HEIGHT_EST > window.innerHeight - 8) top = mouseY - CARD_HEIGHT_EST - OFFSET
  top = Math.max(8, top)

  const color = data.color || '#64748b'
  const streak = data.streak ?? 0

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top, left,
      width: CARD_WIDTH,
      fontFamily: 'pressStart',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: 9999,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <div style={{ height: '4px', backgroundColor: color }} />

      <div style={{ padding: '12px' }}>
        {/* Header: avatar + name + record */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <img
            src={`${API_BASE}/teams/${data.id}/avatar?size=40&v=2`}
            alt={data.abbr}
            style={{ width: '40px', height: '40px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>
              {data.city} {data.name}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{data.league}</div>
            <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '3px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {data.wins}-{data.losses}
              {streak >= 2 && <span style={{ color: '#22c55e', fontSize: '12px' }}>W{streak}</span>}
              {streak <= -2 && <span style={{ color: '#ef4444', fontSize: '12px' }}>L{Math.abs(streak)}</span>}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              ELO <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{Math.round(data.elo)}</span>
            </div>
          </div>
        </div>

        {/* Status badges */}
        {(data.leagueChampion || data.clinchedTopSeed || data.clinchedPlayoffs) && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {data.leagueChampion && (
              <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#f59e0b18', border: '1px solid #f59e0b55', color: '#f59e0b', letterSpacing: '0.05em' }}>CHAMP</span>
            )}
            {!data.leagueChampion && data.clinchedTopSeed && (
              <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#a78bfa18', border: '1px solid #a78bfa55', color: '#a78bfa', letterSpacing: '0.05em' }}>TOP SEED</span>
            )}
            {!data.leagueChampion && !data.clinchedTopSeed && data.clinchedPlayoffs && (
              <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#22c55e18', border: '1px solid #22c55e55', color: '#22c55e', letterSpacing: '0.05em' }}>CLINCHED</span>
            )}
          </div>
        )}

        {/* Ratings */}
        <RatingBar label="Overall" value={data.overallRating} color={color} bold />
        <RatingBar label="Offense" value={data.offenseRating} color={color} />
        <RatingBar label="Run Defense" value={data.defenseRunCoverageRating} color={color} />
        <RatingBar label="Pass Defense" value={data.defensePassCoverageRating} color={color} />
      </div>
    </div>,
    document.body
  )
}

interface TeamHoverCardProps {
  teamId: string | number
  children: React.ReactNode
}

const TeamHoverCard: React.FC<TeamHoverCardProps> = ({ teamId, children }) => {
  const [data, setData] = useState<TeamDetail | null>(null)
  const [visible, setVisible] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchedRef = useRef<number | null>(null)

  const fetchData = useCallback(async (id: number) => {
    if (fetchedRef.current === id) return
    fetchedRef.current = id
    try {
      const res = await fetch(`${API_BASE}/teams/${id}`)
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
      fetchData(Number(teamId))
    }, 180)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ display: 'contents' }}>
      {children}
      {visible && mousePos && data && (
        <Card data={data} mouseX={mousePos.x} mouseY={mousePos.y} />
      )}
    </span>
  )
}

export default TeamHoverCard
