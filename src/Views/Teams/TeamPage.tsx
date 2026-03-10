import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import { Stars } from '@/Components/Stars'
import CoachAvatar from '@/Components/CoachAvatar'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  ratingStars: number
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

  const ratingBar = (value: number) => {
    const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    const pct = ((value - 60) / 40) * 100
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '5px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    )
  }

  const sectionHeader = (label: string) => (
    <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )

  const calcStars = (rating: number) => Math.min(5, Math.max(1, Math.floor((rating - 60) / 8) + 1))

  const coachAttrBar = (value: number) => {
    const color = value >= 85 ? '#22c55e' : value >= 72 ? '#f59e0b' : '#ef4444'
    const pct = value
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
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

        {/* Top row: Trophy Chest · Ratings · Roster */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>

          {/* Trophy Chest */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {sectionHeader('Trophy Chest')}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(team.floosbowlChampionships?.length ?? 0) > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const, marginBottom: '4px' }}>
                    {team.floosbowlChampionships.map((_: any, i: number) => (
                      <span key={i} style={{ fontSize: '18px' }}>🏆</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b' }}>Floos Bowl</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{team.floosbowlChampionships.length}× champion</div>
                </div>
              )}
              {(team.leagueChampionships?.length ?? 0) > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const, marginBottom: '4px' }}>
                    {team.leagueChampionships.map((_: any, i: number) => (
                      <span key={i} style={{ fontSize: '18px' }}>🥇</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }}>League Champ</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{team.leagueChampionships.length}× champion</div>
                </div>
              )}
              {!(team.floosbowlChampionships?.length) && !(team.leagueChampionships?.length) && (
                <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>No championships yet</div>
              )}
            </div>
          </div>

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
            <div>
              {ROSTER_SLOTS.map(([slot, posLabel], idx) => {
                const player = team.roster?.[slot]
                return (
                  <div key={slot} style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 32px',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderBottom: idx < ROSTER_SLOTS.length - 1 ? '1px solid #1a2640' : 'none',
                  }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{posLabel}</span>
                    {player ? (
                      <>
                        <div style={{ minWidth: 0 }}>
                          <PlayerHoverCard playerId={player.id} playerName={player.name}>
                            <Link
                              to={`/players/${player.id}`}
                              style={{ fontSize: '13px', color: '#e2e8f0', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                            >
                              {player.name}
                            </Link>
                          </PlayerHoverCard>
                          <div style={{ marginTop: '1px' }}>
                            <Stars stars={player.ratingStars} size={11} />
                          </div>
                        </div>
                        <span style={{
                          fontSize: '12px', fontWeight: '700', color: '#e2e8f0',
                          backgroundColor: '#0f172a', border: '1px solid #334155',
                          borderRadius: '4px', padding: '1px 5px',
                          textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                          justifySelf: 'end'
                        }}>{player.rating}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#475569', gridColumn: '2 / 4' }}>—</span>
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
                <CoachAvatar name={team.coach.name} size={isMobile ? 80 : 120} style={{ border: `3px solid ${team.color}` }} />
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
