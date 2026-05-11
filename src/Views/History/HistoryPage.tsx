import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type ViewMode = 'seasons' | 'records'

interface SeasonSummary {
  seasonNumber: number
  championTeamId: number | null
  championTeamName: string | null
  championTeamAbbr: string | null
  championTeamColor: string | null
  mvpPlayerId: number | null
  mvpPlayerName: string | null
  mvpPosition: string | null
}

interface StandingsTeam {
  teamId: number
  teamName: string
  teamAbbr: string
  teamColor: string | null
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  winPct: number
}

interface RecordEntry {
  playerId: number
  playerName: string
  teamAbbr?: string | null
  value: number
  season?: number
  week?: number
  seasons?: number
}

interface RecordsResponse {
  records: {
    game: Record<string, RecordEntry[]>
    season: Record<string, RecordEntry[]>
    career: Record<string, RecordEntry[]>
  }
  labels: Record<string, string>
}

const HistoryPage: React.FC = () => {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<ViewMode>('seasons')

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '14px' : '20px 24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0' }}>History</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
          Past champions, season standings, and the all-time record book
        </div>
      </div>

      <div style={{
        display: 'flex', gap: '2px', marginBottom: '14px',
        backgroundColor: '#0f172a', borderRadius: '8px', padding: '3px',
        width: 'fit-content',
      }}>
        {(['seasons', 'records'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 600,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              backgroundColor: mode === m ? '#1e293b' : 'transparent',
              color: mode === m ? '#e2e8f0' : '#64748b',
              fontFamily: 'inherit',
            }}
          >
            {m === 'seasons' ? 'Seasons' : 'Record Book'}
          </button>
        ))}
      </div>

      {mode === 'seasons' ? <SeasonsView isMobile={isMobile} /> : <RecordsView isMobile={isMobile} />}
    </div>
  )
}

// ─── Seasons view ──────────────────────────────────────────────────────────

