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

interface AllProPlayer {
  id: number
  name: string
  position: string
  team: string
  teamAbbr: string
  teamColor: string
  teamId: number
  seasonPerformanceRating: number
  zScore: number
  ratingStars: number
}

export const MvpRankings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [rankings, setRankings] = useState<MvpCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [crownedMvp, setCrownedMvp] = useState<CrownedMvp | null>(null)
  const [allPro, setAllPro] = useState<AllProPlayer[]>([])
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

  // Check if MVP/All-Pro have already been announced this season
  const checkExistingAwards = useCallback(async () => {
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
          seasonNumber: json.data.seasonNumber || json.data.season_number,
        })
      }
      if (json.success && json.data?.allPro) {
        setAllPro(json.data.allPro)
      }
    } catch (e) {
      // Silently fail — awards check is non-critical
    }
  }, [])

  useEffect(() => {
    fetchRankings()
    checkExistingAwards()
  }, [fetchRankings, checkExistingAwards])

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
    } else if (evt.event === 'all_pro_announcement') {
      setAllPro(evt.allPro || [])
    } else if (evt.event === 'season_start') {
      setCrownedMvp(null)
      setAllPro([])
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
      <div style={{ ...(!embedded && { backgroundColor: '#1e2d3d', border: '1px solid #2a3a4e', borderRadius: '8px' }), padding: '16px' }}>
        <div style={{ fontSize: '13px', color: '#475569', textAlign: 'center' }}>Loading...</div>
      </div>
    )
  }

  // Don't show anything until MVP/All-Pro have been awarded
  if (!crownedMvp && allPro.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* MVP Section */}
      <div style={{ ...(!embedded ? { backgroundColor: '#1e2d3d', border: '1px solid #2a3a4e', borderRadius: '8px', overflow: 'hidden' } : {}) }}>
        <div style={{ padding: embedded ? '4px 14px 8px' : '10px 14px', ...(!embedded && { backgroundColor: '#0f172a' }), borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {crownedMvp ? 'Season MVP' : 'MVP Race'}
          </span>
          <InfoTooltip text="Players ranked by z-score — how far above average each player's performance rating is compared to their peers. Higher = more dominant." />
        </div>

        {crownedMvp && (
          <div style={{
            padding: '10px 14px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))',
            borderBottom: rankings.length > 0 ? '1px solid rgba(245,158,11,0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <GiStarMedal style={{ fontSize: '22px', color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <Link
                to={`/players/${crownedMvp.id}`}
                style={{ fontSize: '15px', fontWeight: '700', color: '#fbbf24', textDecoration: 'none' }}
              >
                {crownedMvp.name}
              </Link>
              <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                {crownedMvp.teamAbbr} · {crownedMvp.position} · Season {crownedMvp.seasonNumber} MVP
              </div>
            </div>
          </div>
        )}

        {crownedMvp && rankings.map((player, idx) => {
          const isLeader = idx === 0
          const isCrowned = player.id === crownedMvp.id
          return (
            <div
              key={player.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 20px 1fr auto',
                alignItems: 'center',
                gap: '6px',
                padding: embedded ? '7px 14px' : '7px 10px',
                borderBottom: idx < rankings.length - 1 ? '1px solid #1a2640' : 'none',
                backgroundColor: isLeader ? 'rgba(245,158,11,0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                borderLeft: isLeader ? '2px solid #f59e0b' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: '12px', color: isLeader ? '#f59e0b' : '#94a3b8', textAlign: 'right', fontWeight: isLeader ? '700' : '400', fontVariantNumeric: 'tabular-nums' }}>
                {player.rank}
              </span>
              <img
                src={`/avatars/${player.teamId}.png`}
                alt=""
                style={{ width: '20px', height: '20px', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <PlayerHoverCard playerId={player.id} playerName={player.name}>
                  <Link
                    to={`/players/${player.id}`}
                    style={{ fontSize: '14px', color: isLeader ? '#fbbf24' : '#e2e8f0', textDecoration: 'none', display: 'inline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {player.name}
                  </Link>
                </PlayerHoverCard>
                {isCrowned && <GiStarMedal style={{ marginLeft: '4px', fontSize: '13px', color: '#fbbf24', display: 'inline', verticalAlign: 'middle' }} title="Season MVP" />}
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {player.teamAbbr}
                  <span style={{ marginLeft: '4px', color: '#64748b' }}>· {player.position}</span>
                </div>
                <div style={{ marginTop: '1px' }}>
                  <Stars stars={player.ratingStars} size={11} />
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: '700', color: isLeader ? '#fbbf24' : '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                {player.zScore > 0 ? '+' : ''}{player.zScore.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>

      {/* All-Pro Section */}
      {allPro.length > 0 && (
        <div style={{ ...(!embedded ? { backgroundColor: '#1e2d3d', border: '1px solid #2a3a4e', borderRadius: '8px', overflow: 'hidden' } : {}) }}>
          <div style={{ padding: embedded ? '4px 14px 8px' : '10px 14px', ...(!embedded && { backgroundColor: '#0f172a' }), borderBottom: '1px solid #334155' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              All-Pro Team
            </span>
          </div>

          {allPro.map((player, idx) => (
            <div
              key={player.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 20px 1fr auto',
                alignItems: 'center',
                gap: '6px',
                padding: embedded ? '7px 14px' : '7px 10px',
                borderBottom: idx < allPro.length - 1 ? '1px solid #1a2640' : 'none',
                borderLeft: '2px solid #a78bfa',
                backgroundColor: idx % 2 === 0 ? 'rgba(167,139,250,0.04)' : 'transparent',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#a78bfa', textAlign: 'center' }}>
                {player.position}
              </span>
              <img
                src={`/avatars/${player.teamId}.png`}
                alt=""
                style={{ width: '20px', height: '20px', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <PlayerHoverCard playerId={player.id} playerName={player.name}>
                  <Link
                    to={`/players/${player.id}`}
                    style={{ fontSize: '14px', color: '#e2e8f0', textDecoration: 'none', display: 'inline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {player.name}
                  </Link>
                </PlayerHoverCard>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {player.teamAbbr}
                </div>
                <div style={{ marginTop: '1px' }}>
                  <Stars stars={player.ratingStars} size={11} />
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#a78bfa', fontVariantNumeric: 'tabular-nums' }}>
                {player.zScore > 0 ? '+' : ''}{player.zScore.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
