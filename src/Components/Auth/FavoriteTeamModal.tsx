import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  const isMobile = useIsMobile()
  const [teams, setTeams] = useState<Team[]>([])
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  // Confirmation state: team the user clicked, awaiting confirm
  const [confirmTeam, setConfirmTeam] = useState<Team | null>(null)

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

  // Reset confirm state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setConfirmTeam(null)
      setPendingMessage(null)
    }
  }, [visible])

  const hasFavorite = user?.favoriteTeamId != null
  const isLocked = hasFavorite && user?.favoriteTeamLockedSeason != null

  const handlePick = (team: Team) => {
    if (saving) return
    // If user already has this team selected, no-op
    if (user?.favoriteTeamId === team.id) return
    // Show confirmation before committing
    setConfirmTeam(team)
  }

  const handleConfirm = async () => {
    if (!confirmTeam || saving) return
    setSaving(true)
    setPendingMessage(null)
    try {
      await setFavoriteTeam(confirmTeam.id)
      // Check if it ended up as pending
      if (user?.pendingFavoriteTeamId === confirmTeam.id) {
        setPendingMessage(`Change to ${confirmTeam.city} ${confirmTeam.name} takes effect next season`)
      } else {
        onClose()
      }
    } finally {
      setSaving(false)
      setConfirmTeam(null)
    }
  }

  if (!visible) return null

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? '0' : '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: isMobile ? '100%' : '620px',
          maxHeight: isMobile ? '92vh' : '90vh',
          backgroundColor: '#1e293b',
          border: isMobile ? 'none' : '1px solid #334155',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          fontFamily: 'pressStart',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: isMobile ? '16px 16px 12px' : '20px 20px 16px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              {!hasFavorite ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '8px' : '12px' }}>
                    <svg width={isMobile ? 24 : 28} height={isMobile ? 24 : 28} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
                      <circle cx="16" cy="16" r="16" fill="#3b82f6" />
                      <g transform="rotate(-45 16 16)">
                        <ellipse cx="16" cy="16" rx="10" ry="6.5" fill="#e2e8f0" />
                        <line x1="6" y1="16" x2="26" y2="16" stroke="#3b82f6" strokeWidth="1.2" />
                        <line x1="13" y1="13.2" x2="13" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
                        <line x1="16" y1="12.5" x2="16" y2="19.5" stroke="#3b82f6" strokeWidth="1" />
                        <line x1="19" y1="13.2" x2="19" y2="18.8" stroke="#3b82f6" strokeWidth="1" />
                      </g>
                    </svg>
                    <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '700', color: '#e2e8f0' }}>
                      Welcome to Floosball!
                    </div>
                  </div>
                  <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#cbd5e1', lineHeight: '1.7', marginBottom: '8px' }}>
                    Pick a team to follow through the season. Your team's games will be highlighted across the app,
                    and you'll be able to track their progress in the standings.
                  </div>
                  <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                    Choose carefully — your pick is locked for the rest of the current season.
                    You can change it once a new season begins.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '6px' }}>
                    Change Your Team
                  </div>
                  <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                    Select a different team to follow
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
              aria-label="Close"
            >&times;</button>
          </div>
        </div>

        {/* Lock notice */}
        {isLocked && !pendingMessage && (
          <div style={{ padding: isMobile ? '8px 14px' : '10px 20px', backgroundColor: 'rgba(59,130,246,0.10)', borderBottom: '2px solid rgba(59,130,246,0.5)' }}>
            <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#60a5fa', lineHeight: '1.6' }}>
              Your favorite team is locked for this season. Any change will take effect next season.
            </div>
          </div>
        )}

        {/* Pending message */}
        {(pendingMessage || user?.pendingFavoriteTeamId) && (
          <div style={{ padding: isMobile ? '8px 14px' : '10px 20px', backgroundColor: 'rgba(234,179,8,0.10)', borderBottom: '2px solid rgba(234,179,8,0.5)' }}>
            <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#eab308', lineHeight: '1.5' }}>
              {pendingMessage || (() => {
                const pt = teams.find(t => t.id === user?.pendingFavoriteTeamId)
                return pt ? `Change to ${pt.city} ${pt.name} takes effect next season` : 'Team change pending next season'
              })()}
            </div>
          </div>
        )}

        {/* Confirmation overlay */}
        {confirmTeam && (
          <div style={{
            padding: isMobile ? '14px' : '20px',
            backgroundColor: 'rgba(234,179,8,0.10)',
            borderBottom: '2px solid rgba(234,179,8,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', marginBottom: isMobile ? '10px' : '14px' }}>
              <img
                src={`/avatars/${confirmTeam.id}.png`}
                alt={confirmTeam.abbr}
                style={{ width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px', borderRadius: '50%', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: '#f1f5f9' }}>
                  {confirmTeam.city} {confirmTeam.name}
                </div>
              </div>
            </div>
            <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#fbbf24', lineHeight: '1.6', marginBottom: isMobile ? '10px' : '14px' }}>
              {hasFavorite
                ? 'Your current team is locked for this season. This change will take effect next season.'
                : 'Your favorite team will be locked for the rest of the season. You won\'t be able to change it until next season.'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: '#eab308',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#1e293b',
                  cursor: saving ? 'default' : 'pointer',
                  fontFamily: 'pressStart',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: '700',
                  padding: isMobile ? '10px 12px' : '10px 14px',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Setting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmTeam(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontFamily: 'pressStart',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: '700',
                  padding: isMobile ? '10px 12px' : '10px 14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Team grid */}
        <div style={{ padding: isMobile ? '8px 12px' : '12px 16px', overflowY: 'auto', flex: 1 }}>
          {teams.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
              Loading teams...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '2px' : '4px' }}>
              {[...teams].sort((a, b) => a.city.localeCompare(b.city)).map(team => {
                const isFav = user?.favoriteTeamId === team.id
                const isPending = user?.pendingFavoriteTeamId === team.id
                const isHov = hoveredId === team.id
                return (
                  <button
                    key={team.id}
                    onClick={() => handlePick(team)}
                    onMouseEnter={() => setHoveredId(team.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    disabled={saving || isFav}
                    style={{
                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isMobile ? '10px' : '10px',
                      padding: isMobile ? '10px 12px' : '8px 10px',
                      background: isFav ? 'rgba(59,130,246,0.15)' : isHov ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: isFav ? `1px solid ${team.color || '#3b82f6'}` : '1px solid transparent',
                      borderRadius: '8px',
                      cursor: saving || isFav ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s, border-color 0.1s',
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={`/avatars/${team.id}.png`}
                        alt={team.abbr}
                        style={{ width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', display: 'block', borderRadius: '50%' }}
                      />
                    </div>
                    <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                      {team.city} {team.name}
                    </div>
                    {isFav && (
                      <div style={{ fontSize: '8px', color: team.color || '#3b82f6', fontWeight: '700', flexShrink: 0 }}>Current</div>
                    )}
                    {isPending && !isFav && (
                      <div style={{ fontSize: '8px', color: '#eab308', fontWeight: '700', flexShrink: 0 }}>Pending</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '12px 16px' : '12px 20px', borderTop: '1px solid #334155', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: isMobile ? '10px' : '11px', color: '#475569',
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
