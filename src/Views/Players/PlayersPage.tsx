import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import { Stars } from '@/Components/Stars'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'] as const
type PositionFilter = typeof POSITIONS[number]

type StatusFilter = 'active' | 'prospects' | 'fa' | 'retired' | 'hof'
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'active',    label: 'Active' },
  { key: 'prospects', label: 'Prospects' },
  { key: 'fa',        label: 'Free Agents' },
  { key: 'retired',   label: 'Retired' },
  { key: 'hof',       label: 'Hall of Fame' },
]

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
  const [players, setPlayers]   = useState<PlayerListItem[]>([])
  const [status, setStatus]     = useState<StatusFilter>('active')
  const [position, setPosition] = useState<PositionFilter>('ALL')
  const [sortKey, setSortKey]   = useState<string>('fpt')
  const [sortAsc, setSortAsc]   = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ status })
    if (position !== 'ALL') params.set('position', position)
    fetch(`${API_BASE}/players?${params}`)
      .then(r => r.json())
      .then(json => { if (json.success && json.data) setPlayers(json.data) })
      .catch(err => console.error('Failed to fetch players:', err))
      .finally(() => setLoading(false))
  }, [status, position])

  // Reset sort to fantasy points when position changes
  const handlePositionChange = (pos: PositionFilter) => {
    setPosition(pos)
    setSortKey('fpt')
    setSortAsc(false)
  }

  const cols = COLS[position]

  const sorted = useMemo(() => {
    if (sortKey === '__rating') {
      return [...players].sort((a, b) => {
        const diff = a.playerRating - b.playerRating
        return sortAsc ? diff : -diff
      })
    }
    const col = cols.find(c => c.key === sortKey) ?? cols[cols.length - 1]
    return [...players].sort((a, b) => {
      const diff = col.sortValue(a) - col.sortValue(b)
      return sortAsc ? diff : -diff
    })
  }, [players, sortKey, sortAsc, cols])

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
    fontSize: '15px', color: '#cbd5e1', padding: '7px 10px',
    textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
    borderRight: '1px solid #1a2640',
  }
  const tdHighlight: React.CSSProperties = {
    ...tdStyle, color: '#e2e8f0', fontWeight: '700',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e293b', padding: '20px 24px',
        background: 'linear-gradient(135deg, #1e293b50 0%, #0f172a 55%)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#e2e8f0' }}>Player Stats</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Season statistics · click a column header to sort</div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px' }}>

        {/* Status tabs */}
        <div style={{
          display: 'flex', gap: '2px', marginBottom: '14px',
          backgroundColor: '#0f172a', borderRadius: '8px', padding: '3px', width: 'fit-content',
        }}>
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => { setStatus(tab.key); setPosition('ALL'); setSortKey('fpt'); setSortAsc(false) }}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: status === tab.key ? '#1e293b' : 'transparent',
                color: status === tab.key ? '#e2e8f0' : '#64748b',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Position tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
          {POSITIONS.map(pos => (
            <button key={pos} onClick={() => handlePositionChange(pos)}
              style={{
                padding: '7px 14px', fontSize: '12px', fontWeight: '600',
                color: position === pos ? '#e2e8f0' : '#64748b',
                backgroundColor: position === pos ? '#1e293b' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                borderBottom: position === pos ? '2px solid #3b82f6' : '2px solid transparent',
              }}>
              {pos}
            </button>
          ))}
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
                  {position === 'ALL' && (
                    <th style={{ ...thStyle('__pos'), textAlign: 'left', width: '40px' }}>Pos</th>
                  )}
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
                    <td colSpan={6 + cols.length} style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>Loading…</td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6 + cols.length} style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>No players found</td>
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
                            style={{ fontSize: '15px', color: '#e2e8f0', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap' }}>
                            {player.name}
                          </Link>
                        </PlayerHoverCard>
                        <div style={{ marginTop: '1px' }}>
                          <Stars stars={player.ratingStars} size={11} />
                        </div>
                      </td>

                      {/* Position (ALL view only) */}
                      {position === 'ALL' && (
                        <td style={{ ...tdStyle, textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>{player.position}</td>
                      )}

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

      </div>
    </div>
  )
}
