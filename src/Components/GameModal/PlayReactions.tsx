import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FaFire, FaHeart, FaSurprise, FaLaughSquint, FaSadTear, FaAngry } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useGames } from '@/contexts/GamesContext'
import HoverTooltip from '../HoverTooltip'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export type ReactionType = 'hype' | 'love' | 'wow' | 'laugh' | 'cry' | 'mad'
export type ReactionTargetType = 'play' | 'sideline_quote'

export interface ReactorUser {
  id: number
  username: string
}
export interface ReactionBucket {
  count: number
  users: ReactorUser[]
}
export type ReactionAggregate = Partial<Record<ReactionType, ReactionBucket>>

const REACTIONS: ReadonlyArray<{
  type: ReactionType
  Icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
  label: string
}> = [
  { type: 'hype',  Icon: FaFire,        color: '#f97316', label: 'Hype' },
  { type: 'love',  Icon: FaHeart,       color: '#ef4444', label: 'Love' },
  { type: 'wow',   Icon: FaSurprise,    color: '#fbbf24', label: 'Wow' },
  { type: 'laugh', Icon: FaLaughSquint, color: '#facc15', label: 'Laugh' },
  { type: 'cry',   Icon: FaSadTear,     color: '#60a5fa', label: 'Cry' },
  { type: 'mad',   Icon: FaAngry,       color: '#dc2626', label: 'Mad' },
]

const ICON_BY_TYPE = Object.fromEntries(REACTIONS.map(r => [r.type, r])) as Record<ReactionType, typeof REACTIONS[number]>

// Reactions are inert for this long after the GAME MODAL opens — anchored to the
// modal-open time (passed down from GameModalNew), NOT to each widget's own mount.
// Top-of-feed widgets remount as the async REST fetch resolves (it unshifts plays
// onto the top) and on every live WS play; a per-widget guard resets on each of
// those remounts and lets a late "ghost click" through, which then PERSISTS.
// Opening the modal (a tap on a game card) can otherwise land the synthesized
// ghost click (~300ms after the tap) on a reaction pill at the top of the play
// list, adding a reaction (usually the leftmost: fire) the user never intended.
// No human opens the modal and deliberately reacts this fast.
const REACTION_MOUNT_GUARD_MS = 600

interface PlayReactionsProps {
  gameId: number
  playNumber: number
  targetType?: ReactionTargetType
  initial?: ReactionAggregate
  // Epoch ms when the game modal opened. The mount guard keys off this so a
  // widget that remounts late (REST merge / live play) shares the modal's window
  // instead of starting a fresh one. Falls back to mount time if not provided.
  modalOpenedAt?: number
}

