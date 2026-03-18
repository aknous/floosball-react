import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import TeamHoverCard from '@/Components/TeamHoverCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

interface TeamStanding {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string
  elo: number
  wins: number
  losses: number
  winPerc: string
  clinchedPlayoffs?: boolean
  clinchedTopSeed?: boolean
  eliminated?: boolean
  floosbowlChampion?: boolean
}

interface LeagueStandings {
  name: string
  standings: TeamStanding[]
}

interface StandingsProps {
  leagueIndex: number
  maxHeight?: number
  viewMode?: 'standings' | 'powerRankings'
}

export const Standings: React.FC<StandingsProps> = ({ leagueIndex, maxHeight = 280, viewMode = 'standings' }) => {
  const [leagues, setLeagues] = useState<LeagueStandings[]>([])
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const { user } = useAuth()

  const fetchStandings = async () => {
    try {
      const response = await axios.get<LeagueStandings[]>(`${API_BASE}/standings`)
      setLeagues(response.data)
    } catch (err) {
      console.error('Failed to fetch standings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings()
  }, [])

  useEffect(() => {
    if (!event) return
    if (event.event === 'standings_update') {
      const standingsData = (event as any).standings
      if (Array.isArray(standingsData)) {
        setLeagues(standingsData)
      }
    }
    if (event.event === 'week_start') {
      fetchStandings()
    }
  }, [event])

  const isPowerRankings = viewMode === 'powerRankings'

  if (loading) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #334155' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#334155' }} />
            <div style={{ flex: 1, height: '14px', backgroundColor: '#334155', borderRadius: '4px' }} />
            <div style={{ width: '30px', height: '14px', backgroundColor: '#334155', borderRadius: '4px' }} />
            <div style={{ width: '30px', height: '14px', backgroundColor: '#334155', borderRadius: '4px' }} />
            <div style={{ width: '30px', height: '14px', backgroundColor: '#334155', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    )
  }

  // Power rankings: merge all leagues into one sorted table (only render once via leagueIndex 0)
  if (isPowerRankings) {
    if (leagueIndex !== 0) return null
    const allTeams = leagues.flatMap(l => l.standings).sort((a, b) => b.elo - a.elo)
    if (allTeams.length === 0) return null
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 48px 44px', padding: '6px 14px', borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>#</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Team</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>ELO</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>W-L</span>
        </div>
        {allTeams.map((team, index) => {
          const isFav = user?.favoriteTeamId === team.id
          const rowBg = isFav
            ? `rgba(${hexToRgb(team.color || '#3b82f6')}, ${index % 2 === 0 ? '0.10' : '0.14'})`
            : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
          return (
            <TeamHoverCard key={team.id} teamId={team.id}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr 48px 44px',
                alignItems: 'center',
                padding: '7px 14px',
                borderBottom: index < allTeams.length - 1 ? '1px solid #1e293b' : 'none',
                backgroundColor: rowBg,
              }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>
                <Link to={`/team/${team.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textDecoration: 'none' }}>
                  <img
                    src={`${API_BASE}/teams/${team.id}/avatar?size=24&v=2`}
                    alt={team.abbr}
                    style={{ width: '24px', height: '24px', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {team.city}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {team.name}
                      </div>
                    </div>
                    {team.floosbowlChampion && (
                      <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
                      </svg>
                    )}
                    {isFav && (
                      <svg viewBox="0 0 24 24" fill={team.color || '#3b82f6'} style={{ width: '11px', height: '11px', flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </Link>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(team.elo)}
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {team.wins}-{team.losses}
                </div>
              </div>
            </TeamHoverCard>
          )
        })}
      </div>
    )
  }

  const league = leagues[leagueIndex]
  if (!league) return null

  const displayTeams = league.standings

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {league.name}
        </span>
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 44px 44px', padding: '6px 14px', borderBottom: '1px solid #334155' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Team</span>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>ELO</span>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>W-L</span>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>PCT</span>
      </div>

      {displayTeams.map((team, index) => {
        const PLAYOFF_SPOTS = 6
        const isPlayoffCutline = index === PLAYOFF_SPOTS - 1
        const isFav = user?.favoriteTeamId === team.id
        const leftBorder = team.floosbowlChampion ? '3px solid #f59e0b'
          : team.clinchedTopSeed ? '3px solid #ca8a04'
          : team.clinchedPlayoffs ? '3px solid #16a34a'
          : isFav ? `3px solid ${team.color || '#3b82f6'}`
          : '3px solid transparent'
        const rowOpacity = team.eliminated ? 0.4 : 1
        const paddingLeft = (team.floosbowlChampion || team.clinchedTopSeed || team.clinchedPlayoffs || isFav) ? '11px' : '14px'
        const rowBg = isFav
          ? `rgba(${hexToRgb(team.color || '#3b82f6')}, ${index % 2 === 0 ? '0.10' : '0.14'})`
          : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'

        return (
        <TeamHoverCard key={team.id} teamId={team.id}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 48px 44px 44px',
            alignItems: 'center',
            padding: `7px 14px 7px ${paddingLeft}`,
            borderLeft: leftBorder,
            borderBottom: isPlayoffCutline
              ? '2px solid #334155'
              : index < displayTeams.length - 1 ? '1px solid #1e293b' : 'none',
            backgroundColor: rowBg,
            opacity: rowOpacity,
          }}
        >
          {/* Team info */}
          <Link to={`/team/${team.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textDecoration: 'none' }}>
            <img
              src={`${API_BASE}/teams/${team.id}/avatar?size=24&v=2`}
              alt={team.abbr}
              style={{ width: '24px', height: '24px', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team.city}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team.name}
                </div>
              </div>
              {team.floosbowlChampion && (
                <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
                </svg>
              )}
              {isFav && (
                <svg viewBox="0 0 24 24" fill={team.color || '#3b82f6'} style={{ width: '11px', height: '11px', flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </Link>

          {/* ELO */}
          <div style={{ fontSize: '13px', fontWeight: '400', color: '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(team.elo)}
          </div>

          {/* W-L */}
          <div style={{ fontSize: '13px', color: '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {team.wins}-{team.losses}
          </div>

          {/* PCT */}
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {team.winPerc.replace(/^0/, '')}
          </div>
        </div>
        </TeamHoverCard>
        )
      })}
    </div>
  )
}