const SeasonsView: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [standings, setStandings] = useState<StandingsTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStandings, setLoadingStandings] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/history/seasons`)
      .then(r => r.json())
      .then(j => {
        const list: SeasonSummary[] = j?.data?.seasons || j?.seasons || []
        setSeasons(list)
        if (list.length > 0 && selectedSeason == null) setSelectedSeason(list[0].seasonNumber)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedSeason == null) return
    setLoadingStandings(true)
    fetch(`${API_BASE}/history/standings?season=${selectedSeason}`)
      .then(r => r.json())
      .then(j => setStandings(j?.data?.teams || j?.teams || []))
      .finally(() => setLoadingStandings(false))
  }, [selectedSeason])

  if (loading) return <div style={{ color: '#94a3b8', padding: '20px' }}>Loading…</div>
  if (seasons.length === 0) {
    return (
      <div style={{ color: '#94a3b8', padding: '40px 20px', textAlign: 'center', fontStyle: 'italic' }}>
        No completed seasons yet.
      </div>
    )
  }

  const selected = seasons.find(s => s.seasonNumber === selectedSeason) ?? null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
      gap: isMobile ? '16px' : '20px', alignItems: 'flex-start',
    }}>
      {/* Season picker */}
      <div style={{
        backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{
          padding: '10px 14px', fontSize: '11px', fontWeight: 700,
          color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em',
          borderBottom: '1px solid #334155',
        }}>
          Seasons
        </div>
        <div style={{ maxHeight: isMobile ? '200px' : '400px', overflowY: 'auto' }}>
          {seasons.map(s => {
            const active = s.seasonNumber === selectedSeason
            return (
              <button
                key={s.seasonNumber}
                onClick={() => setSelectedSeason(s.seasonNumber)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px',
                  backgroundColor: active ? '#0f172a' : 'transparent',
                  border: 'none', borderLeft: active ? '3px solid #f59e0b' : '3px solid transparent',
                  color: active ? '#f1f5f9' : '#cbd5e1',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  fontSize: '13px', fontWeight: active ? 700 : 500,
                }}
              >
                <span>Season {s.seasonNumber}</span>
                {s.championTeamAbbr && (
                  <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>
                    {s.championTeamAbbr}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div>
        {selected && (
          <div style={{
            backgroundColor: '#1e293b', borderRadius: '8px',
            border: '1px solid #334155', padding: '14px 16px', marginBottom: '14px',
            display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Floosbowl Champion
              </div>
              {selected.championTeamId ? (
                <Link
                  to={`/team/${selected.championTeamId}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    marginTop: '4px', textDecoration: 'none',
                  }}
                >
                  <img
                    src={`/avatars/${selected.championTeamId}.png`}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '4px' }}
                  />
                  <span style={{
                    fontSize: '16px', fontWeight: 700,
                    color: selected.championTeamColor ?? '#fbbf24',
                  }}>
                    {selected.championTeamName}
                  </span>
                </Link>
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>—</div>
              )}
            </div>
            {selected.mvpPlayerId && (
              <div style={{ borderLeft: '1px solid #334155', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  MVP
                </div>
                <Link
                  to={`/players/${selected.mvpPlayerId}`}
                  style={{
                    display: 'inline-flex', gap: '6px', marginTop: '4px',
                    textDecoration: 'none', color: '#e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{selected.mvpPlayerName}</span>
                  {selected.mvpPosition && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', alignSelf: 'flex-end', marginBottom: '2px' }}>
                      {selected.mvpPosition}
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Standings table */}
        <div style={{
          backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden',
          border: '1px solid #334155',
        }}>
          <div style={{
            padding: '10px 14px', fontSize: '11px', fontWeight: 700,
            color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: '1px solid #334155',
          }}>
            Final Standings
          </div>
          {loadingStandings ? (
            <div style={{ padding: '20px', color: '#94a3b8' }}>Loading…</div>
          ) : standings.length === 0 ? (
            <div style={{ padding: '20px', color: '#94a3b8', fontStyle: 'italic' }}>
              No standings data for this season.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Team</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>W</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>L</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>T</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>PF</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>PA</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(t => (
                  <tr key={t.teamId} style={{ borderTop: '1px solid #2a3a4e' }}>
                    <td style={{ padding: '8px 10px', fontSize: '13px' }}>
                      <Link
                        to={`/team/${t.teamId}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          color: '#e2e8f0', textDecoration: 'none',
                        }}
                      >
                        <img src={`/avatars/${t.teamId}.png`} alt="" style={{ width: 18, height: 18, borderRadius: '3px' }} />
                        {t.teamName}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.wins}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.losses}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: t.ties ? '#cbd5e1' : '#475569' }}>{t.ties}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.pointsFor}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>{t.pointsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Record book view ──────────────────────────────────────────────────────

type RecordTab = 'game' | 'season' | 'career'

const RecordsView: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const [data, setData] = useState<RecordsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<RecordTab>('career')

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/history/records`)
      .then(r => r.json())
      .then(j => setData(j?.data || j))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    if (!data) return [] as string[]
    return Object.keys(data.records[tab]).filter(k => (data.records[tab][k] ?? []).length > 0)
  }, [data, tab])

  if (loading) return <div style={{ color: '#94a3b8', padding: '20px' }}>Loading…</div>
  if (!data) return <div style={{ color: '#94a3b8', padding: '20px' }}>No records yet.</div>

  return (
    <div>
      <div style={{
        display: 'flex', gap: '2px', marginBottom: '14px',
        backgroundColor: '#0f172a', borderRadius: '8px', padding: '3px',
        width: 'fit-content',
      }}>
        {(['career', 'season', 'game'] as RecordTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: 600,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              backgroundColor: tab === t ? '#1e293b' : 'transparent',
              color: tab === t ? '#e2e8f0' : '#64748b',
              fontFamily: 'inherit',
            }}
          >
            {t === 'career' ? 'Career' : t === 'season' ? 'Single Season' : 'Single Game'}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '14px',
      }}>
        {categories.map(cat => {
          const entries = data.records[tab][cat]
          const label = data.labels[cat] ?? cat
          return (
            <div
              key={cat}
              style={{
                backgroundColor: '#1e293b', borderRadius: '8px',
                border: '1px solid #334155', overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '8px 12px', fontSize: '11px', fontWeight: 700,
                color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid #334155',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{label}</span>
              </div>
              <div>
                {entries.slice(0, 10).map((e, idx) => (
                  <div
                    key={`${e.playerId}-${idx}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '5px 12px', fontSize: '12px',
                      borderTop: idx > 0 ? '1px solid #2a3a4e' : 'none',
                    }}
                  >
                    <span style={{
                      width: '18px', textAlign: 'right',
                      fontWeight: 700, color: idx === 0 ? '#f59e0b' : '#64748b',
                    }}>
                      {idx + 1}
                    </span>
                    <Link
                      to={`/players/${e.playerId}`}
                      style={{ flex: 1, minWidth: 0, color: '#e2e8f0', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {e.playerName}
                    </Link>
                    <span style={{
                      fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums',
                    }}>
                      {e.value.toLocaleString()}
                    </span>
                    {tab === 'game' && e.season != null && e.week != null && (
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        S{e.season} W{e.week}
                      </span>
                    )}
                    {tab === 'season' && e.season != null && (
                      <span style={{ fontSize: '10px', color: '#64748b' }}>S{e.season}</span>
                    )}
                    {tab === 'career' && e.seasons != null && (
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{e.seasons}yr</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HistoryPage
