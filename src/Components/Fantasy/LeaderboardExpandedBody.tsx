import React, { useEffect, useState } from 'react'
import axios from 'axios'
import type { CardData } from '@/Components/Cards/TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface ExpandedPlayer {
  slot: string
  playerName: string
  teamAbbr?: string
  points: number
  isPrev?: boolean
}

interface EquippedCardEntry {
  slotNumber: number
  card: CardData
  isMatch: boolean
}

interface Props {
  userId: number
  season: number
  week: number
  players: ExpandedPlayer[]
  cardBonus: number
  isMobile: boolean
}

const cardCache = new Map<string, EquippedCardEntry[]>()

const EDITION_SHORT: Record<string, string> = {
  base: 'BASE',
  holographic: 'HOLO',
  prismatic: 'PRSM',
  diamond: 'DMND',
}

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  holographic: '#c4b5fd',
  prismatic: '#f472b6',
  diamond: '#67e8f9',
}

const TYPE_COLORS: Record<string, string> = {
  flat_fp: '#4ade80',
  multiplier: '#f472b6',
  floobits: '#eab308',
}

const playerRowStyleFn = (mobile: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: mobile ? '3px 0' : '4px 0',
  fontSize: mobile ? '11px' : '12px',
})
const slotStyleFn = (mobile: boolean): React.CSSProperties => ({
  width: mobile ? 28 : 36, color: '#64748b', fontWeight: '600',
  fontSize: mobile ? '10px' : '11px',
})
const playerNameStyle: React.CSSProperties = { flex: 1, color: '#cbd5e1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const teamAbbrStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '10px', minWidth: 28, textAlign: 'right' }
const playerPointsStyleFn = (mobile: boolean): React.CSSProperties => ({
  color: '#e2e8f0', fontWeight: '600', minWidth: mobile ? 32 : 40, textAlign: 'right',
  fontSize: mobile ? '11px' : '12px',
})

export const LeaderboardExpandedBody: React.FC<Props> = ({ userId, season, week, players, cardBonus, isMobile }) => {
  const cacheKey = `${userId}:${season}:${week}`
  const [cards, setCards] = useState<EquippedCardEntry[] | null>(cardCache.get(cacheKey) ?? null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cards != null) return
    let cancelled = false
    setLoading(true)
    axios.get(`${API_BASE}/cards/equipped/public/${userId}`, { params: { season, week } })
      .then(res => {
        if (cancelled) return
        const list: EquippedCardEntry[] = res.data?.data?.equippedCards || res.data?.equippedCards || []
        cardCache.set(cacheKey, list)
        setCards(list)
      })
      .catch(() => { if (!cancelled) setCards([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cacheKey, cards, userId, season, week])

  const sortedPlayers = [...players].filter(p => !p.isPrev).sort((a, b) => b.points - a.points)
  const prevPlayers = players.filter(p => p.isPrev)

  const rosterColumn = (
    <div style={{ flex: '1 1 0', minWidth: 0 }}>
      {sortedPlayers.map(p => (
        <div key={p.slot} style={playerRowStyleFn(isMobile)}>
          <span style={slotStyleFn(isMobile)}>{p.slot}</span>
          <span style={playerNameStyle}>{p.playerName}</span>
          <span style={teamAbbrStyle}>{p.teamAbbr || ''}</span>
          <span style={playerPointsStyleFn(isMobile)}>+{p.points.toFixed(0)}</span>
        </div>
      ))}
      {prevPlayers.map(p => (
        <div key="prev" style={playerRowStyleFn(isMobile)}>
          <span style={{ ...slotStyleFn(isMobile), color: '#64748b' }}>PREV</span>
          <span style={{ ...playerNameStyle, color: '#64748b', fontStyle: 'italic' }}>{p.playerName}</span>
          <span style={teamAbbrStyle}></span>
          <span style={{ ...playerPointsStyleFn(isMobile), color: '#64748b' }}>+{p.points.toFixed(0)}</span>
        </div>
      ))}
      {cardBonus > 0 && (
        <div style={playerRowStyleFn(isMobile)}>
          <span style={{ ...slotStyleFn(isMobile), color: '#a78bfa' }}>CARD</span>
          <span style={{ ...playerNameStyle, color: '#a78bfa' }}>Card Bonus</span>
          <span style={teamAbbrStyle}></span>
          <span style={{ ...playerPointsStyleFn(isMobile), color: '#a78bfa' }}>+{cardBonus.toFixed(0)}</span>
        </div>
      )}
    </div>
  )

  const sortedCards = cards ? [...cards].sort((a, b) => a.slotNumber - b.slotNumber) : []

  const cardsColumn = (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Equipped Cards
      </div>
      {loading && <div style={{ fontSize: '11px', color: '#64748b' }}>Loading…</div>}
      {!loading && sortedCards.length === 0 && (
        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>None equipped</div>
      )}
      {!loading && sortedCards.map(({ card, isMatch }, i) => {
        const edTag = EDITION_SHORT[card.edition] ?? card.edition
        const edColor = EDITION_COLORS[card.edition] ?? '#94a3b8'
        const effectColor = TYPE_COLORS[card.outputType ?? ''] ?? '#cbd5e1'
        const effectLabel = card.displayName || card.effectName || ''
        return (
          <div
            key={card.id ?? i}
            title={card.detail || card.tooltip || ''}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '3px 0', fontSize: isMobile ? '11px' : '12px',
            }}
          >
            <span style={{
              color: edColor, fontWeight: '700',
              fontSize: '10px', flexShrink: 0, minWidth: 32,
            }}>
              {edTag}
            </span>
            <span style={{
              color: '#f1f5f9', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              minWidth: 0, flex: '1 1 0',
            }}>
              {card.playerName}
            </span>
            <span style={{
              color: effectColor, fontSize: '11px', flexShrink: 0,
              fontWeight: isMatch ? '700' : '400',
            }}>
              {effectLabel}
            </span>
            {isMatch && (
              <span style={{
                color: '#60a5fa', fontSize: '9px', fontWeight: '700',
                letterSpacing: '0.04em', flexShrink: 0,
              }}>
                MATCH
              </span>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{
      padding: isMobile ? '6px 8px 10px 32px' : '6px 16px 14px 58px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '12px' : '24px', alignItems: 'flex-start',
    }}>
      {rosterColumn}
      {cardsColumn}
    </div>
  )
}
