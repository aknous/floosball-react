import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface Team {
  id: number
  abbr: string
  name: string
  city: string
  color?: string
}

interface TeamNavStripProps {
  currentTeamId: number
}

export const TeamNavStrip: React.FC<TeamNavStripProps> = ({ currentTeamId }) => {
  const [teams, setTeams] = useState<Team[]>([])
  const [hovered, setHovered] = useState<{ team: Team; x: number; y: number } | null>(null)
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const currentItemRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    fetch(`${API_BASE}/teams`)
      .then(r => r.json())
      .then(data => {
        const list = data?.success && Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        const sorted = [...list].sort((a: Team, b: Team) => a.city.localeCompare(b.city))
        setTeams(sorted)
      })
      .catch(() => {})
  }, [])

  // Scroll the active team into view when it changes
  useEffect(() => {
    if (!currentItemRef.current || !containerRef.current) return
    currentItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentTeamId, teams.length])

  if (teams.length === 0) return null

  const itemSize = isMobile ? 24 : 28

  return (
    <>
    <div
      ref={containerRef}
      style={{
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{
        display: 'flex',
        gap: isMobile ? '4px' : '6px',
        padding: isMobile ? '8px 12px' : '10px 16px',
        flexShrink: 0,
      }}>
        {teams.map(team => {
          const isCurrent = team.id === currentTeamId
          return (
            <Link
              key={team.id}
              to={`/team/${team.id}`}
              ref={isCurrent ? currentItemRef : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '4px 6px' : '5px 8px',
                borderRadius: '6px',
                backgroundColor: isCurrent ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: `1px solid ${isCurrent ? 'rgba(59,130,246,0.5)' : 'transparent'}`,
                textDecoration: 'none',
                flexShrink: 0,
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                setHovered({ team, x: rect.left + rect.width / 2, y: rect.bottom })
                if (!isCurrent) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                setHovered(null)
                if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <img
                src={`/avatars/${team.id}.png`}
                alt={`${team.city} ${team.name}`}
                style={{
                  width: `${itemSize}px`,
                  height: `${itemSize}px`,
                  opacity: isCurrent ? 1 : 0.85,
                }}
              />
            </Link>
          )
        })}
      </div>
    </div>
    {hovered && (
      <div style={{
        position: 'fixed',
        top: `${hovered.y + 6}px`,
        left: `${hovered.x}px`,
        transform: 'translateX(-50%)',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '6px',
        padding: '6px 10px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#e2e8f0',
        whiteSpace: 'nowrap',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
      }}>
        {hovered.team.city} {hovered.team.name}
      </div>
    )}
    </>
  )
}

export default TeamNavStrip
