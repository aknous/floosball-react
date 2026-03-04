import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface Team {
  id: number
  city: string
  name: string
  abbr: string
  color?: string
}

interface FavoriteTeamModalProps {
  visible: boolean
  onClose: () => void
}

export const FavoriteTeamModal: React.FC<FavoriteTeamModalProps> = ({ visible, onClose }) => {
  const { setFavoriteTeam, user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    axios.get(`${API_BASE}/teams`)
      .then(res => {
        const data = res.data
        const list = data?.success && Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setTeams(list)
      })
      .catch(() => {})
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const handlePick = async (teamId: number) => {
    if (saving) return
    setSaving(true)
    try {
      await setFavoriteTeam(teamId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!visible) return null

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '480px',
          maxHeight: '80vh',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          fontFamily: 'pressStart',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '6px' }}>
                Pick Your Team
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                Choose a favorite team to follow
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
              aria-label="Skip"
            >×</button>
          </div>
        </div>

        {/* Team list */}
        <div style={{ overflowY: 'auto', padding: '8px 0' }}>
          {teams.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
              Loading teams…
            </div>
          ) : (
            teams.map(team => {
              const isFav = user?.favoriteTeamId === team.id
              const isHov = hoveredId === team.id
              return (
                <button
                  key={team.id}
                  onClick={() => handlePick(team.id)}
                  onMouseEnter={() => setHoveredId(team.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '10px 20px',
                    background: isFav ? 'rgba(59,130,246,0.12)' : isHov ? 'rgba(255,255,255,0.04)' : 'none',
                    border: 'none', cursor: saving ? 'default' : 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      borderRadius: '50%',
                      outline: isFav ? `2px solid ${team.color || '#3b82f6'}` : isHov ? '2px solid #475569' : '2px solid transparent',
                      outlineOffset: '2px',
                      transition: 'outline 0.1s',
                    }}
                  >
                    <img
                      src={`${API_BASE}/teams/${team.id}/avatar?size=36&v=2`}
                      alt={team.abbr}
                      style={{ width: '36px', height: '36px', display: 'block', borderRadius: '50%' }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: isFav ? '#e2e8f0' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {team.city} {team.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                      {team.abbr}
                    </div>
                  </div>
                  {isFav && (
                    <div style={{ marginLeft: 'auto', fontSize: '10px', color: team.color || '#3b82f6', fontWeight: '700', flexShrink: 0 }}>
                      ✓ Selected
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #334155', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '11px', color: '#475569',
              padding: 0,
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
