import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * The Bleachers' fan half: what you can shout AT THIS GAME, and what everyone
 * else has shouted at it.
 *
 * ⚠️ Deliberately NOT `TeamFeed`. That feed is a club's standing conversation —
 * "This is our season", "Same story every season" — lines about a year, which
 * read as nonsense shouted at a single snap. Worse, it is scoped to a team, so
 * a post made watching one game showed up in every other game's rail.
 *
 * Posts here carry a `game_id` and are read back per game, so a shout belongs
 * to the night it was shouted at.
 */

interface FeedPost {
  id: number
  postKey: string
  text: string
  valence: number
  teamId: number
  teamAbbr: string | null
  teamColor: string | null
  username: string | null
  isMine: boolean
  createdAt: string | null
}

interface CatalogGroup {
  label: string
  options: { key: string; text: string; valence: number }[]
}

const relativeTime = (iso: string | null): string => {
  if (!iso) return ''
  const then = new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime()
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  return `${Math.floor(secs / 3600)}h`
}

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 20 20" fill={TEXT.muted}
    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 160ms ease' }}
  >
    <path d="M5 7l5 6 5-6H5z" />
  </svg>
)

const GameFeedComposer: React.FC<{ gameId: number }> = ({ gameId }) => {
  const { user, getToken } = useAuth()
  const [groups, setGroups] = useState<CatalogGroup[]>([])
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/games/${gameId}/feed/catalog`)
      .then(r => r.json())
      .then(j => { if (j?.success) setGroups(j.data.groups ?? []) })
      .catch(() => { /* the feed still reads without a composer */ })
  }, [gameId])

  const loadFeed = useCallback(async () => {
    try {
      const token = user ? await getToken() : null
      const res = await fetch(`${API_BASE}/games/${gameId}/feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success) return
      setPosts(json.data.posts ?? [])
      setRemaining(json.data.postsRemaining ?? null)
    } catch { /* keep whatever we had */ }
  }, [gameId, user, getToken])

  // Reset on a game switch so the previous match's shouts never flash up here.
  useEffect(() => { setPosts([]); setOpen(false); setError(null); loadFeed() }, [gameId, loadFeed])

  const post = async (key: string, text: string) => {
    setOpen(false)
    setError(null)
    // Optimistic: the shout appears the moment you pick it.
    const optimistic: FeedPost = {
      id: -Date.now(), postKey: key, text, valence: 0,
      teamId: user?.favoriteTeamId ?? 0, teamAbbr: null, teamColor: null,
      username: user?.username ?? 'you', isMine: true,
      createdAt: new Date().toISOString(),
    }
    setPosts(prev => [optimistic, ...prev])
    try {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/games/${gameId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ postKey: key }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setPosts(prev => prev.filter(p => p.id !== optimistic.id))
        setError(json?.detail || 'That did not go through')
        return
      }
      setRemaining(json.data?.postsRemaining ?? remaining)
      loadFeed()
    } catch {
      setPosts(prev => prev.filter(p => p.id !== optimistic.id))
      setError('That did not go through')
    }
  }

  const canPost = !!user?.favoriteTeamId

  return (
    <>
      <div style={{ padding: '13px 14px', borderBottom: `1px solid ${BORDER.hairline}` }}>
        <button
          onClick={() => (canPost ? setOpen(o => !o) : undefined)}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            padding: '10px 12px', cursor: canPost ? 'pointer' : 'default',
            background: open ? '#243044' : BG.panel,
            border: `1px solid ${open ? '#64748b' : BORDER.raised}`,
            fontFamily: FONT, ...font(700, 12), color: TEXT.secondary,
          }}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>
            {canPost ? 'Say something' : user ? 'Pick a club to join in' : 'Sign in to join in'}
          </span>
          {canPost && <Chevron open={open} />}
        </button>

        {open && (
          <div style={{ marginTop: '6px', border: `1px solid ${BORDER.raised}`, background: BG.panel }}>
            {groups.map(group => (
              <div key={group.label}>
                <div style={{ ...font(700, 11, 1, '0.04em'), color: TEXT.muted, padding: '8px 12px 5px' }}>
                  {group.label}
                </div>
                {group.options.map(option => (
                  <button
                    key={option.key}
                    className="feed-composer-option"
                    onClick={() => post(option.key, option.text)}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: '8px', width: '100%',
                      padding: '9px 12px', background: 'transparent', border: 'none',
                      borderLeft: '2px solid transparent', cursor: 'pointer',
                      fontFamily: FONT, ...font(500, 12), color: TEXT.secondary, textAlign: 'left',
                    }}
                  >{option.text}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ ...font(400, 11), color: ACCENT.negative, paddingTop: '8px' }}>{error}</div>
        )}
        {canPost && remaining != null && (
          <div style={{ ...font(400, 11), color: TEXT.muted, paddingTop: '8px' }}>
            {remaining} posts left this hour
          </div>
        )}
      </div>

      {posts.map(p => {
        const colour = p.teamColor ? readableTeamColor(p.teamColor) : TEXT.muted
        return (
          <div
            key={p.id}
            style={{
              display: 'flex', flexDirection: 'column', gap: '6px',
              padding: '12px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
              ...(p.isMine && p.teamColor
                ? { background: `${p.teamColor}14`, boxShadow: `inset 3px 0 0 ${p.teamColor}` }
                : {}),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {p.teamId ? (
                <img src={`/avatars/${p.teamId}.png`} alt="" width={18} height={18}
                     style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }} />
              ) : null}
              <span style={{ ...font(600, 11), color: colour }}>{p.username ?? 'someone'}</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...font(400, 10), color: TEXT.muted, ...TABULAR }}>{relativeTime(p.createdAt)}</span>
            </div>
            <span style={{ ...font(700, 14, 1.2, '-0.01em'), color: TEXT.strong }}>{p.text}</span>
          </div>
        )
      })}
    </>
  )
}

export default GameFeedComposer
