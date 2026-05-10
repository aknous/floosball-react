import React, { useEffect, useState } from 'react'
import axios from 'axios'
import TradingCard, { CardData } from '@/Components/Cards/TradingCard'

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

  const cardsColumn = (
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Equipped Cards
      </div>
      {loading && <div style={{ fontSize: '11px', color: '#64748b' }}>Loading…</div>}
      {!loading && (cards?.length ?? 0) === 0 && (
        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>None equipped</div>
      )}
      {!loading && cards && cards.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px',
          maxWidth: isMobile ? '100%' : `${(cards.length * 111) - 6}px`,
        }}>
          {[...cards].sort((a, b) => a.slotNumber - b.slotNumber).map(c => (
            <TradingCard
              key={c.slotNumber}
              card={c.card}
              size="xs"
              glowColor={c.isMatch ? 'rgba(34,197,94,0.5)' : undefined}
              staticGlow
              noHoverLift
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{
      padding: isMobile ? '6px 8px 10px 32px' : '6px 16px 14px 58px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '12px' : '20px', alignItems: isMobile ? 'stretch' : 'flex-start',
    }}>
      {rosterColumn}
      {cardsColumn}
    </div>
  )
}
