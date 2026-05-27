import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Stars, SwordIcon, ShieldIcon } from './Stars'
import { personalityAccent } from '@/utils/personality'
import { attitudeTier } from '@/utils/mentalProfile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface PlayerDetail {
  id: number
  name: string
  position: string
  team: string | null
  teamCity: string | null
  teamColor: string | null
  teamId: number | null
  teamAbbr: string | null
  playerRating: number
  ratingStars: number
  offensiveRating?: number
  defensiveRating?: number
  defensivePosition?: string | null
  attributes: {
    att1?: string; att1Value?: number; att1stars?: number
    att2?: string; att2Value?: number; att2stars?: number
    att3?: string; att3Value?: number; att3stars?: number
    playmakingStars?: number; playmakingValue?: number
    xFactorStars?: number; xFactorValue?: number
    seasonPerformanceRating?: number
    fatigue?: number
    mood?: string         // mood name like "Composed" / "Studying"
    moodTier?: string     // tier name like "steady" / "electric"
    attitude?: number     // raw 30-100 — used to derive the badge tier
    attitudeLabel?: string  // "Leader" / "Positive" / "Steady" / "Sour" / "Toxic"
    attitudeTier?: string   // tier key for color mapping
    personality?: string  // personality key like "stoic" / "alien"
    quirk?: string        // quirk key like "snacker" / "bling"
  }
  latestQuote?: {
    text: string
    event?: string
    personality?: string
    timestamp?: string
  } | null
}

const POSITION_FULL: Record<string, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', K: 'Kicker',
}

// ── Portal card ───────────────────────────────────────────────────────────────

interface CardProps {
  data: PlayerDetail
  mouseX: number
  mouseY: number
}

const MOOD_COLORS: Record<string, string> = {
  electric: '#22c55e',
  confident: '#4ade80',
  steady: '#94a3b8',
  frustrated: '#f97316',
  miserable: '#ef4444',
}

const CARD_WIDTH = 260
const CARD_HEIGHT_EST = 300
const OFFSET = 16

