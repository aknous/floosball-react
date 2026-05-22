import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FaFire, FaHeart, FaSurprise, FaLaughSquint, FaSadTear, FaAngry } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'

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

interface PlayReactionsProps {
  gameId: number
  playNumber: number
  targetType?: ReactionTargetType
  initial?: ReactionAggregate
}

export const PlayReactions: React.FC<PlayReactionsProps> = ({
  gameId, playNumber, targetType = 'play', initial,
}) => {
  const { user, getToken } = useAuth()
  const { subscribe } = useSeasonWebSocket()
  const [reactions, setReactions] = useState<ReactionAggregate>(initial ?? {})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hoveredUsers, setHoveredUsers] = useState<{ type: ReactionType; users: ReactorUser[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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
  // when a matching event arrives.
  useEffect(() => {
    return subscribe((msg: any) => {
      if (msg?.event !== 'play_reaction_update') return
      if (msg.gameId !== gameId) return
      if (msg.playNumber !== playNumber) return
      if (msg.targetType !== targetType) return
      setReactions(msg.reactions ?? {})
    })
  }, [subscribe, gameId, playNumber, targetType])

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
        if (next) setReactions(next)
      }
    } catch {
      // silent — WS broadcast will reconcile if request succeeded server-side
    } finally {
      setBusy(false)
    }
  }, [busy, user, getToken, gameId, playNumber, targetType])

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
          clicking a different one swaps. */}
      {presentTypes.map(type => {
        const def = ICON_BY_TYPE[type]
        const bucket = reactions[type]!
        const isOwn = ownReaction === type
        return (
          <button
            key={type}
            disabled={busy || !user}
            onClick={() => handleReact(type)}
            onMouseEnter={() => setHoveredUsers({ type, users: bucket.users })}
            onMouseLeave={() => setHoveredUsers(null)}
            title={bucket.users.map(u => u.username).join(', ')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid ${isOwn ? def.color : '#334155'}`,
              backgroundColor: isOwn ? `${def.color}1f` : 'transparent',
              color: '#cbd5e1',
              fontSize: '11px',
              fontWeight: 600,
              cursor: !user || busy ? 'default' : 'pointer',
            }}
          >
            <def.Icon size={11} color={def.color} />
            <span>{bucket.count}</span>
          </button>
        )
      })}

      {/* Add reaction trigger — opens the picker */}
      {user && (
        <button
          disabled={busy}
          onClick={() => setPickerOpen(p => !p)}
          title="React"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '20px',
            borderRadius: '10px',
            border: '1px dashed #334155',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            fontSize: '14px',
            lineHeight: 1,
            cursor: busy ? 'default' : 'pointer',
            padding: 0,
          }}
        >
          +
        </button>
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
            <button
              key={type}
              onClick={() => handleReact(type)}
              title={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: ownReaction === type ? `${color}33` : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${color}40`)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ownReaction === type ? `${color}33` : 'transparent')}
            >
              <Icon size={16} color={color} />
            </button>
          ))}
        </div>
      )}

      {/* Username tooltip on hover — shows who reacted with a given type */}
      {hoveredUsers && hoveredUsers.users.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          padding: '4px 8px',
          backgroundColor: '#0f172a',
          border: '1px solid #2a3a4e',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#cbd5e1',
          whiteSpace: 'nowrap',
          maxWidth: '240px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          zIndex: 6,
          pointerEvents: 'none',
        }}>
          {hoveredUsers.users.map(u => u.username).join(', ')}
        </div>
      )}
    </div>
  )
}