export const PlayReactions: React.FC<PlayReactionsProps> = ({
  gameId, playNumber, targetType = 'play', initial, modalOpenedAt,
}) => {
  const { user, getToken } = useAuth()
  const { subscribe } = useSeasonWebSocket()
  const { updateGameReactions } = useGames()
  const [reactions, setReactions] = useState<ReactionAggregate>(initial ?? {})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mountedAtRef = useRef<number>(Date.now())

  // Sync local state when the parent passes a fresh `initial` aggregate.
  // useState only captures the initial value on first mount, so without
  // this the cached central-store value wins forever. Triggered when the
  // modal re-fetches game data and PlayReactions receives a new prop.
  useEffect(() => {
    if (initial) setReactions(initial)
  }, [initial])

  // The user's own reaction for this target — determined by scanning the
  // aggregate for their username. Used to highlight the picker icon.
  const ownReaction = (() => {
    if (!user) return null
    for (const type of Object.keys(reactions) as ReactionType[]) {
      const bucket = reactions[type]
      if (bucket && bucket.users.some(u => u.id === user.id)) return type
    }
    return null
  })()

  // Live updates from the WS broadcaster — replaces the whole aggregate
  // when a matching event arrives. Also push into the central store so a
  // close/reopen of the modal shows the latest state without waiting on
  // a refetch.
  useEffect(() => {
    return subscribe((msg: any) => {
      if (msg?.event !== 'play_reaction_update') return
      if (msg.gameId !== gameId) return
      if (msg.playNumber !== playNumber) return
      if (msg.targetType !== targetType) return
      const next = msg.reactions ?? {}
      setReactions(next)
      updateGameReactions(gameId, playNumber, targetType, next)
    })
  }, [subscribe, gameId, playNumber, targetType, updateGameReactions])

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  const handleReact = useCallback(async (type: ReactionType) => {
    if (busy || !user) return
    // Swallow clicks that fire as the modal opens (ghost click / click-through
    // landing on a pill) — see REACTION_MOUNT_GUARD_MS. Keyed off the modal-open
    // time so a late-remounting widget can't reset its own window.
    if (Date.now() - (modalOpenedAt ?? mountedAtRef.current) < REACTION_MOUNT_GUARD_MS) {
      setPickerOpen(false)
      return
    }
    setBusy(true)
    setPickerOpen(false)
    try {
      const tok = await getToken()
      const resp = await fetch(`${API_BASE}/games/${gameId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        body: JSON.stringify({ playNumber, targetType, reactionType: type }),
      })
      if (resp.ok) {
        const j = await resp.json()
        const next = (j.data?.reactions ?? j.reactions) as ReactionAggregate | undefined
        if (next) {
          setReactions(next)
          // Push into the central game cache so closing + reopening the
          // modal immediately shows the new reaction instead of waiting on
          // the next refetch or WS broadcast to land.
          updateGameReactions(gameId, playNumber, targetType, next)
        }
      }
    } catch {
      // silent — WS broadcast will reconcile if request succeeded server-side
    } finally {
      setBusy(false)
    }
  }, [busy, user, getToken, gameId, playNumber, targetType, updateGameReactions, modalOpenedAt])

  const presentTypes = (Object.keys(reactions) as ReactionType[])
    .filter(t => (reactions[t]?.count ?? 0) > 0)

  return (
    <div
      ref={wrapperRef}
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
        position: 'relative',
        marginTop: '4px',
      }}
    >
      {/* Existing reactions — clicking an icon you already used removes it;
          clicking a different one swaps. Hover shows reactor usernames via
          the shared HoverTooltip portal. */}
      {presentTypes.map(type => {
        const def = ICON_BY_TYPE[type]
        const bucket = reactions[type]!
        const isOwn = ownReaction === type
        // Cap tooltip to the first N usernames + " and M more" so big
        // reaction counts don't produce a comma-separated wall of text.
        const MAX_NAMES = 3
        const names = bucket.users.map(u => u.username)
        const tooltipText = names.length <= MAX_NAMES
          ? names.join(', ')
          : `${names.slice(0, MAX_NAMES).join(', ')} and ${names.length - MAX_NAMES} more`
        return (
          <HoverTooltip
            key={type}
            text={tooltipText}
            color={def.color}
          >
            <button
              disabled={busy || !user}
              onClick={() => handleReact(type)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '14px',
                border: `1px solid ${isOwn ? def.color : '#334155'}`,
                backgroundColor: isOwn ? `${def.color}1f` : 'transparent',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                cursor: !user || busy ? 'default' : 'pointer',
              }}
            >
              <def.Icon size={14} color={def.color} />
              <span>{bucket.count}</span>
            </button>
          </HoverTooltip>
        )
      })}

      {/* Add reaction trigger — opens the picker */}
      {user && (
        <HoverTooltip text="React">
          <button
            disabled={busy}
            onClick={() => setPickerOpen(p => !p)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '24px',
              borderRadius: '12px',
              border: '1px dashed #334155',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontSize: '16px',
              lineHeight: 1,
              cursor: busy ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            +
          </button>
        </HoverTooltip>
      )}

      {/* Picker popover — six icons in a row */}
      {pickerOpen && user && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          padding: '6px 8px',
          backgroundColor: '#1e2d3d',
          border: '1px solid #2a3a4e',
          borderRadius: '8px',
          display: 'flex',
          gap: '4px',
          zIndex: 5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {REACTIONS.map(({ type, Icon, color, label }) => (
            <HoverTooltip key={type} text={label} color={color}>
              <button
                onClick={() => handleReact(type)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: ownReaction === type ? `${color}33` : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${color}40`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ownReaction === type ? `${color}33` : 'transparent')}
              >
                <Icon size={20} color={color} />
              </button>
            </HoverTooltip>
          ))}
        </div>
      )}
    </div>
  )
}
