import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import HoverTooltip from '../HoverTooltip'
import type { CurrentGame } from '@/hooks/useCurrentGames'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Single-tier cheer. Free — the 20s lockout is the only friction.
const CHEER_COLOR = '#86efac'

const LOCKOUT_SECONDS = 20

interface RallyButtonProps {
  game: CurrentGame
  teamId: number
  teamColor: string
}

const RallyButton: React.FC<RallyButtonProps> = ({ game, teamId, teamColor }) => {
  const { user, getToken } = useAuth()
  const [lockoutLeft, setLockoutLeft] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lockout countdown tick.
  useEffect(() => {
    if (lockoutLeft <= 0) return
    const t = setInterval(() => {
      setLockoutLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [lockoutLeft])

  // On mount, hydrate the current cooldown for THIS team. The backend
  // cooldown is per-(user, game, team) and persists across modal opens.
  // Without this, closing and reopening the modal would let the user
  // press a button that's actually still locked out (400 from backend).
  useEffect(() => {
    let cancelled = false
    if (!user) return
    ;(async () => {
      try {
        const token = await getToken()
        const res = await fetch(`${API_BASE}/games/${game.id}/rally`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const json = await res.json()
        const data = json.data || json
        const cdByTeam = data.cooldownByTeam || {}
        const remaining = cdByTeam[String(teamId)] ?? cdByTeam[teamId] ?? 0
        if (!cancelled && remaining > 0) {
          setLockoutLeft(remaining)
        }
      } catch {
        // best-effort hydration; if it fails the button just starts unlocked
      }
    })()
    return () => { cancelled = true }
  }, [game.id, getToken, teamId, user])

  // Clear the flash after the celebration animation finishes.
  useEffect(() => {
    if (!flashing) return
    const t = setTimeout(() => setFlashing(false), 1200)
    return () => clearTimeout(t)
  }, [flashing])

  const fire = useCallback(async () => {
    if (!user || busy || lockoutLeft > 0) return
    setBusy(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/games/${game.id}/rally`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ teamId, tier: 'small' }),
      })
      const json = await res.json()
      if (!res.ok || !json.data) {
        setError(json.detail || 'Failed')
        return
      }
      const seconds = json.data.cooldownSeconds ?? LOCKOUT_SECONDS
      // Cooldown is per-(user, game, team) — only this team's button
      // needs to lock out; the other team stays available.
      window.dispatchEvent(new CustomEvent('floosball:rally-fired', {
        detail: { gameId: game.id, teamId, seconds },
      }))
      setFlashing(true)
      setLockoutLeft(seconds)
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }, [busy, game.id, getToken, lockoutLeft, teamId, user])

  // Listen for rally-fired events only for THIS team — cooldown is
  // per-team now, so the other team's rally doesn't lock this button.
  useEffect(() => {
    const onRallyFired = (e: Event) => {
      const evt = e as CustomEvent<{ gameId: number; teamId: number; seconds: number }>
      if (!evt.detail) return
      if (evt.detail.gameId !== game.id) return
      if (evt.detail.teamId !== teamId) return
      setLockoutLeft(evt.detail.seconds)
    }
    window.addEventListener('floosball:rally-fired', onRallyFired)
    return () => window.removeEventListener('floosball:rally-fired', onRallyFired)
  }, [game.id, teamId])

  if (game.status !== 'Active') return null

  // Current state determines the icon color.
  const color =
    flashing ? CHEER_COLOR :
    lockoutLeft > 0 ? '#475569' :
    !user ? '#475569' :
    teamColor

  const disabled = !user || lockoutLeft > 0 || busy

  // Simple one-line tooltip — full team name lives here; the button
  // itself uses the team avatar inline as the identifier.
  const isHome = teamId === Number(game.homeTeam.id)
  const teamName = isHome ? game.homeTeam.name : game.awayTeam.name
  const tooltipContent: React.ReactNode = !user
    ? <span>Sign in to cheer</span>
    : lockoutLeft > 0
      ? <span>Locked out · {lockoutLeft}s</span>
      : <span>Cheer on the {teamName}</span>

  // Bottom-of-scoreboard CTA — full-width button per team. Idle state
  // pairs the "Cheer" verb with the team avatar (no abbr text) so the
  // identifier reads visually instead of as initials. Tooltip carries
  // the full team name.
  const idleLabel = 'Cheer'
  const label =
    flashing ? 'CHEERED!' :
    lockoutLeft > 0 ? `${lockoutLeft}s` :
    idleLabel
  const showTeamIcon = !flashing && lockoutLeft === 0

  return (
    <HoverTooltip content={tooltipContent} color={color}>
      <button
        onClick={fire}
        disabled={disabled}
        aria-label={`Cheer for ${teamName}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          color,
          backgroundColor: `${color}15`,
          border: `1px solid ${color}66`,
          padding: '10px 6px',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          opacity: disabled && !flashing ? 0.55 : 1,
          transition: 'all 0.15s',
          animation: flashing ? 'rally-flash 0.6s ease-out 2' : undefined,
          boxShadow: flashing ? `0 0 16px ${color}88, inset 0 0 8px ${color}33` : 'none',
        }}
      >
        <MegaphoneIcon color={color} />
        <span>{label}</span>
        {showTeamIcon && (
          <img
            src={`/avatars/${teamId}.png`}
            alt=""
            style={{
              width: '22px',
              height: '22px',
              display: 'block',
              flexShrink: 0,
            }}
          />
        )}
      </button>
    </HoverTooltip>
  )
}

const MegaphoneIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 24 24" fill={color} width="20" height="20"
       style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
    <path d="M3 11v2a1 1 0 0 0 1 1h1l3 6h3l-2-6h1l8 3V5l-8 3H4a1 1 0 0 0-1 1v2zm17-2.5v7c1.1-.7 2-2.1 2-3.5s-.9-2.8-2-3.5z" />
  </svg>
)

export default RallyButton
