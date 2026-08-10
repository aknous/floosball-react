import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'
import HoverTooltip from '@/Components/HoverTooltip'

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
  /** Drop the panel chrome and the internal heading: the host page owns both.
   *  The team page is editorial - only the roster cards carry boxes there, and
   *  a bordered feed fought that. It also rendered its own "The Bleachers"
   *  title directly under the page's, showing the heading twice. */
  bare?: boolean
  /** Cap the scrolling feed. The team page runs it in a narrow rail beside the
   *  season record, where the default 320 pushed the column past the roster. */
  maxHeight?: number
  /** 'cheers' lays the catalog out as tappable chips instead of a dropdown.
   *  Kept as an option, but 'dropdown' is what the team page ships: eight
   *  always-visible chips crowded out the feed itself, which is the part
   *  people actually read. */
  composer?: 'dropdown' | 'cheers'
  /** Square corners and the #131e2f row surfaces, to sit in a page that has no
   *  radius anywhere. Independent of `composer` — the team page wants this
   *  look WITH the dropdown. */
  railTone?: boolean
}

export const TeamFeed: React.FC<Props> = ({
  teamId, refreshKey = 0, canPost = true, bare = false, maxHeight = 320,
  composer = 'dropdown', railTone = false,
}) => {
  const { getToken, user } = useAuth()
  const isSignedIn = !!user
  const interactive = isSignedIn && canPost
  const rail = railTone || composer === 'cheers'
  const radius = rail ? 0 : 8

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

  /** The catalog ordered the way the crowd actually is: what's being said most,
   *  support first. Counts come from the loaded window of posts — the feed
   *  endpoint has no per-key tally, and a running total would read as all-time
   *  when what matters is the mood right now. */
  const cheers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of posts) {
      if (p.targetType !== 'team') continue
      counts.set(p.postKey, (counts.get(p.postKey) || 0) + 1)
    }
    const withCounts = options.map(o => ({ ...o, count: counts.get(o.key) || 0 }))
    const byCount = (a: typeof withCounts[0], b: typeof withCounts[0]) => b.count - a.count
    return [
      ...withCounts.filter(o => o.valence > 0).sort(byCount),
      ...withCounts.filter(o => o.valence < 0).sort(byCount),
    ]
  }, [options, posts])

  return (
    <div style={bare ? { overflow: 'hidden' } : {
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {/* No aggregate mood band — how the fanbase feels should come across by
          READING the feed, not from a computed label sitting above it. */}
      {!bare && (
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>The Bleachers</div>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          {canPost
            ? 'Rate players and back or call out the GM to have your say here'
            : 'Visiting fan — you can read, but not join in'}
        </div>
      </div>
      )}

      {/* Cheer chips — the whole catalog, visible, each carrying how often it's
          been said lately. Unlike the dropdown this shows the crowd's mood
          without a click, which is the point of the panel. Signed-out fans see
          the chips inert with a sign-in hint rather than nothing at all. */}
      {composer === 'cheers' && (
      <div style={{ padding: bare ? '0 0 2px' : '12px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {cheers.map(c => {
            const up = c.valence > 0
            const tone = up ? '#4ade80' : '#f87171'
            const tint = up ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)'
            const edge = up ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'
            return (
              <button
                key={c.key}
                type="button"
                className="tp-cheer"
                disabled={!interactive}
                onClick={() => send(c.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', fontSize: '12px', fontWeight: 600,
                  borderRadius: 0, color: tone,
                  backgroundColor: tint, border: `1px solid ${edge}`,
                  cursor: interactive ? 'pointer' : 'default',
                }}
              >
                {c.text}
                {c.count > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{c.count}</span>
                )}
              </button>
            )
          })}
        </div>
        {/* The real rate-limit state, not a fixed promise: the backend meters
            per hour, so that's what gets reported. */}
        <div style={{ marginTop: '8px', fontSize: '12px', color: error ? '#f87171' : '#94a3b8' }}>
          {error
            ? error
            : !isSignedIn
              ? 'Sign in to post'
              : !canPost
                ? 'Visiting fan — you can read, but not join in'
                : remaining != null && remaining <= 10
                  ? `${remaining} post${remaining === 1 ? '' : 's'} left this hour`
                  : ''}
        </div>
      </div>
      )}

      {/* Composer — general support/frustration only. Opinions about a
          specific player or the GM arrive by rating them, which posts here
          automatically. Hidden away from your own team: a row of permanently
          disabled buttons is just noise. */}
      {composer === 'dropdown' && canPost && (
      <div style={{ padding: bare ? '0 0 2px' : '12px 14px', position: 'relative' }}>
        <button
          type="button"
          disabled={!interactive}
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            font: 'inherit',
            padding: '9px 12px', borderRadius: `${radius}px`,
            fontSize: '13px', fontWeight: 700,
            cursor: interactive ? 'pointer' : 'not-allowed',
            border: `1px solid ${open ? '#64748b' : '#334155'}`,
            backgroundColor: open ? '#243044' : '#0f172a',
            // #64748b is under the readable floor; a disabled control still
            // has to be legible, it just isn't clickable.
            color: interactive ? '#e2e8f0' : '#94a3b8',
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
            border: '1px solid #334155', borderRadius: `${radius}px`,
            backgroundColor: '#0f172a', overflow: 'hidden',
          }}>
            {(['support', 'frustration'] as const).map(group => {
              const items = cheers.filter(o =>
                group === 'support' ? o.valence > 0 : o.valence < 0)
              if (items.length === 0) return null
              const accent = group === 'support' ? '#4ade80' : '#f87171'
              return (
                <div key={group}>
                  <div style={{
                    padding: '7px 12px 4px',
                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
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
                        font: 'inherit',
                        display: 'flex', alignItems: 'baseline', gap: '8px',
                        width: '100%', textAlign: 'left',
                        padding: '8px 12px', fontSize: '13px',
                        border: 'none', background: 'transparent',
                        color: '#cbd5e1', cursor: 'pointer',
                        borderLeft: `2px solid ${accent}00`,
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>{o.text}</span>
                      {o.count > 0 && (
                        <span style={{
                          fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                        }}>{o.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '8px', fontSize: '12px', color: error ? '#f87171' : '#94a3b8' }}>
          {error
            ? error
            : remaining != null && remaining <= 10
              ? `${remaining} post${remaining === 1 ? '' : 's'} left this hour`
              : ''}
        </div>
      </div>
      )}

      {/* Feed. In the rail the rows are surfaces with a tone edge rather than
          hairline-separated lines — at 340px wide a valence bar plus a border
          on every row was two dividers doing one job. */}
      <div style={{
        ...(rail
          ? { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }
          : { borderTop: '1px solid #1e293b' }),
        maxHeight: `${maxHeight}px`, overflowY: 'auto',
      }}>
        {posts.length === 0 ? (
          <div style={{
            padding: bare ? '14px 0' : '18px 14px',
            fontSize: '13px', color: '#cbd5e1',
            textAlign: bare ? 'left' : 'center',
          }}>
            Nothing from the bleachers yet.
          </div>
        ) : posts.map((p, i) => (
          <div
            key={p.id}
            className="feed-post-row"
            style={{
              display: 'flex', alignItems: 'baseline', gap: '10px',
              ...(rail ? {
                padding: '8px 10px',
                backgroundColor: '#131e2f',
                borderLeft: `3px solid ${valenceColor(p.valence)}`,
              } : {
                padding: bare ? '8px 0' : '8px 14px',
                borderBottom: '1px solid #16202f',
              }),
              // Stagger only the first handful — a long list shouldn't cascade.
              animationDelay: `${Math.min(i, 8) * 35}ms`,
            }}
          >
            {!rail && (
              <span style={{
                width: '3px', alignSelf: 'stretch', borderRadius: '2px',
                backgroundColor: valenceColor(p.valence), flexShrink: 0,
              }} />
            )}
            <span style={{ fontSize: '13px', color: '#cbd5e1', flex: 1, minWidth: 0 }}>
              {p.text}
              {p.targetType === 'player' && p.targetName && (
                <span style={{ color: '#94a3b8' }}> — {p.targetName}</span>
              )}
            </span>
            {p.isAuto && (
              <HoverTooltip text="Generated from a rating">
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>rated</span>
              </HoverTooltip>
            )}
            {p.mine && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>you</span>
            )}
            <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
              {timeAgo(p.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TeamFeed
