import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import { Stars } from '@/Components/Stars'
import { useAuth } from '@/contexts/AuthContext'
import ArchetypeBadge from '@/Components/ArchetypeBadge'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'] as const
type PositionFilter = typeof POSITIONS[number]

type StatusFilter = 'active' | 'prospects' | 'fa' | 'retired' | 'followed'
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'active',    label: 'Active' },
  { key: 'prospects', label: 'Prospects' },
  { key: 'fa',        label: 'Free Agents' },
  { key: 'retired',   label: 'Retired' },
  { key: 'followed',  label: 'Followed' },
]

// Outlined pill, matching the card-collection view/filter pills for consistency.
const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px',
  borderRadius: '6px',
  border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
  backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
  color: active ? '#60a5fa' : '#94a3b8',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'pressStart',
  textTransform: 'capitalize' as const,
})

interface CurrentStats {
  fantasyPoints: number
  gamesPlayed: number
  passing:   { comp: number; att: number; compPerc: number; yards: number; tds: number; ints: number; ypc: number }
  rushing:   { carries: number; yards: number; ypc: number; tds: number; fumblesLost: number }
  receiving: { receptions: number; targets: number; rcvPerc: number; yards: number; ypr: number; tds: number }
  kicking:   { fgs: number; fgAtt: number; fgPerc: number }
}

interface PlayerListItem {
  id: number
  name: string
  position: string
  team: string | null
  teamCity: string | null
  teamColor: string | null
  teamId: number | null
  teamAbbr: string | null
  isProspect?: boolean
  draftingTeamId?: number | null
  draftingTeamAbbr?: string | null
  draftingTeamColor?: string | null
  ratingStars: number
  playerRating: number
  archetype?: string | null
  currentStats: CurrentStats
}

// ── Column definitions ──────────────────────────────────────────────────────

type ColDef = {
  key: string
  label: string
  getValue: (p: PlayerListItem) => number | string
  sortValue: (p: PlayerListItem) => number
  format?: (v: number | string) => string
}

const FPT_COL: ColDef = {
  key: 'fpt', label: 'Pts',
  getValue: p => p.currentStats.fantasyPoints,
  sortValue: p => p.currentStats.fantasyPoints,
  format: v => Number(v).toFixed(1),
}

