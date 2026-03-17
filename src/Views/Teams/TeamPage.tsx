import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import PlayerAvatar from '@/Components/PlayerAvatar'
import { Stars } from '@/Components/Stars'
import CoachAvatar from '@/Components/CoachAvatar'
import FrontOfficePanel from '@/Components/FrontOffice/FrontOfficePanel'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  ratingStars: number
  termRemaining?: number
}

interface ScheduleEntry {
  gameId: number
  isHome: boolean
  week: number | null
  opponent: { id: number; name: string; city: string; abbr: string }
  teamScore: number
  oppScore: number
  status: string
  result: string | null
}

interface Coach {
  name: string
  overallRating: number
  offensiveMind: number
  defensiveMind: number
  adaptability: number
  aggressiveness: number
  clockManagement: number
  playerDevelopment: number
  seasonsCoached: number
}

interface TeamData {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string
  league: string
  elo: number
  wins: number
  losses: number
  winPerc: string
  overallRating: number
  offenseRating: number
  defenseRunCoverageRating: number
  defensePassCoverageRating: number
  clinchedPlayoffs: boolean
  clinchedTopSeed: boolean
  floosbowlChampion: boolean
  eliminated: boolean
  leagueChampionships: any[]
  floosbowlChampionships: any[]
  roster: Record<string, RosterPlayer | null>
  schedule: ScheduleEntry[]
  history: any[]
  coach: Coach | null
}

