import React, { useEffect, useState } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Fan Favorites / Most Hated — the payoff for the 1-5 ratings.
 *
 * Always scoped to ONE team. A league-wide table of who's loved and hated
 * everywhere isn't interesting to a fan — you care who the fans of YOUR
 * team have turned on. Rater-gated server-side, so nobody appears off a
 * single rating.
 */

interface BoardEntry {
  playerId: number
  name: string | null
  position: string | null
  team: string | null
  average: number
  raters: number
  sentiment: number
}

const Column: React.FC<{
  title: string
  accent: string
  entries: BoardEntry[]
  emptyNote: string
}> = ({ title, accent, entries, emptyNote }) => (
  <div style={{ flex: 1, minWidth: '220px' }}>
    <div style={{
      fontSize: '11px', fontWeight: 700, color: accent,
      letterSpacing: '0.04em', marginBottom: '8px',
    }}>
      {title}
    </div>
    {entries.length === 0 ? (
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{emptyNote}</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {entries.map((e, i) => (
          <div key={e.playerId} style={{
            display: 'flex', alignItems: 'baseline', gap: '8px',
            fontSize: '12px', color: '#cbd5e1',
          }}>
            <span style={{ width: '16px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.name || `#${e.playerId}`}
              {e.position && <span style={{ color: '#94a3b8' }}> · {e.position}</span>}
            </span>
            <span style={{ color: accent, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {e.average.toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>{e.raters}</span>
          </div>
        ))}
      </div>
    )}
  </div>
)

export const SentimentBoards: React.FC<{ teamId: number; limit?: number }> = ({ teamId, limit }) => {
  const [favorites, setFavorites] = useState<BoardEntry[]>([])
  const [villains, setVillains] = useState<BoardEntry[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (teamId != null) params.set('teamId', String(teamId))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString()
    fetch(`${API_BASE}/sentiment/boards${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then(b => {
        if (!b?.data) return
        setFavorites(b.data.favorites || [])
        setVillains(b.data.villains || [])
      })
      .catch(() => {})
  }, [teamId, limit])

  // Nothing rated yet anywhere — say nothing rather than showing two empty columns.
  if (favorites.length === 0 && villains.length === 0) return null

  return (
    <div style={{
      backgroundColor: '#1e293b', border: '1px solid #334155',
      borderRadius: '10px', padding: '14px',
      display: 'flex', gap: '24px', flexWrap: 'wrap',
    }}>
      <Column title="Fan Favorites" accent="#4ade80" entries={favorites}
              emptyNote="Nobody has won them over yet." />
      <Column title="Most Hated" accent="#f87171" entries={villains}
              emptyNote="No villains yet." />
    </div>
  )
}

export default SentimentBoards