const Card: React.FC<CardProps> = ({ data, mouseX, mouseY }) => {
  // Place to the right of cursor; flip left if not enough room
  const left = mouseX + OFFSET + CARD_WIDTH > window.innerWidth - 8
    ? mouseX - CARD_WIDTH - OFFSET
    : mouseX + OFFSET

  // Place below cursor; flip up if not enough room. Re-measure after
  // mount in case the actual height exceeds the estimate.
  const initialTop = (() => {
    let t = mouseY + OFFSET
    if (t + CARD_HEIGHT_EST > window.innerHeight - 8) {
      t = mouseY - CARD_HEIGHT_EST - OFFSET
    }
    return Math.max(8, t)
  })()
  const [top, setTop] = useState(initialTop)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const h = el.offsetHeight
    let t = mouseY + OFFSET
    if (t + h > window.innerHeight - 8) {
      t = mouseY - h - OFFSET
    }
    setTop(Math.max(8, t))
  }, [mouseY, data])

  const { attributes: att } = data
  const color = data.teamColor || '#64748b'

  return ReactDOM.createPortal(
    <div ref={cardRef} style={{
      position: 'fixed', top, left,
      width: CARD_WIDTH,
      fontFamily: 'pressStart',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: 20000,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Header strip */}
      <div style={{
        height: '4px',
        backgroundColor: color,
      }} />

      <div style={{ padding: '14px' }}>
        {/* Name + position + stars */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1.2 }}>{data.name}</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '3px' }}>
            {POSITION_FULL[data.position] ?? data.position}
          </div>
          <div style={{ marginTop: '3px' }}><Stars stars={data.ratingStars} size={20} /></div>
        </div>

        {/* Team */}
        {data.teamId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <img src={`/avatars/${data.teamId}.png`} alt=""
              style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color, fontWeight: '600' }}>
              {data.teamCity} {data.team}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>Free Agent</div>
        )}

        {/* Mood + Attitude badges — current mental state + locker-room
            presence. Wrap so longer-named teams don't push these off. */}
        {(att?.mood || att?.attitude != null) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {att?.mood && (() => {
              const accent = MOOD_COLORS[att.moodTier || 'steady'] || '#94a3b8'
              return (
                <span style={{
                  fontSize: '11px',
                  color: accent,
                  backgroundColor: `${accent}1a`,
                  border: `1px solid ${accent}66`,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}>
                  Mood: <span style={{ fontWeight: '700' }}>{att.mood}</span>
                </span>
              )
            })()}
            {att?.attitude != null && (() => {
              const { label, color: tierColor } = attitudeTier(att.attitude)
              return (
                <span style={{
                  fontSize: '11px',
                  color: tierColor,
                  backgroundColor: `${tierColor}1a`,
                  border: `1px solid ${tierColor}66`,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}>
                  Presence: <span style={{ fontWeight: '700' }}>{label}</span>
                </span>
              )
            })()}
          </div>
        )}

        {/* Rating bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Overall</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700' }}>{data.playerRating}</span>
          </div>
          <div style={{ height: '4px', backgroundColor: '#334155', borderRadius: '2px' }}>
            <div style={{ width: `${Math.min(100, data.playerRating)}%`, height: '100%', backgroundColor: data.playerRating >= 85 ? '#22c55e' : data.playerRating >= 72 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Offensive / Defensive rating bars */}
        {data.offensiveRating != null && (
          <div style={{ marginBottom: data.defensivePosition ? '4px' : '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
              <SwordIcon size={11} color="#94a3b8" />
              <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>Offense</span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>{data.offensiveRating}</span>
            </div>
            <div style={{ height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
              <div style={{ width: `${Math.min(100, data.offensiveRating)}%`, height: '100%', backgroundColor: data.offensiveRating >= 85 ? '#22c55e' : data.offensiveRating >= 72 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
            </div>
          </div>
        )}
        {data.defensiveRating != null && data.defensivePosition && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
              <ShieldIcon size={11} color="#94a3b8" />
              <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>Defense ({data.defensivePosition})</span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>{data.defensiveRating}</span>
            </div>
            <div style={{ height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
              <div style={{ width: `${Math.min(100, data.defensiveRating)}%`, height: '100%', backgroundColor: data.defensiveRating >= 85 ? '#22c55e' : data.defensiveRating >= 72 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
            </div>
          </div>
        )}

        {/* Performance indicator */}
        {(() => {
          const perfRating = data.attributes?.seasonPerformanceRating
          if (perfRating == null || perfRating === 0) return null
          const delta = perfRating - data.playerRating
          let symbols = ''
          let label = ''
          let indicatorColor = ''
          if (delta >= 20) { symbols = '+++'; label = 'Overperforming'; indicatorColor = '#22c55e' }
          else if (delta >= 12) { symbols = '++'; label = 'Overperforming'; indicatorColor = '#22c55e' }
          else if (delta >= 5) { symbols = '+'; label = 'Overperforming'; indicatorColor = '#4ade80' }
          else if (delta <= -20) { symbols = '---'; label = 'Underperforming'; indicatorColor = '#ef4444' }
          else if (delta <= -12) { symbols = '--'; label = 'Underperforming'; indicatorColor = '#ef4444' }
          else if (delta <= -5) { symbols = '-'; label = 'Underperforming'; indicatorColor = '#f87171' }
          else return null
          return (
            <div style={{ fontSize: '12px', color: indicatorColor, fontWeight: '600', marginBottom: '10px' }}>
              {symbols} {label}
            </div>
          )
        })()}

        {/* Fatigue indicator */}
        {att?.fatigue != null && att.fatigue > 0 && (() => {
          const f = att.fatigue
          const fColor = f < 5 ? '#4ade80' : f < 10 ? '#eab308' : f < 15 ? '#f97316' : '#ef4444'
          return (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Fatigue</span>
                <span style={{ fontSize: '12px', color: fColor, fontWeight: '600' }}>{f.toFixed(1)}%</span>
              </div>
              <div style={{ height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
                <div style={{ width: `${Math.min(f / 20 * 100, 100)}%`, height: '100%', backgroundColor: fColor, borderRadius: '2px' }} />
              </div>
            </div>
          )
        })()}

        {/* Latest personality quote — most recent thing this player said
            or did, drawn from the in-memory quote buffer on the backend. */}
        {data.latestQuote?.text && (() => {
          const accent = data.latestQuote.personality
            ? personalityAccent(data.latestQuote.personality)
            : (att?.personality ? personalityAccent(att.personality) : '#94a3b8')
          return (
            <div style={{
              marginTop: '4px',
              padding: '8px 10px',
              backgroundColor: `${accent}10`,
              borderLeft: `2px solid ${accent}`,
              borderRadius: '4px',
            }}>
              <p style={{
                fontSize: '12px',
                color: '#cbd5e1',
                fontStyle: 'italic' as const,
                margin: 0,
                lineHeight: 1.4,
              }}>
                {data.latestQuote.text}
              </p>
            </div>
          )
        })()}

      </div>
    </div>,
    document.body
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface PlayerHoverCardProps {
  playerId: number
  playerName: string
  children: React.ReactNode
}

const PlayerHoverCard: React.FC<PlayerHoverCardProps> = ({ playerId, playerName, children }) => {
  const [data, setData] = useState<PlayerDetail | null>(null)
  const [visible, setVisible] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchedRef = useRef<number | null>(null)

  const fetchData = useCallback(async (id: number) => {
    if (fetchedRef.current === id) return
    fetchedRef.current = id
    try {
      const res = await fetch(`${API_BASE}/players/${id}`)
      const json = await res.json()
      if (json.success && json.data) setData(json.data)
    } catch {}
  }, [])

  const handleMouseEnter = (e: React.MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    timerRef.current = setTimeout(() => {
      setMousePos({ x, y })
      setVisible(true)
      fetchData(playerId)
    }, 180)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      style={{ display: 'contents' }}>
      {children}
      {visible && mousePos && data && (
        <Card data={data} mouseX={mousePos.x} mouseY={mousePos.y} />
      )}
    </span>
  )
}

export default PlayerHoverCard
