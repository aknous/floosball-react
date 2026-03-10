import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Link } from 'react-router-dom'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import PlayerHoverCard from './PlayerHoverCard'
import { Stars } from './Stars'
import { GiStarMedal } from 'react-icons/gi'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', cursor: 'default', flexShrink: 0 }}
      >?</span>
      {show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px 14px',
          maxWidth: '240px',
          fontSize: '12px',
          color: '#cbd5e1',
          lineHeight: '1.6',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 10000,
          pointerEvents: 'none',
        }}>
          {text}
        </div>,
        document.body
      )}
    </>
  )
}

interface MvpCandidate {
  rank: number
  id: number
  name: string
  position: string
  team: string
  teamAbbr: string
  teamColor: string
  teamId: number
  seasonPerformanceRating: number
  zScore: number
  gamesPlayed: number
  ratingStars: number
}

interface CrownedMvp {
  name: string
  position: string
  team: string
  teamAbbr: string
  teamColor: string
  teamId: number
  id: number
  seasonNumber: number
}

export const MvpRankings: React.FC = () => {
  const [rankings, setRankings] = useState<MvpCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [crownedMvp, setCrownedMvp] = useState<CrownedMvp | null>(null)
  const { event } = useSeasonWebSocket()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRankings = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/stats/mvp-rankings?limit=5`)
      const json = await r.json()
      if (json.success) setRankings(json.data.rankings)
    } catch (e) {
      console.error('Failed to fetch MVP rankings:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if MVP has already been crowned this season
  const checkExistingMvp = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/season`)
      const json = await r.json()
      if (json.success && json.data?.mvp) {
        const mvp = json.data.mvp
        setCrownedMvp({
          name: mvp.name,
          position: mvp.position,
          team: mvp.team,
          teamAbbr: mvp.teamAbbr,
          teamColor: mvp.teamColor,
          teamId: mvp.teamId,
          id: mvp.id,
          seasonNumber: json.data.seasonNumber,
        })
      }
    } catch (e) {
      // Silently fail — MVP check is non-critical
    }
  }, [])

  useEffect(() => {
    fetchRankings()
    checkExistingMvp()
  }, [fetchRankings, checkExistingMvp])

  // Refresh from WebSocket events
  useEffect(() => {
    if (!event) return
    const evt = event as any
    if (evt.event === 'mvp_announcement') {
      const mvp = evt.mvp
      setCrownedMvp({
        name: mvp.name,
        position: mvp.position,
        team: mvp.team,
        teamAbbr: mvp.teamAbbr,
        teamColor: mvp.teamColor,
        teamId: mvp.teamId,
        id: mvp.id,
        seasonNumber: evt.seasonNumber,
      })
      fetchRankings()
    } else if (evt.event === 'season_start') {
      setCrownedMvp(null)
      fetchRankings()
    } else if (evt.event === 'game_end') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      fetchRankings()
    } else if (evt.event === 'game_state') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchRankings, 5000)
    }
  }, [event, fetchRankings])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  if (loading) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontSize: '13px', color: '#475569', textAlign: 'center' }}>Loading…</div>
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '24px' }}>
        <div style={{ fontSize: '13px', color: '#475569', textAlign: 'center' }}>
          No MVP data yet — rankings populate as games are played.
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {crownedMvp ? 'Season MVP' : 'MVP Race'}
        </span>
        <InfoTooltip text="Players ranked by z-score — how far above average each player's performance rating is compared to their peers. Higher = more dominant." />
      </div>

      {crownedMvp && (
        <div style={{
          padding: '10px 14px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))',
          borderBottom: '1px solid rgba(245,158,11,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <GiStarMedal style={{ fontSize: '22px', color: '#fbbf24', flexShrink: 0 }} />
          <div>
            <Link
              to={`/players/${crownedMvp.id}`}
              style={{ fontSize: '14px', fontWeight: '700', color: '#fbbf24', textDecoration: 'none' }}
            >
              {crownedMvp.name}
            </Link>
            <div style={{ fontSize: '11px', color: '#f59e0b' }}>
              {crownedMvp.teamAbbr} · {crownedMvp.position} · Season {crownedMvp.seasonNumber} MVP
            </div>
          </div>
        </div>
      )}

      {rankings.map((player, idx) => {
        const isLeader = idx === 0
        const isCrowned = crownedMvp && player.id === crownedMvp.id
        return (
          <div
            key={player.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '16px 20px 1fr auto',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 10px',
              borderBottom: idx < rankings.length - 1 ? '1px solid #1a2640' : 'none',
              backgroundColor: isLeader ? 'rgba(245,158,11,0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderLeft: isLeader ? '2px solid #f59e0b' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: '11px', color: isLeader ? '#f59e0b' : '#94a3b8', textAlign: 'right', fontWeight: isLeader ? '700' : '400', fontVariantNumeric: 'tabular-nums' }}>
              {player.rank}
            </span>
            <img
              src={`${API_BASE}/teams/${player.teamId}/avatar?size=20&v=2`}
              alt=""
              style={{ width: '20px', height: '20px', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <PlayerHoverCard playerId={player.id} playerName={player.name}>
                <Link
                  to={`/players/${player.id}`}
                  style={{ fontSize: '13px', color: isLeader ? '#fbbf24' : '#e2e8f0', textDecoration: 'none', display: 'inline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {player.name}
                </Link>
              </PlayerHoverCard>
              {isCrowned && <GiStarMedal style={{ marginLeft: '4px', fontSize: '13px', color: '#fbbf24', display: 'inline', verticalAlign: 'middle' }} title="Season MVP" />}
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {player.teamAbbr}
                <span style={{ marginLeft: '4px', color: '#64748b' }}>· {player.position}</span>
              </div>
              <div style={{ marginTop: '1px' }}>
                <Stars stars={player.ratingStars} size={10} />
              </div>
            </div>
            <span style={{ fontSize: '15px', fontWeight: '700', color: isLeader ? '#fbbf24' : '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
              {player.zScore > 0 ? '+' : ''}{player.zScore.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