const ROSTER_SLOTS: [string, string][] = [
  ['qb', 'QB'], ['rb', 'RB'], ['wr1', 'WR1'], ['wr2', 'WR2'], ['te', 'TE'], ['k', 'K']
]

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${API_BASE}/teams/${id}`)
      .then(r => r.json())
      .then(json => { if (json.success && json.data) setTeam(json.data) })
      .catch(err => console.error('Failed to fetch team:', err))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#0f172a', minHeight: '100vh' }}>Loading…</div>
  }
  if (!team) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#0f172a', minHeight: '100vh' }}>Team not found</div>
  }

  const sectionHeader = (label: string) => (
    <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )

  const calcStars = (rating: number) => Math.min(5, Math.max(1, Math.floor((rating - 60) / 8) + 1))

  const ratingBar = (value: number) => {
    const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '5px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${value}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    )
  }

  const coachAttrBar = (value: number) => {
    const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${value}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${team.color}50 0%, #0f172a 55%)`,
        borderBottom: '1px solid #1e293b',
        padding: isMobile ? '20px 16px' : '28px 24px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '14px' : '20px' }}>
          <img
            src={`${API_BASE}/teams/${team.id}/avatar?size=${isMobile ? 56 : 80}&v=2`}
            alt={team.name}
            style={{ width: isMobile ? '56px' : '80px', height: isMobile ? '56px' : '80px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#94a3b8' }}>{team.league} · {team.city}</div>
            <div style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{team.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: '15px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{team.wins}–{team.losses}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>·</span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>ELO {Math.round(team.elo)}</span>
              {(team.floosbowlChampionships?.length ?? 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  {team.floosbowlChampionships.length}
                </span>
              )}
              {(team.leagueChampionships?.length ?? 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#ca8a04' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                  {team.leagueChampionships.length}
                </span>
              )}
              {team.floosbowlChampion && (
                <span style={{ backgroundColor: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>CHAMPION</span>
              )}
              {team.clinchedTopSeed && !team.floosbowlChampion && (
                <span style={{ backgroundColor: '#ca8a04', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>TOP SEED</span>
              )}
              {team.clinchedPlayoffs && !team.clinchedTopSeed && !team.floosbowlChampion && (
                <span style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>PLAYOFFS</span>
              )}
              {team.eliminated && (
                <span style={{ backgroundColor: '#374151', color: '#6b7280', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>ELIMINATED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>

        {/* Ratings · Roster side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

          {/* Ratings */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Ratings')}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Overall', value: team.overallRating },
                { label: 'Offense', value: team.offenseRating },
                { label: 'Run Defense', value: team.defenseRunCoverageRating },
                { label: 'Pass Defense', value: team.defensePassCoverageRating },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
                  {ratingBar(value)}
                </div>
              ))}
            </div>
          </div>

          {/* Roster */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Roster')}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ROSTER_SLOTS.map(([slot, posLabel]) => {
                const player = team.roster?.[slot]
                return (
                  <div key={slot} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#0f172a',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', minWidth: '28px' }}>{posLabel}</span>
                    {player ? (
                      <>
                        <PlayerAvatar name={player.name} size={32} bgColor={team.color} />
                        <PlayerHoverCard playerId={player.id} playerName={player.name}>
                          <Link
                            to={`/players/${player.id}`}
                            style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {player.name}
                          </Link>
                        </PlayerHoverCard>
                        <Stars stars={player.ratingStars} size={12} />
                        <span style={{ flex: 1 }} />
                        {player.termRemaining != null && (
                          <span style={{
                            fontSize: '11px',
                            color: player.termRemaining === 1 ? '#f59e0b' : '#94a3b8',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}>
                            {player.termRemaining} season{player.termRemaining !== 1 ? 's' : ''} remaining
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#475569' }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Head Coach */}
        {team.coach && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            {sectionHeader('Head Coach')}
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: isMobile ? '16px' : '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CoachAvatar name={team.coach.name} size={isMobile ? 80 : 120} bgColor={team.color} style={{ border: `3px solid ${team.color}` }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>{team.coach.name}</div>
                  <Stars stars={calcStars(team.coach.overallRating)} size={13} />
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                    {team.coach.seasonsCoached} season{team.coach.seasonsCoached !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {([
                  ['Offensive Mind', team.coach.offensiveMind],
                  ['Defensive Mind', team.coach.defensiveMind],
                  ['Adaptability', team.coach.adaptability],
                  ['Aggressiveness', team.coach.aggressiveness],
                  ['Clock Mgmt', team.coach.clockManagement],
                  ['Player Dev', team.coach.playerDevelopment],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>{label}</div>
                    {coachAttrBar(val)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* The Front Office — GM voting panel (favorite team only) */}
        {user?.favoriteTeamId === team.id && (
          <FrontOfficePanel teamId={team.id} teamColor={team.color} />
        )}

        {/* Schedule + Season History side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (team.history?.length ?? 0) > 0 ? '3fr 2fr' : '1fr', gap: '16px', alignItems: 'start' }}>

          {/* Schedule */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Schedule')}
            <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 28px 1fr 44px 80px', gap: '8px', padding: '6px 14px', borderBottom: '1px solid #334155', minWidth: isMobile ? '400px' : undefined }}>
              {['WK', '', 'OPPONENT', 'RESULT', 'SCORE'].map((h, i) => (
                <span key={i} style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textAlign: i >= 3 ? 'right' as const : 'left' as const }}>{h}</span>
              ))}
            </div>
            {team.schedule.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No schedule available</div>
            )}
            {team.schedule.map((game, idx) => {
              const resultColor = game.result === 'W' ? '#22c55e' : game.result === 'L' ? '#ef4444' : '#94a3b8'
              const weekNum = game.week != null ? game.week + 1 : idx + 1
              return (
                <div key={game.gameId} style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 28px 1fr 44px 80px',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '7px 14px',
                  borderBottom: idx < team.schedule.length - 1 ? '1px solid #1a2640' : 'none',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  minWidth: isMobile ? '400px' : undefined,
                }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{weekNum}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{game.isHome ? 'vs' : '@'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <img
                      src={`${API_BASE}/teams/${game.opponent.id}/avatar?size=20&v=2`}
                      alt={game.opponent.abbr}
                      style={{ width: '20px', height: '20px', flexShrink: 0 }}
                    />
                    <Link
                      to={`/team/${game.opponent.id}`}
                      style={{ fontSize: '13px', color: '#cbd5e1', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {game.opponent.city} {game.opponent.name}
                    </Link>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {game.result ? (
                      <span style={{ fontSize: '13px', fontWeight: '700', color: resultColor }}>{game.result}</span>
                    ) : game.status === 'Active' ? (
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>LIVE</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>—</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {game.status !== 'Scheduled' ? `${game.teamScore}–${game.oppScore}` : '—'}
                  </div>
                </div>
              )
            })}
            </div>
          </div>

          {/* Season History */}
          {(team.history?.length ?? 0) > 0 && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
              {sectionHeader('Season History')}
              <div style={{ display: 'grid', gridTemplateColumns: '56px 56px 60px 1fr', gap: '8px', padding: '6px 14px', borderBottom: '1px solid #334155' }}>
                {['Season', 'W–L', 'Pts/G', 'Result'].map((h, i) => (
                  <span key={i} style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{h}</span>
                ))}
              </div>
              {team.history.map((s: any, idx: number) => {
                const result = s.floosbowlChamp ? 'Floos Bowl 🏆'
                  : s.leagueChamp ? 'League Champ 🥇'
                  : s.madePlayoffs ? 'Playoffs'
                  : '—'
                const resultColor = s.floosbowlChamp ? '#f59e0b' : s.leagueChamp ? '#ca8a04' : s.madePlayoffs ? '#94a3b8' : '#64748b'
                return (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 56px 60px 1fr',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '7px 14px',
                    borderBottom: idx < team.history.length - 1 ? '1px solid #1a2640' : 'none',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>S{s.season}</span>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{s.wins}–{s.losses}</span>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{s.Offense?.avgPts?.toFixed(1) ?? '—'}</span>
                    <span style={{ fontSize: '13px', color: resultColor }}>{result}</span>
                  </div>
                )
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
