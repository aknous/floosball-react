import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import PlayerHoverCard from './PlayerHoverCard'
import { Stars } from './Stars'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'] as const
type Position = typeof POSITIONS[number]

const CATEGORIES: Record<Position, { key: string; label: string }[]> = {
  ALL: [{ key: 'fantasy_points', label: 'Fantasy Pts' }],
  QB:  [
    { key: 'fantasy_points',  label: 'Fantasy Pts' },
    { key: 'passing_yards',   label: 'Pass Yds' },
    { key: 'passing_tds',     label: 'Pass TDs' },
  ],
  RB:  [
    { key: 'fantasy_points',  label: 'Fantasy Pts' },
    { key: 'rushing_yards',   label: 'Rush Yds' },
    { key: 'rushing_tds',     label: 'Rush TDs' },
    { key: 'receiving_yards', label: 'Rec Yds' },
  ],
  WR:  [
    { key: 'fantasy_points',  label: 'Fantasy Pts' },
    { key: 'receiving_yards', label: 'Rec Yds' },
    { key: 'receiving_tds',   label: 'Rec TDs' },
    { key: 'receptions',      label: 'Receptions' },
  ],
  TE:  [
    { key: 'fantasy_points',  label: 'Fantasy Pts' },
    { key: 'receiving_yards', label: 'Rec Yds' },
    { key: 'receiving_tds',   label: 'Rec TDs' },
    { key: 'receptions',      label: 'Receptions' },
  ],
  K:   [
    { key: 'fantasy_points', label: 'Fantasy Pts' },
    { key: 'fg_made',        label: 'FG Made' },
    { key: 'fg_pct',         label: 'FG %' },
  ],
}

interface Leader {
  rank: number
  id: number
  name: string
  position: string
  teamAbbr: string
  teamColor: string
  teamId: number
  ratingStars: number
  gamesPlayed: number
  statValue: number
}

const formatStat = (value: number, category: string): string => {
  if (category === 'fantasy_points') return value.toFixed(1)
  if (category === 'fg_pct') return `${value.toFixed(1)}%`
  return String(value)
}

export const PlayerLeaders: React.FC = () => {
  const [position, setPosition] = useState<Position>('ALL')
  const [category, setCategory] = useState('fantasy_points')
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const positionRef = useRef(position)
  const categoryRef = useRef(category)
  positionRef.current = position
  categoryRef.current = category

  const fetch_ = useCallback(async (pos: Position, cat: string) => {
    try {
      const r = await fetch(`${API_BASE}/stats/leaders?position=${pos}&category=${cat}&limit=10`)
      const json = await r.json()
      if (json.success) setLeaders(json.data.leaders)
    } catch (e) {
      console.error('Failed to fetch leaders:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch_(position, category)
  }, [position, category, fetch_])

  // Refresh from WebSocket events
  useEffect(() => {
    if (!event) return
    const evt = event as any
    if (evt.event === 'game_end') {
      // Immediate refresh when a game finishes
      if (debounceRef.current) clearTimeout(debounceRef.current)
      fetch_(positionRef.current, categoryRef.current)
    } else if (evt.event === 'game_state') {
      // Debounced refresh during live play (3s cooldown)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetch_(positionRef.current, categoryRef.current)
      }, 3000)
    }
  }, [event, fetch_])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handlePositionChange = (pos: Position) => {
    setPosition(pos)
    setCategory(CATEGORIES[pos][0].key)
  }

  const cats = CATEGORIES[position]
  const currentCatLabel = cats.find(c => c.key === category)?.label ?? ''

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>

      {/* Position tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => handlePositionChange(pos)}
            style={{
              flex: 1,
              padding: '8px 0',
              fontSize: '11px',
              fontWeight: '600',
              color: position === pos ? '#e2e8f0' : '#64748b',
              backgroundColor: position === pos ? '#0f172a' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: position === pos ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Category pills */}
      {cats.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', padding: '10px 12px', flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: category === c.key ? '#3b82f6' : '#0f172a',
                color: category === c.key ? '#fff' : '#64748b',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Leader rows */}
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>Loading…</div>
      ) : leaders.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>No data yet</div>
      ) : (
        <div>
          {leaders.map((player, idx) => (
            <div
              key={player.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 20px 1fr auto',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 10px',
                borderBottom: idx < leaders.length - 1 ? '1px solid #1a2640' : 'none',
                backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{player.rank}</span>
              <img
                src={`${API_BASE}/teams/${player.teamId}/avatar?size=20&v=2`}
                alt=""
                style={{ width: '20px', height: '20px', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <PlayerHoverCard playerId={player.id} playerName={player.name}>
                  <Link
                    to={`/players/${player.id}`}
                    style={{ fontSize: '13px', color: '#e2e8f0', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {player.name}
                  </Link>
                </PlayerHoverCard>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {player.teamAbbr}
                  {position === 'ALL' && <span style={{ marginLeft: '4px', color: '#64748b' }}>· {player.position}</span>}
                  {player.gamesPlayed > 0 && <span style={{ marginLeft: '4px', color: '#64748b' }}>· {player.gamesPlayed}G</span>}
                </div>
                <div style={{ marginTop: '1px' }}>
                  <Stars stars={player.ratingStars} size={10} />
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                {formatStat(player.statValue, category)}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
