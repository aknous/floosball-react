import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * The team social feed — signal 2 of the sentiment layer.
 *
 * The LOUD half, and the one the survey actually asked for: expressing how you
 * feel should be fun, not a governance chore. So posting is one tap from a
 * fixed catalog (Rocket-League quick-chat), posts land with a visible thud, and
 * the whole thing is deliberately ephemeral.
 *
 * Backend: GET /api/feed/catalog, GET/POST /api/teams/{id}/feed.
 */

interface CatalogPost { key: string; text: string; valence: number }
// Only `team` is manually postable; player/gm entries are the auto vocabulary.
interface Catalog { player: CatalogPost[]; gm: CatalogPost[]; team: CatalogPost[] }

interface FeedPost {
  id: number
  postKey: string
  text: string
  targetType: 'player' | 'gm' | 'team'
  targetPlayerId: number | null
  targetName: string | null
  valence: number
  createdAt: string | null
  mine: boolean
  isAuto: boolean
}

const valenceColor = (v: number) => (v > 0 ? '#4ade80' : v < 0 ? '#f87171' : '#93c5fd')

const timeAgo = (iso: string | null) => {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`
}

interface Props {
  teamId: number
  /** Bumped by the parent when a rating/GM vote lands, to refetch the echo. */
  refreshKey?: number
  /** You post about your OWN team. Elsewhere you can read, not join in. */
  canPost?: boolean
}

export const TeamFeed: React.FC<Props> = ({ teamId, refreshKey = 0, canPost = true }) => {
  const { getToken, user } = useAuth()
  const isSignedIn = !!user
  const interactive = isSignedIn && canPost

  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const tok = isSignedIn ? await getToken() : null
    return tok ? { Authorization: `Bearer ${tok}` } : {}
  }, [getToken, isSignedIn])

  useEffect(() => {
    fetch(`${API_BASE}/feed/catalog`)
      .then(r => r.json())
      .then(b => b?.data?.catalog && setCatalog(b.data.catalog))
      .catch(() => {})
  }, [])

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}/feed`, { headers: await authHeaders() })
      const body = await res.json()
      if (!body?.data) return
      setPosts(body.data.posts || [])
      setRemaining(body.data.postsRemaining)
    } catch {
      /* the feed is decoration; never break the team page */
    }
  }, [teamId, authHeaders])

  useEffect(() => { loadFeed() }, [loadFeed, refreshKey])

  const send = async (postKey: string) => {
    if (!interactive) return
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ postKey }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.detail || 'Could not post that')
        return
      }
      await loadFeed()
    } catch {
      setError('Could not post that')
    }
  }

  // Only the general team lines are manually postable.
  const options = useMemo<CatalogPost[]>(() => catalog?.team || [], [catalog])

  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {/* No aggregate mood band — how the fanbase feels should come across by
          READING the feed, not from a computed label sitting above it. */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>The Bleachers</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          {canPost
            ? 'Rate players and back or call out the GM to have your say here'
            : 'Visiting fan — you can read, but not join in'}
        </div>
      </div>

      {/* Composer — general support/frustration only. Opinions about a
          specific player or the GM arrive by rating them, which posts here
          automatically. Hidden away from your own team: a row of permanently
          disabled buttons is just noise. */}
      {canPost && (
      <div style={{ padding: '12px 14px', position: 'relative' }}>
        <button
          type="button"
          disabled={!interactive}
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: '8px',
            fontSize: '12px', fontWeight: 700,
            cursor: interactive ? 'pointer' : 'not-allowed',
            border: `1px solid ${open ? '#64748b' : '#334155'}`,
            backgroundColor: open ? '#243044' : '#0f172a',
            color: interactive ? '#e2e8f0' : '#64748b',
            transition: 'all 130ms ease',
          }}
        >
          <span>{isSignedIn ? 'Say something' : 'Sign in to join in'}</span>
          <FiChevronDown style={{
            fontSize: '15px',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 160ms ease',
          }} />
        </button>

        {open && (
          <div className="feed-composer-pop" style={{
            marginTop: '6px',
            border: '1px solid #334155', borderRadius: '8px',
            backgroundColor: '#0f172a', overflow: 'hidden',
          }}>
            {(['support', 'frustration'] as const).map(group => {
              const items = options.filter(o =>
                group === 'support' ? o.valence > 0 : o.valence < 0)
              if (items.length === 0) return null
              const accent = group === 'support' ? '#4ade80' : '#f87171'
              return (
                <div key={group}>
                  <div style={{
                    padding: '6px 12px 4px',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
                    color: accent,
                  }}>
                    {group === 'support' ? 'Rally behind them' : 'Let them hear it'}
                  </div>
                  {items.map(o => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => { send(o.key); setOpen(false) }}
                      className="feed-composer-option"
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '7px 12px', fontSize: '12px',
                        border: 'none', background: 'transparent',
                        color: '#cbd5e1', cursor: 'pointer',
                        borderLeft: `2px solid ${accent}00`,
                      }}
                    >
                      {o.text}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '8px', fontSize: '11px', color: error ? '#f87171' : '#94a3b8' }}>
          {error
            ? error
            : remaining != null
              ? `${remaining} post${remaining === 1 ? '' : 's'} left this hour`
              : ''}
        </div>
      </div>
      )}

      {/* Feed */}
      <div style={{ borderTop: '1px solid #334155', maxHeight: '320px', overflowY: 'auto' }}>
        {posts.length === 0 ? (
          <div style={{ padding: '18px 14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
            Nothing from the bleachers yet.
          </div>
        ) : posts.map((p, i) => (
          <div
            key={p.id}
            className="feed-post-row"
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid #23304a',
              display: 'flex', alignItems: 'baseline', gap: '10px',
              // Stagger only the first handful — a long list shouldn't cascade.
              animationDelay: `${Math.min(i, 8) * 35}ms`,
            }}
          >
            <span style={{
              width: '3px', alignSelf: 'stretch', borderRadius: '2px',
              backgroundColor: valenceColor(p.valence), flexShrink: 0,
            }} />
            <span style={{ fontSize: '12px', color: '#cbd5e1', flex: 1, minWidth: 0 }}>
              {p.text}
              {p.targetType === 'player' && p.targetName && (
                <span style={{ color: '#94a3b8' }}> — {p.targetName}</span>
              )}
            </span>
            {p.isAuto && (
              <span style={{ fontSize: '10px', color: '#64748b' }}
                    title="Generated from a rating">rated</span>
            )}
            {p.mine && (
              <span style={{ fontSize: '10px', color: '#64748b' }}>you</span>
            )}
            <span style={{ fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
              {timeAgo(p.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TeamFeed
