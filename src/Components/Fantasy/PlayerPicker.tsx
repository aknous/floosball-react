import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { Stars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface PlayerCardInfo {
  edition: string
  effectConfig: any
}

interface PlayerOption {
  id: number
  name: string
  position: string
  teamName: string
  teamAbbr: string
  teamColor: string
  teamId: number
  ratingStars: number
  fantasyPoints: number
}

interface PlayerPickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (player: PlayerOption) => void
  position: string   // e.g. 'QB', 'RB', 'WR', 'TE', 'K'
  excludeIds: number[]
  playerCards?: Map<number, PlayerCardInfo[]>
}

const POSITION_MAP: Record<string, string> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K',
}

const EDITION_COLORS: Record<string, { color: string; bg: string }> = {
  base:        { color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
  holographic: { color: '#c4b5fd', bg: 'rgba(167,139,250,0.18)' },
  prismatic:   { color: '#f472b6', bg: 'rgba(219,39,119,0.18)' },
  diamond:     { color: '#a5f3fc', bg: 'rgba(165,243,252,0.18)' },
}

const EDITION_LABELS: Record<string, string> = {
  base: 'BASE', holographic: 'HOLO', prismatic: 'PRSM',
  diamond: 'DIAMOND',
}

const CATEGORY_COLORS: Record<string, string> = {
  flat_fp: '#4ade80', multiplier: '#a78bfa', floobits: '#eab308',
  conditional: '#60a5fa', streak: '#fb923c',
}

const CardBadge: React.FC<{ card: PlayerCardInfo }> = ({ card }) => {
  const style = EDITION_COLORS[card.edition] || EDITION_COLORS.base
  const label = EDITION_LABELS[card.edition] || card.edition.toUpperCase()
  const effectName = card.effectConfig?.displayName || ''
  const tooltip = card.effectConfig?.tooltip || ''
  const category = card.effectConfig?.category || ''
  const catColor = CATEGORY_COLORS[category] || style.color
  const [showTip, setShowTip] = useState(false)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })
  const nameRef = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (!tooltip || !nameRef.current) return
    const rect = nameRef.current.getBoundingClientRect()
    setTipPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShowTip(true)
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: '700', color: style.color,
      backgroundColor: style.bg,
      padding: '3px 8px', borderRadius: '4px',
      border: 'none',
      whiteSpace: 'nowrap',
    }}>
      {label}
      {effectName && (
        <span
          ref={nameRef}
          onMouseEnter={handleEnter}
          onMouseLeave={() => setShowTip(false)}
          style={{ fontWeight: '500', color: catColor, cursor: tooltip ? 'help' : 'default' }}
        >
          {effectName}
        </span>
      )}
      {showTip && tooltip && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: tipPos.x,
          top: tipPos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a',
          border: `1px solid ${catColor}40`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '10px',
          color: '#e2e8f0',
          lineHeight: '1.5',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 10010,
          pointerEvents: 'none',
          fontFamily: 'pressStart',
          maxWidth: '280px',
          textAlign: 'center',
        }}>
          {tooltip}
        </div>,
        document.body
      )}
    </span>
  )
}

const PlayerRow: React.FC<{
  player: PlayerOption
  hoveredId: number | null
  setHoveredId: (id: number | null) => void
  onSelect: (player: PlayerOption) => void
  cards?: PlayerCardInfo[]
}> = ({ player, hoveredId, setHoveredId, onSelect, cards }) => (
  <button
    onClick={() => onSelect(player)}
    onMouseEnter={() => setHoveredId(player.id)}
    onMouseLeave={() => setHoveredId(null)}
    style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      width: '100%', padding: '12px 20px',
      background: hoveredId === player.id ? 'rgba(255,255,255,0.06)' : 'none',
      border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      transition: 'background 0.1s',
    }}
  >
    <img
      src={`${API_BASE}/teams/${player.teamId}/avatar?size=36&v=2`}
      alt={player.teamAbbr}
      style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <PlayerHoverCard playerId={player.id} playerName={player.name}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
            {player.name}
          </span>
        </PlayerHoverCard>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>{player.position} · {player.teamAbbr}</span>
        <Stars stars={player.ratingStars} size={20} />
      </div>
      {cards && cards.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
          {cards.map((card, i) => <CardBadge key={i} card={card} />)}
        </div>
      )}
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#4ade80' }}>
        {player.fantasyPoints.toFixed(0)}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>FP</div>
    </div>
  </button>
)

export const PlayerPicker: React.FC<PlayerPickerProps> = ({ visible, onClose, onSelect, position, excludeIds, playerCards }) => {
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  // Stabilize excludeIds to avoid infinite re-fetch loop (array reference changes every render)
  const excludeKey = excludeIds.join(',')
  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const pos = POSITION_MAP[position] || position
    const params: Record<string, any> = { category: 'fantasy_points', limit: 50 }
    if (position !== 'FLEX') params.position = pos
    axios.get(`${API_BASE}/stats/leaders`, { params })
      .then(res => {
        const data = res.data?.data?.leaders || res.data?.leaders || []
        const mapped: PlayerOption[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          teamName: p.team,
          teamAbbr: p.teamAbbr,
          teamColor: p.teamColor,
          teamId: p.teamId,
          ratingStars: p.ratingStars,
          fantasyPoints: p.fantasyPoints || p.statValue || 0,
        }))
        setPlayers(mapped.filter(p => !excludeIds.includes(p.id)))
      })
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, position, excludeKey])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  if (!visible) return null

  const hasCards = playerCards && playerCards.size > 0
  const cardMatches = hasCards
    ? players.filter(p => playerCards.has(p.id))
    : []
  const otherPlayers = hasCards
    ? players.filter(p => !playerCards.has(p.id))
    : players

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '560px', maxHeight: '80vh',
          backgroundColor: '#1e293b', border: '1px solid #334155',
          borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          fontFamily: 'pressStart', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #475569', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                Select {position}{position === 'FLEX' ? ' (Any)' : ''}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Sorted by fantasy points
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '22px', padding: '2px 6px' }}
            >x</button>
          </div>
        </div>

        {/* Player list */}
        <div style={{ overflowY: 'auto', padding: '4px 0' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>Loading...</div>
          ) : players.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>No players available</div>
          ) : (
            <>
              {/* Card matches section */}
              {cardMatches.length > 0 && (
                <>
                  <div style={{
                    padding: '10px 20px', fontSize: '12px', fontWeight: '700',
                    color: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.08)',
                    borderBottom: '1px solid rgba(167,139,250,0.15)',
                  }}>
                    Your Cards
                  </div>
                  {cardMatches.map(player => (
                    <PlayerRow key={player.id} player={player} hoveredId={hoveredId}
                      setHoveredId={setHoveredId} onSelect={onSelect}
                      cards={playerCards?.get(player.id)} />
                  ))}
                  <div style={{
                    padding: '10px 20px', fontSize: '12px', fontWeight: '700',
                    color: '#64748b', borderTop: '1px solid #334155',
                    borderBottom: '1px solid #334155',
                    marginTop: '2px',
                  }}>
                    All Players
                  </div>
                </>
              )}
              {otherPlayers.map(player => (
                <PlayerRow key={player.id} player={player} hoveredId={hoveredId}
                  setHoveredId={setHoveredId} onSelect={onSelect} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
