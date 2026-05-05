import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface Team {
  id: number
  name: string
  city: string
  abbr?: string
  color: string
  secondaryColor?: string
  elo: number
  wins: number
  losses: number
  winPerc: string
  formState?: string
  clinchedPlayoffs?: boolean
  clinchedTopSeed?: boolean
  leagueChampion?: boolean
  floosbowlChampion?: boolean
  eliminated?: boolean
}

interface LeagueGroup {
  name: string
  standings: Team[]
}

const LeagueColumn: React.FC<{ league: LeagueGroup; isMobile: boolean; favTeamId?: number | null }> = ({ league, isMobile, favTeamId }) => {
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '12px',
        marginBottom: '14px',
        paddingBottom: '8px',
        borderBottom: '1px solid #1e293b',
      }}>
        <h2 style={{ fontSize: isMobile ? '15px' : '17px', fontWeight: 700, color: '#e2e8f0', margin: 0, letterSpacing: '0.02em' }}>
          {league.name}
        </h2>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {league.standings.length} teams
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '10px',
      }}>
        {league.standings.map(team => (
          <TeamCard key={team.id} team={team} isMobile={isMobile} isFavorite={favTeamId === team.id} />
        ))}
      </div>
    </div>
  )
}

const TeamCard: React.FC<{ team: Team; isMobile: boolean; isFavorite: boolean }> = ({ team, isMobile, isFavorite }) => {
  const [hovered, setHovered] = useState(false)
  const accent = team.color || '#3b82f6'

  return (
    <Link
      to={`/team/${team.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: isMobile ? '14px 10px' : '16px 12px',
        backgroundColor: '#1e2d3d',
        border: `1px solid ${isFavorite ? `${accent}99` : (hovered ? '#475569' : '#2a3a4e')}`,
        borderRadius: '8px',
        textDecoration: 'none',
        position: 'relative',
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        opacity: team.eliminated ? 0.55 : 1,
        boxShadow: isFavorite ? `0 0 0 1px ${accent}33` : 'none',
      }}
    >
      {/* Status icons (top-right) */}
      {(team.floosbowlChampion || team.leagueChampion || team.clinchedTopSeed || team.clinchedPlayoffs) && (
        <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '3px' }}>
          {team.floosbowlChampion && (
            <span title="Floosbowl Champion" style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>★</span>
          )}
          {team.leagueChampion && !team.floosbowlChampion && (
            <span title="League Champion" style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 700 }}>♦</span>
          )}
          {team.clinchedTopSeed && !team.leagueChampion && !team.floosbowlChampion && (
            <span title="Clinched Top Seed" style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>1</span>
          )}
          {team.clinchedPlayoffs && !team.clinchedTopSeed && !team.leagueChampion && !team.floosbowlChampion && (
            <span title="Clinched Playoffs" style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>✓</span>
          )}
        </div>
      )}

      <img
        src={`/avatars/${team.id}.png`}
        alt={`${team.city} ${team.name}`}
        style={{
          width: isMobile ? '52px' : '64px',
          height: isMobile ? '52px' : '64px',
        }}
      />

      <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
        <div style={{
          fontSize: isMobile ? '12px' : '13px',
          color: '#94a3b8',
          fontWeight: 500,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {team.city}
        </div>
        <div style={{
          fontSize: isMobile ? '14px' : '15px',
          fontWeight: 700,
          color: '#e2e8f0',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {team.name}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
          {team.wins}–{team.losses}
        </span>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
          ELO {team.elo}
        </span>
      </div>
    </Link>
  )
}

export default function TeamsPage() {
  const [leagues, setLeagues] = useState<LeagueGroup[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()
  const { user } = useAuth()

  useEffect(() => {
    fetch(`${API_BASE}/standings`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLeagues(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '20px 16px' : '32px 24px',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: '#e2e8f0',
            margin: 0,
            letterSpacing: '0.01em',
          }}>
            League
          </h1>
        </div>

        {loading && (
          <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center' }}>Loading…</div>
        )}

        {!loading && leagues.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: isMobile ? '28px' : '40px',
          }}>
            {leagues.map(league => (
              <LeagueColumn
                key={league.name}
                league={league}
                isMobile={isMobile}
                favTeamId={user?.favoriteTeamId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