const COLS: Record<PositionFilter, ColDef[]> = {
  ALL: [
    FPT_COL,
  ],
  QB: [
    { key: 'comp',  label: 'Comp',  getValue: p => p.currentStats.passing.comp,    sortValue: p => p.currentStats.passing.comp },
    { key: 'att',   label: 'Att',   getValue: p => p.currentStats.passing.att,     sortValue: p => p.currentStats.passing.att },
    { key: 'cpct',  label: 'Cmp%',  getValue: p => p.currentStats.passing.compPerc, sortValue: p => p.currentStats.passing.compPerc, format: v => `${v}%` },
    { key: 'pyds',  label: 'Yds',   getValue: p => p.currentStats.passing.yards,   sortValue: p => p.currentStats.passing.yards },
    { key: 'ptds',  label: 'TDs',   getValue: p => p.currentStats.passing.tds,     sortValue: p => p.currentStats.passing.tds },
    { key: 'ints',  label: 'INTs',  getValue: p => p.currentStats.passing.ints,    sortValue: p => p.currentStats.passing.ints },
    FPT_COL,
  ],
  RB: [
    { key: 'carr',  label: 'Carr',   getValue: p => p.currentStats.rushing.carries,    sortValue: p => p.currentStats.rushing.carries },
    { key: 'ryds',  label: 'Yds',    getValue: p => p.currentStats.rushing.yards,      sortValue: p => p.currentStats.rushing.yards },
    { key: 'rypc',  label: 'YPC',    getValue: p => p.currentStats.rushing.ypc,        sortValue: p => p.currentStats.rushing.ypc },
    { key: 'rtds',  label: 'TDs',    getValue: p => p.currentStats.rushing.tds,        sortValue: p => p.currentStats.rushing.tds },
    { key: 'fum',   label: 'FUM',    getValue: p => p.currentStats.rushing.fumblesLost, sortValue: p => p.currentStats.rushing.fumblesLost },
    FPT_COL,
  ],
  WR: [
    { key: 'rec',   label: 'Rec',   getValue: p => p.currentStats.receiving.receptions, sortValue: p => p.currentStats.receiving.receptions },
    { key: 'tgt',   label: 'Tgt',   getValue: p => p.currentStats.receiving.targets,    sortValue: p => p.currentStats.receiving.targets },
    { key: 'rpct',  label: 'Rcv%',  getValue: p => p.currentStats.receiving.rcvPerc,   sortValue: p => p.currentStats.receiving.rcvPerc, format: v => `${v}%` },
    { key: 'ryds',  label: 'Yds',   getValue: p => p.currentStats.receiving.yards,      sortValue: p => p.currentStats.receiving.yards },
    { key: 'ypr',   label: 'YPR',   getValue: p => p.currentStats.receiving.ypr,        sortValue: p => p.currentStats.receiving.ypr },
    { key: 'rtds',  label: 'TDs',   getValue: p => p.currentStats.receiving.tds,        sortValue: p => p.currentStats.receiving.tds },
    FPT_COL,
  ],
  TE: [
    { key: 'rec',   label: 'Rec',   getValue: p => p.currentStats.receiving.receptions, sortValue: p => p.currentStats.receiving.receptions },
    { key: 'tgt',   label: 'Tgt',   getValue: p => p.currentStats.receiving.targets,    sortValue: p => p.currentStats.receiving.targets },
    { key: 'rpct',  label: 'Rcv%',  getValue: p => p.currentStats.receiving.rcvPerc,   sortValue: p => p.currentStats.receiving.rcvPerc, format: v => `${v}%` },
    { key: 'ryds',  label: 'Yds',   getValue: p => p.currentStats.receiving.yards,      sortValue: p => p.currentStats.receiving.yards },
    { key: 'ypr',   label: 'YPR',   getValue: p => p.currentStats.receiving.ypr,        sortValue: p => p.currentStats.receiving.ypr },
    { key: 'rtds',  label: 'TDs',   getValue: p => p.currentStats.receiving.tds,        sortValue: p => p.currentStats.receiving.tds },
    FPT_COL,
  ],
  K: [
    { key: 'fgs',   label: 'FGs',  getValue: p => p.currentStats.kicking.fgs,    sortValue: p => p.currentStats.kicking.fgs },
    { key: 'fgatt', label: 'Att',  getValue: p => p.currentStats.kicking.fgAtt,  sortValue: p => p.currentStats.kicking.fgAtt },
    { key: 'fgpct', label: 'FG%',  getValue: p => p.currentStats.kicking.fgPerc, sortValue: p => p.currentStats.kicking.fgPerc, format: v => `${v}%` },
    FPT_COL,
  ],
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const { getToken, followedPlayerIds } = useAuth()
  const [players, setPlayers]   = useState<PlayerListItem[]>([])
  const [status, setStatus]     = useState<StatusFilter>('active')
  const [position, setPosition] = useState<PositionFilter>('ALL')
  const [sortKey, setSortKey]   = useState<string>('fpt')
  const [sortAsc, setSortAsc]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    setLoading(true)
    let cancelled = false
    const run = async () => {
      const params = new URLSearchParams({ status })
      if (position !== 'ALL') params.set('position', position)
      const headers: Record<string, string> = {}
      if (status === 'followed') {
        const tok = await getToken()
        if (tok) headers.Authorization = `Bearer ${tok}`
      }
      try {
        const r = await fetch(`${API_BASE}/players?${params}`, { headers })
        const json = await r.json()
        if (cancelled) return
        if (json.success && json.data) setPlayers(json.data)
      } catch (err) {
        console.error('Failed to fetch players:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // followedPlayerIds.size triggers a refetch when the user follows/unfollows
    // while sitting on the Followed tab.
  }, [status, position, getToken, followedPlayerIds.size])

  // Reset sort to fantasy points when position changes
  const handlePositionChange = (pos: PositionFilter) => {
    setPosition(pos)
    setSortKey('fpt')
    setSortAsc(false)
  }

  const cols = COLS[position]

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q ? players.filter(p => p.name.toLowerCase().includes(q)) : players
    if (sortKey === '__rating') {
      return [...base].sort((a, b) => {
        const diff = a.playerRating - b.playerRating
        return sortAsc ? diff : -diff
      })
    }
    const col = cols.find(c => c.key === sortKey) ?? cols[cols.length - 1]
    return [...base].sort((a, b) => {
      const diff = col.sortValue(a) - col.sortValue(b)
      return sortAsc ? diff : -diff
    })
  }, [players, sortKey, sortAsc, cols, search])

  const handleSort = (key: string) => {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  // Shared styles
  const thStyle = (key: string): React.CSSProperties => ({
    fontSize: '13px', fontWeight: '600', color: key === sortKey ? '#e2e8f0' : '#64748b',
    padding: '7px 10px', textAlign: 'right' as const, whiteSpace: 'nowrap' as const,
    cursor: 'pointer', userSelect: 'none' as const,
    borderBottom: '1px solid #334155', backgroundColor: '#0f172a',
    borderRight: '1px solid #1a2640',
  })
  const tdStyle: React.CSSProperties = {
    fontSize: '14px', color: '#cbd5e1', padding: '7px 10px',
    textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
    borderRight: '1px solid #1a2640',
  }
  const tdHighlight: React.CSSProperties = {
    ...tdStyle, color: '#e2e8f0', fontWeight: '700',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px' }}>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => { setStatus(tab.key); setPosition('ALL'); setSortKey('fpt'); setSortAsc(false) }}
              style={pillStyle(status === tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {(<>

        {/* Position tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {POSITIONS.map(pos => (
            <button key={pos} onClick={() => handlePositionChange(pos)}
              style={pillStyle(position === pos)}>
              {pos}
            </button>
          ))}
        </div>

        {/* Search by name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 1 280px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="7" stroke="#64748b" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search player by name"
              style={{
                width: '100%', padding: '8px 28px 8px 32px', fontSize: '13px',
                backgroundColor: '#0f172a', color: '#e2e8f0',
                border: '1px solid #334155', borderRadius: '8px', outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                  fontSize: '16px', lineHeight: 1, padding: '0 4px',
                }}
              >x</button>
            )}
          </div>
          {search.trim() && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {sorted.length} {sorted.length === 1 ? 'player' : 'players'}
            </span>
          )}
        </div>

        {/* Stats table */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: 'auto', minWidth: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {/* Fixed left columns */}
                  <th style={{ ...thStyle('__rank'), textAlign: 'right', width: '32px' }}>#</th>
                  <th style={{ ...thStyle('__name'), textAlign: 'left', width: '200px' }}>Name</th>
                  <th style={{ ...thStyle('__team'), textAlign: 'left', width: '60px' }}>Team</th>
                  <th style={{ ...thStyle('__rating'), textAlign: 'right', width: '80px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('__rating')}>
                    Rating{sortKey === '__rating' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </th>
                  {/* Stat columns */}
                  {cols.map(col => (
                    <th key={col.key} style={thStyle(col.key)} onClick={() => handleSort(col.key)}>
                      {col.label}{sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4 + cols.length} style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>Loading…</td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={4 + cols.length} style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>No players found</td>
                  </tr>
                ) : (
                  sorted.map((player, idx) => (
                    <tr key={player.id} style={{
                      borderBottom: idx < sorted.length - 1 ? '1px solid #1a2640' : 'none',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    }}>
                      {/* Rank */}
                      <td style={{ ...tdStyle, color: '#475569', textAlign: 'right' }}>{idx + 1}</td>

                      {/* Name */}
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #1a2640' }}>
                        <PlayerHoverCard playerId={player.id} playerName={player.name}>
                          <Link to={`/players/${player.id}`}
                            style={{ fontSize: '14px', color: '#e2e8f0', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap' }}>
                            {player.name}
                          </Link>
                        </PlayerHoverCard>
                        <div style={{ marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {position === 'ALL' && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{player.position}</span>
                          )}
                          <Stars stars={player.ratingStars} size={11} />
                          <ArchetypeBadge archetype={player.archetype} size={13} />
                        </div>
                      </td>

                      {/* Team */}
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #1a2640' }}>
                        {player.teamId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <img src={`/avatars/${player.teamId}.png`} alt=""
                              style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                            <Link to={`/team/${player.teamId}`}
                              style={{ fontSize: '14px', color: player.teamColor || '#94a3b8', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              {player.teamAbbr}
                            </Link>
                          </div>
                        ) : player.isProspect && player.draftingTeamId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Prospect">
                            <img src={`/avatars/${player.draftingTeamId}.png`} alt=""
                              style={{ width: '18px', height: '18px', flexShrink: 0, opacity: 0.75 }} />
                            <Link to={`/team/${player.draftingTeamId}`}
                              style={{ fontSize: '14px', color: player.draftingTeamColor || '#a78bfa', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap', fontStyle: 'italic' as const }}>
                              {player.draftingTeamAbbr}*
                            </Link>
                          </div>
                        ) : (
                          <span style={{ fontSize: '14px', color: '#475569' }}>FA</span>
                        )}
                      </td>

                      {/* Stars + rating */}
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #1a2640', textAlign: 'right' }}>
                        <span style={{
                          fontSize: '14px', fontWeight: '700', color: '#e2e8f0',
                          backgroundColor: '#0f172a', border: '1px solid #334155',
                          borderRadius: '4px', padding: '1px 5px', fontVariantNumeric: 'tabular-nums',
                        }}>
                          {player.playerRating}
                        </span>
                      </td>

                      {/* Stat columns */}
                      {cols.map(col => {
                        const val = col.getValue(player)
                        const displayed = col.format ? col.format(val) : String(val)
                        const isSort = col.key === sortKey
                        return (
                          <td key={col.key} style={isSort ? tdHighlight : tdStyle}>{displayed}</td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && sorted.length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>
            {sorted.length} player{sorted.length !== 1 ? 's' : ''}
          </div>
        )}

        </>)}

      </div>
    </div>
  )
}
